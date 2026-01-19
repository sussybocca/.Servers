'use client';

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Particles from 'tsparticles/react';
import { loadSlim } from 'tsparticles-slim';
import Tilt from 'react-parallax-tilt';

export default function ExplorePage() {
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverFiles, setServerFiles] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverContent, setServerContent] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const [serverMode, setServerMode] = useState(false); // NEW: Track if we're in full server view
  const warningAccepted = useRef(false);
  const particlesInit = useRef(null);
  const fullscreenRef = useRef(null);

  // Advanced particles initialization
  useEffect(() => {
    loadSlim().then(engine => {
      particlesInit.current = engine;
    });
  }, []);

  // User and server data loading
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

  // ENTER FULL IMMERSIVE SERVER MODE
  const enterFullServerMode = () => {
    setServerMode(true);
    
    // Create a fullscreen container for server content
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.id = 'fullscreen-server-view';
    fullscreenDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: #000;
      overflow: hidden;
    `;
    
    // Create floating control panel
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: rgba(26, 26, 26, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      display: flex;
      gap: 10px;
      border: 2px solid #4285f4;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    const exitBtn = document.createElement('button');
    exitBtn.textContent = '❌ Exit Server';
    exitBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.2s;
    `;
    exitBtn.onclick = exitFullServerMode;
    exitBtn.onmouseenter = () => exitBtn.style.transform = 'scale(1.05)';
    exitBtn.onmouseleave = () => exitBtn.style.transform = 'scale(1)';
    
    controls.appendChild(exitBtn);
    fullscreenDiv.appendChild(controls);
    
    // Create container for server content
    const contentContainer = document.createElement('div');
    contentContainer.id = 'server-content-container';
    contentContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
    `;
    
    // Inject the server's HTML content
    contentContainer.innerHTML = serverContent;
    
    // Fix relative paths in the injected content
    contentContainer.querySelectorAll('[src], [href]').forEach(el => {
      const attr = el.hasAttribute('src') ? 'src' : 'href';
      const value = el.getAttribute(attr);
      if (value && !value.startsWith('http') && !value.startsWith('//')) {
        // You might want to adjust this based on how you store files
        el.setAttribute(attr, `/api/serve-file?serverId=${selectedServer}&path=${encodeURIComponent(value)}`);
      }
    });
    
    fullscreenDiv.appendChild(contentContainer);
    document.body.appendChild(fullscreenDiv);
    fullscreenRef.current = fullscreenDiv;
    
    // Fade in controls
    setTimeout(() => controls.style.opacity = '1', 100);
    
    // Hide controls on hover (show on mouse move)
    let hideTimeout;
    fullscreenDiv.addEventListener('mousemove', () => {
      controls.style.opacity = '1';
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => controls.style.opacity = '0', 2000);
    });
  };

  const exitFullServerMode = () => {
    if (fullscreenRef.current) {
      fullscreenRef.current.remove();
      fullscreenRef.current = null;
    }
    setServerMode(false);
    setSelectedServer(null);
    setServerContent('');
  };

  const enterServer = async (serverId) => {
    if (!warningAccepted.current) {
      alert("You must acknowledge the security warning first.");
      setShowWarning(true);
      return;
    }

    setLoadingServer(true);
    setSelectedServer(serverId);

    try {
      const serverRes = await fetch(`/api/get-server?serverId=${serverId}`);
      const serverData = await serverRes.json();

      const filesRes = await fetch(`/api/get-server-files?serverId=${serverId}`);
      const filesData = await filesRes.json();

      if (filesData.success && filesData.files) {
        setServerFiles(filesData.files);
        const indexFile = filesData.files.find(f => f.path === '/index.html');
        if (indexFile) {
          setServerContent(indexFile.content);
          // Auto-enter full server mode after loading
          setTimeout(enterFullServerMode, 100);
        } else {
          setServerContent('<h1 style="color: white; text-align: center; margin-top: 50vh;">No index.html found</h1>');
          setTimeout(enterFullServerMode, 100);
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
      setServerContent('<h1 style="color: white; text-align: center; margin-top: 50vh;">Error loading server</h1>');
      setTimeout(enterFullServerMode, 100);
    } finally {
      setLoadingServer(false);
    }
  };

  const goBackToExplore = () => {
    if (serverMode) {
      exitFullServerMode();
    } else {
      setSelectedServer(null);
      setServerFiles([]);
      setServerContent('');
    }
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

  // IMMERSIVE PARTICLES CONFIG
  const particlesOptions = {
    background: { 
      color: { value: selectedServer ? "#000000" : "#0a0a0a" }
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: ["grab", "bubble", "repulse"]
        },
        onClick: {
          enable: true,
          mode: "push"
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 200,
          links: { opacity: 0.5 }
        },
        bubble: {
          distance: 200,
          size: 10,
          duration: 2,
          opacity: 0.8
        },
        repulse: {
          distance: 150,
          duration: 0.4
        },
        push: {
          quantity: 4
        }
      }
    },
    particles: {
      color: { 
        value: ["#4285f4", "#ea4335", "#fbbc05", "#34a853"] 
      },
      links: {
        color: "#ffffff",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
        triangles: {
          enable: true,
          opacity: 0.1
        }
      },
      collisions: {
        enable: true
      },
      move: {
        enable: true,
        speed: 1.5,
        direction: "none",
        outModes: {
          default: "bounce"
        },
        attract: {
          enable: true,
          rotate: {
            x: 600,
            y: 1200
          }
        }
      },
      number: {
        value: 80,
        density: {
          enable: true,
          area: 800
        }
      },
      opacity: {
        value: 0.5,
        animation: {
          enable: true,
          speed: 1,
          minimumValue: 0.1,
          sync: false
        }
      },
      shape: {
        type: ["circle", "triangle", "polygon"]
      },
      size: {
        value: { min: 1, max: 5 },
        animation: {
          enable: true,
          speed: 4,
          minimumValue: 0.1,
          sync: false
        }
      }
    },
    detectRetina: true
  };

  // === RENDER FUNCTIONS ===
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
          ⚠️ CRITICAL SECURITY WARNING ⚠️
        </motion.h2>
        <div style={styles.modalContent}>
          <p><strong>You are about to enter user-generated content.</strong></p>
          <ul style={styles.warningList}>
            <li>The <strong>entire screen will be taken over</strong> by the server you select.</li>
            <li><strong>DO NOT</strong> use a device containing personal information.</li>
            <li>Only log in with a <strong>dedicated, disposable account</strong>.</li>
            <li>Content can contain <strong>malicious scripts and harmful code</strong>.</li>
            <li>Server.x provides <strong>no security guarantees</strong>.</li>
          </ul>
          <p style={styles.modalFooter}>By clicking below, you acknowledge these risks.</p>
        </div>
        <div style={styles.modalActions}>
          <motion.button 
            style={styles.acceptButton}
            onClick={acceptWarning}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(220, 53, 69, 0.5)",
                "0 0 40px rgba(220, 53, 69, 0.8)",
                "0 0 20px rgba(220, 53, 69, 0.5)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔓 I Understand & Accept the Risks
          </motion.button>
          <button
            style={styles.cancelButton}
            onClick={() => window.location.href = '/'}
          >
            🚫 Cancel and Leave
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

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
        Click any server to be <span style={{ color: '#4285f4', fontWeight: 'bold' }}>fully immersed</span> in its content
      </motion.p>

      <motion.div
        style={styles.serversGrid}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
          }
        }}
      >
        {servers.map((server, index) => (
          <Tilt
            key={server.id}
            tiltMaxAngleX={15}
            tiltMaxAngleY={15}
            perspective={1000}
            transitionSpeed={1000}
            scale={1.05}
            glareEnable={true}
            glareMaxOpacity={0.3}
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
                y: -15,
                scale: 1.08,
                boxShadow: "0 30px 60px rgba(66, 133, 244, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={(e) => {
                const glow = e.currentTarget.querySelector('.card-glow');
                if (glow) glow.style.left = '100%';
              }}
              onMouseLeave={(e) => {
                const glow = e.currentTarget.querySelector('.card-glow');
                if (glow) glow.style.left = '-100%';
              }}
            >
              <div className="card-glow" style={styles.cardGlow} />
              <div style={styles.serverHeaderSmall}>
                <motion.h3
                  style={styles.serverName}
                  initial={false}
                  animate={{ 
                    color: server.is_public ? '#4285f4' : '#ea4335',
                    textShadow: server.is_public 
                      ? '0 0 10px rgba(66, 133, 244, 0.5)' 
                      : '0 0 10px rgba(234, 67, 53, 0.5)'
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
                    boxShadow: `0 0 15px ${server.is_public ? '#4285f4' : '#ea4335'}`
                  }}
                >
                  {server.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'}
                </motion.span>
              </div>
              <motion.p
                style={styles.serverDescription}
                initial={false}
                animate={{ 
                  color: server.is_public ? '#666' : '#888'
                }}
              >
                {server.description || 'No description provided.'}
              </motion.p>
              <motion.div
                style={styles.serverStats}
                initial={false}
                animate={{ 
                  borderTopColor: server.is_public ? '#4285f4' : '#ea4335',
                  borderTopWidth: '3px'
                }}
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                >
                  👁️ {server.views || 0}
                </motion.span>
                <motion.span
                  whileHover={{ scale: 1.1 }}
                >
                  🔄 {server.renewal_date ? new Date(server.renewal_date).toLocaleDateString() : 'N/A'}
                </motion.span>
              </motion.div>
            </motion.div>
          </Tilt>
        ))}
      </motion.div>
    </motion.div>
  );

  // Don't render anything when in server mode (fullscreen takeover)
  if (serverMode) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Server.x - Explore</title>
      </Head>

      <Particles
        id="tsparticles"
        init={async (engine) => {
          await particlesInit.current;
        }}
        options={particlesOptions}
      />

      <div style={styles.container}>
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
              textShadow: '0 0 20px #4285f4'
            }}
            onClick={() => !selectedServer && (window.location.href = '/explore')}
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
                boxShadow: '0 0 20px rgba(66, 133, 244, 0.5)'
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
                  boxShadow: '0 0 15px rgba(102, 102, 102, 0.5)'
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
            {showWarning && renderWarningModal()}
            {!selectedServer && renderExploreGrid()}
          </AnimatePresence>
          
          {selectedServer && !serverMode && (
            <motion.div
              style={styles.loadingOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                style={styles.spinnerContainer}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <div style={styles.spinner}>
                  <div style={styles.spinnerInner} />
                </div>
              </motion.div>
              <motion.h3
                style={styles.loadingText}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Entering immersive server mode...
              </motion.h3>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

// === IMMERSIVE STYLES ===
const styles = {
  container: { 
    minHeight: '100vh', 
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    overflow: 'hidden'
  },
  header: { 
    background: 'rgba(10, 10, 10, 0.7)', 
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(66, 133, 244, 0.2)',
    color: 'white', 
    padding: '25px 50px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logo: { 
    fontSize: 32, 
    fontWeight: '900',
    cursor: 'pointer',
    letterSpacing: '-0.5px'
  },
  nav: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 30 
  },
  navButton: { 
    background: 'linear-gradient(90deg, #4285f4, #34a853)',
    color: 'white', 
    border: 'none', 
    padding: '14px 28px', 
    borderRadius: '50px', 
    cursor: 'pointer', 
    fontWeight: '700',
    fontSize: '16px',
    letterSpacing: '0.5px',
    transition: 'all 0.3s ease'
  },
  userInfo: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 20,
    background: 'rgba(255,255,255,0.05)',
    padding: '10px 20px',
    borderRadius: '50px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  username: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: '15px'
  },
  logoutButton: { 
    background: 'rgba(102, 102, 102, 0.3)', 
    color: 'white', 
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '10px 20px', 
    borderRadius: '30px', 
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  main: { 
    padding: '40px 50px', 
    maxWidth: '1600px', 
    margin: '0 auto',
    minHeight: 'calc(100vh - 90px)',
    position: 'relative'
  },
  title: { 
    fontSize: '72px', 
    marginBottom: '20px', 
    color: '#fff', 
    textAlign: 'center', 
    fontWeight: '900',
    background: 'linear-gradient(90deg, #4285f4, #ea4335, #fbbc05, #34a853)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(66, 133, 244, 0.3)',
    letterSpacing: '-1px'
  },
  subtitle: {
    fontSize: '22px',
    color: '#aaa',
    textAlign: 'center',
    marginBottom: '60px',
    fontWeight: '400'
  },
  serversGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
    gap: '40px', 
    padding: '40px 0'
  },
  serverCard: { 
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(66, 133, 244, 0.15)', 
    borderRadius: '24px', 
    padding: '30px', 
    cursor: 'pointer', 
    position: 'relative', 
    overflow: 'hidden',
    height: '100%',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  cardGlow: { 
    position: 'absolute', 
    top: 0, 
    left: '-100%', 
    width: '100%', 
    height: '100%', 
    background: 'linear-gradient(90deg, transparent, rgba(66, 133, 244, 0.2), transparent)',
    transition: 'left 0.7s cubic-bezier(0.19, 1, 0.22, 1)',
    pointerEvents: 'none'
  },
  serverHeaderSmall: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: '20px'
  },
  serverName: { 
    margin: 0, 
    fontSize: '26px', 
    color: '#fff', 
    fontWeight: '700',
    lineHeight: '1.3'
  },
  serverBadge: { 
    padding: '8px 16px', 
    borderRadius: '20px', 
    fontSize: '12px', 
    fontWeight: '800', 
    letterSpacing: '0.5px'
  },
  serverDescription: { 
    color: '#aaa', 
    fontSize: '16px', 
    lineHeight: '1.6', 
    marginBottom: '25px', 
    flex: 1
  },
  serverStats: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    color: '#888', 
    fontSize: '14px', 
    borderTop: '3px solid',
    paddingTop: '20px',
    fontWeight: '600'
  },
  // Warning Modal Styles
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'rgba(0, 0, 0, 0.95)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 2000, 
    backdropFilter: 'blur(10px)'
  },
  warningModal: { 
    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
    color: 'white', 
    width: '90%', 
    maxWidth: '800px', 
    borderRadius: '30px', 
    overflow: 'hidden', 
    border: '3px solid #dc3545',
    boxShadow: '0 0 50px rgba(220, 53, 69, 0.5)'
  },
  modalTitle: { 
    margin: 0, 
    padding: '40px', 
    background: 'linear-gradient(90deg, #dc3545, #ff6b6b)',
    textAlign: 'center', 
    fontSize: '32px', 
    fontWeight: '900',
    letterSpacing: '0.5px'
  },
  modalContent: { 
    padding: '40px' 
  },
  warningList: { 
    margin: '30px 0', 
    paddingLeft: '25px', 
    lineHeight: '1.8',
    fontSize: '17px'
  },
  warningList: { 
    margin: '30px 0', 
    paddingLeft: '25px', 
    lineHeight: '1.8',
    fontSize: '17px'
  },
  modalFooter: { 
    marginTop: '30px', 
    paddingTop: '25px', 
    borderTop: '1px solid rgba(255,255,255,0.1)', 
    color: '#ccc', 
    fontSize: '16px',
    textAlign: 'center'
  },
  modalActions: { 
    padding: '30px 40px 40px', 
    display: 'flex', 
    flexDirection: 'column',
    gap: '20px', 
    alignItems: 'center'
  },
  acceptButton: { 
    background: 'linear-gradient(90deg, #dc3545, #ff4757)', 
    color: 'white', 
    border: 'none', 
    padding: '20px 40px', 
    borderRadius: '15px', 
    cursor: 'pointer', 
    fontWeight: '900', 
    fontSize: '18px',
    width: '100%',
    maxWidth: '500px',
    letterSpacing: '0.5px'
  },
  cancelButton: { 
    background: 'rgba(102, 102, 102, 0.3)', 
    color: 'white', 
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '15px 30px', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontWeight: '600',
    fontSize: '16px'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
    backdropFilter: 'blur(10px)'
  },
  spinnerContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
    marginBottom: '40px'
  },
  spinner: {
    width: '100%',
    height: '100%',
    border: '5px solid transparent',
    borderTop: '5px solid #4285f4',
    borderRight: '5px solid #ea4335',
    borderBottom: '5px solid #fbbc05',
    borderLeft: '5px solid #34a853',
    borderRadius: '50%',
    position: 'relative'
  },
  spinnerInner: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    right: '10px',
    bottom: '10px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderRadius: '50%'
  },
  loadingText: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: '600'
  }
};
