'use client';

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

export default function ExplorePage() {
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverFiles, setServerFiles] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverContent, setServerContent] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewMode, setViewMode] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [serverVersions, setServerVersions] = useState([]);
  const [serverComments, setServerComments] = useState([]);
  const [serverStats, setServerStats] = useState(null);
  const [serverMembers, setServerMembers] = useState([]);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [downloadingVersion, setDownloadingVersion] = useState(null);
  const [commentError, setCommentError] = useState('');
  const warningAccepted = useRef(false);

  useEffect(() => {
    loadUser();
    loadServers();
  }, []);

  const loadUser = async () => {
    const response = await fetch('/api/check-session');
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
    } else {
      window.location.href = '/login';
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch('/api/get-servers?includeStats=true&includeComments=true&includeVersions=true');
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const getFeaturedServers = () => {
    return servers.filter(server => server.is_public && (server.stats?.total_downloads > 100 || server.comment_count > 20))
      .sort((a, b) => {
        const aScore = (a.stats?.total_downloads || 0) + (a.comment_count || 0);
        const bScore = (b.stats?.total_downloads || 0) + (b.comment_count || 0);
        return bScore - aScore;
      })
      .slice(0, 6);
  };

  const getTrendingServers = () => {
    return servers.filter(server => server.is_public)
      .sort((a, b) => {
        const aScore = (a.comment_count || 0) * 2 + (a.stats?.total_downloads || 0);
        const bScore = (b.comment_count || 0) * 2 + (b.stats?.total_downloads || 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  };

  const getRecentlyUpdated = () => {
    return servers.filter(server => server.is_public)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 6);
  };

  const getFilteredServers = () => {
    switch (viewMode) {
      case 'featured':
        return getFeaturedServers();
      case 'trending':
        return getTrendingServers();
      case 'recent':
        return getRecentlyUpdated();
      default:
        return servers.filter(server => server.is_public || (user && (server.owner_id === user.id || server.user_permissions?.is_member)));
    }
  };

  const getServerTags = (server) => {
    const tags = [];
    if (server.category) tags.push(server.category);
    if (server.latest_version) tags.push(`v${server.latest_version.version_number}`);
    if (server.total_downloads > 100) tags.push('🔥 Popular');
    if (server.comment_count > 10) tags.push('💬 Active');
    return tags.slice(0, 3);
  };

  const enterServer = async (serverId) => {
    if (!warningAccepted.current) {
      alert("Please acknowledge the security warning first.");
      setShowWarning(true);
      return;
    }

    setLoadingServer(true);
    setSelectedServer(serverId);
    setSelectedFile(null);
    setFilePreview('');
    setExpandedFolders({});
    setServerVersions([]);
    setServerComments([]);
    setServerStats(null);
    setServerMembers([]);
    setShowCommentForm(false);
    setNewComment('');
    
    try {
      // Load comprehensive server data using the new API
      const serverRes = await fetch(`/api/get-server?serverId=${serverId}&includeVersions=true&includeComments=true&includeStats=true&includeMembers=true`);
      const serverData = await serverRes.json();
      
      if (serverData.success) {
        const currentServer = serverData.server;
        
        // Update servers list with latest data
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, ...currentServer } : s));
        
        // Set versions
        if (serverData.versions) {
          setServerVersions(serverData.versions);
          
          // Check if we have files in versions (assuming files are included in versions data)
          const allFiles = [];
          serverData.versions.forEach(version => {
            if (version.files && version.files.length > 0) {
              version.files.forEach(file => {
                allFiles.push({
                  ...file,
                  version_id: version.id,
                  version_name: version.version_name
                });
              });
            }
          });
          setServerFiles(allFiles);
          
          // Find index.html file
          const indexFile = allFiles.find(f => 
            f.path === '/index.html' || 
            f.path.endsWith('/index.html') || 
            f.path === 'index.html'
          );
          
          if (indexFile && indexFile.content) {
            setServerContent(indexFile.content);
          } else {
            setServerContent(generateDefaultPage(currentServer, serverData.versions[0]));
          }
        } else {
          setServerContent(generateDefaultPage(currentServer, null));
        }
        
        // Set comments
        if (serverData.comments) {
          setServerComments(serverData.comments);
        }
        
        // Set stats
        if (serverData.stats) {
          setServerStats(serverData.stats);
        }
        
        // Set members
        if (serverData.members) {
          setServerMembers(serverData.members);
        }
      }
      
    } catch (error) {
      console.error('Failed to load server:', error);
      setServerContent(generateErrorPage());
    } finally {
      setLoadingServer(false);
      setIframeKey(prev => prev + 1);
    }
  };

  const generateDefaultPage = (server, latestVersion) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${server?.name || 'Server.x'} - ${latestVersion?.version_name || 'Default Page'}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            h1 {
              font-size: 3em;
              margin-bottom: 20px;
              text-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .server-info {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 15px;
              margin-top: 30px;
              backdrop-filter: blur(10px);
              max-width: 600px;
            }
            .version-info {
              background: rgba(0,0,0,0.2);
              padding: 15px;
              border-radius: 10px;
              margin-top: 20px;
            }
            .stats {
              display: flex;
              gap: 20px;
              margin-top: 20px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .stat {
              background: rgba(255,255,255,0.15);
              padding: 10px 20px;
              border-radius: 10px;
              min-width: 120px;
            }
          </style>
        </head>
        <body>
          <h1>🚀 ${server?.name || 'Server.x'}</h1>
          <p style="font-size: 1.2em; max-width: 600px; line-height: 1.6;">
            ${server?.description || 'This server is hosted on Server.x platform.'}
          </p>
          
          <div class="server-info">
            ${latestVersion ? `
              <div class="version-info">
                <h3 style="margin-top: 0;">Latest Version: ${latestVersion.version_name}</h3>
                <p>${latestVersion.description || 'No description provided.'}</p>
                <div class="stats">
                  <div class="stat">📥 ${latestVersion.download_count || 0} downloads</div>
                  ${latestVersion.release_date ? `<div class="stat">📅 Released: ${new Date(latestVersion.release_date).toLocaleDateString()}</div>` : ''}
                </div>
              </div>
            ` : ''}
            
            <div class="stats" style="margin-top: 30px;">
              <div class="stat">👁️ ${server?.views || 0} views</div>
              <div class="stat">💬 ${server?.comment_count || 0} comments</div>
              ${server?.total_downloads ? `<div class="stat">📦 ${server.total_downloads} total downloads</div>` : ''}
            </div>
            
            <p style="margin-top: 25px; opacity: 0.9; font-style: italic;">
              💡 This is a default page. The server owner can upload custom HTML files in the editor.
            </p>
          </div>
          <script>
            console.log('Server.x page loaded for ${server?.name || 'unknown server'}');
            document.addEventListener('click', function() {
              window.parent.postMessage({ type: 'server_interaction' }, '*');
            });
          </script>
        </body>
      </html>
    `;
  };

  const generateErrorPage = () => {
    return `
      <html>
        <head>
          <style>
            body {
              background: #1a1a1a;
              color: white;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              line-height: 1.6;
            }
            .error-container {
              max-width: 500px;
              padding: 40px;
              background: rgba(255,255,255,0.05);
              border-radius: 15px;
              border: 2px solid rgba(255, 107, 107, 0.3);
              backdrop-filter: blur(10px);
            }
            .error-list {
              text-align: left;
              margin: 20px 0;
              padding-left: 20px;
            }
            .error-list li {
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1 style="color: #ff6b6b; margin-bottom: 20px;">⚠️ Error Loading Server</h1>
            <p>The server could not be loaded. This might be due to:</p>
            <ul class="error-list">
              <li>Server is private and requires membership</li>
              <li>Temporary server issues</li>
              <li>Missing files or configurations</li>
              <li>Network connectivity problems</li>
            </ul>
            <p>Please try again later or contact the server owner.</p>
          </div>
        </body>
      </html>
    `;
  };

  const viewFile = (file) => {
    setSelectedFile(file);
    
    let previewContent = '';
    if (file.content) {
      const ext = file.path.split('.').pop().toLowerCase();
      if (['html', 'css', 'js', 'json', 'txt', 'md'].includes(ext)) {
        previewContent = file.content;
      } else {
        previewContent = `// Binary or unsupported file type: ${file.path}\n// File size: ${file.content.length} bytes\n// From version: ${file.version_name}`;
      }
    } else {
      previewContent = `// No content available for this file\n// Path: ${file.path}\n// Version: ${file.version_name}`;
    }
    
    setFilePreview(previewContent);
  };

  const closeFilePreview = () => {
    setSelectedFile(null);
    setFilePreview('');
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const organizeFilesTree = (files) => {
    const tree = {};
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(p => p);
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { ...file, isFile: true } : {};
        }
        if (index < parts.length - 1) {
          current = current[part];
        }
      });
    });
    
    return tree;
  };

  const renderFileTree = (tree, path = '') => {
    const entries = Object.entries(tree);
    
    return entries.map(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : `/${name}`;
      
      if (item.isFile) {
        return (
          <motion.div
            key={fullPath}
            style={styles.fileTreeItem}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ backgroundColor: 'rgba(66, 133, 244, 0.1)' }}
            onClick={() => viewFile(item)}
          >
            <span style={styles.fileIcon}>
              {item.path.endsWith('.html') ? '🌐' : 
               item.path.endsWith('.js') ? '📜' : 
               item.path.endsWith('.css') ? '🎨' : 
               item.path.endsWith('.json') ? '📋' : '📄'}
            </span>
            <span style={styles.fileName}>{name}</span>
            {item.version_name && (
              <span style={styles.versionTag}>v{item.version_name}</span>
            )}
          </motion.div>
        );
      } else {
        const isExpanded = expandedFolders[fullPath];
        const hasChildren = Object.keys(item).length > 0;
        
        return (
          <div key={fullPath}>
            <motion.div
              style={styles.folderItem}
              whileHover={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
              onClick={() => hasChildren && toggleFolder(fullPath)}
            >
              <span style={styles.folderIcon}>
                {hasChildren ? (isExpanded ? '📂' : '📁') : '📁'}
              </span>
              <span style={styles.folderName}>{name}</span>
              {hasChildren && (
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  style={styles.arrow}
                >
                  ▶
                </motion.span>
              )}
            </motion.div>
            {isExpanded && hasChildren && (
              <div style={styles.folderContent}>
                {renderFileTree(item, fullPath)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  const postComment = async () => {
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }

    if (!user) {
      setCommentError('Please log in to comment');
      return;
    }

    try {
      const response = await fetch('/api/get-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          server_id: selectedServer,
          content: newComment,
          parent_comment_id: null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Add the new comment to the top of the list
        setServerComments(prev => [data.comment, ...prev]);
        setNewComment('');
        setShowCommentForm(false);
        setCommentError('');
        
        // Update the server's comment count
        setServers(prev => prev.map(server => 
          server.id === selectedServer 
            ? { ...server, comment_count: (server.comment_count || 0) + 1 }
            : server
        ));
      } else {
        setCommentError(data.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      setCommentError('Network error. Please try again.');
    }
  };

  const downloadVersion = async (versionId, versionName) => {
    if (!user) {
      alert('Please log in to download files');
      return;
    }

    setDownloadingVersion(versionId);
    
    try {
      const response = await fetch('/api/get-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download',
          server_id: selectedServer,
          version_id: versionId
        })
      });

      const data = await response.json();
      
      if (data.success && data.download) {
        // Update the version's download count in state
        setServerVersions(prev => prev.map(v => 
          v.id === versionId 
            ? { ...v, download_count: data.download.download_count } 
            : v
        ));
        
        // Update total downloads in servers list
        setServers(prev => prev.map(server => 
          server.id === selectedServer 
            ? { 
                ...server, 
                total_downloads: (server.total_downloads || 0) + 1,
                latest_version: server.latest_version?.id === versionId 
                  ? { ...server.latest_version, download_count: data.download.download_count }
                  : server.latest_version
              }
            : server
        ));
        
        // If there's a file URL, trigger download
        if (data.download.file_url) {
          const link = document.createElement('a');
          link.href = data.download.file_url;
          link.download = `${versionName || 'download'}.zip`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Show success message
        alert(`✅ Download started for ${data.download.version_name}`);
      } else {
        alert(data.error || 'Failed to start download');
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      alert('Network error. Please try again.');
    } finally {
      setDownloadingVersion(null);
    }
  };

  const goBackToExplore = () => {
    setSelectedServer(null);
    setServerFiles([]);
    setServerContent('');
    setSelectedFile(null);
    setFilePreview('');
    setExpandedFolders({});
    setServerVersions([]);
    setServerComments([]);
    setServerStats(null);
    setServerMembers([]);
    setShowCommentForm(false);
    setNewComment('');
    setCommentError('');
  };

  const logout = () => {
    document.cookie = '__Host-session_secure=; Max-Age=0; Path=/; Secure; SameSite=Strict';
    window.location.href = '/login';
  };

  const goToEditor = () => {
    window.location.href = '/editor';
  };

  const acceptWarning = () => {
    warningAccepted.current = true;
    setShowWarning(false);
  };

  const refreshServer = () => {
    if (selectedServer) {
      setIframeKey(prev => prev + 1);
    }
  };

  const currentServer = servers.find(s => s.id === selectedServer);
  const filteredServers = getFilteredServers();
  const fileTree = organizeFilesTree(serverFiles);

  const renderWarningModal = () => (
    <motion.div
      style={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={styles.warningModal}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
      >
        <motion.h2 
          style={styles.modalTitle}
          animate={{ 
            textShadow: [
              "0 0 10px #ff0000",
              "0 0 20px #ff0000", 
              "0 0 10px #ff0000"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⚠️ Security Notice
        </motion.h2>
        <div style={styles.modalContent}>
          <p><strong>You are about to view user-generated content.</strong></p>
          <ul style={styles.warningList}>
            <li>Content runs in a <strong>sandboxed environment</strong></li>
            <li>All servers are <strong>isolated and secured</strong></li>
            <li>No access to your personal data or cookies</li>
            <li>Refresh to exit any server view</li>
            <li>Comments and downloads require authentication</li>
          </ul>
          <p style={styles.modalFooter}>Click below to continue exploring safely.</p>
        </div>
        <div style={styles.modalActions}>
          <motion.button 
            style={styles.acceptButton}
            onClick={acceptWarning}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔓 I Understand, Continue Exploring
          </motion.button>
          <button
            style={styles.cancelButton}
            onClick={() => window.location.href = '/'}
          >
            🚫 Return Home
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderFilePreview = () => (
    <motion.div
      style={styles.previewOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeFilePreview}
    >
      <motion.div
        style={styles.previewModal}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.previewHeader}>
          <h3 style={styles.previewTitle}>
            📄 {selectedFile?.path || 'File Preview'}
            {selectedFile?.version_name && (
              <span style={styles.versionBadge}>v{selectedFile.version_name}</span>
            )}
          </h3>
          <motion.button
            style={styles.closePreviewButton}
            onClick={closeFilePreview}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        </div>
        <div style={styles.previewContent}>
          <pre style={styles.codePreview}>
            {filePreview}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderVersionsSection = () => (
    <motion.div 
      style={styles.versionsSection}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 style={styles.versionsTitle}>📦 Server Versions ({serverVersions.length})</h4>
      <div style={styles.versionsGrid}>
        {serverVersions.map((version, index) => (
          <motion.div
            key={version.id}
            style={styles.versionCard}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div style={styles.versionHeader}>
              <h5 style={styles.versionName}>{version.version_name}</h5>
              <span style={styles.versionNumber}>v{version.version_number}</span>
            </div>
            <p style={styles.versionDesc}>{version.description || 'No description'}</p>
            <div style={styles.versionStats}>
              <span style={styles.versionStat}>
                📥 {version.download_count || 0} downloads
              </span>
              {version.release_date && (
                <span style={styles.versionStat}>
                  📅 {new Date(version.release_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <motion.button
              style={styles.downloadButton}
              onClick={() => downloadVersion(version.id, version.version_name)}
              disabled={downloadingVersion === version.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {downloadingVersion === version.id ? '⏳ Downloading...' : '⬇️ Download'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderCommentsSection = () => (
    <motion.div 
      style={styles.commentsSection}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={styles.commentsHeader}>
        <h4 style={styles.commentsTitle}>
          💬 Comments ({serverComments.length})
          {currentServer?.allow_comments && user && (
            <motion.button
              style={styles.newCommentButton}
              onClick={() => setShowCommentForm(!showCommentForm)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showCommentForm ? 'Cancel' : '+ Add Comment'}
            </motion.button>
          )}
        </h4>
      </div>

      {showCommentForm && (
        <motion.div
          style={styles.commentForm}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <textarea
            style={styles.commentTextarea}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment here..."
            rows={4}
            maxLength={5000}
          />
          {commentError && (
            <div style={styles.commentError}>{commentError}</div>
          )}
          <div style={styles.commentFormActions}>
            <motion.button
              style={styles.submitCommentButton}
              onClick={postComment}
              disabled={!newComment.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Post Comment
            </motion.button>
            <span style={styles.commentLength}>
              {newComment.length}/5000
            </span>
          </div>
        </motion.div>
      )}

      <div style={styles.commentsList}>
        {serverComments.length > 0 ? (
          serverComments.map((comment, index) => (
            <motion.div
              key={comment.id}
              style={styles.commentCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div style={styles.commentHeader}>
                <div style={styles.commentUser}>
                  <img 
                    src={comment.user?.avatar_url || '/default-avatar.png'} 
                    alt={comment.user?.username}
                    style={styles.commentAvatar}
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div>
                    <strong style={styles.commentUsername}>
                      {comment.user?.username || 'Anonymous'}
                    </strong>
                    <div style={styles.commentDate}>
                      {new Date(comment.created_at).toLocaleDateString()}
                      {comment.is_edited && ' (edited)'}
                    </div>
                  </div>
                </div>
                {comment.bug_report && (
                  <span style={styles.bugReportTag}>
                    🐛 Bug Report
                    {comment.bug_severity && ` (${comment.bug_severity})`}
                  </span>
                )}
              </div>
              <div style={styles.commentContent}>
                {comment.content}
              </div>
            </motion.div>
          ))
        ) : (
          <div style={styles.noComments}>
            {currentServer?.allow_comments 
              ? 'No comments yet. Be the first to comment!'
              : 'Comments are disabled for this server.'}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderServerView = () => {
    const currentServer = servers.find(s => s.id === selectedServer);
    
    return (
      <motion.div
        key="server-view"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        style={styles.serverView}
      >
        <motion.div 
          style={styles.serverHeader}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div style={styles.headerLeft}>
            <motion.button
              style={styles.backButton}
              onClick={goBackToExplore}
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ←
              </motion.span>
              Back to Explore
            </motion.button>
            
            <div style={styles.serverInfo}>
              <motion.h2 
                style={styles.serverTitle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {currentServer?.name || 'Loading...'}
              </motion.h2>
              <motion.p 
                style={styles.serverDesc}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {currentServer?.description || 'No description'}
              </motion.p>
              <div style={styles.serverMeta}>
                <span style={styles.serverCategory}>
                  {currentServer?.category || 'Uncategorized'}
                </span>
                <span style={styles.serverOwner}>
                  👤 {currentServer?.owner?.username || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <motion.div 
              style={styles.serverStats}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.span
                whileHover={{ scale: 1.1 }}
                style={styles.statItem}
              >
                👁️ {currentServer?.views || 0}
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.1 }}
                style={styles.statItem}
              >
                💬 {currentServer?.comment_count || 0}
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.1 }}
                style={styles.statItem}
              >
                📥 {currentServer?.total_downloads || 0}
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.1 }}
                style={{
                  ...styles.statItem,
                  backgroundColor: currentServer?.is_public 
                    ? 'rgba(66, 133, 244, 0.15)' 
                    : 'rgba(234, 67, 53, 0.15)',
                  color: currentServer?.is_public ? '#4285f4' : '#ea4335',
                  border: `2px solid ${currentServer?.is_public ? '#4285f4' : '#ea4335'}`
                }}
              >
                {currentServer?.is_public ? '🌐 Public' : '🔒 Private'}
              </motion.span>
            </motion.div>
            
            <motion.button
              style={styles.refreshButton}
              onClick={refreshServer}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
            >
              🔄
            </motion.button>
          </div>
        </motion.div>

        <motion.div 
          style={styles.warningBox}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⚠️
          </motion.span>
          Viewing user-generated content in a sandboxed environment
          {!user && ' (Log in to comment or download files)'}
        </motion.div>

        <div style={styles.mainContentArea}>
          <div style={styles.leftColumn}>
            <div style={styles.iframeContainer}>
              {loadingServer ? (
                <motion.div 
                  style={styles.loadingContainer}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    style={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <div style={styles.spinnerInner} />
                  </motion.div>
                  <motion.h3
                    style={styles.loadingText}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Loading server...
                  </motion.h3>
                </motion.div>
              ) : (
                <motion.div
                  style={styles.iframeWrapper}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <iframe
                    key={iframeKey}
                    srcDoc={serverContent}
                    style={styles.serverIframe}
                    title="Server Content"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </motion.div>
              )}
            </div>

            <motion.div 
              style={styles.fileList}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.h4 
                style={styles.fileListTitle}
                whileHover={{ x: 5 }}
              >
                📁 Server Files ({serverFiles.length})
                {serverFiles.length > 0 && (
                  <span style={styles.fileListHint}> (Click any file to preview)</span>
                )}
              </motion.h4>
              <div style={styles.fileTree}>
                {renderFileTree(fileTree)}
              </div>
            </motion.div>
          </div>

          <div style={styles.rightColumn}>
            {serverVersions.length > 0 && renderVersionsSection()}
            {renderCommentsSection()}
          </div>
        </div>

        <AnimatePresence>
          {selectedFile && renderFilePreview()}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderExploreGrid = () => (
    <motion.div
      key="explore-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ width: '100%' }}
    >
      <motion.h1
        style={styles.title}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
      >
        Explore Servers
      </motion.h1>

      <motion.p
        style={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Click any server to view its content in a <span style={{ color: '#4285f4', fontWeight: 'bold' }}>secure sandbox</span>
      </motion.p>

      <motion.div 
        style={styles.navigationControls}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div style={styles.viewModeButtons}>
          {[
            { id: 'all', label: '🌐 All Servers', count: servers.length },
            { id: 'featured', label: '⭐ Featured', count: getFeaturedServers().length },
            { id: 'trending', label: '📈 Trending', count: getTrendingServers().length },
            { id: 'recent', label: '🕐 Recent', count: getRecentlyUpdated().length }
          ].map((mode) => (
            <motion.button
              key={mode.id}
              style={{
                ...styles.viewModeButton,
                background: viewMode === mode.id 
                  ? 'linear-gradient(90deg, #4285f4, #34a853)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${viewMode === mode.id ? '#4285f4' : 'rgba(255,255,255,0.1)'}`
              }}
              onClick={() => setViewMode(mode.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mode.label}
              <span style={styles.viewCount}>{mode.count}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        style={styles.serversGrid}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        {filteredServers.map((server, index) => {
          const tags = getServerTags(server);
          const isFeatured = getFeaturedServers().some(s => s.id === server.id);
          const isTrending = getTrendingServers().some(s => s.id === server.id);
          const isRecent = getRecentlyUpdated().some(s => s.id === server.id);
          
          return (
            <Tilt
              key={server.id}
              tiltMaxAngleX={10}
              tiltMaxAngleY={10}
              perspective={1000}
              transitionSpeed={1000}
              scale={1.05}
              glareEnable={true}
              glareMaxOpacity={0.2}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="16px"
            >
              <motion.div
                style={styles.serverCard}
                onClick={() => enterServer(server.id)}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.8 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: { type: "spring", stiffness: 80 }
                  }
                }}
                whileHover={{
                  y: -10,
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(66, 133, 244, 0.2)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="card-glow" style={styles.cardGlow} />
                
                <div style={styles.cardBadges}>
                  {isFeatured && (
                    <motion.span
                      style={styles.featuredBadge}
                      whileHover={{ scale: 1.2 }}
                    >
                      ⭐ Featured
                    </motion.span>
                  )}
                  {isTrending && (
                    <motion.span
                      style={styles.trendingBadge}
                      whileHover={{ scale: 1.2 }}
                    >
                      📈 Trending
                    </motion.span>
                  )}
                  {isRecent && (
                    <motion.span
                      style={styles.recentBadge}
                      whileHover={{ scale: 1.2 }}
                    >
                      🕐 Recent
                    </motion.span>
                  )}
                </div>
                
                <div style={styles.serverHeaderSmall}>
                  <motion.h3
                    style={styles.serverName}
                    animate={{ 
                      color: server.is_public ? '#4285f4' : '#ea4335',
                      textShadow: server.is_public 
                        ? '0 0 10px rgba(66, 133, 244, 0.3)' 
                        : '0 0 10px rgba(234, 67, 53, 0.3)'
                    }}
                  >
                    {server.name}
                  </motion.h3>
                  <motion.span
                    style={{
                      ...styles.serverBadge,
                      backgroundColor: server.is_public 
                        ? 'rgba(66, 133, 244, 0.15)' 
                        : 'rgba(234, 67, 53, 0.15)',
                      color: server.is_public ? '#4285f4' : '#ea4335',
                      border: `2px solid ${server.is_public ? '#4285f4' : '#ea4335'}`
                    }}
                    whileHover={{ 
                      scale: 1.15,
                      boxShadow: `0 0 10px ${server.is_public ? '#4285f4' : '#ea4335'}`
                    }}
                  >
                    {server.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'}
                  </motion.span>
                </div>
                
                <motion.p
                  style={styles.serverDescription}
                >
                  {server.description || 'No description provided.'}
                </motion.p>
                
                {tags.length > 0 && (
                  <motion.div 
                    style={styles.tagContainer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {tags.map((tag, idx) => (
                      <motion.span
                        key={tag}
                        style={styles.tag}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
                
                <motion.div
                  style={styles.serverStatsGrid}
                >
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    style={styles.statSmall}
                  >
                    👁️ {server.views || 0} views
                  </motion.span>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    style={styles.statSmall}
                  >
                    💬 {server.comment_count || 0} comments
                  </motion.span>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    style={styles.statSmall}
                  >
                    📥 {server.total_downloads || 0} downloads
                  </motion.span>
                </motion.div>
              </motion.div>
            </Tilt>
          );
        })}
      </motion.div>
    </motion.div>
  );

  return (
    <>
      <Head>
        <title>Server.x - {selectedServer ? 'Viewing Server' : 'Explore'}</title>
      </Head>

      <div style={styles.container}>
        <AnimatePresence>
          {showWarning && renderWarningModal()}
        </AnimatePresence>

        <motion.div 
          style={styles.header}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <motion.div
            style={styles.logo}
            whileHover={{ 
              scale: 1.1,
              textShadow: '0 0 10px #4285f4'
            }}
            onClick={!selectedServer ? () => window.location.href = '/' : undefined}
          >
            <span style={{ color: '#4285f4' }}>Server</span>
            <span style={{ color: '#ea4335' }}>.x</span>
          </motion.div>
          <div style={styles.nav}>
            <motion.button
              style={styles.navButton}
              onClick={goToEditor}
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 0 15px rgba(66, 133, 244, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              🚀 Create Server
            </motion.button>
            <div style={styles.userInfo}>
              <motion.span 
                style={styles.username}
                whileHover={{ scale: 1.05 }}
              >
                👤 {user?.username || 'Guest'}
              </motion.span>
              {user ? (
                <motion.button
                  style={styles.logoutButton}
                  onClick={logout}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 0 10px rgba(102, 102, 102, 0.3)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout
                </motion.button>
              ) : (
                <motion.button
                  style={styles.loginButton}
                  onClick={() => window.location.href = '/login'}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 0 10px rgba(66, 133, 244, 0.3)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Login
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        <div style={styles.main}>
          <AnimatePresence mode="wait">
            {selectedServer ? renderServerView() : renderExploreGrid()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: { 
    minHeight: '100vh', 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    overflow: 'hidden',
    position: 'relative',
    color: 'white'
  },
  header: { 
    background: 'rgba(10, 10, 10, 0.8)', 
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(66, 133, 244, 0.2)',
    padding: '20px 40px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logo: { 
    fontSize: 28, 
    fontWeight: '900',
    cursor: 'pointer',
    letterSpacing: '-0.5px',
    display: 'flex',
    gap: 2
  },
  nav: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 25 
  },
  navButton: { 
    background: 'linear-gradient(90deg, #4285f4, #34a853)',
    color: 'white', 
    border: 'none', 
    padding: '12px 24px', 
    borderRadius: '30px', 
    cursor: 'pointer', 
    fontWeight: '700',
    fontSize: '15px',
    letterSpacing: '0.3px'
  },
  userInfo: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 15,
    background: 'rgba(255,255,255,0.05)',
    padding: '8px 16px',
    borderRadius: '25px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  username: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px'
  },
  logoutButton: { 
    background: 'rgba(102, 102, 102, 0.3)', 
    color: 'white', 
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '8px 16px', 
    borderRadius: '20px', 
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  loginButton: { 
    background: 'rgba(66, 133, 244, 0.3)', 
    color: '#8ab4f8', 
    border: '1px solid rgba(66, 133, 244, 0.5)',
    padding: '8px 16px', 
    borderRadius: '20px', 
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  main: { 
    padding: '30px 40px', 
    maxWidth: '1600px', 
    margin: '0 auto',
    minHeight: 'calc(100vh - 80px)',
    position: 'relative'
  },
  title: { 
    fontSize: '64px', 
    marginBottom: '15px', 
    color: '#fff', 
    textAlign: 'center', 
    fontWeight: '900',
    background: 'linear-gradient(90deg, #4285f4, #ea4335)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(66, 133, 244, 0.2)',
    letterSpacing: '-1px'
  },
  subtitle: {
    fontSize: '20px',
    color: '#aaa',
    textAlign: 'center',
    marginBottom: '30px',
    fontWeight: '400',
    maxWidth: '600px',
    margin: '0 auto 30px'
  },
  navigationControls: {
    marginBottom: '40px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '15px',
    border: '1px solid rgba(66, 133, 244, 0.1)'
  },
  viewModeButtons: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  viewModeButton: {
    padding: '12px 24px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    border: 'none'
  },
  viewCount: {
    background: 'rgba(0,0,0,0.3)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '700'
  },
  serversGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
    gap: '30px', 
    padding: '30px 0'
  },
  serverCard: { 
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(66, 133, 244, 0.15)', 
    borderRadius: '20px', 
    padding: '25px', 
    cursor: 'pointer', 
    position: 'relative', 
    overflow: 'hidden',
    height: '100%',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.3s ease'
  },
  cardGlow: { 
    position: 'absolute', 
    top: 0, 
    left: '-100%', 
    width: '100%', 
    height: '100%', 
    background: 'linear-gradient(90deg, transparent, rgba(66, 133, 244, 0.1), transparent)',
    transition: 'left 0.7s cubic-bezier(0.19, 1, 0.22, 1)',
    pointerEvents: 'none'
  },
  cardBadges: {
    position: 'absolute',
    top: '15px',
    left: '15px',
    display: 'flex',
    gap: '8px',
    zIndex: 1
  },
  featuredBadge: {
    background: 'linear-gradient(90deg, #ffd700, #ffa500)',
    color: '#000',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
  },
  trendingBadge: {
    background: 'linear-gradient(90deg, #ff6b6b, #ff8e8e)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    boxShadow: '0 0 10px rgba(255, 107, 107, 0.3)'
  },
  recentBadge: {
    background: 'linear-gradient(90deg, #4285f4, #8ab4f8)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    boxShadow: '0 0 10px rgba(66, 133, 244, 0.3)'
  },
  serverHeaderSmall: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: '15px',
    marginTop: '10px'
  },
  serverName: { 
    margin: 0, 
    fontSize: '22px', 
    color: '#fff', 
    fontWeight: '700',
    lineHeight: '1.3'
  },
  serverBadge: { 
    padding: '6px 12px', 
    borderRadius: '15px', 
    fontSize: '11px', 
    fontWeight: '800', 
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease'
  },
  serverDescription: { 
    color: '#aaa', 
    fontSize: '14px', 
    lineHeight: '1.6', 
    marginBottom: '15px', 
    flex: 1
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '15px'
  },
  tag: {
    background: 'rgba(66, 133, 244, 0.15)',
    color: '#8ab4f8',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid rgba(66, 133, 244, 0.3)'
  },
  serverStatsGrid: { 
    display: 'flex', 
    flexWrap: 'wrap',
    gap: '10px', 
    color: '#888', 
    fontSize: '13px', 
    borderTop: '2px solid rgba(255,255,255,0.1)',
    paddingTop: '15px',
    fontWeight: '600'
  },
  statSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'rgba(255,255,255,0.03)',
    padding: '4px 10px',
    borderRadius: '10px',
    flex: 1,
    minWidth: '110px'
  },
  // Server View Styles
  serverView: {
    height: 'calc(100vh - 140px)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid rgba(66, 133, 244, 0.1)'
  },
  serverHeader: {
    background: 'rgba(26, 26, 26, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(66, 133, 244, 0.2)',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backButton: {
    background: 'rgba(66, 133, 244, 0.1)',
    color: '#4285f4',
    border: '2px solid rgba(66, 133, 244, 0.3)',
    padding: '10px 20px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  serverInfo: {
    flex: 1
  },
  serverTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#fff',
    fontWeight: '700',
    lineHeight: '1.2'
  },
  serverDesc: {
    margin: '5px 0 0',
    color: '#ccc',
    fontSize: '14px',
    maxWidth: '600px',
    lineHeight: '1.4'
  },
  serverMeta: {
    display: 'flex',
    gap: '15px',
    marginTop: '10px'
  },
  serverCategory: {
    background: 'rgba(255, 193, 7, 0.15)',
    color: '#ffc107',
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600'
  },
  serverOwner: {
    color: '#888',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  serverStats: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  statItem: {
    padding: '6px 12px',
    borderRadius: '15px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  refreshButton: {
    background: 'rgba(66, 133, 244, 0.1)',
    color: '#4285f4',
    border: '2px solid rgba(66, 133, 244, 0.3)',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  warningBox: {
    background: 'rgba(220, 53, 69, 0.1)',
    color: '#ff6b6b',
    padding: '12px 30px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    borderBottom: '1px solid rgba(220, 53, 69, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    flexShrink: 0
  },
  mainContentArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  leftColumn: {
    flex: 3,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  rightColumn: {
    flex: 1,
    background: 'rgba(26, 26, 26, 0.5)',
    borderLeft: '1px solid rgba(66, 133, 244, 0.1)',
    padding: '20px',
    overflow: 'auto',
    minWidth: '300px'
  },
  iframeContainer: {
    flex: 3,
    position: 'relative',
    overflow: 'hidden'
  },
  iframeWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(5px)'
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid transparent',
    borderTop: '4px solid #4285f4',
    borderRight: '4px solid #ea4335',
    borderBottom: '4px solid #fbbc05',
    borderLeft: '4px solid #34a853',
    borderRadius: '50%',
    marginBottom: '20px'
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    borderRadius: '50%'
  },
  loadingText: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600'
  },
  serverIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'white'
  },
  fileList: {
    flex: 1,
    background: 'rgba(26, 26, 26, 0.8)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '20px',
    overflowY: 'auto',
    minHeight: '200px',
    maxHeight: '300px'
  },
  fileListTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  fileListHint: {
    fontSize: '12px',
    color: '#888',
    fontWeight: '400'
  },
  fileTree: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '13px'
  },
  fileTreeItem: {
    padding: '6px 10px 6px 20px',
    borderRadius: '6px',
    color: '#ccc',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '2px'
  },
  folderItem: {
    padding: '6px 10px 6px 10px',
    borderRadius: '6px',
    color: '#ffc107',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '2px',
    fontWeight: '600'
  },
  folderContent: {
    marginLeft: '20px',
    borderLeft: '1px solid rgba(255, 193, 7, 0.2)',
    paddingLeft: '10px'
  },
  fileIcon: {
    fontSize: '14px',
    width: '20px',
    textAlign: 'center'
  },
  folderIcon: {
    fontSize: '14px',
    width: '20px',
    textAlign: 'center'
  },
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  },
  folderName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  },
  versionTag: {
    background: 'rgba(66, 133, 244, 0.2)',
    color: '#8ab4f8',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '600',
    border: '1px solid rgba(66, 133, 244, 0.3)'
  },
  arrow: {
    fontSize: '10px',
    marginLeft: 'auto',
    transition: 'transform 0.2s ease'
  },
  // Versions Section
  versionsSection: {
    marginBottom: '30px'
  },
  versionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  versionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  versionCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(66, 133, 244, 0.1)',
    borderRadius: '10px',
    padding: '15px',
    transition: 'all 0.3s ease'
  },
  versionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  versionName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff'
  },
  versionNumber: {
    background: 'rgba(66, 133, 244, 0.2)',
    color: '#8ab4f8',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600'
  },
  versionDesc: {
    color: '#aaa',
    fontSize: '13px',
    lineHeight: '1.4',
    marginBottom: '10px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  versionStats: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  versionStat: {
    color: '#888',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  downloadButton: {
    background: 'linear-gradient(90deg, #4285f4, #34a853)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    width: '100%',
    transition: 'all 0.3s ease'
  },
  // Comments Section
  commentsSection: {
    marginBottom: '30px'
  },
  commentsHeader: {
    marginBottom: '15px'
  },
  commentsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px'
  },
  newCommentButton: {
    background: 'rgba(66, 133, 244, 0.15)',
    color: '#8ab4f8',
    border: '1px solid rgba(66, 133, 244, 0.3)',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
    transition: 'all 0.3s ease'
  },
  commentForm: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(66, 133, 244, 0.2)',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '20px',
    overflow: 'hidden'
  },
  commentTextarea: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '10px',
    color: 'white',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px',
    marginBottom: '10px',
    boxSizing: 'border-box'
  },
  commentError: {
    color: '#ff6b6b',
    fontSize: '13px',
    marginBottom: '10px',
    padding: '5px 10px',
    background: 'rgba(220, 53, 69, 0.1)',
    borderRadius: '6px',
    border: '1px solid rgba(220, 53, 69, 0.2)'
  },
  commentFormActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  submitCommentButton: {
    background: 'linear-gradient(90deg, #4285f4, #34a853)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease'
  },
  commentLength: {
    color: '#888',
    fontSize: '12px',
    fontFamily: "'Fira Code', monospace"
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxHeight: '400px',
    overflowY: 'auto'
  },
  commentCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '15px'
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  commentUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  commentAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(66, 133, 244, 0.3)'
  },
  commentUsername: {
    color: '#fff',
    fontSize: '14px'
  },
  commentDate: {
    color: '#888',
    fontSize: '12px',
    marginTop: '2px'
  },
  bugReportTag: {
    background: 'rgba(220, 53, 69, 0.15)',
    color: '#ff6b6b',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid rgba(220, 53, 69, 0.2)',
    whiteSpace: 'nowrap'
  },
  commentContent: {
    color: '#ddd',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  noComments: {
    textAlign: 'center',
    color: '#888',
    fontSize: '14px',
    padding: '30px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    border: '1px dashed rgba(255, 255, 255, 0.1)'
  },
  // File Preview Modal
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(5px)'
  },
  previewModal: {
    background: '#1a1a1a',
    color: 'white',
    width: '90%',
    maxWidth: '800px',
    height: '80vh',
    borderRadius: '15px',
    overflow: 'hidden',
    border: '2px solid rgba(66, 133, 244, 0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column'
  },
  previewHeader: {
    background: 'rgba(26, 26, 26, 0.9)',
    padding: '20px',
    borderBottom: '1px solid rgba(66, 133, 244, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  },
  previewTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#fff',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  versionBadge: {
    background: 'rgba(66, 133, 244, 0.2)',
    color: '#8ab4f8',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid rgba(66, 133, 244, 0.3)'
  },
  closePreviewButton: {
    background: 'rgba(220, 53, 69, 0.2)',
    color: '#ff6b6b',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewContent: {
    flex: 1,
    overflow: 'auto'
  },
  codePreview: {
    margin: 0,
    padding: '20px',
    background: '#0a0a0a',
    color: '#f8f8f2',
    fontSize: '13px',
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    height: '100%',
    overflow: 'auto'
  },
  // Modal Styles
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'rgba(0, 0, 0, 0.9)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 2000, 
    backdropFilter: 'blur(5px)'
  },
  warningModal: { 
    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
    color: 'white', 
    width: '90%', 
    maxWidth: '600px', 
    borderRadius: '20px', 
    overflow: 'hidden', 
    border: '2px solid rgba(66, 133, 244, 0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  modalTitle: { 
    margin: 0, 
    padding: '30px', 
    background: 'linear-gradient(90deg, rgba(66, 133, 244, 0.2), rgba(220, 53, 69, 0.2))',
    textAlign: 'center', 
    fontSize: '24px', 
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  modalContent: { 
    padding: '30px' 
  },
  warningList: { 
    margin: '20px 0', 
    paddingLeft: '20px', 
    lineHeight: '1.6',
    fontSize: '15px',
    color: '#ccc'
  },
  modalFooter: { 
    marginTop: '20px', 
    paddingTop: '20px', 
    borderTop: '1px solid rgba(255,255,255,0.1)', 
    color: '#aaa', 
    fontSize: '14px',
    textAlign: 'center'
  },
  modalActions: { 
    padding: '0 30px 30px', 
    display: 'flex', 
    flexDirection: 'column',
    gap: '15px', 
    alignItems: 'center'
  },
  acceptButton: { 
    background: 'linear-gradient(90deg, #4285f4, #34a853)', 
    color: 'white', 
    border: 'none', 
    padding: '16px 32px', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: '700', 
    fontSize: '16px',
    width: '100%',
    maxWidth: '400px'
  },
  cancelButton: { 
    background: 'rgba(102, 102, 102, 0.3)', 
    color: 'white', 
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '12px 24px', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    maxWidth: '400px'
  }
};
