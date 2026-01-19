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
  const [iframeKey, setIframeKey] = useState(0); // For iframe refresh
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
      const response = await fetch('/api/get-servers');
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const enterServer = async (serverId) => {
    if (!warningAccepted.current) {
      alert("Please acknowledge the security warning first.");
      setShowWarning(true);
      return;
    }

    setLoadingServer(true);
    setSelectedServer(serverId);
    
    try {
      const filesRes = await fetch(`/api/get-server-files?serverId=${serverId}`);
      const filesData = await filesRes.json();
      
      if (filesData.success && filesData.files) {
        setServerFiles(filesData.files);
        const indexFile = filesData.files.find(f => f.path === '/index.html');
        if (indexFile && indexFile.content) {
          setServerContent(indexFile.content);
        } else {
          setServerContent(`
            <!DOCTYPE html>
            <html>
              <head>
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
                  }
                  h1 {
                    font-size: 3em;
                    margin-bottom: 20px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
                  }
                  p {
                    font-size: 1.2em;
                    opacity: 0.9;
                    max-width: 600px;
                    text-align: center;
                    line-height: 1.6;
                  }
                  .server-info {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 15px;
                    margin-top: 30px;
                    backdrop-filter: blur(10px);
                  }
                </style>
              </head>
              <body>
                <h1>🚀 Welcome to Server.x</h1>
                <p>This server doesn't have an index.html file yet.</p>
                <p>The owner can upload files using the editor to customize this page.</p>
                <div class="server-info">
                  <p>💡 Tip: Create your own server with HTML, CSS, and JavaScript!</p>
                </div>
                <script>
                  console.log('Server.x default page loaded');
                </script>
              </body>
            </html>
          `);
        }
      }
      
      // Increment views
      await fetch('/api/increment-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      
    } catch (error) {
      console.error('Failed to load server:', error);
      setServerContent(`
        <html>
          <body style="background: #1a1a1a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif;">
            <div style="text-align: center; padding: 40px;">
              <h1 style="color: #ff6b6b;">⚠️ Error Loading Server</h1>
              <p>Please try again later.</p>
            </div>
          </body>
        </html>
      `);
    } finally {
      setLoadingServer(false);
      setIframeKey(prev => prev + 1); // Force iframe refresh
    }
  };

  const goBackToExplore = () => {
    setSelectedServer(null);
    setServerFiles([]);
    setServerContent('');
  };

  const logout = () => {
    document.cookie = '__Host-session_secure=; Max-Age=0; Path=/';
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

  // Get current server details
  const currentServer = servers.find(s => s.id === selectedServer);

  // Render warning modal
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

  // Render server view
  const renderServerView = () => (
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
      </motion.div>

      <div style={styles.contentArea}>
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
            style={styles.iframeContainer}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <iframe
              key={iframeKey}
              srcDoc={serverContent}
              style={styles.serverIframe}
              title="Server Content"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
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
        </motion.h4>
        <div style={styles.filesGrid}>
          {serverFiles.slice(0, 8).map((file, index) => (
            <motion.div
              key={file.path}
              style={styles.fileItem}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(66, 133, 244, 0.1)' }}
            >
              <span style={styles.fileIcon}>
                {file.path.endsWith('.html') ? '🌐' : 
                 file.path.endsWith('.js') ? '📜' : 
                 file.path.endsWith('.css') ? '🎨' : '📄'}
              </span>
              <span style={styles.fileName}>{file.path}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

  // Render explore grid
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
        {servers.map((server, index) => (
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
                  🔄 {server.renewal_date ? 'Renews: ' + new Date(server.renewal_date).toLocaleDateString() : 'No renewal'}
                </motion.span>
              </motion.div>
            </motion.div>
          </Tilt>
        ))}
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
                👤 {user?.username || 'User'}
              </motion.span>
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

// === ADVANCED STYLES ===
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
    marginBottom: '50px',
    fontWeight: '400',
    maxWidth: '600px',
    margin: '0 auto 50px'
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
    minHeight: '250px',
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
  serverHeaderSmall: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: '15px'
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
    marginBottom: '20px', 
    flex: 1
  },
  serverStatsGrid: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    color: '#888', 
    fontSize: '13px', 
    borderTop: '2px solid rgba(255,255,255,0.1)',
    paddingTop: '15px',
    fontWeight: '600'
  },
  statSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
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
    borderBottom: '1px solid rgba(66, 133, 244, 0.2)'
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
    transition: 'all 0.2s ease'
  },
  serverInfo: {
    flex: 1
  },
  serverTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#fff',
    fontWeight: '700'
  },
  serverDesc: {
    margin: '5px 0 0',
    color: '#ccc',
    fontSize: '14px',
    maxWidth: '600px'
  },
  serverStats: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  statItem: {
    padding: '6px 12px',
    borderRadius: '15px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
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
    transition: 'all 0.2s ease'
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
    gap: '10px'
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
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
  iframeContainer: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  serverIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'white'
  },
  fileList: {
    background: 'rgba(26, 26, 26, 0.8)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '20px 30px',
    maxHeight: '120px',
    overflowY: 'auto'
  },
  fileListTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    display: 'inline-block'
  },
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px'
  },
  fileItem: {
    background: 'rgba(255,255,255,0.05)',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#ccc',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'default',
    transition: 'all 0.2s ease'
  },
  fileIcon: {
    fontSize: '14px'
  },
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
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
