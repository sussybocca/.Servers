// components/ServerProfileManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tilt } from 'react-parallax-tilt';
import VanillaTilt from 'vanilla-tilt';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { FaCopy, FaTrash, FaEdit, FaEye, FaKey, FaServer, FaLock, FaUnlock, FaBolt, FaClock, FaLink, FaCheck, FaShieldAlt, FaRocket, FaGlobe, FaDatabase, FaTerminal } from 'react-icons/fa';
import { SiJsonwebtokens } from 'react-icons/si';

const ServerProfileManager = () => {
  // State
  const [servers, setServers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('servers');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Forms
  const [serverForm, setServerForm] = useState({
    name: '',
    description: '',
    privacy: 'public',
    generateToken: false
  });
  
  const [tokenForm, setTokenForm] = useState({
    table_name: 'servers',
    record_id: '',
    permissions: { read: true, write: false, delete: false },
    expires_in_hours: 24
  });
  
  const [editForm, setEditForm] = useState({
    serverId: '',
    name: '',
    description: '',
    privacy: 'public'
  });

  // Refs
  const serverCardsRef = useRef([]);
  const tokenCardsRef = useRef([]);
  const headerRef = useRef(null);

  // Initialize particles
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  // Initial load
  useEffect(() => {
    fetchServers();
    fetchTokens();
    
    // Add scroll effect for header
    const handleScroll = () => {
      if (headerRef.current) {
        const scrolled = window.scrollY > 10;
        headerRef.current.style.backdropFilter = scrolled ? 'blur(20px)' : 'blur(10px)';
        headerRef.current.style.backgroundColor = scrolled ? 'rgba(17, 24, 39, 0.8)' : 'rgba(17, 24, 39, 0.6)';
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize VanillaTilt
  useEffect(() => {
    serverCardsRef.current.forEach(ref => {
      if (ref && !ref.vanillaTilt) {
        VanillaTilt.init(ref, {
          max: 25,
          speed: 400,
          glare: true,
          'max-glare': 0.5,
          perspective: 1000,
          scale: 1.05,
          transition: true,
        });
      }
    });
    
    tokenCardsRef.current.forEach(ref => {
      if (ref && !ref.vanillaTilt) {
        VanillaTilt.init(ref, {
          max: 15,
          speed: 300,
          glare: true,
          'max-glare': 0.3,
          perspective: 800,
          scale: 1.03,
        });
      }
    });

    return () => {
      serverCardsRef.current.forEach(ref => {
        if (ref && ref.vanillaTilt) {
          ref.vanillaTilt.destroy();
        }
      });
      tokenCardsRef.current.forEach(ref => {
        if (ref && ref.vanillaTilt) {
          ref.vanillaTilt.destroy();
        }
      });
    };
  }, [servers, tokens]);

  // Message helper with immersive effect
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Fetch servers
  const fetchServers = async () => {
    try {
      const response = await fetch('/api/create-server', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setServers(Array.isArray(result.servers) ? result.servers : []);
      } else {
        showMessage('error', result.error || 'Failed to load servers');
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      showMessage('error', 'Error fetching servers');
    }
  };

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/create-server?getTokens=true', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setTokens(Array.isArray(result.tokens) ? result.tokens : []);
      } else {
        showMessage('error', result.error || 'Failed to load tokens');
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      showMessage('error', 'Error fetching tokens');
    } finally {
      setLoading(false);
    }
  };

  // Create server
  const createServer = async () => {
    try {
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(serverForm)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', '🚀 Server launched successfully!');
        setShowCreateModal(false);
        setServerForm({ name: '', description: '', privacy: 'public', generateToken: false });
        fetchServers();
        
        if (result.token) {
          showMessage('success', '🔑 Token created successfully!');
          fetchTokens();
        }
      } else {
        showMessage('error', result.error || 'Failed to create server');
      }
    } catch (error) {
      console.error('Error creating server:', error);
      showMessage('error', 'Error creating server');
    }
  };

  // Generate token
  const generateToken = async () => {
    try {
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `Token Server - ${tokenForm.table_name}`,
          description: 'Server created for token-based API access',
          privacy: 'private',
          generateToken: true,
          table_name: tokenForm.table_name,
          record_id: tokenForm.record_id,
          permissions: tokenForm.permissions,
          expires_in_hours: tokenForm.expires_in_hours
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', '🔐 Token generated successfully!');
        setShowTokenModal(false);
        setTokenForm({
          table_name: 'servers',
          record_id: '',
          permissions: { read: true, write: false, delete: false },
          expires_in_hours: 24
        });
        fetchServers();
        fetchTokens();
      } else {
        showMessage('error', result.error || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      showMessage('error', 'Error generating token');
    }
  };

  // Update server
  const updateServer = async () => {
    try {
      const response = await fetch('/api/create-server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', '⚡ Server updated successfully!');
        setShowEditModal(false);
        setEditForm({ serverId: '', name: '', description: '', privacy: 'public' });
        fetchServers();
      } else {
        showMessage('error', result.error || 'Failed to update server');
      }
    } catch (error) {
      console.error('Error updating server:', error);
      showMessage('error', 'Error updating server');
    }
  };

  // Delete server
  const deleteServer = async (serverId) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this server? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/create-server', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serverId })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', '🗑️ Server deleted successfully!');
        fetchServers();
      } else {
        showMessage('error', result.error || 'Failed to delete server');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      showMessage('error', 'Error deleting server');
    }
  };

  // Revoke token
  const revokeToken = async (tokenId) => {
    if (!window.confirm('⚠️ Are you sure you want to revoke this token?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/create-server', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokenId })
      });

      const result = await response.json();
      
      if (result.success) {
        showMessage('success', '🔓 Token revoked successfully!');
        fetchTokens();
      } else {
        showMessage('error', result.error || 'Failed to revoke token');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
      showMessage('error', 'Error revoking token');
    }
  };

  // Copy to clipboard with haptic feedback
  const copyToClipboard = async (text) => {
    if (text && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        showMessage('success', '📋 Copied to clipboard!');
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([50]);
        }
      } catch (error) {
        showMessage('error', 'Failed to copy');
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Open edit modal
  const openEditModal = (server) => {
    if (!server) return;
    setEditForm({
      serverId: server.id || '',
      name: server.name || '',
      description: server.description || '',
      privacy: server.is_public ? 'public' : 'private'
    });
    setShowEditModal(true);
  };

  // Loading state with immersive effects
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex flex-col items-center justify-center relative overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-purple-500/10" />
        
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_transparent_1px,_rgba(59,130,246,0.1)_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,_rgba(59,130,246,0.1)_1px)] bg-[size:20px_20px]" />
        
        <Particles
          id="loading-particles"
          init={particlesInit}
          className="absolute inset-0"
          options={{
            background: { color: { value: "transparent" } },
            fpsLimit: 120,
            particles: {
              color: { value: ["#3b82f6", "#8b5cf6", "#10b981"] },
              links: { 
                color: "#3b82f6", 
                distance: 150, 
                enable: true, 
                opacity: 0.4, 
                width: 1.5 
              },
              move: { 
                enable: true, 
                speed: 3,
                outModes: "bounce"
              },
              number: { density: { enable: true, area: 800 }, value: 100 },
              opacity: { value: 0.7 },
              shape: { type: "circle" },
              size: { 
                value: { min: 2, max: 8 },
                animation: {
                  enable: true,
                  speed: 2,
                  minimumValue: 0.5
                }
              },
              wobble: { enable: true, distance: 10, speed: 10 }
            },
            interactivity: {
              events: {
                onHover: { enable: true, mode: "repulse" }
              }
            }
          }}
        />
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 p-1"
          >
            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
              <FaServer className="text-3xl text-white" />
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center z-10"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
            Loading Dashboard
          </h2>
          <p className="text-gray-400 mt-2">Preparing your immersive experience...</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black/50 to-purple-900/10" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_transparent_1px,_rgba(59,130,246,0.05)_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,_rgba(59,130,246,0.05)_1px)] bg-[size:40px_40px]" />
        
        {/* Radial Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Animated Particles */}
      <Particles
        id="background-particles"
        init={particlesInit}
        className="fixed inset-0 -z-10"
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 120,
          particles: {
            color: { 
              value: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"] 
            },
            links: { 
              color: "#4f46e5", 
              distance: 180, 
              enable: true, 
              opacity: 0.15, 
              width: 1.2 
            },
            move: { 
              enable: true, 
              speed: 1.5,
              outModes: "bounce"
            },
            number: { 
              density: { enable: true, area: 800 }, 
              value: 80 
            },
            opacity: { 
              value: { min: 0.1, max: 0.4 },
              animation: {
                enable: true,
                speed: 1,
                minimumValue: 0.1
              }
            },
            shape: { 
              type: ["circle", "triangle", "polygon"],
              options: {
                polygon: { sides: 6 }
              }
            },
            size: { 
              value: { min: 1, max: 5 },
              animation: {
                enable: true,
                speed: 3,
                minimumValue: 0.5
              }
            },
            wobble: { enable: true, distance: 5, speed: 5 }
          },
          interactivity: {
            events: {
              onHover: { 
                enable: true, 
                mode: "grab",
                parallax: { enable: true, force: 60, smooth: 10 }
              },
              onClick: { enable: true, mode: "push" }
            }
          }
        }}
      />

      {/* Floating Elements */}
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="fixed top-20 left-10 w-8 h-8 bg-blue-500/20 rounded-full blur-sm"
      />
      <motion.div
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -5, 0]
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1 
        }}
        className="fixed bottom-20 right-10 w-12 h-12 bg-purple-500/20 rounded-full blur-sm"
      />

      {/* Message Banner with Glow */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 20, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-green-600/90 to-emerald-700/90 border-green-500/50 shadow-green-500/20' 
                : 'bg-gradient-to-r from-red-600/90 to-rose-700/90 border-red-500/50 shadow-red-500/20'
            }`}
            style={{
              boxShadow: `0 0 40px ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className={`p-2 rounded-full ${message.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}
              >
                {message.type === 'success' ? <FaCheck /> : <FaTrash />}
              </motion.div>
              <span className="font-medium">{message.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Glassmorphism */}
      <motion.header
        ref={headerRef}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/60 border-b border-gray-800/50 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-70 animate-pulse" />
                <div className="relative bg-gray-900 p-3 rounded-2xl border border-gray-700/50">
                  <FaServer className="text-2xl text-blue-400" />
                </div>
              </motion.div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Server Dashboard
                </h1>
                <p className="text-gray-400 text-sm">Manage your servers and API tokens</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.1} glareEnable={true}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-semibold shadow-lg shadow-blue-500/25 flex items-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <FaRocket className="text-lg" />
                  <span>New Server</span>
                </motion.button>
              </Tilt>
              
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.1} glareEnable={true}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTokenModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold shadow-lg shadow-purple-500/25 flex items-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/10 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <SiJsonwebtokens className="text-lg" />
                  <span>Generate Token</span>
                </motion.button>
              </Tilt>
            </div>
          </div>
          
          {/* Animated Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex space-x-8 mt-8 relative"
          >
            <div className="absolute bottom-0 h-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 w-full" />
            
            {['servers', 'tokens'].map((tab) => (
              <motion.button
                key={tab}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-4 px-1 font-medium transition-all duration-300 group ${
                  activeTab === tab 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {tab === 'servers' ? (
                    <FaServer className={`${activeTab === tab ? 'text-blue-400' : 'text-gray-500'}`} />
                  ) : (
                    <FaKey className={`${activeTab === tab ? 'text-purple-400' : 'text-gray-500'}`} />
                  )}
                  <span className="relative">
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-4 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                    )}
                  </span>
                  {tab === 'servers' && servers.length > 0 && (
                    <span className="px-2 py-1 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-full text-xs border border-blue-700/30">
                      {servers.length}
                    </span>
                  )}
                  {tab === 'tokens' && tokens.length > 0 && (
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-full text-xs border border-purple-700/30">
                      {tokens.length}
                    </span>
                  )}
                </div>
                
                {/* Hover Effect */}
                {activeTab !== tab && (
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-600/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
      >
        {/* Servers Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'servers' && (
            <motion.div
              key="servers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {servers.length === 0 ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-full flex items-center justify-center mb-6 border border-gray-800/50">
                      <FaServer className="text-5xl text-gray-500" />
                    </div>
                    <div className="text-gray-400 mb-6 text-lg">No servers deployed yet</div>
                    <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} scale={1.1} glareEnable={true}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateModal(true)}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl text-lg font-semibold shadow-2xl shadow-blue-500/25 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <FaRocket className="inline-block mr-3" />
                        Deploy First Server
                      </motion.button>
                    </Tilt>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {servers.map((server, index) => (
                    <motion.div
                      key={server.id || index}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div 
                        ref={el => serverCardsRef.current[index] = el}
                        className="relative group"
                      >
                        {/* Card Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Main Card */}
                        <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
                          {/* Animated Border */}
                          <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-purple-500/0 animate-[gradient_3s_ease_infinite]" />
                          </div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                                  {server.name || 'Unnamed Server'}
                                </h3>
                                <div className="flex items-center space-x-3 mt-2">
                                  <div className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2 ${
                                    server.is_public 
                                      ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 text-green-300 border border-green-700/50' 
                                      : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-300 border border-gray-700/50'
                                  }`}>
                                    {server.is_public ? <FaGlobe /> : <FaLock />}
                                    <span>{server.is_public ? 'Public' : 'Private'}</span>
                                  </div>
                                  <div className="px-3 py-1 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-full text-sm border border-blue-700/30">
                                    <FaDatabase className="inline mr-1 text-xs" /> Server
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700/50">
                                <FaServer className="text-2xl text-blue-400" />
                              </div>
                            </div>
                            
                            {server.description && (
                              <p className="text-gray-400 mb-8 line-clamp-2 bg-gray-900/30 p-4 rounded-xl border border-gray-800/50">
                                {server.description}
                              </p>
                            )}
                            
                            <div className="space-y-4 mb-8">
                              <div className="flex items-center text-gray-400 bg-gray-900/30 p-3 rounded-xl border border-gray-800/30">
                                <FaClock className="mr-3 text-blue-400" />
                                <div>
                                  <div className="text-xs text-gray-500">Created</div>
                                  <div>{formatDate(server.created_at)}</div>
                                </div>
                              </div>
                              {server.renewal_date && (
                                <div className="flex items-center text-gray-400 bg-gray-900/30 p-3 rounded-xl border border-gray-800/30">
                                  <FaBolt className="mr-3 text-cyan-400" />
                                  <div>
                                    <div className="text-xs text-gray-500">Renews</div>
                                    <div>{formatDate(server.renewal_date)}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-4">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => openEditModal(server)}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl font-medium flex items-center justify-center space-x-3 border border-gray-700/50 group/btn"
                              >
                                <FaEdit className="group-hover/btn:rotate-12 transition-transform" />
                                <span>Edit</span>
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => deleteServer(server.id)}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-900/30 to-rose-900/30 hover:from-red-800/40 hover:to-rose-800/40 rounded-xl font-medium flex items-center justify-center space-x-3 border border-red-700/30 group/btn"
                              >
                                <FaTrash className="group-hover/btn:shake transition-transform" />
                                <span>Delete</span>
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tokens Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'tokens' && (
            <motion.div
              key="tokens"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {tokens.length === 0 ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-full flex items-center justify-center mb-6 border border-gray-800/50">
                      <SiJsonwebtokens className="text-5xl text-gray-500" />
                    </div>
                    <div className="text-gray-400 mb-6 text-lg">No API tokens generated yet</div>
                    <Tilt tiltMaxAngleX={15} tiltMaxAngleY={15} scale={1.1} glareEnable={true}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTokenModal(true)}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl text-lg font-semibold shadow-2xl shadow-purple-500/25 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <FaKey className="inline-block mr-3" />
                        Generate First Token
                      </motion.button>
                    </Tilt>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {tokens.map((token, index) => (
                    <motion.div
                      key={token.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div 
                        ref={el => tokenCardsRef.current[index] = el}
                        className="relative group"
                      >
                        {/* Card Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Main Card */}
                        <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden">
                          {/* Animated Border */}
                          <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-pink-500/0 animate-[gradient_3s_ease_infinite]" />
                          </div>
                          
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <div className="flex items-center space-x-3 mb-2">
                                  <FaKey className="text-2xl text-yellow-400" />
                                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                                    API Token
                                  </h3>
                                </div>
                                <p className="text-gray-400 flex items-center">
                                  <FaDatabase className="mr-2" />
                                  Access to: <span className="ml-1 font-semibold text-purple-300">{token.table_name || 'unknown'}</span>
                                </p>
                                {token.record_name && (
                                  <p className="text-gray-400 text-sm mt-1">
                                    Record: <span className="text-cyan-300">{token.record_name}</span>
                                  </p>
                                )}
                              </div>
                              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                                token.status === 'active' 
                                  ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 text-green-300 border border-green-700/50 shadow-lg shadow-green-500/10' 
                                  : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-300 border border-gray-700/50'
                              }`}>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${token.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                                  <span>{token.status || 'unknown'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-8">
                              <div className="text-sm text-gray-500 mb-3 flex items-center">
                                <FaShieldAlt className="mr-2" />
                                <span>Access Permissions:</span>
                              </div>
                              <div className="flex space-x-4">
                                {token.permissions?.read && (
                                  <motion.div 
                                    whileHover={{ scale: 1.1, y: -5 }}
                                    className="px-4 py-3 bg-gradient-to-r from-blue-900/30 to-blue-800/30 text-blue-300 rounded-xl border border-blue-700/50 flex items-center space-x-3 shadow-lg shadow-blue-500/10"
                                  >
                                    <FaEye />
                                    <span>Read</span>
                                  </motion.div>
                                )}
                                {token.permissions?.write && (
                                  <motion.div 
                                    whileHover={{ scale: 1.1, y: -5 }}
                                    className="px-4 py-3 bg-gradient-to-r from-green-900/30 to-green-800/30 text-green-300 rounded-xl border border-green-700/50 flex items-center space-x-3 shadow-lg shadow-green-500/10"
                                  >
                                    <FaEdit />
                                    <span>Write</span>
                                  </motion.div>
                                )}
                                {token.permissions?.delete && (
                                  <motion.div 
                                    whileHover={{ scale: 1.1, y: -5 }}
                                    className="px-4 py-3 bg-gradient-to-r from-red-900/30 to-red-800/30 text-red-300 rounded-xl border border-red-700/50 flex items-center space-x-3 shadow-lg shadow-red-500/10"
                                  >
                                    <FaTrash />
                                    <span>Delete</span>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                            
                            {token.vercel_token_link && (
                              <div className="mb-8">
                                <div className="text-sm text-gray-500 mb-3 flex items-center">
                                  <FaLink className="mr-2" />
                                  <span>Token Endpoint:</span>
                                </div>
                                <div className="flex items-center">
                                  <code className="flex-1 bg-gradient-to-r from-gray-900 to-black p-4 rounded-xl text-sm border border-gray-700/50 truncate font-mono shadow-inner">
                                    {token.vercel_token_link}
                                  </code>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => copyToClipboard(token.vercel_token_link)}
                                    className="ml-4 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl font-medium flex items-center space-x-3 border border-gray-700/50 group/btn"
                                  >
                                    <FaCopy className="group-hover/btn:rotate-12 transition-transform" />
                                    <span>Copy</span>
                                  </motion.button>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-6 mb-8">
                              <div className="bg-gradient-to-br from-gray-900/30 to-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                                <div className="text-sm text-gray-500 mb-2 flex items-center">
                                  <FaClock className="mr-2" />
                                  <span>Created</span>
                                </div>
                                <div className="text-gray-300 font-medium">{formatDate(token.created_at)}</div>
                              </div>
                              <div className="bg-gradient-to-br from-gray-900/30 to-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                                <div className="text-sm text-gray-500 mb-2 flex items-center">
                                  <FaBolt className="mr-2" />
                                  <span>Expires</span>
                                </div>
                                <div className={`font-medium ${token.status === 'active' ? 'text-cyan-300' : 'text-gray-400'}`}>
                                  {formatDate(token.expires_at)}
                                </div>
                              </div>
                            </div>
                            
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => revokeToken(token.id)}
                              className="w-full px-6 py-4 bg-gradient-to-r from-red-900/30 to-rose-900/30 hover:from-red-800/40 hover:to-rose-800/40 rounded-xl font-medium flex items-center justify-center space-x-3 border border-red-700/30 group/btn shadow-lg shadow-red-500/10"
                            >
                              <FaTrash className="group-hover/btn:shake transition-transform" />
                              <span>Revoke Token</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <ModalOverlay onClose={() => setShowCreateModal(false)}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl shadow-blue-500/10 relative overflow-hidden"
            >
              {/* Modal Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-3 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl">
                    <FaRocket className="text-2xl text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Deploy New Server
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <FormInput
                    label="Server Name"
                    value={serverForm.name}
                    onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                    placeholder="Enter server name..."
                    icon={<FaServer className="text-blue-400" />}
                  />
                  
                  <FormTextarea
                    label="Description (Optional)"
                    value={serverForm.description}
                    onChange={(e) => setServerForm({...serverForm, description: e.target.value})}
                    placeholder="Describe your server purpose..."
                    rows="3"
                    icon={<FaTerminal className="text-cyan-400" />}
                  />
                  
                  <FormSelect
                    label="Visibility"
                    value={serverForm.privacy}
                    onChange={(e) => setServerForm({...serverForm, privacy: e.target.value})}
                    options={[
                      { value: 'public', label: '🌐 Public (Anyone can view)' },
                      { value: 'private', label: '🔒 Private (Only you can view)' }
                    ]}
                    icon={serverForm.privacy === 'public' ? <FaGlobe className="text-green-400" /> : <FaLock className="text-yellow-400" />}
                  />
                  
                  <FormCheckbox
                    label="Generate API token for this server"
                    checked={serverForm.generateToken}
                    onChange={(e) => setServerForm({...serverForm, generateToken: e.target.checked})}
                    id="generateToken"
                  />
                </div>
                
                <div className="flex space-x-4 mt-10">
                  <ModalButton onClick={() => setShowCreateModal(false)} variant="secondary">
                    Cancel
                  </ModalButton>
                  <ModalButton onClick={createServer} variant="primary">
                    <FaRocket className="mr-2" />
                    Deploy Server
                  </ModalButton>
                </div>
              </div>
            </motion.div>
          </ModalOverlay>
        )}

        {showTokenModal && (
          <ModalOverlay onClose={() => setShowTokenModal(false)}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl shadow-purple-500/10 relative overflow-hidden"
            >
              {/* Modal Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-3 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl">
                    <SiJsonwebtokens className="text-2xl text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Generate API Token
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <FormSelect
                    label="Resource Type"
                    value={tokenForm.table_name}
                    onChange={(e) => setTokenForm({...tokenForm, table_name: e.target.value})}
                    options={[
                      { value: 'servers', label: '🖥️ Servers' },
                      { value: 'users', label: '👤 Users' },
                      { value: 'boteos', label: '📦 Boteos' },
                      { value: 'bots', label: '🤖 Bots' }
                    ]}
                    icon={<FaDatabase className="text-purple-400" />}
                  />
                  
                  <FormInput
                    label="Resource ID (Optional)"
                    value={tokenForm.record_id}
                    onChange={(e) => setTokenForm({...tokenForm, record_id: e.target.value})}
                    placeholder="Leave empty for all resources"
                    description="Specific UUID for targeted access"
                    icon={<FaKey className="text-pink-400" />}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center">
                      <FaShieldAlt className="mr-2 text-cyan-400" />
                      <span>Access Permissions</span>
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <PermissionToggle
                        label="Read"
                        checked={tokenForm.permissions.read}
                        onChange={(checked) => setTokenForm({
                          ...tokenForm,
                          permissions: {...tokenForm.permissions, read: checked}
                        })}
                        icon={<FaEye />}
                        color="blue"
                      />
                      <PermissionToggle
                        label="Write"
                        checked={tokenForm.permissions.write}
                        onChange={(checked) => setTokenForm({
                          ...tokenForm,
                          permissions: {...tokenForm.permissions, write: checked}
                        })}
                        icon={<FaEdit />}
                        color="green"
                      />
                      <PermissionToggle
                        label="Delete"
                        checked={tokenForm.permissions.delete}
                        onChange={(checked) => setTokenForm({
                          ...tokenForm,
                          permissions: {...tokenForm.permissions, delete: checked}
                        })}
                        icon={<FaTrash />}
                        color="red"
                      />
                    </div>
                  </div>
                  
                  <FormInput
                    label="Expiration (Hours)"
                    type="number"
                    value={tokenForm.expires_in_hours}
                    onChange={(e) => setTokenForm({...tokenForm, expires_in_hours: parseInt(e.target.value) || 24})}
                    min="1"
                    max="8760"
                    icon={<FaClock className="text-yellow-400" />}
                  />
                </div>
                
                <div className="flex space-x-4 mt-10">
                  <ModalButton onClick={() => setShowTokenModal(false)} variant="secondary">
                    Cancel
                  </ModalButton>
                  <ModalButton onClick={generateToken} variant="primary">
                    <SiJsonwebtokens className="mr-2" />
                    Generate Token
                  </ModalButton>
                </div>
              </div>
            </motion.div>
          </ModalOverlay>
        )}

        {showEditModal && (
          <ModalOverlay onClose={() => setShowEditModal(false)}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl shadow-blue-500/10 relative overflow-hidden"
            >
              {/* Modal Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-3 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl">
                    <FaEdit className="text-2xl text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Update Server
                  </h2>
                </div>
                
                <div className="space-y-6">
                  <FormInput
                    label="Server Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    icon={<FaServer className="text-blue-400" />}
                  />
                  
                  <FormTextarea
                    label="Description (Optional)"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows="3"
                    icon={<FaTerminal className="text-cyan-400" />}
                  />
                  
                  <FormSelect
                    label="Visibility"
                    value={editForm.privacy}
                    onChange={(e) => setEditForm({...editForm, privacy: e.target.value})}
                    options={[
                      { value: 'public', label: '🌐 Public (Anyone can view)' },
                      { value: 'private', label: '🔒 Private (Only you can view)' }
                    ]}
                    icon={editForm.privacy === 'public' ? <FaGlobe className="text-green-400" /> : <FaLock className="text-yellow-400" />}
                  />
                </div>
                
                <div className="flex space-x-4 mt-10">
                  <ModalButton onClick={() => setShowEditModal(false)} variant="secondary">
                    Cancel
                  </ModalButton>
                  <ModalButton onClick={updateServer} variant="primary">
                    <FaEdit className="mr-2" />
                    Update Server
                  </ModalButton>
                </div>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable Components
const ModalOverlay = ({ children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </motion.div>
);

const ModalButton = ({ children, onClick, variant = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25',
    secondary: 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700/50',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/25'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-1 px-6 py-4 rounded-xl font-semibold flex items-center justify-center ${variants[variant]}`}
    >
      {children}
    </motion.button>
  );
};

const FormInput = ({ label, value, onChange, placeholder, type = 'text', icon, description, ...props }) => (
  <div>
    <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center space-x-2">
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-gray-500"
      placeholder={placeholder}
      {...props}
    />
    {description && (
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    )}
  </div>
);

const FormTextarea = ({ label, value, onChange, placeholder, rows, icon }) => (
  <div>
    <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center space-x-2">
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </label>
    <textarea
      value={value}
      onChange={onChange}
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent placeholder-gray-500 resize-none"
      placeholder={placeholder}
      rows={rows}
    />
  </div>
);

const FormSelect = ({ label, value, onChange, options, icon }) => (
  <div>
    <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center space-x-2">
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent appearance-none cursor-pointer"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-gray-900">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const FormCheckbox = ({ label, checked, onChange, id }) => (
  <label className="flex items-center space-x-3 cursor-pointer group">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        id={id}
        className="sr-only"
      />
      <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
        checked 
          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-transparent' 
          : 'bg-gray-900 border-gray-700'
      }`}>
        {checked && <FaCheck className="text-white text-sm" />}
      </div>
    </div>
    <span className="text-gray-300 group-hover:text-white transition-colors">{label}</span>
  </label>
);

const PermissionToggle = ({ label, checked, onChange, icon, color }) => {
  const colors = {
    blue: 'from-blue-900/40 to-blue-800/40 border-blue-700/60 text-blue-300 shadow-blue-500/20',
    green: 'from-green-900/40 to-green-800/40 border-green-700/60 text-green-300 shadow-green-500/20',
    red: 'from-red-900/40 to-red-800/40 border-red-700/60 text-red-300 shadow-red-500/20',
  };

  return (
    <motion.label 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 shadow-lg ${
        checked 
          ? `${colors[color]} bg-gradient-to-br` 
          : 'bg-gray-900/40 border-gray-700/50 text-gray-500'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className="mb-3 text-2xl">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </motion.label>
  );
};

// Add custom animation
const style = document.createElement('style');
style.textContent = `
  @keyframes gradient {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px) rotate(-2deg); }
    75% { transform: translateX(2px) rotate(2deg); }
  }
  
  .group-hover\\/btn:shake {
    animation: shake 0.5s ease-in-out;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.3);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #3b82f6, #8b5cf6);
    border-radius: 4px;
  }
`;
document.head.appendChild(style);

export default ServerProfileManager;
