import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase/client';
import './styles.css';

export default function Edit() {
  const [serverName, setServerName] = useState('My Awesome Server');
  const [serverDescription, setServerDescription] = useState('An immersive JSX experience');
  const [serverTags, setServerTags] = useState(['interactive', '3d', 'game']);
  const [currentTag, setCurrentTag] = useState('');
  const [code, setCode] = useState(`// Welcome to Server's Code Editor!
// Create immersive JSX servers with full React capabilities

import { useState, useEffect } from 'react';
import * as THREE from 'three';

export default function MyServer() {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState('#6366f1');
  
  useEffect(() => {
    // Initialize any effects here
    console.log('Server mounted!');
    
    return () => {
      console.log('Server unmounted!');
    };
  }, []);
  
  const handleClick = () => {
    setCount(count + 1);
    // Cycle through colors
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
    setColor(colors[(count + 1) % colors.length]);
  };
  
  return (
    <div className="server-container">
      <h1 style={{ color }}>Welcome to My Server!</h1>
      <p>This is a fully interactive JSX server.</p>
      
      <div className="interactive-area">
        <button 
          onClick={handleClick}
          className="action-button"
        >
          Click me! Count: {count}
        </button>
        
        <div className="particles">
          {Array.from({ length: Math.min(count, 50) }).map((_, i) => (
            <div 
              key={i}
              className="particle"
              style={{
                left: \`\${Math.random() * 100}%\`,
                top: \`\${Math.random() * 100}%\`,
                backgroundColor: color,
                animationDelay: \`\${i * 0.1}s\`
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="features">
        <h2>Server Features:</h2>
        <ul>
          <li>Full React capabilities</li>
          <li>State management</li>
          <li>Interactive elements</li>
          <li>Custom styling</li>
          <li>Package imports (via CDN)</li>
        </ul>
      </div>
    </div>
  );
}`);
  
  const [files, setFiles] = useState([
    { id: 1, name: 'main.jsx', content: '', isActive: true },
    { id: 2, name: 'styles.css', content: '', isActive: false },
    { id: 3, name: 'package.json', content: '{}', isActive: false }
  ]);
  
  const [activeFile, setActiveFile] = useState(files[0]);
  const [packages, setPackages] = useState(['react', 'react-dom']);
  const [currentPackage, setCurrentPackage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Refs for effects
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  
  // Initialize effects
  useEffect(() => {
    initEditorEffects();
    initPreviewParticles();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  const initEditorEffects = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Create typing effect for placeholder
    const typeWriter = (element, text, speed = 50) => {
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
        } else {
          clearInterval(timer);
        }
      }, speed);
    };
  };
  
  const initPreviewParticles = () => {
    if (!previewRef.current) return;
    
    const preview = previewRef.current;
    const particles = [];
    
    // Create floating particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      });
    }
    
    particlesRef.current = particles;
    
    // Animation loop for particles
    const animateParticles = () => {
      if (!previewRef.current) return;
      
      particlesRef.current.forEach(p => {
        p.y -= p.speed;
        if (p.y < -10) {
          p.y = 110;
          p.x = Math.random() * 100;
        }
      });
      
      animationRef.current = requestAnimationFrame(animateParticles);
    };
    
    animateParticles();
  };
  
  const handleFileClick = (file) => {
    setFiles(files.map(f => ({
      ...f,
      isActive: f.id === file.id
    })));
    setActiveFile(file);
  };
  
  const handleAddFile = () => {
    const fileName = prompt('Enter file name (include extension):');
    if (!fileName) return;
    
    const newFile = {
      id: files.length + 1,
      name: fileName,
      content: '',
      isActive: false
    };
    
    setFiles([...files, newFile]);
    handleFileClick(newFile);
  };
  
  const handleDeleteFile = (fileId) => {
    if (files.length <= 1) {
      alert('You must have at least one file!');
      return;
    }
    
    setFiles(files.filter(f => f.id !== fileId));
    if (activeFile.id === fileId) {
      handleFileClick(files.find(f => f.id !== fileId));
    }
  };
  
  const handleAddTag = () => {
    if (!currentTag.trim() || serverTags.includes(currentTag.trim())) return;
    
    if (serverTags.length >= 5) {
      alert('Maximum 5 tags allowed');
      return;
    }
    
    setServerTags([...serverTags, currentTag.trim()]);
    setCurrentTag('');
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setServerTags(serverTags.filter(tag => tag !== tagToRemove));
  };
  
  const handleAddPackage = async () => {
    if (!currentPackage.trim()) return;
    
    // Check if package exists (simplified)
    try {
      const response = await fetch(`https://api.cdnjs.com/libraries?search=${currentPackage}&fields=name`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setPackages([...packages, currentPackage.trim()]);
        setCurrentPackage('');
      } else {
        alert('Package not found in CDN. Please check the name.');
      }
    } catch (error) {
      console.error('Error checking package:', error);
      alert('Error checking package availability');
    }
  };
  
  const handleRemovePackage = (pkg) => {
    setPackages(packages.filter(p => p !== pkg));
  };
  
  const handleSave = async () => {
    if (!serverName.trim()) {
      alert('Server name is required!');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('Saving...');
    
    try {
      // Save to Supabase
      const serverData = {
        name: serverName,
        description: serverDescription,
        tags: serverTags,
        code: code,
        files: files,
        packages: packages,
        author: 'Current User', // In real app, get from auth
        views: 0
      };
      
      const { data, error } = await supabase
        .from('servers')
        .upsert(serverData)
        .select();
      
      if (error) throw error;
      
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving server:', error);
      setSaveStatus('Error saving!');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: serverName,
          code: code,
          files: files,
          packages: packages
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Server deployed successfully!');
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };
  
  const handlePreview = () => {
    // Create a preview window
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      alert('Please allow pop-ups to preview');
      return;
    }
    
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preview: ${serverName}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: sans-serif; background: #0f172a; color: white; }
            .particle { position: absolute; width: 10px; height: 10px; border-radius: 50%; opacity: 0.7; }
          </style>
          ${packages.map(pkg => 
            `<script src="https://unpkg.com/${pkg}"></script>`
          ).join('\n')}
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            ${code}
            ReactDOM.render(<MyServer />, document.getElementById('root'));
          </script>
        </body>
      </html>
    `);
  };
  
  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter') {
      if (type === 'tag') {
        e.preventDefault();
        handleAddTag();
      } else if (type === 'package') {
        e.preventDefault();
        handleAddPackage();
      }
    }
  };
  
  return (
    <div className="edit-container">
      {/* Animated background */}
      <div className="editor-background">
        <div className="floating-shapes">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i}
              className="floating-shape"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                background: `linear-gradient(45deg, 
                  hsl(${i * 36}, 70%, 40%), 
                  hsl(${(i * 36 + 60) % 360}, 70%, 30%))`
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="editor-layout">
        {/* Left sidebar - Files and packages */}
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <h3 className="section-title">
              <i className="fas fa-folder"></i> Files
              <button 
                className="icon-btn add-btn"
                onClick={handleAddFile}
                title="Add new file"
              >
                <i className="fas fa-plus"></i>
              </button>
            </h3>
            <div className="file-list">
              {files.map(file => (
                <div 
                  key={file.id}
                  className={`file-item ${file.isActive ? 'active' : ''}`}
                  onClick={() => handleFileClick(file)}
                >
                  <i className={`fas fa-${file.name.endsWith('.jsx') ? 'file-code' : 
                                 file.name.endsWith('.css') ? 'file-alt' : 
                                 'cog'}`}></i>
                  <span className="file-name">{file.name}</span>
                  {files.length > 1 && (
                    <button 
                      className="file-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      title="Delete file"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3 className="section-title">
              <i className="fas fa-box"></i> Packages
            </h3>
            <div className="package-input">
              <input
                type="text"
                value={currentPackage}
                onChange={(e) => setCurrentPackage(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'package')}
                placeholder="Add npm package..."
                className="package-input-field"
              />
              <button 
                className="package-add-btn"
                onClick={handleAddPackage}
                disabled={!currentPackage.trim()}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="package-list">
              {packages.map((pkg, index) => (
                <div key={index} className="package-item">
                  <i className="fas fa-cube"></i>
                  <span className="package-name">{pkg}</span>
                  <button 
                    className="package-remove"
                    onClick={() => handleRemovePackage(pkg)}
                    title="Remove package"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3 className="section-title">
              <i className="fas fa-play-circle"></i> Quick Actions
            </h3>
            <div className="action-buttons">
              <button 
                className="action-btn preview-btn"
                onClick={handlePreview}
                title="Preview server in new tab"
              >
                <i className="fas fa-eye"></i> Preview
              </button>
              <button 
                className="action-btn save-btn"
                onClick={handleSave}
                disabled={isSaving}
              >
                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="action-btn deploy-btn"
                onClick={handleDeploy}
                disabled={isDeploying}
              >
                <i className={`fas ${isDeploying ? 'fa-spinner fa-spin' : 'fa-rocket'}`}></i>
                {isDeploying ? 'Deploying...' : 'Deploy Server'}
              </button>
            </div>
            {saveStatus && (
              <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
                <i className={`fas ${saveStatus.includes('Error') ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                {saveStatus}
              </div>
            )}
          </div>
        </div>
        
        {/* Main editor area */}
        <div className="editor-main">
          {/* Server metadata */}
          <div className="server-meta">
            <div className="meta-input">
              <label htmlFor="server-name">
                <i className="fas fa-server"></i> Server Name
              </label>
              <input
                id="server-name"
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="meta-input-field"
                placeholder="Enter server name..."
              />
            </div>
            
            <div className="meta-input">
              <label htmlFor="server-description">
                <i className="fas fa-align-left"></i> Description
              </label>
              <textarea
                id="server-description"
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                className="meta-textarea"
                placeholder="Describe your server..."
                rows="2"
              />
            </div>
            
            <div className="meta-input">
              <label>
                <i className="fas fa-tags"></i> Tags (max 5)
              </label>
              <div className="tags-input">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'tag')}
                  className="tags-input-field"
                  placeholder="Add tag and press Enter..."
                />
                <button 
                  className="tags-add-btn"
                  onClick={handleAddTag}
                  disabled={!currentTag.trim() || serverTags.length >= 5}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="tags-list">
                {serverTags.map((tag, index) => (
                  <span key={index} className="tag-bubble">
                    {tag}
                    <button 
                      className="tag-remove"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Code editor */}
          <div className="code-editor-container" ref={editorRef}>
            <div className="editor-header">
              <div className="editor-tabs">
                {files.map(file => (
                  <div 
                    key={file.id}
                    className={`editor-tab ${file.isActive ? 'active' : ''}`}
                    onClick={() => handleFileClick(file)}
                  >
                    <i className={`fas fa-${file.name.endsWith('.jsx') ? 'file-code' : 
                                       file.name.endsWith('.css') ? 'file-alt' : 
                                       'cog'}`}></i>
                    {file.name}
                  </div>
                ))}
              </div>
              <div className="editor-actions">
                <button className="editor-action-btn" title="Format code">
                  <i className="fas fa-broom"></i>
                </button>
                <button className="editor-action-btn" title="Find and replace">
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>
            
            <div className="editor-body">
              <div className="line-numbers">
                {code.split('\n').map((_, i) => (
                  <div key={i} className="line-number">{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="code-textarea"
                spellCheck="false"
                placeholder="Write your JSX code here..."
              />
            </div>
            
            <div className="editor-footer">
              <div className="editor-stats">
                <span><i className="fas fa-code"></i> Lines: {code.split('\n').length}</span>
                <span><i className="fas fa-font"></i> Characters: {code.length}</span>
                <span><i className="fas fa-file-code"></i> {activeFile.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview panel */}
        <div className="editor-preview" ref={previewRef}>
          <div className="preview-header">
            <h3>
              <i className="fas fa-desktop"></i> Live Preview
            </h3>
            <div className="preview-controls">
              <button className="preview-control-btn" title="Refresh preview">
                <i className="fas fa-sync-alt"></i>
              </button>
              <button className="preview-control-btn" title="Fullscreen">
                <i className="fas fa-expand"></i>
              </button>
            </div>
          </div>
          
          <div className="preview-content">
            {/* Particle background for preview */}
            <div className="preview-particles">
              {particlesRef.current.map((p, i) => (
                <div
                  key={i}
                  className="preview-particle"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color
                  }}
                />
              ))}
            </div>
            
            {/* Preview iframe would go here */}
            <div className="preview-placeholder">
              <div className="preview-mock">
                <div className="mock-header">
                  <div className="mock-buttons">
                    <div className="mock-button close"></div>
                    <div className="mock-button minimize"></div>
                    <div className="mock-button expand"></div>
                  </div>
                </div>
                <div className="mock-content">
                  <div className="mock-server">
                    <h2 className="mock-title">{serverName}</h2>
                    <p className="mock-description">{serverDescription}</p>
                    <div className="mock-tags">
                      {serverTags.map((tag, i) => (
                        <span key={i} className="mock-tag">{tag}</span>
                      ))}
                    </div>
                    <div className="mock-interaction">
                      <button className="mock-button-interactive">
                        Interactive Element
                      </button>
                      <div className="mock-animation"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="preview-footer">
            <div className="preview-info">
              <i className="fas fa-info-circle"></i>
              Preview updates as you type (simulated)
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="editor-nav">
        <button 
          className="nav-btn back-btn"
          onClick={() => window.location.href = '/explore'}
        >
          <i className="fas fa-arrow-left"></i> Back to Explore
        </button>
        
        <div className="nav-title">
          <i className="fas fa-edit"></i> Server Editor
          <span className="nav-subtitle">Creating: {serverName}</span>
        </div>
        
        <div className="nav-status">
          <div className="status-indicator active"></div>
          <span>Auto-save: Enabled</span>
        </div>
      </div>
    </div>
  );
}
