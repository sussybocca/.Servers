// components/ServerProfileManager.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParallaxTilt from 'react-parallax-tilt';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { FaCopy, FaTrash, FaEdit, FaEye, FaKey, FaServer, FaLock, FaUnlock, FaBolt, FaClock, FaLink, FaCheck, FaShieldAlt, FaRocket, FaGlobe, FaDatabase, FaTerminal, FaStar, FaCog, FaNetworkWired, FaCloud } from 'react-icons/fa';
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

  // Initialize particles
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  // Initial load
  useEffect(() => {
    fetchServers();
    fetchTokens();
  }, []);

  // Message helper
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

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    if (text && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        showMessage('success', '📋 Copied to clipboard!');
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
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center relative overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-purple-500/10" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,_#3b82f6_1px,_transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,_#3b82f6_1px,_transparent_1px)] bg-[size:40px_40px]" />
        </div>
        
        {/* Floating Elements */}
        <motion.div
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 360, 0]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            y: [0, 30, 0],
            rotate: [0, -360, 0]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"
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
            className="w-32 h-32 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 p-2 shadow-2xl shadow-blue-500/30"
          >
            <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center border border-gray-800">
              <FaServer className="text-4xl text-white" />
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center z-10"
        >
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Loading HyperDock
          </h2>
          <p className="text-gray-400 text-lg">Initializing immersive dashboard...</p>
          <div className="mt-6 flex justify-center space-x-2">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
              className="w-3 h-3 bg-blue-500 rounded-full"
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
              className="w-3 h-3 bg-purple-500 rounded-full"
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.4 }}
              className="w-3 h-3 bg-cyan-500 rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white relative overflow-hidden">
      {/* Immersive Background Effects */}
      <div className="fixed inset-0 -z-20">
        {/* Animated Gradient Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-900" />
        
        {/* Grid Pattern with Animation */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,_#3b82f6_1px,_transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,_#3b82f6_1px,_transparent_1px)] bg-[size:60px_60px]" />
        </div>
        
        {/* Floating Glow Orbs */}
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
        
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/5 to-transparent" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-500/5 to-transparent" />
      </div>

      {/* Particles Background - Client Side Only */}
      {typeof window !== 'undefined' && (
        <Particles
          id="tsparticles"
          init={particlesInit}
          className="fixed inset-0 -z-10"
          options={{
            background: { color: { value: "transparent" } },
            fpsLimit: 120,
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: "repulse",
                },
                onClick: {
                  enable: true,
                  mode: "push",
                },
              },
              modes: {
                repulse: {
                  distance: 100,
                  duration: 0.4,
                },
                push: {
                  quantity: 4,
                },
              },
            },
            particles: {
              color: {
                value: ["#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899"],
              },
              links: {
                color: "#4f46e5",
                distance: 150,
                enable: true,
                opacity: 0.15,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 60,
              },
              opacity: {
                value: 0.3,
                animation: {
                  enable: true,
                  speed: 1,
                  minimumValue: 0.1,
                },
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 5 },
                animation: {
                  enable: true,
                  speed: 3,
                  minimumValue: 0.5,
                },
              },
            },
            detectRetina: true,
          }}
        />
      )}

      {/* Glowing Message Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl backdrop-blur-xl border ${
              message.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-900/40 to-green-900/40 border-emerald-500/50 shadow-2xl shadow-emerald-500/20' 
                : 'bg-gradient-to-r from-rose-900/40 to-red-900/40 border-rose-500/50 shadow-2xl shadow-rose-500/20'
            }`}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className={`p-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}
              >
                {message.type === 'success' ? 
                  <FaCheck className="text-emerald-400" /> : 
                  <FaTrash className="text-rose-400" />
                }
              </motion.div>
              <span className="font-medium">{message.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header with Glassmorphism */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="sticky top-0 z-40 backdrop-blur-2xl bg-gray-900/30 border-b border-gray-800/50 shadow-2xl shadow-black/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative bg-gray-900/80 p-3 rounded-2xl border border-gray-700/50">
                  <FaServer className="text-3xl text-blue-400" />
                </div>
              </motion.div>
              
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  HyperDock
                </h1>
                <p className="text-gray-400 text-sm flex items-center">
                  <FaNetworkWired className="mr-2" />
                  Advanced Server & Token Management System
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <ParallaxTilt
                tiltMaxAngleX={10}
                tiltMaxAngleY={10}
                scale={1.1}
                glareEnable={true}
                glareMaxOpacity={0.3}
                glareColor="#ffffff"
                glarePosition="all"
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold shadow-2xl shadow-blue-500/25 flex items-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <FaRocket className="text-xl" />
                  <span>Launch Server</span>
                </motion.button>
              </ParallaxTilt>
              
              <ParallaxTilt
                tiltMaxAngleX={10}
                tiltMaxAngleY={10}
                scale={1.1}
                glareEnable={true}
                glareMaxOpacity={0.3}
                glareColor="#ffffff"
                glarePosition="all"
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTokenModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl font-bold shadow-2xl shadow-purple-500/25 flex items-center space-x-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <SiJsonwebtokens className="text-xl" />
                  <span>Generate Token</span>
                </motion.button>
              </ParallaxTilt>
            </div>
          </div>
          
          {/* Animated Tabs with Glow */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex space-x-12 mt-8 relative"
          >
            <div className="absolute bottom-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30 w-full" />
            
            {['servers', 'tokens'].map((tab) => (
              <motion.button
                key={tab}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-4 px-2 font-semibold transition-all duration-300 group ${
                  activeTab === tab 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {tab === 'servers' ? (
                    <div className={`p-2 rounded-xl ${activeTab === tab ? 'bg-blue-500/20' : 'bg-gray-800/50'}`}>
                      <FaServer className={`text-lg ${activeTab === tab ? 'text-blue-400' : 'text-gray-500'}`} />
                    </div>
                  ) : (
                    <div className={`p-2 rounded-xl ${activeTab === tab ? 'bg-purple-500/20' : 'bg-gray-800/50'}`}>
                      <FaKey className={`text-lg ${activeTab === tab ? 'text-purple-400' : 'text-gray-500'}`} />
                    </div>
                  )}
                  <span className="relative text-lg">
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      />
                    )}
                  </span>
                  {tab === 'servers' && servers.length > 0 && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-full text-sm border border-blue-700/30">
                      {servers.length}
                    </span>
                  )}
                  {tab === 'tokens' && tokens.length > 0 && (
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-full text-sm border border-purple-700/30">
                      {tokens.length}
                    </span>
                  )}
                </div>
                
                {/* Hover Glow Effect */}
                {activeTab !== tab && (
                  <div className="absolute -bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content Area */}
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
                  className="text-center py-24"
                >
                  <div className="relative inline-block">
                    <div className="w-48 h-48 mx-auto bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-full flex items-center justify-center mb-8 border border-gray-800/50 shadow-2xl">
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center">
                        <FaServer className="text-6xl text-gray-600" />
                      </div>
                    </div>
                    <div className="text-gray-400 mb-8 text-xl">No active servers detected</div>
                    <ParallaxTilt
                      tiltMaxAngleX={15}
                      tiltMaxAngleY={15}
                      scale={1.1}
                      glareEnable={true}
                      glareMaxOpacity={0.3}
                      className="relative"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateModal(true)}
                        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl text-xl font-bold shadow-2xl shadow-blue-500/30 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <FaRocket className="inline-block mr-3 text-2xl" />
                        Deploy First Server
                      </motion.button>
                    </ParallaxTilt>
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
                      <ParallaxTilt
                        tiltMaxAngleX={15}
                        tiltMaxAngleY={15}
                        scale={1.05}
                        glareEnable={true}
                        glareMaxOpacity={0.3}
                        glareColor="#ffffff"
                        glarePosition="all"
                        className="relative group"
                      >
                        {/* Card Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Main Card */}
                        <div className="relative bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 overflow-hidden">
                          {/* Animated Border */}
                          <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 animate-[gradient_3s_ease_infinite]" />
                          </div>
                          
                          {/* Content */}
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent truncate">
                                    {server.name || 'Unnamed Server'}
                                  </h3>
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
                                    server.is_public 
                                      ? 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 text-emerald-300 border border-emerald-700/50' 
                                      : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-300 border border-gray-700/50'
                                  }`}>
                                    {server.is_public ? <FaGlobe /> : <FaLock />}
                                    <span>{server.is_public ? 'Public' : 'Private'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-full text-sm border border-blue-700/30 flex items-center space-x-2">
                                    <FaDatabase className="text-xs" />
                                    <span>Server Instance</span>
                                  </div>
                                  {server.is_public && (
                                    <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-full text-sm border border-emerald-700/30 flex items-center space-x-2">
                                      <FaStar className="text-xs" />
                                      <span>Featured</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 shadow-lg">
                                <FaServer className="text-3xl text-blue-400" />
                              </div>
                            </div>
                            
                            {server.description && (
                              <div className="mb-8">
                                <p className="text-gray-400 line-clamp-3 bg-gray-900/30 p-4 rounded-xl border border-gray-800/50">
                                  {server.description}
                                </p>
                              </div>
                            )}
                            
                            <div className="space-y-4 mb-8">
                              <div className="flex items-center text-gray-400 bg-gray-900/30 p-4 rounded-xl border border-gray-800/30 group/item hover:bg-gray-900/40 transition-colursor-pointer">
                                <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                                  <FaClock className="text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500">Created</div>
                                  <div className="font-medium">{formatDate(server.created_at)}</div>
                                </div>
                              </div>
                              {server.renewal_date && (
                                <div className="flex items-center text-gray-400 bg-gray-900/30 p-4 rounded-xl border border-gray-800/30 group/item hover:bg-gray-900/40 transition-colursor-pointer">
                                  <div className="p-2 bg-cyan-500/10 rounded-lg mr-3">
                                    <FaBolt className="text-cyan-400" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500">Renewal Date</div>
                                    <div className="font-medium text-cyan-300">{formatDate(server.renewal_date)}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-3">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => openEditModal(server)}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 rounded-xl font-medium flex items-center justify-center space-x-3 border border-gray-700/50 group/btn"
                              >
                                <FaEdit className="group-hover/btn:rotate-12 transition-transform duration-300" />
                                <span>Edit</span>
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => deleteServer(server.id)}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-900/30 to-red-900/30 hover:from-rose-800/40 hover:to-red-800/40 rounded-xl font-medium flex items-center justify-center space-x-3 border border-rose-700/30 group/btn"
                              >
                                <FaTrash className="group-hover/btn:scale-110 transition-transform duration-300" />
                                <span>Delete</span>
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </ParallaxTilt>
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
                  className="text-center py-24"
                >
                  <div className="relative inline-block">
                    <div className="w-48 h-48 mx-auto bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-full flex items-center justify-center mb-8 border border-gray-800/50 shadow-2xl">
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full flex items-center justify-center">
                        <SiJsonwebtokens className="text-6xl text-gray-600" />
                      </div>
                    </div>
                    <div className="text-gray-400 mb-8 text-xl">No API tokens available</div>
                    <ParallaxTilt
                      tiltMaxAngleX={15}
                      tiltMaxAngleY={15}
                      scale={1.1}
                      glareEnable={true}
                      glareMaxOpacity={0.3}
                      className="relative"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTokenModal(true)}
                        className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl text-xl font-bold shadow-2xl shadow-purple-500/30 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <FaKey className="inline-block mr-3 text-2xl" />
                        Generate First Token
                      </motion.button>
                    </ParallaxTilt>
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
                      <ParallaxTilt
                        tiltMaxAngleX={10}
                        tiltMaxAngleY={10}
                        scale={1.03}
                        glareEnable={true}
                        glareMaxOpacity={0.2}
                        glareColor="#ffffff"
                        glarePosition="all"
                        className="relative group"
                      >
                        {/* Card Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Main Card */}
                        <div className="relative bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-800/50 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden">
                          {/* Animated Border */}
                          <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-pink-500/0 animate-[gradient_3s_ease_infinite]" />
                          </div>
                          
                          <div className="relative z-10">
                            {/* Header Section */}
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl">
                                    <FaKey className="text-2xl text-yellow-400" />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                                      API Access Token
                                    </h3>
                                    <p className="text-gray-400 flex items-center text-sm">
                                      <FaDatabase className="mr-2" />
                                      Resource: <span className="ml-1 font-semibold text-purple-300">{token.table_name || 'unknown'}</span>
                                    </p>
                                  </div>
                                </div>
                                {token.record_name && (
                                  <p className="text-gray-400 text-sm mt-2">
                                    <FaCog className="inline mr-2" />
                                    Record: <span className="text-cyan-300">{token.record_name}</span>
                                  </p>
                                )}
                              </div>
                              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                                token.status === 'active' 
                                  ? 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 text-emerald-300 border border-emerald-700/50 shadow-lg shadow-emerald-500/10' 
                                  : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 text-gray-300 border border-gray-700/50'
                              }`}>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${token.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                                  <span>{token.status || 'unknown'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Permissions Section */}
                            <div className="mb-8">
                              <div className="text-sm text-gray-500 mb-4 flex items-center">
                                <FaShieldAlt className="mr-2 text-cyan-400" />
                                <span>Access Permissions:</span>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                {token.permissions?.read && (
                                  <motion.div 
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="px-4 py-3 bg-gradient-to-r from-blue-900/30 to-blue-800/30 text-blue-300 rounded-xl border border-blue-700/50 flex items-center justify-center space-x-3 shadow-lg shadow-blue-500/10"
                                  >
                                    <FaEye />
                                    <span className="font-medium">Read</span>
                                  </motion.div>
                                )}
                                {token.permissions?.write && (
                                  <motion.div 
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="px-4 py-3 bg-gradient-to-r from-emerald-900/30 to-green-900/30 text-emerald-300 rounded-xl border border-emerald-700/50 flex items-center justify-center space-x-3 shadow-lg shadow-emerald-500/10"
                                  >
                                    <FaEdit />
                                    <span className="font-medium">Write</span>
                                  </motion.div>
                                )}
                                {token.permissions?.delete && (
                                  <motion.div 
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="px-4 py-3 bg-gradient-to-r from-rose-900/30 to-red-900/30 text-rose-300 rounded-xl border border-rose-700/50 flex items-center justify-center space-x-3 shadow-lg shadow-rose-500/10"
                                  >
                                    <FaTrash />
                                    <span className="font-medium">Delete</span>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                            
                            {/* Token URL Section */}
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
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => copyToClipboard(token.vercel_token_link)}
                                    className="ml-4 px-6 py-3 bg-gradient-to-r from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 rounded-xl font-medium flex items-center space-x-3 border border-gray-700/50"
                                  >
                                    <FaCopy />
                                    <span>Copy</span>
                                  </motion.button>
                                </div>
                              </div>
                            )}
                            
                            {/* Metadata Section */}
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
                            
                            {/* Action Button */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => revokeToken(token.id)}
                              className="w-full px-6 py-4 bg-gradient-to-r from-rose-900/30 to-red-900/30 hover:from-rose-800/40 hover:to-red-800/40 rounded-xl font-bold flex items-center justify-center space-x-3 border border-rose-700/30 shadow-lg shadow-rose-500/10 group/revoke"
                            >
                              <FaTrash className="group-hover/revoke:scale-110 transition-transform duration-300" />
                              <span>Revoke Token</span>
                            </motion.button>
                          </div>
                        </div>
                      </ParallaxTilt>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Immersive Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <ModalOverlay onClose={() => setShowCreateModal(false)}>
            <ModalContent title="Launch New Server" icon={<FaRocket />} gradient="from-blue-400 to-cyan-400">
              <div className="space-y-6">
                <FormInput
                  label="Server Name"
                  value={serverForm.name}
                  onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                  placeholder="Enter a unique server name..."
                  icon={<FaServer className="text-blue-400" />}
                />
                
                <FormTextarea
                  label="Description (Optional)"
                  value={serverForm.description}
                  onChange={(e) => setServerForm({...serverForm, description: e.target.value})}
                  placeholder="Describe your server's purpose..."
                  rows="3"
                  icon={<FaTerminal className="text-cyan-400" />}
                />
                
                <FormSelect
                  label="Server Visibility"
                  value={serverForm.privacy}
                  onChange={(e) => setServerForm({...serverForm, privacy: e.target.value})}
                  options={[
                    { value: 'public', label: '🌐 Public - Accessible to everyone' },
                    { value: 'private', label: '🔒 Private - Only accessible to you' }
                  ]}
                  icon={serverForm.privacy === 'public' ? <FaGlobe className="text-emerald-400" /> : <FaLock className="text-amber-400" />}
                />
                
                <FormCheckbox
                  label="Generate API token for immediate access"
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
                  Launch Server
                </ModalButton>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}

        {showTokenModal && (
          <ModalOverlay onClose={() => setShowTokenModal(false)}>
            <ModalContent title="Generate API Token" icon={<SiJsonwebtokens />} gradient="from-purple-400 to-pink-400">
              <div className="space-y-6">
                <FormSelect
                  label="Resource Type"
                  value={tokenForm.table_name}
                  onChange={(e) => setTokenForm({...tokenForm, table_name: e.target.value})}
                  options={[
                    { value: 'servers', label: '🖥️ Servers - Full server management' },
                    { value: 'users', label: '👤 Users - User data access' },
                    { value: 'boteos', label: '📦 Boteos - Package management' },
                    { value: 'bots', label: '🤖 Bots - Bot control systems' }
                  ]}
                  icon={<FaDatabase className="text-purple-400" />}
                />
                
                <FormInput
                  label="Resource ID (Optional)"
                  value={tokenForm.record_id}
                  onChange={(e) => setTokenForm({...tokenForm, record_id: e.target.value})}
                  placeholder="Leave empty for all resources"
                  description="Specify UUID for granular access control"
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
                  label="Expiration Time (Hours)"
                  type="number"
                  value={tokenForm.expires_in_hours}
                  onChange={(e) => setTokenForm({...tokenForm, expires_in_hours: parseInt(e.target.value) || 24})}
                  min="1"
                  max="8760"
                  description="Token validity duration (1-8760 hours)"
                  icon={<FaClock className="text-amber-400" />}
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
            </ModalContent>
          </ModalOverlay>
        )}

        {showEditModal && (
          <ModalOverlay onClose={() => setShowEditModal(false)}>
            <ModalContent title="Update Server" icon={<FaEdit />} gradient="from-blue-400 to-cyan-400">
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
                  label="Server Visibility"
                  value={editForm.privacy}
                  onChange={(e) => setEditForm({...editForm, privacy: e.target.value})}
                  options={[
                    { value: 'public', label: '🌐 Public - Accessible to everyone' },
                    { value: 'private', label: '🔒 Private - Only accessible to you' }
                  ]}
                  icon={editForm.privacy === 'public' ? <FaGlobe className="text-emerald-400" /> : <FaLock className="text-amber-400" />}
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
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// Enhanced Modal Components
const ModalOverlay = ({ children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div className="absolute inset-0" onClick={e => e.stopPropagation()} />
    <div className="relative z-10" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </motion.div>
);

const ModalContent = ({ children, title, icon, gradient }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0, y: 50 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.8, opacity: 0, y: 50 }}
    className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl relative overflow-hidden"
  >
    {/* Modal Background Glow */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}/5 via-transparent to-transparent`} />
    
    <div className="relative z-10">
      <div className="flex items-center space-x-3 mb-8">
        <div className={`p-3 bg-gradient-to-br ${gradient}/10 rounded-2xl`}>
          {React.cloneElement(icon, { className: "text-2xl" })}
        </div>
        <h2 className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  </motion.div>
);

const ModalButton = ({ children, onClick, variant = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25',
    secondary: 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 border border-gray-700/50',
    danger: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-500/25'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-1 px-6 py-4 rounded-xl font-bold flex items-center justify-center ${variants[variant]}`}
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
    green: 'from-emerald-900/40 to-green-900/40 border-emerald-700/60 text-emerald-300 shadow-emerald-500/20',
    red: 'from-rose-900/40 to-red-900/40 border-rose-700/60 text-rose-300 shadow-rose-500/20',
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

export default ServerProfileManager;
