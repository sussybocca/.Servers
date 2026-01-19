'use client';

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion'; // Use Framer Motion for animations
import Particles from 'react-tsparticles'; // Use tsparticles for background effects
import { loadSlim } from 'tsparticles-slim';

export default function ExplorePage() {
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverFiles, setServerFiles] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverContent, setServerContent] = useState('');
  const [showWarning, setShowWarning] = useState(true); // Controls the initial warning modal
  const warningAccepted = useRef(false);
  const particlesInit = useRef(null);

  // Initialize particles engine
  useEffect(() => {
    loadSlim().then(engine => {
      particlesInit.current = engine;
    });
  }, []);

  // User and server data loading remains the same
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
        setServerContent(indexFile ? indexFile.content : '<h1>No index.html found</h1>');
      }
      // Increment views...
    } catch (error) {
      console.error('Failed to load server:', error);
      setServerContent('<h1>Error loading server</h1>');
    } finally {
      setLoadingServer(false);
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
        transition={{ type: "spring", damping: 20 }}
      >
        <h2 style={styles.modalTitle}>⚠️ CRITICAL SECURITY WARNING ⚠️</h2>
        <div style={styles.modalContent}>
          <p><strong>You are about to enter user-generated content.</strong></p>
          <ul style={styles.warningList}>
            <li>The <strong>entire DOM of this website will be replaced</strong> with content from the server you select.</li>
            <li><strong>DO NOT</strong> use a device containing personal information, saved passwords, or sensitive data.</li>
            <li>Only log in with a <strong>dedicated, disposable account</strong> created for Server.x</li>
            <li>User-generated content can contain <strong>malicious scripts, fake login forms, or harmful code</strong>.</li>
            <li>Server.x provides <strong>no security guarantees</strong> for the content of user servers.</li>
            <li>You are proceeding at <strong>your own risk</strong>.</li>
          </ul>
          <p style={styles.modalFooter}>By clicking "I Understand", you acknowledge these risks.</p>
        </div>
        <div style={styles.modalActions}>
          <button style={styles.acceptButton} onClick={acceptWarning}>
            I Understand & Accept the Risks
          </button>
          <button
            style={styles.cancelButton}
            onClick={() => window.location.href = '/'}
          >
            Cancel and Leave
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
        initial={{ y: -30 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Explore Servers
      </motion.h1>

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
          <motion.div
            key={server.id}
            style={styles.serverCard}
            onClick={() => enterServer(server.id)}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
            transition={{ type: "spring", stiffness: 100 }}
            whileHover={{
              y: -10,
              scale: 1.03,
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={styles.cardGlow} />
            <div style={styles.serverHeaderSmall}>
              <motion.h3
                style={styles.serverName}
                initial={false}
                animate={{ color: server.is_public ? '#4285f4' : '#ea4335' }}
              >
                {server.name}
              </motion.h3>
              <motion.span
                style={{
                  ...styles.serverBadge,
                  backgroundColor: server.is_public ? 'rgba(66, 133, 244, 0.1)' : 'rgba(234, 67, 53, 0.1)',
                  color: server.is_public ? '#4285f4' : '#ea4335'
                }}
                whileHover={{ scale: 1.1 }}
              >
                {server.is_public ? '🌐 PUBLIC' : '🔒 PRIVATE'}
              </motion.span>
            </div>
            <p style={styles.serverDescription}>
              {server.description || 'No description provided.'}
            </p>
            <motion.div
              style={styles.serverStats}
              initial={false}
              animate={{ borderTopColor: server.is_public ? '#4285f4' : '#ea4335' }}
            >
              <span>👁️ {server.views || 0}</span>
              <span>🔄 {server.renewal_date ? new Date(server.renewal_date).toLocaleDateString() : 'N/A'}</span>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  const renderServerView = () => {
    const server = servers.find(s => s.id === selectedServer);

    return (
      <motion.div
        key="server-view"
        style={styles.serverViewContainer}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
      >
        <div style={styles.serverHeader}>
          <motion.button
            style={styles.backButton}
            onClick={goBackToExplore}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back to Explore
          </motion.button>
          <div style={styles.serverInfo}>
            <motion.h2
              style={styles.serverTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {server?.name || 'Loading...'}
            </motion.h2>
            <motion.p
              style={styles.serverDesc}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {server?.description || 'No description'}
            </motion.p>
          </div>
          <motion.div
            style={styles.serverMeta}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <span>👁️ {server?.views || 0}</span>
            <span>{server?.is_public ? '🌐 Public' : '🔒 Private'}</span>
          </motion.div>
        </div>

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
            />
            <p>Loading server content...</p>
          </motion.div>
        ) : (
          <div style={styles.contentArea}>
            <iframe
              srcDoc={serverContent}
              style={styles.serverIframe}
              title="Server Content"
              sandbox="allow-scripts"
            />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <Head>
        <title>Server.x - {selectedServer ? 'Viewing Server' : 'Explore'}</title>
      </Head>

      <Particles
        id="tsparticles"
        init={async (engine) => {
          if (particlesInit.current) await particlesInit.current;
        }}
        options={{
          background: { color: { value: selectedServer ? "#0a0a0a" : "#f0f2f5" } },
          fpsLimit: 60,
          particles: {
            color: { value: selectedServer ? "#ffffff" : "#4285f4" },
            links: { enable: true, distance: 150, color: selectedServer ? "#555" : "#ccc" },
            move: { enable: true, speed: 1 },
            number: { density: { enable: true, area: 800 }, value: selectedServer ? 40 : 30 },
            opacity: { value: 0.3 },
            size: { value: { min: 1, max: 3 } },
          },
        }}
      />

      <div style={{
        ...styles.container,
        backgroundColor: selectedServer ? 'rgba(10, 10, 10, 0.85)' : 'transparent'
      }}>
        <div style={styles.header}>
          <motion.div
            style={styles.logo}
            onClick={selectedServer ? goBackToExplore : undefined}
            whileHover={{ scale: 1.05 }}
          >
            Server.x
          </motion.div>
          <div style={styles.nav}>
            <motion.button
              style={styles.navButton}
              onClick={goToEditor}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Server
            </motion.button>
            <div style={styles.userInfo}>
              <span style={styles.username}>{user?.username || 'User'}</span>
              <motion.button
                style={styles.logoutButton}
                onClick={logout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>

        <div style={styles.main}>
          <AnimatePresence mode="wait">
            {showWarning && renderWarningModal()}
            {!selectedServer ? renderExploreGrid() : renderServerView()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// === STYLES (Enhanced for animations) ===
const styles = {
  container: { minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', transition: 'background-color 0.5s ease' },
  header: { backgroundColor: 'rgba(26, 26, 26, 0.9)', color: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#4285f4', cursor: 'pointer' },
  nav: { display: 'flex', alignItems: 'center', gap: 20 },
  navButton: { backgroundColor: '#4285f4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  username: { color: '#ccc' },
  logoutButton: { backgroundColor: '#666', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  main: { padding: '20px 40px', maxWidth: 1400, margin: '0 auto', minHeight: 'calc(100vh - 80px)' },
  title: { fontSize: 48, marginBottom: 40, color: '#1a1a1a', textAlign: 'center', fontWeight: 800, background: 'linear-gradient(90deg, #4285f4, #ea4335)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  serversGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 30, padding: '20px 0' },
  serverCard: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: 16, padding: 25, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' },
  cardGlow: { position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(66, 133, 244, 0.1), transparent)', transition: 'left 0.6s' },
  serverHeaderSmall: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  serverName: { margin: 0, fontSize: 20, color: '#1a1a1a', fontWeight: 600 },
  serverBadge: { padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid', transition: 'all 0.2s' },
  serverDescription: { color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 20, minHeight: 60 },
  serverStats: { display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 13, borderTop: '2px solid', paddingTop: 15 },
  // Server View Styles
  serverViewContainer: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' },
  serverHeader: { backgroundColor: 'rgba(37, 37, 38, 0.9)', color: 'white', padding: '20px', display: 'flex', alignItems: 'center', gap: 20, borderRadius: '12px 12px 0 0', backdropFilter: 'blur(10px)' },
  backButton: { backgroundColor: '#666', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  serverInfo: { flex: 1 },
  serverTitle: { margin: 0, fontSize: 28, color: 'white' },
  serverDesc: { margin: '5px 0 0', color: '#ccc', fontSize: 16 },
  serverMeta: { display: 'flex', gap: 20, color: '#aaa', fontSize: 14 },
  loadingContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: 20 },
  spinner: { width: 50, height: 50, border: '5px solid #4285f4', borderTopColor: 'transparent', borderRadius: '50%' },
  contentArea: { flex: 1, backgroundColor: 'white', borderRadius: '0 0 12px 12px', overflow: 'hidden' },
  serverIframe: { width: '100%', height: '100%', border: 'none', minHeight: '70vh' },
  // Warning Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
  warningModal: { backgroundColor: '#1a1a1a', color: 'white', width: '90%', maxWidth: 700, borderRadius: 20, overflow: 'hidden', border: '2px solid #dc3545' },
  modalTitle: { margin: 0, padding: '30px', backgroundColor: '#dc3545', textAlign: 'center', fontSize: 24, fontWeight: 700 },
  modalContent: { padding: '30px' },
  warningList: { margin: '20px 0', paddingLeft: 20, lineHeight: 1.8 },
  modalFooter: { marginTop: 25, paddingTop: 20, borderTop: '1px solid #444', color: '#aaa', fontSize: 14 },
  modalActions: { padding: '20px 30px 30px', display: 'flex', gap: 15, justifyContent: 'center' },
  acceptButton: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '15px 30px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16 },
  cancelButton: { backgroundColor: '#666', color: 'white', border: 'none', padding: '15px 30px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }
};
