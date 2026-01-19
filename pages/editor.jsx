'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function EditorPage() {
  // Server states
  const [serverName, setServerName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // File system states
  const [currentServerId, setCurrentServerId] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Get current user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
    
    // Check URL for existing server ID
    const path = window.location.pathname;
    if (path.includes('/editor/')) {
      const serverId = path.split('/editor/')[1];
      setCurrentServerId(serverId);
      loadServerFiles(serverId);
    }
  }, []);

  const loadServerFiles = async (serverId) => {
    try {
      const response = await fetch(`/api/get-server-files?serverId=${serverId}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
        setFolders(data.folders || []);
        // Load server info
        const serverRes = await fetch(`/api/get-servers?serverId=${serverId}`);
        const serverData = await serverRes.json();
        if (serverData.success) {
          setServerName(serverData.server.name);
          setDescription(serverData.server.description);
          setIsPublic(serverData.server.is_public);
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const createServer = async () => {
    if (!serverName.trim()) {
      setMessage('Server name is required');
      return;
    }

    if (!currentUser) {
      setMessage('You must be logged in to create a server');
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serverName,
          description,
          userId: currentUser.id,
          privacy: isPublic ? 'public' : 'private'
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Server created successfully!');
        setCurrentServerId(data.server.id);
        // Update URL without redirect
        window.history.pushState({}, '', `/editor/${data.server.id}`);
        
        // Initialize with default files
        initializeDefaultFiles(data.server.id);
      } else {
        setMessage(data.error || 'Failed to create server');
        console.error('API Error:', data);
      }
    } catch (error) {
      setMessage('Network error: ' + error.message);
      console.error('Network Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultFiles = async (serverId) => {
    const defaultFiles = [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Server</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Welcome to My Server!</h1>\n  <p>Edit this file to customize your server.</p>\n  <script src="script.js"></script>\n</body>\n</html>' },
      { path: '/style.css', content: 'body {\n  font-family: Arial, sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 20px;\n  line-height: 1.6;\n}\n\nh1 {\n  color: #4285f4;\n}' },
      { path: '/script.js', content: 'console.log("Server is running!");\n\n// Your JavaScript code here\ndocument.addEventListener("DOMContentLoaded", function() {\n  console.log("Page loaded");\n});' }
    ];

    for (const file of defaultFiles) {
      await saveFile(file.path, file.content);
    }
    
    setFiles(defaultFiles);
    setSelectedFile(defaultFiles[0]);
    setFileContent(defaultFiles[0].content);
  };

  const saveFile = async (path, content) => {
    if (!currentServerId) return;
    
    try {
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          path,
          content
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    
    const path = currentPath === '/' ? `/${newFileName}` : `${currentPath}/${newFileName}`;
    const newFile = { path, content: '' };
    
    const result = await saveFile(path, '');
    if (result.success) {
      setFiles([...files, newFile]);
      setSelectedFile(newFile);
      setFileContent('');
      setIsCreatingFile(false);
      setNewFileName('');
    }
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
    
    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          path: folderPath
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setFolders([...folders, { path: folderPath }]);
        setIsCreatingFolder(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const publishServer = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/publish-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Server published successfully!');
      } else {
        setMessage(data.error || 'Failed to publish server');
      }
    } catch (error) {
      setMessage('Publish error: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileContent(file.content);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    
    const result = await saveFile(selectedFile.path, fileContent);
    if (result.success) {
      setMessage('File saved successfully');
      // Update file in files array
      setFiles(files.map(f => 
        f.path === selectedFile.path ? { ...f, content: fileContent } : f
      ));
    }
  };

  const getFileLanguage = (filename) => {
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  // Filter files/folders for current path
  const currentFiles = files.filter(f => {
    const dir = f.path.substring(0, f.path.lastIndexOf('/') + 1) || '/';
    return dir === currentPath;
  });

  const currentFolders = folders.filter(f => {
    const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
    return parentPath === currentPath.substring(0, currentPath.lastIndexOf('/') + 1) || 
           (currentPath === '/' && !f.path.includes('/'));
  });

  // Show loading while checking auth
  if (!currentUser) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Checking authentication...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Server.x - {currentServerId ? `Editing ${serverName}` : 'Create Server'}</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo} onClick={() => window.location.href = '/explore'}>
            Server.x
          </div>
          <div style={styles.nav}>
            <div style={styles.userInfo}>
              <span style={styles.username}>Hello, {currentUser.username || 'User'}</span>
              {currentServerId && (
                <span style={styles.serverInfo}> | Editing: {serverName}</span>
              )}
            </div>
            {currentServerId ? (
              <>
                <button 
                  style={styles.publishButton}
                  onClick={publishServer}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing...' : 'Publish Server'}
                </button>
                <button 
                  style={styles.backButton}
                  onClick={() => window.location.href = '/explore'}
                >
                  ← Back to Explore
                </button>
              </>
            ) : (
              <button 
                style={styles.backButton}
                onClick={() => window.location.href = '/explore'}
              >
                ← Back to Explore
              </button>
            )}
          </div>
        </div>

        <div style={styles.main}>
          {!currentServerId ? (
            // Server creation form
            <div style={styles.editorBox}>
              <h2 style={styles.title}>Create New Server</h2>
              <div style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Server Name *</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    style={styles.input}
                    placeholder="My Awesome Server"
                    maxLength={50}
                    disabled={loading}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.textarea}
                    placeholder="Describe your server..."
                    rows={4}
                    maxLength={500}
                    disabled={loading}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      style={styles.checkbox}
                      disabled={loading}
                    />
                    Make server public (visible to everyone)
                  </label>
                </div>

                <div style={styles.infoBox}>
                  <strong>⚠️ Important:</strong> Servers expire after 60 days unless renewed.
                  Default files (index.html, style.css, script.js) will be created automatically.
                </div>

                {message && (
                  <div style={message.includes('success') ? styles.successMessage : styles.errorMessage}>
                    {message}
                  </div>
                )}

                <button
                  style={styles.createButton}
                  onClick={createServer}
                  disabled={loading || !serverName.trim() || !currentUser}
                >
                  {loading ? 'Creating...' : 'Create Server & Open Editor'}
                </button>
              </div>
            </div>
          ) : (
            // File editor interface
            <div style={styles.editorLayout}>
              {/* File Explorer Sidebar */}
              <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                  <h3 style={styles.sidebarTitle}>Files</h3>
                  <div style={styles.sidebarActions}>
                    <button 
                      style={styles.smallButton}
                      onClick={() => setIsCreatingFile(true)}
                      title="New File"
                    >
                      📄
                    </button>
                    <button 
                      style={styles.smallButton}
                      onClick={() => setIsCreatingFolder(true)}
                      title="New Folder"
                    >
                      📁
                    </button>
                  </div>
                </div>
                
                <div style={styles.pathDisplay}>
                  Path: {currentPath}
                </div>
                
                {/* Create File Modal */}
                {isCreatingFile && (
                  <div style={styles.modal}>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      style={styles.modalInput}
                      placeholder="filename.js"
                      onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
                    />
                    <div style={styles.modalActions}>
                      <button onClick={createNewFile} style={styles.confirmButton}>Create</button>
                      <button onClick={() => setIsCreatingFile(false)} style={styles.cancelButton}>Cancel</button>
                    </div>
                  </div>
                )}
                
                {/* Create Folder Modal */}
                {isCreatingFolder && (
                  <div style={styles.modal}>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      style={styles.modalInput}
                      placeholder="folder-name"
                      onKeyPress={(e) => e.key === 'Enter' && createNewFolder()}
                    />
                    <div style={styles.modalActions}>
                      <button onClick={createNewFolder} style={styles.confirmButton}>Create</button>
                      <button onClick={() => setIsCreatingFolder(false)} style={styles.cancelButton}>Cancel</button>
                    </div>
                  </div>
                )}
                
                {/* Folders List */}
                {currentFolders.map(folder => (
                  <div 
                    key={folder.path}
                    style={styles.folderItem}
                    onClick={() => setCurrentPath(folder.path)}
                  >
                    📁 {folder.path.split('/').pop()}
                  </div>
                ))}
                
                {/* Files List */}
                {currentFiles.map(file => (
                  <div 
                    key={file.path}
                    style={{
                      ...styles.fileItem,
                      ...(selectedFile?.path === file.path ? styles.selectedFile : {})
                    }}
                    onClick={() => handleFileSelect(file)}
                  >
                    📄 {file.path.split('/').pop()}
                  </div>
                ))}
              </div>
              
              {/* Code Editor */}
              <div style={styles.editorPanel}>
                <div style={styles.editorHeader}>
                  <div style={styles.fileInfo}>
                    {selectedFile ? (
                      <>
                        <span style={styles.fileName}>{selectedFile.path.split('/').pop()}</span>
                        <span style={styles.filePath}>{selectedFile.path}</span>
                      </>
                    ) : (
                      <span>Select a file to edit</span>
                    )}
                  </div>
                  <button 
                    style={styles.saveButton}
                    onClick={handleSaveFile}
                    disabled={!selectedFile}
                  >
                    💾 Save
                  </button>
                </div>
                
                {selectedFile ? (
                  <div style={styles.editorContainer}>
                    <MonacoEditor
                      height="70vh"
                      language={getFileLanguage(selectedFile.path)}
                      value={fileContent}
                      onChange={setFileContent}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>
                ) : (
                  <div style={styles.emptyEditor}>
                    <p>Select a file from the sidebar to start editing</p>
                    <p>Or create a new file using the 📄 button</p>
                  </div>
                )}
                
                {message && (
                  <div style={{
                    ...styles.message,
                    ...(message.includes('success') ? styles.successMessage : styles.errorMessage)
                  }}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Instructions panel (only when not editing) */}
          {!currentServerId && (
            <div style={styles.instructions}>
              <h3>How it works:</h3>
              <ol style={styles.instructionsList}>
                <li>Create server with name and description</li>
                <li>Use code editor to add HTML, CSS, JS files</li>
                <li>Organize files in folders</li>
                <li>Publish when ready</li>
                <li>Renew every 60 days to keep it alive</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1e1e1e',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff'
  },
  header: {
    backgroundColor: '#252526',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #3c3c3c'
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285f4',
    cursor: 'pointer'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  userInfo: {
    color: '#ccc',
    fontSize: 14,
    display: 'flex',
    gap: 10
  },
  serverInfo: {
    color: '#888'
  },
  publishButton: {
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  backButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  main: {
    padding: 20,
    height: 'calc(100vh - 70px)'
  },
  editorBox: {
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    padding: 30,
    marginBottom: 30,
    maxWidth: 600,
    margin: '0 auto'
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    color: '#fff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#ccc'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #3c3c3c',
    borderRadius: 4,
    fontSize: 16,
    outline: 'none',
    backgroundColor: '#3c3c3c',
    color: '#fff'
  },
  textarea: {
    padding: '12px 16px',
    border: '1px solid #3c3c3c',
    borderRadius: 4,
    fontSize: 16,
    outline: 'none',
    backgroundColor: '#3c3c3c',
    color: '#fff',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    color: '#ccc'
  },
  checkbox: {
    width: 18,
    height: 18
  },
  infoBox: {
    backgroundColor: '#2d2d30',
    border: '1px solid #3c3c3c',
    color: '#888',
    padding: 16,
    borderRadius: 4,
    fontSize: 14
  },
  successMessage: {
    backgroundColor: '#1e4620',
    border: '1px solid #2d6a2f',
    color: '#d4edda',
    padding: 12,
    borderRadius: 4
  },
  errorMessage: {
    backgroundColor: '#3c1f1e',
    border: '1px solid #5c2b2a',
    color: '#f8d7da',
    padding: 12,
    borderRadius: 4
  },
  createButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: 16,
    borderRadius: 4,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  editorLayout: {
    display: 'flex',
    height: 'calc(100vh - 110px)',
    gap: 20
  },
  sidebar: {
    width: 300,
    backgroundColor: '#252526',
    borderRadius: 8,
    padding: 15,
    overflow: 'auto'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sidebarTitle: {
    margin: 0,
    color: '#fff',
    fontSize: 16
  },
  sidebarActions: {
    display: 'flex',
    gap: 8
  },
  smallButton: {
    backgroundColor: 'transparent',
    border: '1px solid #3c3c3c',
    color: '#ccc',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 16
  },
  pathDisplay: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
    padding: '4px 8px',
    backgroundColor: '#2d2d30',
    borderRadius: 4
  },
  modal: {
    backgroundColor: '#2d2d30',
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
    border: '1px solid #3c3c3c'
  },
  modalInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#fff',
    marginBottom: 10
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  confirmButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer'
  },
  cancelButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer'
  },
  folderItem: {
    padding: '8px 12px',
    color: '#569cd6',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 4
  },
  fileItem: {
    padding: '8px 12px',
    color: '#ccc',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 4
  },
  selectedFile: {
    backgroundColor: '#094771'
  },
  editorPanel: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column'
  },
  editorHeader: {
    backgroundColor: '#252526',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #3c3c3c'
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  fileName: {
    fontSize: 16,
    color: '#fff'
  },
  filePath: {
    fontSize: 12,
    color: '#888'
  },
  saveButton: {
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden'
  },
  emptyEditor: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#888',
    fontSize: 16
  },
  message: {
    margin: '15px',
    padding: '12px',
    borderRadius: 4
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#1e1e1e'
  },
  loadingText: {
    fontSize: 18,
    color: '#ccc'
  }
};
