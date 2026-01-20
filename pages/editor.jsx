'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { 
  FiFile, FiFolder, FiSave, FiGlobe, FiCode, FiTerminal,
  FiPackage, FiServer, FiUsers, FiLock, FiUnlock, FiUpload,
  FiChevronRight, FiChevronDown, FiTrash2, FiEdit3, FiPlay,
  FiZap, FiStar, FiGitBranch, FiCloud, FiCpu
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
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [dependencies, setDependencies] = useState({});
  const [isInstallingDeps, setIsInstallingDeps] = useState(false);
  const [serverStats, setServerStats] = useState({
    files: 0,
    lines: 0,
    size: '0 KB'
  });

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

  // Update server stats when files change
  useEffect(() => {
    if (files.length > 0) {
      const totalLines = files.reduce((acc, file) => {
        return acc + (file.content?.split('\n').length || 0);
      }, 0);
      
      const totalSize = files.reduce((acc, file) => {
        return acc + (file.content?.length || 0);
      }, 0);
      
      setServerStats({
        files: files.length,
        lines: totalLines,
        size: formatBytes(totalSize)
      });
    }
  }, [files]);

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
      { 
        path: '/index.html', 
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${serverName} | Server.x</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <header class="hero">
            <h1>🚀 Welcome to ${serverName}</h1>
            <p class="subtitle">Powered by Server.x</p>
            <div class="stats">
                <div class="stat">
                    <i class="fas fa-code"></i>
                    <span>Built with modern web tech</span>
                </div>
                <div class="stat">
                    <i class="fas fa-bolt"></i>
                    <span>Fast & reliable hosting</span>
                </div>
                <div class="stat">
                    <i class="fas fa-shield-alt"></i>
                    <span>Secure by design</span>
                </div>
            </div>
        </header>
        
        <main>
            <section class="features">
                <h2><i class="fas fa-star"></i> Features</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <i class="fas fa-code"></i>
                        <h3>Full Stack Ready</h3>
                        <p>Support for Node.js, React, Vue, and more</p>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-cloud"></i>
                        <h3>Cloud Hosted</h3>
                        <p>Automatic deployment to the cloud</p>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-tools"></i>
                        <h3>Powerful Editor</h3>
                        <p>VS Code-like editing experience</p>
                    </div>
                </div>
            </section>
            
            <section class="cta">
                <h2>Ready to build something amazing?</h2>
                <p>Start editing your files in the Server.x editor</p>
                <button class="btn-primary" onclick="alert('Edit in Server.x Editor!')">
                    <i class="fas fa-edit"></i> Edit Now
                </button>
            </section>
        </main>
        
        <footer>
            <p>Made with ❤️ using Server.x • © ${new Date().getFullYear()}</p>
        </footer>
    </div>
    
    <script src="app.js"></script>
</body>
</html>` 
      },
      { 
        path: '/styles.css', 
        content: `/* Modern CSS for ${serverName} */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
    --primary: #4285f4;
    --secondary: #34a853;
    --accent: #ea4335;
    --dark: #1a1a2e;
    --light: #f8f9fa;
    --gray: #6c757d;
    --card-bg: #ffffff;
    --shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    --radius: 16px;
    --transition: all 0.3s ease;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.hero {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    margin-bottom: 3rem;
    position: relative;
    overflow: hidden;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, var(--primary), var(--secondary));
}

.hero h1 {
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--dark);
    margin-bottom: 1rem;
    background: linear-gradient(to right, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.subtitle {
    font-size: 1.2rem;
    color: var(--gray);
    margin-bottom: 2rem;
}

.stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
    margin-top: 3rem;
    flex-wrap: wrap;
}

.stat {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: var(--light);
    border-radius: 50px;
    transition: var(--transition);
}

.stat:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow);
}

.stat i {
    font-size: 1.5rem;
    color: var(--primary);
}

.features {
    margin-bottom: 4rem;
}

.features h2 {
    font-size: 2.5rem;
    color: white;
    margin-bottom: 2rem;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.feature-card {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    text-align: center;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(to right, var(--accent), var(--secondary));
}

.feature-card:hover {
    transform: translateY(-10px);
}

.feature-card i {
    font-size: 3rem;
    color: var(--primary);
    margin-bottom: 1rem;
}

.feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--dark);
}

.feature-card p {
    color: var(--gray);
}

.cta {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    margin-bottom: 3rem;
}

.cta h2 {
    font-size: 2.5rem;
    color: var(--dark);
    margin-bottom: 1rem;
}

.cta p {
    font-size: 1.2rem;
    color: var(--gray);
    margin-bottom: 2rem;
}

.btn-primary {
    background: linear-gradient(to right, var(--primary), var(--secondary));
    color: white;
    border: none;
    padding: 1rem 3rem;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: var(--transition);
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
}

.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(66, 133, 244, 0.3);
}

.btn-primary i {
    font-size: 1.2rem;
}

footer {
    text-align: center;
    padding: 2rem;
    color: white;
    font-size: 0.9rem;
}

footer p {
    opacity: 0.8;
}

@media (max-width: 768px) {
    .hero h1 {
        font-size: 2.5rem;
    }
    
    .stats {
        flex-direction: column;
        align-items: center;
    }
    
    .features-grid {
        grid-template-columns: 1fr;
    }
}` 
      },
      { 
        path: '/app.js', 
        content: `// ${serverName} - Main Application Script
console.log('🚀 Server.x application loaded successfully!');

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });

    // Add animation classes
    const style = document.createElement('style');
    style.textContent = \`
        .feature-card {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.6s ease;
        }
        
        .feature-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .stat {
            transition: all 0.3s ease;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .hero h1 {
            animation: float 6s ease-in-out infinite;
        }
    \`;
    document.head.appendChild(style);

    // Interactive stats
    const stats = document.querySelectorAll('.stat');
    stats.forEach(stat => {
        stat.addEventListener('mouseenter', () => {
            stat.style.transform = 'scale(1.05)';
            stat.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
        });
        
        stat.addEventListener('mouseleave', () => {
            stat.style.transform = 'scale(1)';
            stat.style.boxShadow = 'none';
        });
    });

    // Performance monitoring
    let perfStart = performance.now();
    window.addEventListener('load', () => {
        let perfEnd = performance.now();
        console.log(\`📊 Page loaded in \${(perfEnd - perfStart).toFixed(2)}ms\`);
        
        // Log feature usage
        console.log('🔧 Features detected:', {
            cards: document.querySelectorAll('.feature-card').length,
            stats: document.querySelectorAll('.stat').length,
            interactive: true
        });
    });

    // Add real-time clock in console
    function updateConsoleClock() {
        const now = new Date();
        console.clear();
        console.log(\`🕒 \${now.toLocaleTimeString()} - ${serverName} is running\`);
        console.log('📁 Edit files in Server.x Editor to customize');
    }
    
    // Update clock every minute
    setInterval(updateConsoleClock, 60000);
    updateConsoleClock();
});

// Export module for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        appName: '${serverName}',
        platform: 'Server.x'
    };
}` 
      },
      {
        path: '/package.json',
        content: JSON.stringify({
          name: serverName.toLowerCase().replace(/\s+/g, '-'),
          version: "1.0.0",
          description: description || "A modern web application built with Server.x",
          main: "app.js",
          scripts: {
            "start": "node app.js",
            "dev": "node --watch app.js",
            "build": "echo 'Build process started'",
            "test": "echo 'No tests specified'",
            "lint": "echo 'Linting...'"
          },
          dependencies: {
            "express": "^4.18.2",
            "cors": "^2.8.5",
            "dotenv": "^16.3.1"
          },
          devDependencies: {
            "nodemon": "^3.0.1"
          },
          keywords: ["server", "web", "application", "nodejs"],
          author: currentUser?.username || "Anonymous",
          license: "MIT",
          engines: {
            "node": ">=18.0.0"
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
    } catch (e) {
      console.error('Failed to parse default package.json');
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
    }
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    
    const path = currentPath === '/' ? `/${newFileName}` : `${currentPath}/${newFileName}`;
    
    // Set default content based on file type
    let content = '';
    if (newFileName.endsWith('.js')) {
      content = `// ${newFileName}\nconsole.log('Hello from Server.x!');`;
    } else if (newFileName.endsWith('.jsx')) {
      content = `import React from 'react';\n\nconst ${newFileName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')} = () => {\n  return (\n    <div>\n      <h1>${newFileName}</h1>\n      <p>Edit this component</p>\n    </div>\n  );\n};\n\nexport default ${newFileName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')};`;
    } else if (newFileName.endsWith('.css')) {
      content = `/* ${newFileName} */\n\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n}`;
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

  const publishServer = async () => {
    setPublishing(true);
    setMessage('');
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
        setMessage('🎉 Server published successfully!');
      } else {
        setMessage(`❌ ${data.error || 'Failed to publish server'}`);
      }
    } catch (error) {
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
        } catch (e) {
          console.error('Failed to parse package.json');
        }
      }
    } else {
      setMessage('❌ Failed to save file');
    }
  };

  const getFileLanguage = (filename) => {
    if (filename.endsWith('.js')) return 'javascript';
    if (filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts')) return 'typescript';
    if (filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    return 'plaintext';
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

  const installDependencies = async () => {
    setIsInstallingDeps(true);
    setTerminalOutput('📦 Installing dependencies...\n');
    
    // Simulate installation process
    setTimeout(() => {
      setTerminalOutput(prev => prev + '✅ Package.json found\n');
      setTimeout(() => {
        setTerminalOutput(prev => prev + '📥 Downloading packages...\n');
        setTimeout(() => {
          setTerminalOutput(prev => prev + '🚀 Dependencies installed successfully!\n');
          setTimeout(() => {
            setTerminalOutput(prev => prev + '✨ Ready to build your project!\n');
            setIsInstallingDeps(false);
          }, 500);
        }, 1500);
      }, 1000);
    }, 500);
    
    setShowTerminal(true);
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
                      {publishing ? 'Publishing...' : 'Publish Server'}
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
                    <h2>Create New Server</h2>
                    <p className="creation-subtitle">Start building your web application</p>
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
                      <h4><FiStar className="feature-icon" /> Included Features:</h4>
                      <ul>
                        <li><FiCode /> Full Node.js support with package.json</li>
                        <li><FiGlobe /> Modern HTML/CSS/JS templates</li>
                        <li><FiPackage /> Built-in dependency management</li>
                        <li><FiTerminal /> Terminal simulation</li>
                        <li><FiCloud /> One-click deployment</li>
                      </ul>
                    </motion.div>

                    <AnimatePresence>
                      {message && (
                        <motion.div 
                          className={`message ${message.includes('✅') ? 'success' : 'error'}`}
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
                        onClick={createServer}
                        disabled={loading || !serverName.trim() || !currentUser}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? (
                          <>
                            <div className="spinner"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <FiZap className="btn-icon" />
                            Create Server & Launch Editor
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
                    <span className="step-text">Create your server with name & description</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">2</span>
                    <span className="step-text">Use the powerful editor with Node.js & React support</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">3</span>
                    <span className="step-text">Manage dependencies via package.json</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">4</span>
                    <span className="step-text">Test with built-in terminal simulation</span>
                  </motion.li>
                  <motion.li variants={fadeInUp}>
                    <span className="step-number">5</span>
                    <span className="step-text">Publish with one click to the cloud</span>
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
                  </div>
                </div>
                
                <div className="path-indicator">
                  <FiChevronRight className="path-icon" />
                  <span>{currentPath}</span>
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
                          ×
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
                          ×
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
                    
                    return (
                      <div key={folder.path} className="tree-item folder-item">
                        <div 
                          className="folder-header"
                          onClick={() => toggleFolder(folder.path)}
                        >
                          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                          <FiFolder className="folder-icon" />
                          <span className="folder-name">{folderName}</span>
                          <span className="file-count">({folderFiles.length})</span>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && folderFiles.length > 0 && (
                            <motion.div 
                              className="folder-contents"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {folderFiles.map(file => (
                                <div 
                                  key={file.path}
                                  className={`tree-item file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                                  onClick={() => handleFileSelect(file)}
                                >
                                  {getFileIcon(file.path.split('/').pop())}
                                  <span className="file-name">{file.path.split('/').pop()}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  
                  {currentFiles.map(file => (
                    <div 
                      key={file.path}
                      className={`tree-item file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      {getFileIcon(file.path.split('/').pop())}
                      <span className="file-name">{file.path.split('/').pop()}</span>
                    </div>
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
                      <div className="stat-value">{Object.keys(dependencies).length}</div>
                      <div className="stat-label">Deps</div>
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
                            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                              <button 
                                className="btn btn-small btn-terminal"
                                onClick={installDependencies}
                                disabled={isInstallingDeps}
                              >
                                <FiTerminal />
                                {isInstallingDeps ? 'Installing...' : 'Install Deps'}
                              </button>
                            </Tilt>
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
                          <h4>✨ Advanced Features</h4>
                          <div className="features-grid">
                            <div className="feature-highlight">
                              <FiPackage />
                              <h5>Node.js Support</h5>
                              <p>Full package.json support with dependency management</p>
                            </div>
                            <div className="feature-highlight">
                              <FiCode />
                              <h5>React/JSX Ready</h5>
                              <p>Build modern React applications with full support</p>
                            </div>
                            <div className="feature-highlight">
                              <FiTerminal />
                              <h5>Built-in Terminal</h5>
                              <p>Run commands and install packages</p>
                            </div>
                            <div className="feature-highlight">
                              <FiCloud />
                              <h5>Cloud Deployment</h5>
                              <p>One-click publish to the cloud</p>
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
                          ×
                        </button>
                      </div>
                      <div className="terminal-content">
                        <pre>{terminalOutput}</pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Status Messages */}
                <AnimatePresence>
                  {message && (
                    <motion.div 
                      className={`status-message ${message.includes('✅') ? 'success' : 'error'}`}
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
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          user-select: none;
        }
        
        .folder-item {
          margin-bottom: 4px;
        }
        
        .folder-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #569cd6;
          font-weight: 500;
        }
        
        .folder-icon {
          color: #fbbc05;
        }
        
        .folder-name {
          flex: 1;
        }
        
        .file-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        
        .folder-contents {
          margin-left: 1.5rem;
          margin-top: 4px;
          border-left: 2px solid rgba(255, 255, 255, 0.1);
          padding-left: 1rem;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        
        .file-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
        }
        
        .file-item.selected {
          background: rgba(66, 133, 244, 0.2);
          color: #4285f4;
        }
        
        .icon {
          flex-shrink: 0;
          font-size: 1rem;
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
          font-size: 0.9rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          background: rgba(0, 0, 0, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        
        .terminal-header {
          background: rgba(0, 0, 0, 0.9);
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #34a853;
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .terminal-content {
          padding: 1rem;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          color: #cbd5e1;
          height: 150px;
          overflow-y: auto;
        }
        
        .terminal-content pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
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
      `}</style>
    </>
  );
}
