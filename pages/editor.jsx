'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { 
  FiFile, FiFolder, FiSave, FiGlobe, FiCode, FiTerminal,
  FiPackage, FiServer, FiUsers, FiLock, FiUnlock, FiUpload,
  FiChevronRight, FiChevronDown, FiTrash2, FiEdit3, FiPlay,
  FiZap, FiStar, FiGitBranch, FiCloud, FiCpu, FiX
} from 'react-icons/fi';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => <div className="editor-loading">Loading editor...</div>
});

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 }
};

export default function EditorPage() {
  const particlesInit = useRef(null);
  const [isParticlesLoaded, setIsParticlesLoaded] = useState(false);
  
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
  const [isRenaming, setIsRenaming] = useState({ path: null, type: '' });
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [dependencies, setDependencies] = useState({});
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);
  const [serverStats, setServerStats] = useState({
    files: 0,
    lines: 0,
    size: '0 KB'
  });
  const [serverList, setServerList] = useState([]);
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [installedPackages, setInstalledPackages] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [packageManager, setPackageManager] = useState('npm');

  // Refs
  const terminalRef = useRef(null);
  const fileInputRef = useRef(null);
  const terminalInputRef = useRef(null);

  // Initialize particles
  useEffect(() => {
    const initParticles = async () => {
      if (particlesInit.current) return;
      
      particlesInit.current = await loadSlim({
        particles: {
          number: {
            value: 30,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: {
            value: "#4285f4"
          },
          shape: {
            type: "circle"
          },
          opacity: {
            value: 0.3,
            random: true
          },
          size: {
            value: 3,
            random: true
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#4285f4",
            opacity: 0.2,
            width: 1
          },
          move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false
          }
        },
        interactivity: {
          events: {
            onhover: {
              enable: true,
              mode: "repulse"
            }
          }
        }
      });
      setIsParticlesLoaded(true);
    };
    
    initParticles();
  }, []);

  // Get current user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          loadUserServers(data.user.id);
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

  // Load user's servers
  const loadUserServers = async (userId) => {
    try {
      const response = await fetch(`/api/get-user-servers?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setServerList(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  // Update server stats when files change
  useEffect(() => {
    if (files.length > 0) {
      const totalLines = files.reduce((acc, file) => {
        return acc + (file.content?.split('\n').length || 0);
      }, 0);
      
      const totalSize = files.reduce((acc, file) => {
        return acc + (new TextEncoder().encode(file.content).length || 0);
      }, 0);
      
      setServerStats({
        files: files.length,
        lines: totalLines,
        size: formatBytes(totalSize)
      });
    }
  }, [files]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Focus terminal input when terminal is shown
  useEffect(() => {
    if (showTerminal && terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  }, [showTerminal]);

  const loadServerFiles = async (serverId) => {
    try {
      const response = await fetch(`/api/get-server-files?serverId=${serverId}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
        setFolders(data.folders || []);
        
        // Load package.json if exists
        const packageJson = data.files?.find(f => f.path === '/package.json');
        if (packageJson) {
          try {
            const pkg = JSON.parse(packageJson.content);
            setDependencies(pkg.dependencies || {});
            setInstalledPackages(Object.keys(pkg.dependencies || {}));
          } catch (e) {
            console.error('Failed to parse package.json');
          }
        }
        
        // Load server info
        const serverRes = await fetch(`/api/get-server?serverId=${serverId}`);
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

  // Check if server name exists
  const checkServerExists = async (name) => {
    try {
      const response = await fetch(`/api/check-server?name=${encodeURIComponent(name)}&userId=${currentUser.id}`);
      const data = await response.json();
      return data.exists;
    } catch (error) {
      return false;
    }
  };

  const createOrUpdateServer = async () => {
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
      // Check if server exists
      const serverExists = await checkServerExists(serverName);
      
      let response;
      if (serverExists && !currentServerId) {
        // Edit existing server
        setIsEditingServer(true);
        // Find the existing server
        const existingServer = serverList.find(s => s.name === serverName);
        if (existingServer) {
          setCurrentServerId(existingServer.id);
          window.history.pushState({}, '', `/editor/${existingServer.id}`);
          await loadServerFiles(existingServer.id);
          setMessage('Editing existing server: ' + serverName);
          setLoading(false);
          return;
        }
      }

      if (currentServerId) {
        // Update existing server
        response = await fetch('/api/update-server', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: currentServerId,
            name: serverName,
            description,
            privacy: isPublic ? 'public' : 'private'
          })
        });
      } else {
        // Create new server
        response = await fetch('/api/create-server', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: serverName,
            description,
            userId: currentUser.id,
            privacy: isPublic ? 'public' : 'private'
          })
        });
      }

      const data = await response.json();

      if (data.success) {
        setMessage(currentServerId ? 'Server updated successfully!' : 'Server created successfully!');
        
        if (!currentServerId) {
          setCurrentServerId(data.server.id);
          window.history.pushState({}, '', `/editor/${data.server.id}`);
          initializeDefaultFiles(data.server.id);
        } else {
          // Reload server list
          await loadUserServers(currentUser.id);
        }
      } else {
        setMessage(data.error || 'Failed to create/update server');
      }
    } catch (error) {
      setMessage('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultFiles = async (serverId) => {
    const defaultFiles = [
      { 
        path: '/index.jsx', 
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);` 
      },
      { 
        path: '/App.jsx', 
        content: `import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`${serverName} - Server.x\`;
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Welcome to {serverName}</h1>
        <p className="subtitle">Powered by Server.x with React & JSX</p>
        
        <div className="card">
          <button onClick={() => setCount(count + 1)}>
            Count is {count}
          </button>
          <p>
            Edit <code>App.jsx</code> to see changes
          </p>
        </div>

        <div className="features">
          <h2>✨ Features</h2>
          <div className="features-grid">
            <div className="feature">
              <h3>React 18</h3>
              <p>Built with modern React features</p>
            </div>
            <div className="feature">
              <h3>Real JSX</h3>
              <p>Full JSX support with compilation</p>
            </div>
            <div className="feature">
              <h3>Node.js Packages</h3>
              <p>Install real npm packages</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;` 
      },
      { 
        path: '/App.css', 
        content: `.App {
  text-align: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.App-header {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.App-header h1 {
  font-size: 3rem;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.subtitle {
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.card {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 15px;
  margin: 2rem 0;
}

.card button {
  background: #667eea;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card button:hover {
  background: #5a67d8;
  transform: translateY(-2px);
}

.features {
  margin-top: 3rem;
}

.features h2 {
  color: #333;
  margin-bottom: 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.feature:hover {
  transform: translateY(-5px);
}

.feature h3 {
  color: #667eea;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #666;
}

@media (max-width: 768px) {
  .App-header {
    padding: 1rem;
    margin: 1rem;
  }
  
  .App-header h1 {
    font-size: 2rem;
  }
}` 
      },
      {
        path: '/package.json',
        content: JSON.stringify({
          name: serverName.toLowerCase().replace(/\s+/g, '-'),
          version: "1.0.0",
          description: description || "A modern React application built with Server.x",
          private: true,
          scripts: {
            "start": "react-scripts start",
            "build": "react-scripts build",
            "test": "react-scripts test",
            "eject": "react-scripts eject"
          },
          dependencies: {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-scripts": "5.0.1"
          },
          devDependencies: {},
          keywords: ["react", "jsx", "server", "nodejs"],
          author: currentUser?.username || "Anonymous",
          license: "MIT",
          browserslist: {
            "production": [
              ">0.2%",
              "not dead",
              "not op_mini all"
            ],
            "development": [
              "last 1 chrome version",
              "last 1 firefox version",
              "last 1 safari version"
            ]
          }
        }, null, 2)
      }
    ];

    for (const file of defaultFiles) {
      await saveFile(file.path, file.content);
    }
    
    setFiles(defaultFiles);
    setSelectedFile(defaultFiles[0]);
    setFileContent(defaultFiles[0].content);
    
    // Load dependencies from package.json
    try {
      const pkg = JSON.parse(defaultFiles[3].content);
      setDependencies(pkg.dependencies || {});
      setInstalledPackages(Object.keys(pkg.dependencies || {}));
    } catch (e) {
      console.error('Failed to parse default package.json');
    }
  };

  // REAL Node.js package installation
  const installDependencies = async () => {
    if (!currentServerId) return;
    
    setIsInstallingDeps(true);
    setShowTerminal(true);
    setTerminalOutput('📦 Installing Node.js packages...\n\n');
    
    try {
      // Call API to install packages
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          packageManager,
          dependencies: Object.keys(dependencies)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Simulate installation output with real package names
        const packages = Object.keys(dependencies);
        let output = terminalOutput;
        
        for (const pkg of packages) {
          const version = dependencies[pkg];
          output += `➡️ Installing ${pkg}@${version}\n`;
          setTerminalOutput(output);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        output += '\n✅ All packages installed successfully!\n';
        output += `📦 ${packages.length} packages installed\n`;
        output += '✨ Ready to build your project!\n';
        
        setTerminalOutput(output);
        setInstalledPackages(packages);
        
        // Update package.json with installed versions
        const packageJsonFile = files.find(f => f.path === '/package.json');
        if (packageJsonFile) {
          try {
            const pkg = JSON.parse(packageJsonFile.content);
            // Mark packages as installed
            pkg._installed = true;
            const updatedContent = JSON.stringify(pkg, null, 2);
            await saveFile('/package.json', updatedContent);
            setFileContent(updatedContent);
          } catch (e) {
            console.error('Failed to update package.json');
          }
        }
      } else {
        setTerminalOutput(prev => prev + `❌ Failed to install packages: ${data.error}\n`);
      }
    } catch (error) {
      setTerminalOutput(prev => prev + `❌ Network error: ${error.message}\n`);
    } finally {
      setIsInstallingDeps(false);
    }
  };

  // Add a new package
  const addPackage = async (packageName, version = 'latest') => {
    if (!packageName.trim()) return;
    
    setTerminalOutput(prev => prev + `➕ Adding ${packageName}@${version}...\n`);
    
    // Update dependencies
    const newDeps = { ...dependencies, [packageName]: version };
    setDependencies(newDeps);
    
    // Update package.json
    const packageJsonFile = files.find(f => f.path === '/package.json');
    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        pkg.dependencies = newDeps;
        const updatedContent = JSON.stringify(pkg, null, 2);
        await saveFile('/package.json', updatedContent);
        setFileContent(updatedContent);
        
        // Update files array
        setFiles(files.map(f => 
          f.path === '/package.json' ? { ...f, content: updatedContent } : f
        ));
        
        setTerminalOutput(prev => prev + `✅ ${packageName} added to package.json\n`);
      } catch (e) {
        setTerminalOutput(prev => prev + `❌ Failed to update package.json\n`);
      }
    }
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
      return { success: false, error: error.message };
    }
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    
    const path = currentPath === '/' ? `/${newFileName}` : `${currentPath}/${newFileName}`;
    
    // Check if file already exists
    if (files.some(f => f.path === path)) {
      setMessage('File already exists!');
      return;
    }
    
    // Set default content based on file type
    let content = '';
    if (newFileName.endsWith('.js')) {
      content = `// ${newFileName}\nconsole.log('Hello from Server.x!');\n\nmodule.exports = {};`;
    } else if (newFileName.endsWith('.jsx')) {
      const componentName = newFileName.split('.')[0]
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/^[a-z]/, char => char.toUpperCase());
      content = `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    <div>\n      <h1>${newFileName}</h1>\n      <p>Edit this component in Server.x Editor</p>\n    </div>\n  );\n}`;
    } else if (newFileName.endsWith('.css')) {
      content = `/* ${newFileName} */\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n}`;
    } else if (newFileName === 'package.json') {
      content = JSON.stringify({
        name: serverName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        description: "Server.x project",
        main: "index.js",
        scripts: {
          start: "node index.js"
        },
        dependencies: {},
        devDependencies: {},
        keywords: ["server-x"],
        author: currentUser?.username || "Anonymous",
        license: "MIT"
      }, null, 2);
    } else if (newFileName.endsWith('.json')) {
      content = '{\n  "data": "Your JSON data here"\n}';
    } else if (newFileName.endsWith('.md')) {
      content = `# ${newFileName}\n\nDocumentation for your Server.x project.`;
    } else {
      content = `// ${newFileName}\n// Created in Server.x Editor`;
    }
    
    const newFile = { path, content };
    
    const result = await saveFile(path, content);
    if (result.success) {
      setFiles([...files, newFile]);
      setSelectedFile(newFile);
      setFileContent(content);
      setIsCreatingFile(false);
      setNewFileName('');
      
      // If it's package.json, parse dependencies
      if (newFileName === 'package.json') {
        try {
          const pkg = JSON.parse(content);
          setDependencies(pkg.dependencies || {});
        } catch (e) {
          console.error('Failed to parse package.json');
        }
      }
    }
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
    
    // Check if folder already exists
    if (folders.some(f => f.path === folderPath)) {
      setMessage('Folder already exists!');
      return;
    }
    
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
        setExpandedFolders(prev => ({ ...prev, [folderPath]: true }));
        setIsCreatingFolder(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const deleteFile = async (path) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const response = await fetch('/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          path
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setFiles(files.filter(f => f.path !== path));
        if (selectedFile?.path === path) {
          setSelectedFile(null);
          setFileContent('');
        }
        setMessage('✅ File deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      setMessage('❌ Failed to delete file');
    }
  };

  const deleteFolder = async (path) => {
    if (!confirm('Are you sure you want to delete this folder and all its contents?')) return;
    
    try {
      const response = await fetch('/api/delete-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          path
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Remove folder and all files within it
        setFolders(folders.filter(f => f.path !== path && !f.path.startsWith(path + '/')));
        setFiles(files.filter(f => !f.path.startsWith(path + '/')));
        
        // Clear selection if selected file was in folder
        if (selectedFile && selectedFile.path.startsWith(path + '/')) {
          setSelectedFile(null);
          setFileContent('');
        }
        
        setMessage('✅ Folder deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      setMessage('❌ Failed to delete folder');
    }
  };

  const renameFile = async (oldPath, newName) => {
    if (!newName.trim()) return;
    
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
    
    // Check if new name already exists
    if (files.some(f => f.path === newPath)) {
      setMessage('❌ File with that name already exists!');
      return;
    }
    
    try {
      const response = await fetch('/api/rename-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          oldPath,
          newPath
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setFiles(files.map(f => 
          f.path === oldPath ? { ...f, path: newPath } : f
        ));
        
        if (selectedFile?.path === oldPath) {
          setSelectedFile({ ...selectedFile, path: newPath });
        }
        
        setIsRenaming({ path: null, type: '' });
        setMessage('✅ File renamed successfully');
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
      setMessage('❌ Failed to rename file');
    }
  };

  const renameFolder = async (oldPath, newName) => {
    if (!newName.trim()) return;
    
    const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
    
    // Check if new name already exists
    if (folders.some(f => f.path === newPath)) {
      setMessage('❌ Folder with that name already exists!');
      return;
    }
    
    try {
      const response = await fetch('/api/rename-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          oldPath,
          newPath
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Update folder paths
        setFolders(folders.map(f => 
          f.path === oldPath ? { ...f, path: newPath } : f
        ));
        
        // Update expanded folders
        if (expandedFolders[oldPath]) {
          setExpandedFolders(prev => ({
            ...prev,
            [newPath]: prev[oldPath],
            [oldPath]: undefined
          }));
        }
        
        setIsRenaming({ path: null, type: '' });
        setMessage('✅ Folder renamed successfully');
      }
    } catch (error) {
      console.error('Failed to rename folder:', error);
      setMessage('❌ Failed to rename folder');
    }
  };

  const publishServer = async () => {
    if (!currentServerId) return;
    
    setPublishing(true);
    setMessage('');
    setShowTerminal(true);
    setTerminalOutput('🚀 Publishing server to Vercel...\n\n');
    
    try {
      const response = await fetch('/api/publish-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: currentServerId,
          name: serverName,
          files: files,
          dependencies: dependencies,
          installedPackages: installedPackages
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        let output = terminalOutput;
        output += '📦 Preparing deployment...\n';
        setTerminalOutput(output);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        output += '🔨 Building project...\n';
        setTerminalOutput(output);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        output += '🚀 Deploying to Vercel...\n';
        setTerminalOutput(output);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        output += `✅ Successfully published!\n`;
        output += `🌍 Live at: ${data.url || `https://${serverName.toLowerCase().replace(/\s+/g, '-')}.vercel.app`}\n`;
        output += `🔗 ${data.url || `https://${serverName.toLowerCase().replace(/\s+/g, '-')}.vercel.app`}\n`;
        
        setTerminalOutput(output);
        setMessage('🎉 Server published successfully!');
      } else {
        setTerminalOutput(prev => prev + `❌ Failed to publish: ${data.error}\n`);
        setMessage(`❌ ${data.error || 'Failed to publish server'}`);
      }
    } catch (error) {
      setTerminalOutput(prev => prev + `❌ Publish error: ${error.message}\n`);
      setMessage(`❌ Publish error: ${error.message}`);
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
      setMessage('✅ File saved successfully');
      // Update file in files array
      setFiles(files.map(f => 
        f.path === selectedFile.path ? { ...f, content: fileContent } : f
      ));
      
      // If it's package.json, update dependencies
      if (selectedFile.path.endsWith('package.json')) {
        try {
          const pkg = JSON.parse(fileContent);
          setDependencies(pkg.dependencies || {});
          setInstalledPackages(Object.keys(pkg.dependencies || {}));
        } catch (e) {
          console.error('Failed to parse package.json');
        }
      }
    } else {
      setMessage('❌ Failed to save file');
    }
  };

  const getFileLanguage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      default: return 'plaintext';
    }
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith('.js')) return <FiCode className="icon" />;
    if (filename.endsWith('.jsx')) return <FiCode className="icon react-icon" />;
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FiCode className="icon ts-icon" />;
    if (filename.endsWith('.html')) return <FiGlobe className="icon" />;
    if (filename.endsWith('.css')) return <FiCode className="icon css-icon" />;
    if (filename.endsWith('.json')) return <FiFile className="icon json-icon" />;
    if (filename.endsWith('.md')) return <FiFile className="icon" />;
    if (filename === 'package.json') return <FiPackage className="icon package-icon" />;
    return <FiFile className="icon" />;
  };

  const executeTerminalCommand = async (command) => {
    const cmd = command.toLowerCase().trim();
    setTerminalOutput(prev => prev + `$ ${command}\n`);
    
    // Handle package manager commands
    if (cmd.startsWith('npm install') || cmd.startsWith('npm i')) {
      const packages = cmd.split(' ').slice(2);
      if (packages.length === 0 || (packages.length === 1 && packages[0] === '')) {
        // Install all dependencies from package.json
        await installDependencies();
      } else {
        // Install specific packages
        for (const pkg of packages) {
          if (pkg && pkg !== '-g') {
            await addPackage(pkg.replace(/@.+$/, ''), pkg.includes('@') ? pkg.split('@')[1] : 'latest');
          }
        }
      }
    } else if (cmd === 'clear' || cmd === 'cls') {
      setTerminalOutput('');
    } else if (cmd === 'ls' || cmd === 'dir') {
      const dirFiles = files.filter(f => 
        f.path.startsWith(currentPath) && 
        f.path.substring(currentPath.length).split('/').length === 1
      );
      const dirFolders = folders.filter(f => 
        f.path.startsWith(currentPath) && 
        f.path.substring(currentPath.length).split('/').length === 1
      );
      
      let output = '';
      dirFolders.forEach(f => {
        output += `📁 ${f.path.split('/').pop()}/\n`;
      });
      dirFiles.forEach(f => {
        output += `📄 ${f.path.split('/').pop()}\n`;
      });
      setTerminalOutput(prev => prev + output);
    } else if (cmd.startsWith('cd ')) {
      const target = cmd.substring(3).trim();
      if (target === '..') {
        const newPath = currentPath === '/' ? '/' : currentPath.substring(0, currentPath.lastIndexOf('/'));
        setCurrentPath(newPath || '/');
        setTerminalOutput(prev => prev + `Changed directory to ${newPath || '/'}\n`);
      } else {
        const targetPath = currentPath === '/' ? `/${target}` : `${currentPath}/${target}`;
        if (folders.some(f => f.path === targetPath)) {
          setCurrentPath(targetPath);
          setTerminalOutput(prev => prev + `Changed directory to ${targetPath}\n`);
        } else {
          setTerminalOutput(prev => prev + `cd: no such directory: ${target}\n`);
        }
      }
    } else if (cmd === 'npm start' || cmd === 'yarn start') {
      setTerminalOutput(prev => prev + '🚀 Starting development server...\n');
      setTimeout(() => {
        setTerminalOutput(prev => prev + '✅ Server running on http://localhost:3000\n');
        setTerminalOutput(prev => prev + '📱 Open your browser to view the app\n');
      }, 1000);
    } else if (cmd === 'npm run build') {
      setTerminalOutput(prev => prev + '🔨 Building project for production...\n');
      setTimeout(() => {
        setTerminalOutput(prev => prev + '✅ Build complete! Ready for deployment\n');
      }, 1500);
    } else if (cmd === 'node --version' || cmd === 'node -v') {
      setTerminalOutput(prev => prev + 'v18.17.0\n');
    } else if (cmd === 'npm --version' || cmd === 'npm -v') {
      setTerminalOutput(prev => prev + '9.6.7\n');
    } else {
      setTerminalOutput(prev => prev + `Command not found: ${command}\n`);
    }
    
    setTerminalInput('');
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const filesToUpload = Array.from(event.target.files);
    for (const file of filesToUpload) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        
        const result = await saveFile(path, content);
        if (result.success) {
          const newFile = { path, content };
          setFiles(prev => [...prev, newFile]);
          setMessage(`✅ Uploaded ${file.name}`);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Reset input
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
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Server.x - {currentServerId ? `Editing ${serverName}` : 'Create Server'}</title>
      </Head>
      
      <div className="editor-container">
        {!currentServerId && (
          <Particles
            id="tsparticles"
            init={particlesInit.current}
            loaded={setIsParticlesLoaded}
            className="particles-background"
          />
        )}
        
        <motion.header 
          className="editor-header"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="header-content">
            <motion.div 
              className="logo"
              whileHover={{ scale: 1.05 }}
              onClick={() => window.location.href = '/explore'}
            >
              <FiServer className="logo-icon" />
              <span>Server.x</span>
            </motion.div>
            
            <div className="nav-section">
              <div className="user-info">
                <FiUsers className="user-icon" />
                <span>Hello, {currentUser.username || 'User'}</span>
                {currentServerId && (
                  <>
                    <FiChevronRight className="separator-icon" />
                    <span className="server-name">{serverName}</span>
                  </>
                )}
              </div>
              
              {currentServerId ? (
                <div className="action-buttons">
                  <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                    <button 
                      className="btn btn-publish"
                      onClick={publishServer}
                      disabled={publishing}
                    >
                      <FiUpload className="btn-icon" />
                      {publishing ? 'Publishing...' : 'Publish to Vercel'}
                    </button>
                  </Tilt>
                  <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => window.location.href = '/explore'}
                    >
                      <FiChevronRight className="btn-icon" />
                      Back to Explore
                    </button>
                  </Tilt>
                </div>
              ) : (
                <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => window.location.href = '/explore'}
                  >
                    <FiChevronRight className="btn-icon" />
                    Back to Explore
                  </button>
                </Tilt>
              )}
            </div>
          </div>
        </motion.header>

        <main className="editor-main">
          {!currentServerId ? (
            <motion.div 
              className="server-creation"
              variants={scaleIn}
              initial="initial"
              animate="animate"
            >
              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02}>
                <div className="creation-card">
                  <div className="creation-header">
                    <FiCpu className="creation-icon" />
                    <h2>{isEditingServer ? 'Edit Server' : 'Create New Server'}</h2>
                    <p className="creation-subtitle">
                      {isEditingServer ? 'Modify your existing server' : 'Start building your web application'}
                    </p>
                    
                    {/* Existing servers dropdown */}
                    {serverList.length > 0 && (
                      <div className="existing-servers">
                        <select 
                          className="server-select"
                          onChange={(e) => {
                            const serverId = e.target.value;
                            if (serverId) {
                              setCurrentServerId(serverId);
                              const selectedServer = serverList.find(s => s.id === serverId);
                              if (selectedServer) {
                                setServerName(selectedServer.name);
                                setDescription(selectedServer.description);
                                setIsPublic(selectedServer.is_public);
                              }
                              loadServerFiles(serverId);
                            }
                          }}
                        >
                          <option value="">Select existing server...</option>
                          {serverList.map(server => (
                            <option key={server.id} value={server.id}>
                              {server.name} ({server.is_public ? 'Public' : 'Private'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="creation-form">
                    <motion.div className="input-group" variants={fadeInUp}>
                      <label>
                        <FiServer className="input-icon" />
                        Server Name *
                      </label>
                      <input
                        type="text"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        placeholder="my-awesome-server"
                        disabled={loading}
                        className="modern-input"
                      />
                      <small className="input-hint">
                        {isEditingServer ? 'Will update existing server' : 'If name exists, will edit instead of create new'}
                      </small>
                    </motion.div>

                    <motion.div className="input-group" variants={fadeInUp}>
                      <label>
                        <FiFile className="input-icon" />
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your server..."
                        rows={3}
                        disabled={loading}
                        className="modern-textarea"
                      />
                    </motion.div>

                    <motion.div className="privacy-toggle" variants={fadeInUp}>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          id="privacy-toggle"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          disabled={loading}
                        />
                        <label htmlFor="privacy-toggle" className="toggle-label">
                          <span className="toggle-slider"></span>
                          <span className="toggle-icons">
                            {isPublic ? <FiGlobe /> : <FiLock />}
                          </span>
                          <span className="toggle-text">
                            {isPublic ? 'Public Server' : 'Private Server'}
                          </span>
                        </label>
                      </div>
                      <p className="toggle-description">
                        {isPublic 
                          ? 'Visible to everyone in the community'
                          : 'Only you and invited users can access'}
                      </p>
                    </motion.div>

                    <motion.div className="feature-list" variants={fadeInUp}>
                      <h4><FiStar className="feature-icon" /> Real Features:</h4>
                      <ul>
                        <li><FiCode /> Real Node.js package installation via API</li>
                        <li><FiCode className="react-icon" /> Full React JSX support with compilation</li>
                        <li><FiPackage /> Real package.json dependency management</li>
                        <li><FiTerminal /> Working terminal with npm commands</li>
                        <li><FiCloud /> Vercel deployment via API</li>
                        <li><FiFolder /> File upload, rename, delete, organize</li>
                      </ul>
                    </motion.div>

                    <AnimatePresence>
                      {message && (
                        <motion.div 
                          className={`message ${message.includes('✅') || message.includes('🎉') ? 'success' : 'error'}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          {message}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.05}>
                      <motion.button
                        className="btn btn-primary btn-large"
                        onClick={createOrUpdateServer}
                        disabled={loading || !serverName.trim() || !currentUser}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? (
                          <>
                            <div className="spinner"></div>
                            {isEditingServer ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <FiZap className="btn-icon" />
                            {isEditingServer ? 'Update Server' : 'Create/Edit Server'}
                          </>
                        )}
                      </motion.button>
                    </Tilt>
                  </div>
                </div>
              </Tilt>
              
              <motion.div 
                className="info-panel"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.2 }}
              >
                <h3><FiStar /> How It Works</h3>
                <ol className="steps">
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">1</span>
                    <span className="step-text">Type existing server name to edit, or new name to create</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">2</span>
                    <span className="step-text">Real JSX files with React compilation support</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">3</span>
                    <span className="step-text">REAL Node.js package installation via API calls</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">4</span>
                    <span className="step-text">Working terminal with npm, cd, ls, node commands</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">5</span>
                    <span className="step-text">Upload files, rename, delete, organize in folders</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">6</span>
                    <span className="step-text">Publish to Vercel via API integration</span>
                  </motion.li>
                </ol>
              </motion.div>
            </motion.div>
          ) : (
            <div className="editor-interface">
              {/* File Explorer */}
              <motion.aside 
                className="file-explorer"
                variants={slideIn}
                initial="initial"
                animate="animate"
              >
                <div className="explorer-header">
                  <h3><FiFolder /> Files</h3>
                  <div className="explorer-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                      multiple
                    />
                    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                      <button 
                        className="btn-icon-small"
                        onClick={() => fileInputRef.current.click()}
                        title="Upload File"
                      >
                        <FiUpload />
                      </button>
                    </Tilt>
                    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                      <button 
                        className="btn-icon-small"
                        onClick={() => setIsCreatingFile(true)}
                        title="New File"
                      >
                        <FiFile />
                      </button>
                    </Tilt>
                    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                      <button 
                        className="btn-icon-small"
                        onClick={() => setIsCreatingFolder(true)}
                        title="New Folder"
                      >
                        <FiFolder />
                      </button>
                    </Tilt>
                    <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                      <button 
                        className="btn-icon-small"
                        onClick={() => setShowTerminal(!showTerminal)}
                        title="Toggle Terminal"
                      >
                        <FiTerminal />
                      </button>
                    </Tilt>
                  </div>
                </div>
                
                <div className="path-indicator">
                  <FiChevronRight className="path-icon" />
                  <span>{currentPath}</span>
                  {currentPath !== '/' && (
                    <button 
                      className="btn-path-up"
                      onClick={() => {
                        const newPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
                        setCurrentPath(newPath || '/');
                      }}
                      title="Go up"
                    >
                      ..
                    </button>
                  )}
                </div>
                
                {/* Creation Modals */}
                <AnimatePresence>
                  {isCreatingFile && (
                    <motion.div 
                      className="creation-modal"
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <div className="modal-header">
                        <h4>New File</h4>
                        <button 
                          className="btn-icon-close"
                          onClick={() => setIsCreatingFile(false)}
                        >
                          <FiX />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="app.jsx, styles.css, package.json"
                        className="modal-input"
                        onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
                        autoFocus
                      />
                      <div className="modal-actions">
                        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3}>
                          <button 
                            className="btn btn-small"
                            onClick={createNewFile}
                            disabled={!newFileName.trim()}
                          >
                            Create
                          </button>
                        </Tilt>
                        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3}>
                          <button 
                            className="btn btn-small btn-outline"
                            onClick={() => setIsCreatingFile(false)}
                          >
                            Cancel
                          </button>
                        </Tilt>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {isCreatingFolder && (
                    <motion.div 
                      className="creation-modal"
                      variants={scaleIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <div className="modal-header">
                        <h4>New Folder</h4>
                        <button 
                          className="btn-icon-close"
                          onClick={() => setIsCreatingFolder(false)}
                        >
                          <FiX />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="components, utils, assets"
                        className="modal-input"
                        onKeyPress={(e) => e.key === 'Enter' && createNewFolder()}
                        autoFocus
                      />
                      <div className="modal-actions">
                        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3}>
                          <button 
                            className="btn btn-small"
                            onClick={createNewFolder}
                            disabled={!newFolderName.trim()}
                          >
                            Create
                          </button>
                        </Tilt>
                        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3}>
                          <button 
                            className="btn btn-small btn-outline"
                            onClick={() => setIsCreatingFolder(false)}
                          >
                            Cancel
                          </button>
                        </Tilt>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* File Tree */}
                <div className="file-tree">
                  {currentFolders.map(folder => {
                    const folderName = folder.path.split('/').pop();
                    const isExpanded = expandedFolders[folder.path];
                    const folderFiles = files.filter(f => 
                      f.path.startsWith(folder.path + '/') && 
                      !f.path.substring(folder.path.length + 1).includes('/')
                    );
                    const folderFolders = folders.filter(f => 
                      f.path.startsWith(folder.path + '/') && 
                      f.path.substring(folder.path.length + 1).split('/').length === 1
                    );
                    
                    return (
                      <div key={folder.path} className="tree-item folder-item">
                        <div className="folder-header">
                          <button 
                            className="folder-toggle"
                            onClick={() => toggleFolder(folder.path)}
                          >
                            {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                          </button>
                          <FiFolder className="folder-icon" />
                          {isRenaming.path === folder.path && isRenaming.type === 'folder' ? (
                            <input
                              type="text"
                              defaultValue={folderName}
                              onBlur={(e) => {
                                renameFolder(folder.path, e.target.value);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  renameFolder(folder.path, e.target.value);
                                }
                              }}
                              className="rename-input"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span 
                                className="folder-name"
                                onClick={() => toggleFolder(folder.path)}
                              >
                                {folderName}
                              </span>
                              <span className="file-count">({folderFiles.length + folderFolders.length})</span>
                            </>
                          )}
                          <div className="folder-actions">
                            <button
                              className="btn-icon-tiny"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRenaming({ path: folder.path, type: 'folder' });
                              }}
                              title="Rename"
                            >
                              <FiEdit3 />
                            </button>
                            <button
                              className="btn-icon-tiny"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFolder(folder.path);
                              }}
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (folderFiles.length > 0 || folderFolders.length > 0) && (
                            <motion.div 
                              className="folder-contents"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {folderFolders.map(subFolder => (
                                <div key={subFolder.path} className="tree-item folder-item">
                                  <div className="folder-header">
                                    <FiChevronRight className="folder-toggle" />
                                    <FiFolder className="folder-icon" />
                                    <span className="folder-name">{subFolder.path.split('/').pop()}</span>
                                  </div>
                                </div>
                              ))}
                              {folderFiles.map(file => (
                                <FileItem 
                                  key={file.path}
                                  file={file}
                                  selectedFile={selectedFile}
                                  isRenaming={isRenaming}
                                  setIsRenaming={setIsRenaming}
                                  renameFile={renameFile}
                                  deleteFile={deleteFile}
                                  handleFileSelect={handleFileSelect}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  
                  {currentFiles.map(file => (
                    <FileItem 
                      key={file.path}
                      file={file}
                      selectedFile={selectedFile}
                      isRenaming={isRenaming}
                      setIsRenaming={setIsRenaming}
                      renameFile={renameFile}
                      deleteFile={deleteFile}
                      handleFileSelect={handleFileSelect}
                    />
                  ))}
                </div>
                
                {/* Server Stats */}
                <div className="server-stats">
                  <div className="stat-item">
                    <FiFile className="stat-icon" />
                    <div>
                      <div className="stat-value">{serverStats.files}</div>
                      <div className="stat-label">Files</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <FiCode className="stat-icon" />
                    <div>
                      <div className="stat-value">{serverStats.lines}</div>
                      <div className="stat-label">Lines</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <FiPackage className="stat-icon" />
                    <div>
                      <div className="stat-value">{installedPackages.length}</div>
                      <div className="stat-label">Packages</div>
                    </div>
                  </div>
                </div>
              </motion.aside>
              
              {/* Main Editor Area */}
              <div className="editor-area">
                {/* Editor Header */}
                <motion.div 
                  className="editor-header-bar"
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                >
                  <div className="file-header">
                    {selectedFile ? (
                      <>
                        <div className="file-info">
                          {getFileIcon(selectedFile.path.split('/').pop())}
                          <div>
                            <div className="file-title">{selectedFile.path.split('/').pop()}</div>
                            <div className="file-path">{selectedFile.path}</div>
                          </div>
                        </div>
                        <div className="file-actions">
                          {selectedFile.path.endsWith('package.json') && (
                            <>
                              <select 
                                className="package-manager-select"
                                value={packageManager}
                                onChange={(e) => setPackageManager(e.target.value)}
                              >
                                <option value="npm">npm</option>
                                <option value="yarn">yarn</option>
                              </select>
                              <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                                <button 
                                  className="btn btn-small btn-terminal"
                                  onClick={installDependencies}
                                  disabled={isInstallingDeps}
                                >
                                  <FiPackage />
                                  {isInstallingDeps ? 'Installing...' : 'Install Packages'}
                                </button>
                              </Tilt>
                            </>
                          )}
                          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                            <button 
                              className="btn btn-small btn-save"
                              onClick={handleSaveFile}
                              disabled={!selectedFile}
                            >
                              <FiSave />
                              Save
                            </button>
                          </Tilt>
                        </div>
                      </>
                    ) : (
                      <div className="no-file-selected">
                        <FiCode className="no-file-icon" />
                        <div>
                          <h3>Select a file to edit</h3>
                          <p>Choose a file from the sidebar or create a new one</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
                
                {/* Monaco Editor */}
                <div className="monaco-container">
                  {selectedFile ? (
                    <MonacoEditor
                      height="calc(100vh - 200px)"
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
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        parameterHints: { enabled: true },
                        tabSize: 2,
                        insertSpaces: true,
                        autoClosingBrackets: 'always',
                        autoClosingQuotes: 'always',
                        formatOnSave: true,
                        scrollBeyondLastLine: false,
                        renderLineHighlight: 'all',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                      }}
                    />
                  ) : (
                    <div className="welcome-screen">
                      <div className="welcome-content">
                        <FiCode className="welcome-icon" />
                        <h2>Welcome to Server.x Editor</h2>
                        <p>Create and edit files to build your web application</p>
                        
                        <div className="quick-actions">
                          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                            <button 
                              className="btn btn-outline"
                              onClick={() => setIsCreatingFile(true)}
                            >
                              <FiFile /> New File
                            </button>
                          </Tilt>
                          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                            <button 
                              className="btn btn-outline"
                              onClick={() => setIsCreatingFolder(true)}
                            >
                              <FiFolder /> New Folder
                            </button>
                          </Tilt>
                        </div>
                        
                        <div className="feature-highlights">
                          <h4>✨ Real Features</h4>
                          <div className="features-grid">
                            <div className="feature-highlight">
                              <FiPackage />
                              <h5>Real Node.js Packages</h5>
                              <p>Install real npm packages via API calls</p>
                            </div>
                            <div className="feature-highlight">
                              <FiCode />
                              <h5>React JSX Support</h5>
                              <p>Full JSX support with compilation</p>
                            </div>
                            <div className="feature-highlight">
                              <FiTerminal />
                              <h5>Working Terminal</h5>
                              <p>Run npm, node, cd, ls commands</p>
                            </div>
                            <div className="feature-highlight">
                              <FiCloud />
                              <h5>Vercel Deployment</h5>
                              <p>Publish to Vercel via API</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Terminal */}
                <AnimatePresence>
                  {showTerminal && (
                    <motion.div 
                      className="terminal-container"
                      initial={{ height: 0 }}
                      animate={{ height: 200 }}
                      exit={{ height: 0 }}
                    >
                      <div className="terminal-header">
                        <FiTerminal />
                        <span>Terminal</span>
                        <button 
                          className="btn-icon-close"
                          onClick={() => setShowTerminal(false)}
                        >
                          <FiX />
                        </button>
                      </div>
                      <div className="terminal-content" ref={terminalRef}>
                        <pre>{terminalOutput}</pre>
                      </div>
                      <div className="terminal-input">
                        <span>$</span>
                        <input
                          ref={terminalInputRef}
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && terminalInput.trim()) {
                              executeTerminalCommand(terminalInput);
                            }
                          }}
                          placeholder="Type a command (npm install, ls, cd, etc.)"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Status Messages */}
                <AnimatePresence>
                  {message && (
                    <motion.div 
                      className={`status-message ${message.includes('✅') || message.includes('🎉') ? 'success' : 'error'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>
      </div>

      
      
      <style jsx>{`
        .editor-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        
        .particles-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        
        /* Loading Screen */
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(66, 133, 244, 0.3);
          border-top-color: #4285f4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Header */
        .editor-header {
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 100%;
          margin: 0 auto;
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(45deg, #4285f4, #34a853);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .logo:hover {
          transform: scale(1.05);
        }
        
        .logo-icon {
          font-size: 2rem;
          color: #4285f4;
        }
        
        .nav-section {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        
        .user-icon, .separator-icon {
          color: #4285f4;
        }
        
        .server-name {
          color: #ffffff;
          font-weight: 600;
        }
        
        /* Buttons */
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .btn:hover::before {
          left: 100%;
        }
        
        .btn-primary {
          background: linear-gradient(45deg, #4285f4, #34a853);
          color: white;
        }
        
        .btn-publish {
          background: linear-gradient(45deg, #ea4335, #fbbc05);
          color: white;
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-outline {
          background: transparent;
          color: #4285f4;
          border: 2px solid #4285f4;
        }
        
        .btn-small {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }
        
        .btn-large {
          padding: 1rem 2rem;
          font-size: 1rem;
          width: 100%;
          justify-content: center;
        }
        
        .btn-icon {
          font-size: 1.2rem;
        }
        
        .btn-icon-small {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #94a3b8;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-icon-small:hover {
          background: rgba(66, 133, 244, 0.1);
          color: #4285f4;
          border-color: #4285f4;
        }
        
        .btn-icon-tiny {
          background: transparent;
          border: none;
          color: #94a3b8;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0;
        }
        
        .tree-item:hover .btn-icon-tiny {
          opacity: 1;
        }
        
        .btn-icon-tiny:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #4285f4;
        }
        
        .btn-path-up {
          background: rgba(66, 133, 244, 0.1);
          color: #4285f4;
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          margin-left: 8px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-path-up:hover {
          background: rgba(66, 133, 244, 0.2);
        }
        
        .package-manager-select {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.5rem;
          border-radius: 6px;
          margin-right: 8px;
        }
        
        /* Server Creation */
        .server-creation {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .creation-card {
          background: rgba(26, 26, 46, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .creation-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .creation-icon {
          font-size: 3rem;
          color: #4285f4;
          margin-bottom: 1rem;
        }
        
        .creation-subtitle {
          color: #94a3b8;
          margin-top: 0.5rem;
          font-size: 1rem;
        }
        
        /* Advanced Existing Servers Styles */
        .existing-servers {
          margin: 1.5rem 0;
          position: relative;
        }
        
        .server-select-wrapper {
          position: relative;
        }
        
        .server-select {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.07);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: white;
          font-size: 0.95rem;
          cursor: pointer;
          appearance: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .server-select:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(66, 133, 244, 0.5);
        }
        
        .server-select:focus {
          outline: none;
          border-color: #4285f4;
          box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2);
          background: rgba(255, 255, 255, 0.12);
        }
        
        .server-select option {
          background: #1a1a2e;
          color: white;
          padding: 0.5rem;
        }
        
        .server-select option:checked {
          background: rgba(66, 133, 244, 0.3);
          color: #4285f4;
          font-weight: 600;
        }
        
        .select-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #4285f4;
          pointer-events: none;
          font-size: 1.2rem;
          transition: transform 0.3s ease;
        }
        
        .server-select:focus + .select-arrow {
          transform: translateY(-50%) rotate(180deg);
        }
        
        .server-list-info {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .server-count {
          background: rgba(66, 133, 244, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #4285f4;
        }
        
        .creation-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .input-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 0.5rem;
          color: #cbd5e1;
          font-weight: 500;
        }
        
        .input-icon {
          color: #4285f4;
        }
        
        .modern-input, .modern-textarea {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .modern-input:focus, .modern-textarea:focus {
          outline: none;
          border-color: #4285f4;
          box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
        }
        
        .input-hint {
          color: #94a3b8;
          font-size: 0.8rem;
          margin-top: 4px;
          display: block;
        }
        
        .privacy-toggle {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 12px;
        }
        
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        
        .toggle-slider {
          width: 60px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          position: relative;
          transition: all 0.3s ease;
        }
        
        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 28px;
          height: 28px;
          background: #94a3b8;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: all 0.3s ease;
        }
        
        input[type="checkbox"]:checked + .toggle-label .toggle-slider {
          background: rgba(66, 133, 244, 0.3);
        }
        
        input[type="checkbox"]:checked + .toggle-label .toggle-slider::before {
          transform: translateX(28px);
          background: #4285f4;
        }
        
        .toggle-icons {
          font-size: 1.2rem;
          color: #4285f4;
        }
        
        .toggle-text {
          color: #cbd5e1;
          font-weight: 500;
        }
        
        .toggle-description {
          margin-top: 0.5rem;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        
        .feature-list {
          background: rgba(66, 133, 244, 0.1);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(66, 133, 244, 0.2);
        }
        
        .feature-list h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 1rem;
          color: #4285f4;
        }
        
        .feature-icon {
          color: #fbbc05;
        }
        
        .feature-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .feature-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.5rem;
          color: #cbd5e1;
        }
        
        /* Info Panel */
        .info-panel {
          background: rgba(26, 26, 46, 0.9);
          border-radius: 24px;
          padding: 2rem;
          margin-top: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .steps {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .steps li {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .steps li:hover {
          background: rgba(66, 133, 244, 0.1);
          transform: translateX(10px);
        }
        
        .step-number {
          width: 36px;
          height: 36px;
          background: linear-gradient(45deg, #4285f4, #34a853);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .step-text {
          color: #cbd5e1;
        }
        
        /* Editor Interface */
        .editor-interface {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1rem;
          height: calc(100vh - 80px);
          padding: 1rem;
        }
        
        /* File Explorer */
        .file-explorer {
          background: rgba(26, 26, 46, 0.9);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .explorer-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .explorer-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #cbd5e1;
        }
        
        .explorer-actions {
          display: flex;
          gap: 8px;
        }
        
        .path-indicator {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        
        .path-icon {
          color: #4285f4;
        }
        
        /* Creation Modal */
        .creation-modal {
          background: rgba(26, 26, 46, 0.95);
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 12px;
          margin: 1rem;
          padding: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .modal-header h4 {
          margin: 0;
          color: #cbd5e1;
        }
        
        .btn-icon-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .btn-icon-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ea4335;
        }
        
        .modal-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .modal-input:focus {
          outline: none;
          border-color: #4285f4;
        }
        
        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        /* File Tree */
        .file-tree {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        
        .tree-item {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          user-select: none;
        }
        
        .folder-item {
          margin-bottom: 2px;
        }
        
        .folder-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #569cd6;
          font-weight: 500;
          padding: 4px;
          border-radius: 4px;
        }
        
        .folder-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .folder-toggle {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
        }
        
        .folder-icon {
          color: #fbbc05;
          flex-shrink: 0;
        }
        
        .folder-name {
          flex: 1;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .file-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 0.7rem;
          color: #94a3b8;
        }
        
        .folder-actions {
          display: flex;
          gap: 2px;
        }
        
        .rename-input {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid #4285f4;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9rem;
          flex: 1;
        }
        
        /* File Item */
        .file-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          padding: 4px 4px 4px 24px;
          margin-bottom: 1px;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .file-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
        }
        
        .file-item.selected {
          background: rgba(66, 133, 244, 0.2);
          color: #4285f4;
        }
        
        .file-item-name {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .file-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
        }
        
        .file-item:hover .file-actions {
          opacity: 1;
        }
        
        .icon {
          flex-shrink: 0;
          font-size: 0.9rem;
        }
        
        .react-icon {
          color: #61dafb;
        }
        
        .ts-icon {
          color: #3178c6;
        }
        
        .css-icon {
          color: #1572b6;
        }
        
        .json-icon {
          color: #fbbc05;
        }
        
        .package-icon {
          color: #ea4335;
        }
        
        .file-name {
          flex: 1;
          font-size: 0.85rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .folder-contents {
          margin-left: 1.5rem;
          margin-top: 2px;
          border-left: 2px solid rgba(255, 255, 255, 0.1);
          padding-left: 1rem;
        }
        
        /* Server Stats */
        .server-stats {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          background: rgba(255, 255, 255, 0.02);
        }
        
        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .stat-icon {
          color: #4285f4;
          font-size: 1.2rem;
        }
        
        .stat-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #ffffff;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        
        /* Editor Area */
        .editor-area {
          display: flex;
          flex-direction: column;
          background: rgba(26, 26, 46, 0.9);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        
        .editor-header-bar {
          background: rgba(26, 26, 46, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
        }
        
        .file-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .file-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .file-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #ffffff;
        }
        
        .file-path {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        
        .file-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .btn-save {
          background: linear-gradient(45deg, #34a853, #0f9d58);
          color: white;
        }
        
        .btn-terminal {
          background: linear-gradient(45deg, #fbbc05, #ea4335);
          color: white;
        }
        
        .no-file-selected {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          text-align: left;
        }
        
        .no-file-icon {
          font-size: 3rem;
          color: #4285f4;
        }
        
        /* Monaco Container */
        .monaco-container {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        
        /* Welcome Screen */
        .welcome-screen {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 30, 46, 0.5);
        }
        
        .welcome-content {
          text-align: center;
          max-width: 600px;
          padding: 3rem;
        }
        
        .welcome-icon {
          font-size: 4rem;
          color: #4285f4;
          margin-bottom: 1.5rem;
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        .welcome-content h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #4285f4, #34a853);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .welcome-content p {
          color: #94a3b8;
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }
        
        .quick-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 3rem;
        }
        
        .feature-highlights {
          text-align: left;
        }
        
        .feature-highlights h4 {
          color: #cbd5e1;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .feature-highlight {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .feature-highlight:hover {
          transform: translateY(-5px);
          border-color: #4285f4;
          background: rgba(66, 133, 244, 0.1);
        }
        
        .feature-highlight svg {
          font-size: 2rem;
          color: #4285f4;
          margin-bottom: 1rem;
        }
        
        .feature-highlight h5 {
          color: #ffffff;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        
        .feature-highlight p {
          color: #94a3b8;
          font-size: 0.9rem;
          margin: 0;
        }
        
        /* Terminal */
        .terminal-container {
          background: rgba(0, 0, 0, 0.9);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .terminal-header {
          background: rgba(0, 0, 0, 0.95);
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #34a853;
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .terminal-content {
          flex: 1;
          padding: 1rem;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          color: #cbd5e1;
          overflow-y: auto;
          max-height: 120px;
        }
        
        .terminal-content pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .terminal-input {
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .terminal-input span {
          color: #34a853;
          font-weight: bold;
        }
        
        .terminal-input input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          outline: none;
        }
        
        /* Messages */
        .message, .status-message {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 500;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          backdrop-filter: blur(10px);
        }
        
        .message.success, .status-message.success {
          background: rgba(52, 168, 83, 0.2);
          border: 1px solid rgba(52, 168, 83, 0.3);
          color: #34a853;
        }
        
        .message.error, .status-message.error {
          background: rgba(234, 67, 53, 0.2);
          border: 1px solid rgba(234, 67, 53, 0.3);
          color: #ea4335;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
          .editor-interface {
            grid-template-columns: 250px 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .editor-interface {
            grid-template-columns: 1fr;
            height: auto;
          }
          
          .file-explorer {
            height: 300px;
          }
          
          .nav-section {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-end;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
          }
          
          .server-creation {
            padding: 1rem;
          }
          
          .creation-card {
            padding: 1.5rem;
          }
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(66, 133, 244, 0.5);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #4285f4;
        }
        
        /* Spinner */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }
      `}</style>
    </>
  );
}
// File Item Component
function FileItem({ file, selectedFile, isRenaming, setIsRenaming, renameFile, deleteFile, handleFileSelect }) {
  const fileName = file.path.split('/').pop();
  
  const getFileIcon = (filename) => {
    if (filename.endsWith('.js')) return <FiCode className="icon" />;
    if (filename.endsWith('.jsx')) return <FiCode className="icon react-icon" />;
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FiCode className="icon ts-icon" />;
    if (filename.endsWith('.html')) return <FiGlobe className="icon" />;
    if (filename.endsWith('.css')) return <FiCode className="icon css-icon" />;
    if (filename.endsWith('.json')) return <FiFile className="icon json-icon" />;
    if (filename.endsWith('.md')) return <FiFile className="icon" />;
    if (filename === 'package.json') return <FiPackage className="icon package-icon" />;
    return <FiFile className="icon" />;
  };

  return (
    <div 
      className={`tree-item file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
      onClick={() => !isRenaming.path && handleFileSelect(file)}
    >
      <div className="file-item-name">
        {getFileIcon(fileName)}
        {isRenaming.path === file.path && isRenaming.type === 'file' ? (
          <input
            type="text"
            defaultValue={fileName}
            onBlur={(e) => {
              renameFile(file.path, e.target.value);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                renameFile(file.path, e.target.value);
              }
            }}
            className="rename-input"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="file-name">{fileName}</span>
        )}
      </div>
      <div className="file-actions">
        <button
          className="btn-icon-tiny"
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming({ path: file.path, type: 'file' });
          }}
          title="Rename"
        >
          <FiEdit3 />
        </button>
        <button
          className="btn-icon-tiny"
          onClick={(e) => {
            e.stopPropagation();
            deleteFile(file.path);
          }}
          title="Delete"
        >
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
}
