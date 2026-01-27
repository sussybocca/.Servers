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
  const [currentVersionId, setCurrentVersionId] = useState(null);
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
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [versionChangelog, setVersionChangelog] = useState('');
  const [isPrerelease, setIsPrerelease] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [userServers, setUserServers] = useState([]);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersionModal, setShowVersionModal] = useState(false);

  // Get current user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          // Load user's servers
          fetchUserServers(data.user.id);
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
      loadServerVersions(serverId);
    }
  }, []);

  const fetchUserServers = async (userId) => {
    try {
      const response = await fetch(`/api/get-servers?owner_id=${userId}&includeVersions=true`);
      const data = await response.json();
      if (data.success) {
        setUserServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to fetch user servers:', error);
    }
  };

  const loadServerFiles = async (serverId) => {
    try {
      const response = await fetch(`/api/update-file?serverId=${serverId}&fileType=file&includeContent=true`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
        setFolders([]); // Reset folders for now
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadServerVersions = async (serverId) => {
    try {
      const response = await fetch(`/api/get-server?serverId=${serverId}&includeVersions=true`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const loadVersionFiles = async (versionId) => {
    try {
      const response = await fetch(`/api/update-file?serverId=${currentServerId}&version_id=${versionId}&fileType=version&includeContent=true`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
        setFolders([]);
        // Clear selected file when loading new version
        setSelectedFile(null);
        setFileContent('');
      }
    } catch (error) {
      console.error('Failed to load version files:', error);
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
          privacy: isPublic ? 'public' : 'private'
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Server created successfully!');
        setCurrentServerId(data.server.id);
        // Update URL without redirect
        window.history.pushState({}, '', `/editor/${data.server.id}`);
        
        // Load the newly created server
        fetchUserServers(currentUser.id);
        
        // Initialize with default files in a new version
        createInitialVersion(data.server.id);
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

  const createInitialVersion = async (serverId) => {
    const defaultFiles = [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Server</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Welcome to My Server!</h1>\n  <p>Edit this file to customize your server.</p>\n  <script src="script.js"></script>\n</body>\n</html>' },
      { path: '/style.css', content: 'body {\n  font-family: Arial, sans-serif;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 20px;\n  line-height: 1.6;\n}\n\nh1 {\n  color: #4285f4;\n}' },
      { path: '/script.js', content: 'console.log("Server is running!");\n\n// Your JavaScript code here\ndocument.addEventListener("DOMContentLoaded", function() {\n  console.log("Page loaded");\n});' }
    ];

    // First create a version
    const versionResponse = await fetch('/api/update-file', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_version',
        serverId: serverId,
        version_name: 'Initial Version',
        version_number: 'v1.0.0',
        description: 'Initial server files',
        changelog: 'Created initial server files'
      })
    });

    const versionData = await versionResponse.json();
    
    if (versionData.success) {
      setCurrentVersionId(versionData.version.id);
      
      // Save each file to the version
      for (const file of defaultFiles) {
        await saveFile(file.path, file.content);
      }
      
      setFiles(defaultFiles);
      setSelectedFile(defaultFiles[0]);
      setFileContent(defaultFiles[0].content);
      
      // Load versions for this server
      loadServerVersions(serverId);
    }
  };

  const saveFile = async (path, content) => {
    if (!currentServerId || !currentVersionId) {
      setMessage('No active version. Please create or select a version first.');
      return { success: false };
    }
    
    try {
      const response = await fetch('/api/update-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          path,
          content,
          version_id: currentVersionId,
          fileType: 'version'
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save file:', error);
      return { success: false, error: error.message };
    }
  };

  const createNewVersion = async () => {
    if (!newVersionName.trim()) {
      setMessage('Version name is required');
      return;
    }

    try {
      const response = await fetch('/api/update-file', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_version',
          serverId: currentServerId,
          version_name: newVersionName,
          version_number: newVersionNumber || `v${Date.now()}`,
          description: versionDescription || `Version: ${newVersionName}`,
          changelog: versionChangelog || 'Created new version',
          is_prerelease: isPrerelease
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Version created successfully!');
        setCurrentVersionId(data.version.id);
        setNewVersionName('');
        setNewVersionNumber('');
        setVersionDescription('');
        setVersionChangelog('');
        setIsCreatingVersion(false);
        
        // Copy current files to new version
        if (files.length > 0) {
          for (const file of files) {
            await saveFile(file.path, file.content || '');
          }
        } else {
          // Initialize with default files
          await createInitialVersion(currentServerId);
        }
        
        // Load updated versions list
        loadServerVersions(currentServerId);
      } else {
        setMessage(data.error || 'Failed to create version');
      }
    } catch (error) {
      setMessage('Failed to create version: ' + error.message);
    }
  };

  const publishCurrentVersion = async () => {
    if (!currentServerId || !currentVersionId) {
      setMessage('No version selected to publish');
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch('/api/publish-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          version_id: currentVersionId,
          release_notes: releaseNotes
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Version published successfully!');
        setReleaseNotes('');
        // Update versions list
        loadServerVersions(currentServerId);
      } else {
        setMessage(data.error || 'Failed to publish version');
      }
    } catch (error) {
      setMessage('Publish error: ' + error.message);
    } finally {
      setPublishing(false);
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

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileContent(file.content || '');
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

  const handleSelectServer = (server) => {
    setCurrentServerId(server.id);
    setServerName(server.name);
    setDescription(server.description);
    setIsPublic(server.is_public);
    setShowServerSelection(false);
    window.history.pushState({}, '', `/editor/${server.id}`);
    loadServerFiles(server.id);
    loadServerVersions(server.id);
  };

  const handleSelectVersion = (version) => {
    setCurrentVersionId(version.id);
    setMessage(`Switched to version: ${version.version_name}`);
    loadVersionFiles(version.id);
  };

  const getFileLanguage = (filename) => {
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.jsx')) return 'javascript'; // JSX uses JavaScript language
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.tsx')) return 'typescript';
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

  // Get file icon based on extension
  const getFileIcon = (filename) => {
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return '⚛️';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return '📘';
    if (filename.endsWith('.html')) return '🌐';
    if (filename.endsWith('.css')) return '🎨';
    if (filename.endsWith('.json')) return '📋';
    if (filename.endsWith('.md')) return '📝';
    return '📄';
  };

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
              {currentServerId && currentVersionId && (
                <span style={styles.serverInfo}> | {serverName} | Version: {currentVersionId}</span>
              )}
            </div>
            {currentServerId && (
              <div style={styles.headerButtons}>
                <button 
                  style={styles.versionButton}
                  onClick={() => setIsCreatingVersion(true)}
                >
                  🆕 New Version
                </button>
                <button 
                  style={styles.publishButton}
                  onClick={() => setShowVersionModal(true)}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing...' : '📤 Publish'}
                </button>
                <button 
                  style={styles.manageButton}
                  onClick={() => setShowServerSelection(!showServerSelection)}
                >
                  📂 My Servers ({userServers.length})
                </button>
                <button 
                  style={styles.backButton}
                  onClick={() => window.location.href = '/explore'}
                >
                  ← Explore
                </button>
              </div>
            )}
            {!currentServerId && (
              <button 
                style={styles.backButton}
                onClick={() => window.location.href = '/explore'}
              >
                ← Back to Explore
              </button>
            )}
          </div>
        </div>

        {/* Server Selection Modal */}
        {showServerSelection && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3>My Servers</h3>
                <button onClick={() => setShowServerSelection(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.serverList}>
                {userServers.length === 0 ? (
                  <div style={styles.noServers}>No servers found. Create one!</div>
                ) : (
                  userServers.map(server => (
                    <div 
                      key={server.id}
                      style={styles.serverItem}
                      onClick={() => handleSelectServer(server)}
                    >
                      <div style={styles.serverIcon}>🖥️</div>
                      <div style={styles.serverDetails}>
                        <div style={styles.serverName}>{server.name}</div>
                        <div style={styles.serverDescription}>{server.description || 'No description'}</div>
                        <div style={styles.serverMeta}>
                          {server.is_public ? '🌐 Public' : '🔒 Private'} • 
                          {server.versions?.length || 0} versions
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Version Creation Modal */}
        {isCreatingVersion && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3>Create New Version</h3>
                <button onClick={() => setIsCreatingVersion(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.versionForm}>
                <div style={styles.formGroup}>
                  <label>Version Name *</label>
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="e.g., Release 1.0"
                    style={styles.modalInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Version Number</label>
                  <input
                    type="text"
                    value={newVersionNumber}
                    onChange={(e) => setNewVersionNumber(e.target.value)}
                    placeholder="e.g., v1.0.0"
                    style={styles.modalInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    placeholder="Describe this version..."
                    style={styles.modalTextarea}
                    rows={3}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Changelog</label>
                  <textarea
                    value={versionChangelog}
                    onChange={(e) => setVersionChangelog(e.target.value)}
                    placeholder="What's new in this version..."
                    style={styles.modalTextarea}
                    rows={4}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={isPrerelease}
                      onChange={(e) => setIsPrerelease(e.target.checked)}
                      style={styles.checkbox}
                    />
                    Mark as pre-release
                  </label>
                </div>
                <div style={styles.modalActions}>
                  <button onClick={createNewVersion} style={styles.confirmButton}>
                    Create Version
                  </button>
                  <button onClick={() => setIsCreatingVersion(false)} style={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publish Version Modal */}
        {showVersionModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3>Publish Version</h3>
                <button onClick={() => setShowVersionModal(false)} style={styles.closeButton}>×</button>
              </div>
              <div style={styles.versionForm}>
                <div style={styles.versionsList}>
                  <h4>Available Versions</h4>
                  {versions.length === 0 ? (
                    <div style={styles.noVersions}>No versions created yet</div>
                  ) : (
                    versions.map(version => (
                      <div 
                        key={version.id}
                        style={styles.versionItem}
                      >
                        <div style={styles.versionHeader}>
                          <strong>{version.version_name}</strong>
                          <span style={styles.versionNumber}>{version.version_number}</span>
                        </div>
                        <div style={styles.versionDetails}>
                          {version.description}
                          <div style={styles.versionStatus}>
                            {version.is_released ? (
                              <span style={styles.releasedBadge}>✅ Published</span>
                            ) : (
                              <span style={styles.draftBadge}>📝 Draft</span>
                            )}
                            {version.is_prerelease && (
                              <span style={styles.prereleaseBadge}>🚧 Pre-release</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.versionActions}>
                          {!version.is_released && (
                            <button
                              onClick={() => {
                                setCurrentVersionId(version.id);
                                loadVersionFiles(version.id);
                                setShowVersionModal(false);
                              }}
                              style={styles.selectVersionButton}
                            >
                              Select & Edit
                            </button>
                          )}
                          {version.is_released && (
                            <button
                              onClick={() => handleSelectVersion(version)}
                              style={styles.viewVersionButton}
                            >
                              View Files
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {!currentVersionId ? (
                  <div style={styles.warningMessage}>
                    Please select or create a version first
                  </div>
                ) : (
                  <div style={styles.releaseNotes}>
                    <h4>Release Notes</h4>
                    <textarea
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      placeholder="What's new in this release..."
                      style={styles.modalTextarea}
                      rows={4}
                    />
                    <div style={styles.modalActions}>
                      <button onClick={publishCurrentVersion} style={styles.publishConfirmButton}>
                        📤 Publish Current Version
                      </button>
                      <button onClick={() => setShowVersionModal(false)} style={styles.cancelButton}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                  <strong>✨ Version Management:</strong> Create multiple versions of your server files.
                  <br />
                  <strong>📤 Publishing:</strong> Publish specific versions for users to download.
                  <br />
                  <strong>⚡ JSX/TypeScript:</strong> Full support for modern web development.
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
                
                <div style={styles.versionInfo}>
                  {currentVersionId ? (
                    <div style={styles.versionBadge}>
                      Version: {currentVersionId.substring(0, 8)}...
                    </div>
                  ) : (
                    <div style={styles.warningBadge}>
                      ⚠️ No version selected
                    </div>
                  )}
                </div>
                
                <div style={styles.pathDisplay}>
                  Path: {currentPath}
                </div>
                
                {/* Create File Modal */}
                {isCreatingFile && (
                  <div style={styles.modal}>
                    <div style={styles.fileExtensionHint}>
                      Supported: .js, .jsx, .ts, .tsx, .html, .css, .json, .md
                    </div>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      style={styles.modalInput}
                      placeholder="filename.jsx"
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
                {currentFiles.map(file => {
                  const fileName = file.path.split('/').pop();
                  return (
                    <div 
                      key={file.path}
                      style={{
                        ...styles.fileItem,
                        ...(selectedFile?.path === file.path ? styles.selectedFile : {})
                      }}
                      onClick={() => handleFileSelect(file)}
                      title={file.path}
                    >
                      {getFileIcon(fileName)} {fileName}
                    </div>
                  );
                })}
                
                {/* Empty state */}
                {currentFiles.length === 0 && currentFolders.length === 0 && (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyStateText}>No files in this version</p>
                    <p style={styles.emptyStateSubtext}>Create your first file!</p>
                  </div>
                )}
              </div>
              
              {/* Code Editor */}
              <div style={styles.editorPanel}>
                <div style={styles.editorHeader}>
                  <div style={styles.fileInfo}>
                    {selectedFile ? (
                      <>
                        <span style={styles.fileName}>
                          {getFileIcon(selectedFile.path.split('/').pop())} 
                          {selectedFile.path.split('/').pop()}
                        </span>
                        <span style={styles.filePath}>{selectedFile.path}</span>
                      </>
                    ) : (
                      <span>Select a file to edit</span>
                    )}
                  </div>
                  <div style={styles.editorActions}>
                    {selectedFile && (
                      <button 
                        style={styles.saveButton}
                        onClick={handleSaveFile}
                      >
                        💾 Save
                      </button>
                    )}
                  </div>
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
                        formatOnPaste: true,
                        formatOnType: true,
                      }}
                    />
                  </div>
                ) : (
                  <div style={styles.emptyEditor}>
                    {!currentVersionId ? (
                      <>
                        <p>⚠️ Please create or select a version first</p>
                        <button 
                          onClick={() => setIsCreatingVersion(true)}
                          style={styles.createVersionPrompt}
                        >
                          Create Your First Version
                        </button>
                      </>
                    ) : (
                      <>
                        <p>Select a file from the sidebar to start editing</p>
                        <p>Or create a new file using the 📄 button</p>
                      </>
                    )}
                    <div style={styles.supportedFiles}>
                      <h4>Supported file types:</h4>
                      <ul style={styles.fileTypesList}>
                        <li>📄 JavaScript (.js)</li>
                        <li>⚛️ JSX (.jsx)</li>
                        <li>📘 TypeScript (.ts, .tsx)</li>
                        <li>🌐 HTML (.html)</li>
                        <li>🎨 CSS (.css)</li>
                        <li>📋 JSON (.json)</li>
                        <li>📝 Markdown (.md)</li>
                      </ul>
                    </div>
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
                <li>Create versions to manage different file sets</li>
                <li>Edit files in each version</li>
                <li>Publish specific versions for users</li>
                <li>Switch between versions to edit</li>
              </ol>
              <div style={styles.featuresList}>
                <h4>✨ New Features:</h4>
                <ul>
                  <li><strong>Version Management:</strong> Create multiple versions</li>
                  <li><strong>Publishing Control:</strong> Publish specific versions</li>
                  <li><strong>Server Dashboard:</strong> View all your servers</li>
                  <li><strong>Enhanced Editor:</strong> Better file organization</li>
                </ul>
              </div>
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
  username: {
    color: '#4285f4'
  },
  serverInfo: {
    color: '#888'
  },
  headerButtons: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  },
  versionButton: {
    backgroundColor: '#8e44ad',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  publishButton: {
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  manageButton: {
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 5
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#252526',
    borderRadius: 8,
    width: '90%',
    maxWidth: 700,
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid #3c3c3c'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #3c3c3c',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: 24,
    cursor: 'pointer',
    padding: '0 10px'
  },
  serverList: {
    padding: '20px',
    maxHeight: '60vh',
    overflow: 'auto'
  },
  serverItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    borderBottom: '1px solid #3c3c3c',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#2d2d30'
    }
  },
  serverIcon: {
    fontSize: 24,
    marginRight: 15
  },
  serverDetails: {
    flex: 1
  },
  serverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  serverDescription: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5
  },
  serverMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    display: 'flex',
    gap: 10
  },
  noServers: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#888'
  },
  versionForm: {
    padding: '20px'
  },
  formGroup: {
    marginBottom: 15
  },
  modalInput: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#fff',
    fontSize: 14
  },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    borderRadius: 4,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#ccc',
    fontSize: 14
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 20
  },
  confirmButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  publishConfirmButton: {
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  cancelButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  versionsList: {
    marginBottom: 20
  },
  versionItem: {
    backgroundColor: '#2d2d30',
    padding: '15px',
    borderRadius: 4,
    marginBottom: 10,
    border: '1px solid #3c3c3c'
  },
  versionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  versionNumber: {
    backgroundColor: '#555',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12
  },
  versionDetails: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 10
  },
  versionStatus: {
    display: 'flex',
    gap: 10,
    marginTop: 10
  },
  releasedBadge: {
    backgroundColor: '#1e4620',
    color: '#4caf50',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12
  },
  draftBadge: {
    backgroundColor: '#2d3748',
    color: '#90caf9',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12
  },
  prereleaseBadge: {
    backgroundColor: '#4a235a',
    color: '#e1bee7',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12
  },
  versionActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  selectVersionButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12
  },
  viewVersionButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12
  },
  noVersions: {
    textAlign: 'center',
    padding: '20px',
    color: '#888'
  },
  warningMessage: {
    backgroundColor: '#4a235a',
    color: '#e1bee7',
    padding: '10px',
    borderRadius: 4,
    textAlign: 'center',
    marginBottom: 20
  },
  releaseNotes: {
    marginTop: 20
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
  versionInfo: {
    marginBottom: 15
  },
  versionBadge: {
    backgroundColor: '#4285f4',
    color: 'white',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    display: 'inline-block'
  },
  warningBadge: {
    backgroundColor: '#f39c12',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    display: 'inline-block'
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
  fileExtensionHint: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8
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
  folderItem: {
    padding: '8px 12px',
    color: '#569cd6',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 4,
    '&:hover': {
      backgroundColor: '#2a2d2e'
    }
  },
  fileItem: {
    padding: '8px 12px',
    color: '#ccc',
    cursor: 'pointer',
    borderRadius: 4,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    '&:hover': {
      backgroundColor: '#2a2d2e'
    }
  },
  selectedFile: {
    backgroundColor: '#094771'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#888'
  },
  emptyStateText: {
    margin: 0,
    fontSize: 14
  },
  emptyStateSubtext: {
    margin: '5px 0 0 0',
    fontSize: 12,
    color: '#666'
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
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  filePath: {
    fontSize: 12,
    color: '#888'
  },
  editorActions: {
    display: 'flex',
    gap: 10
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
    fontSize: 16,
    gap: 20
  },
  createVersionPrompt: {
    backgroundColor: '#8e44ad',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14
  },
  supportedFiles: {
    marginTop: 30,
    textAlign: 'left',
    maxWidth: 300
  },
  fileTypesList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0 0 0'
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
  },
  instructions: {
    backgroundColor: '#252526',
    border: '1px solid #3c3c3c',
    borderRadius: 8,
    padding: 20,
    maxWidth: 600,
    margin: '20px auto 0'
  },
  instructionsList: {
    paddingLeft: 20,
    lineHeight: 1.6
  },
  featuresList: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: '1px solid #3c3c3c'
  }
};
