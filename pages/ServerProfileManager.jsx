// components/ServerProfileManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tilt } from 'react-parallax-tilt';
import VanillaTilt from 'vanilla-tilt';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { FaCopy, FaTrash, FaEdit, FaEye, FaEyeSlash, FaKey, FaServer, FaLock, FaUnlock, FaBolt, FaClock, FaLink, FaCheck } from 'react-icons/fa';
import { IoIosWarning, IoIosInformationCircle } from 'react-icons/io';

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

  // Refs for VanillaTilt
  const serverCardsRef = useRef([]);
  const tokenCardsRef = useRef([]);

  // Initialize particles
  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  // Initial load
  useEffect(() => {
    fetchServers();
    fetchTokens();
  }, []);

  // Initialize VanillaTilt after DOM updates
  useEffect(() => {
    serverCardsRef.current.forEach(ref => {
      if (ref) VanillaTilt.init(ref, {
        max: 15,
        speed: 400,
        glare: true,
        'max-glare': 0.3,
      });
    });
    
    tokenCardsRef.current.forEach(ref => {
      if (ref) VanillaTilt.init(ref, {
        max: 10,
        speed: 300,
        glare: true,
        'max-glare': 0.2,
      });
    });

    // Cleanup
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
        setServers(result.servers || []);
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to view servers');
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
        setTokens(result.tokens || []);
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to view tokens');
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
        showMessage('success', 'Server created successfully!');
        setShowCreateModal(false);
        setServerForm({ name: '', description: '', privacy: 'public', generateToken: false });
        fetchServers();
        
        if (result.token) {
          showMessage('success', `Token created: ${result.token.vercel_token_link}`);
          fetchTokens();
        }
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to create servers');
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
        showMessage('success', 'Token generated successfully!');
        setShowTokenModal(false);
        setTokenForm({
          table_name: 'servers',
          record_id: '',
          permissions: { read: true, write: false, delete: false },
          expires_in_hours: 24
        });
        fetchServers();
        fetchTokens();
        
        if (result.token) {
          showMessage('info', `Token URL: ${result.token.vercel_token_link}`);
        }
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to generate tokens');
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
        showMessage('success', 'Server updated successfully!');
        setShowEditModal(false);
        setEditForm({ serverId: '', name: '', description: '', privacy: 'public' });
        fetchServers();
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to update servers');
      } else if (response.status === 403) {
        showMessage('error', 'You do not own this server');
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
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
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
        showMessage('success', 'Server deleted successfully!');
        fetchServers();
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to delete servers');
      } else if (response.status === 403) {
        showMessage('error', 'You do not own this server');
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
    if (!confirm('Are you sure you want to revoke this token?')) {
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
        showMessage('success', 'Token revoked successfully!');
        fetchTokens();
      } else if (response.status === 401) {
        showMessage('error', 'Please log in to revoke tokens');
      } else {
        showMessage('error', result.error || 'Failed to revoke token');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
      showMessage('error', 'Error revoking token');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copied to clipboard!');
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Open edit modal
  const openEditModal = (server) => {
    setEditForm({
      serverId: server.id,
      name: server.name,
      description: server.description || '',
      privacy: server.is_public ? 'public' : 'private'
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center"
      >
        <div className="relative">
          <Particles
            id="loading-particles"
            init={particlesInit}
            options={{
              background: { color: { value: "transparent" } },
              fpsLimit: 120,
              particles: {
                color: { value: "#10b981" },
                links: { color: "#10b981", distance: 150, enable: true, opacity: 0.5, width: 1 },
                move: { enable: true, speed: 2 },
                number: { density: { enable: true, area: 800 }, value: 80 },
                opacity: { value: 0.5 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 5 } },
              },
            }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Background Particles */}
      <Particles
        id="background-particles"
        init={particlesInit}
        className="absolute inset-0 -z-10"
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 120,
          particles: {
            color: { value: "#4f46e5" },
            links: { 
              color: "#4f46e5", 
              distance: 150, 
              enable: true, 
              opacity: 0.1, 
              width: 1 
            },
            move: { enable: true, speed: 1 },
            number: { density: { enable: true, area: 800 }, value: 50 },
            opacity: { value: 0.1 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
          },
        }}
      />

      {/* Message Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm ${
              message.type === 'success' ? 'bg-green-600/90 border border-green-500' : 
              message.type === 'error' ? 'bg-red-600/90 border border-red-500' : 
              'bg-blue-600/90 border border-blue-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' && <FaCheck className="text-lg" />}
              {message.type === 'error' && <IoIosWarning className="text-lg" />}
              {!message.type && <IoIosInformationCircle className="text-lg" />}
              <span>{message.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-md border-b border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <FaServer className="text-xl" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Server & Token Manager
              </h1>
            </div>
            <div className="flex space-x-4">
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-xl font-medium shadow-lg shadow-green-900/30 flex items-center space-x-2"
                >
                  <FaServer />
                  <span>Create Server</span>
                </motion.button>
              </Tilt>
              
              <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTokenModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-xl font-medium shadow-lg shadow-purple-900/30 flex items-center space-x-2"
                >
                  <FaKey />
                  <span>Generate Token</span>
                </motion.button>
              </Tilt>
            </div>
          </div>
          
          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex space-x-8"
          >
            {['servers', 'tokens'].map((tab) => (
              <motion.button
                key={tab}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 border-b-2 font-medium transition-all duration-300 ${
                  activeTab === tab 
                    ? 'border-green-500 text-green-400' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {tab === 'servers' ? <FaServer /> : <FaKey />}
                  <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                  {tab === 'servers' && servers.length > 0 && (
                    <span className="px-2 py-1 bg-gray-700/50 rounded-full text-xs">
                      {servers.length}
                    </span>
                  )}
                  {tab === 'tokens' && tokens.length > 0 && (
                    <span className="px-2 py-1 bg-gray-700/50 rounded-full text-xs">
                      {tokens.length}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
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
                  <div className="text-gray-400 mb-6 text-lg">No servers yet</div>
                  <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.1}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowCreateModal(true)}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 rounded-xl text-lg font-medium shadow-2xl shadow-green-900/30"
                    >
                      Create Your First Server
                    </motion.button>
                  </Tilt>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {servers.map((server, index) => (
                    <div 
                      key={server.id}
                      ref={el => serverCardsRef.current[index] = el}
                      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-xl font-bold truncate mb-1">{server.name}</h3>
                          <div className="flex items-center space-x-2">
                            <div className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
                              server.is_public 
                                ? 'bg-green-900/30 text-green-300 border border-green-700/50' 
                                : 'bg-gray-700/30 text-gray-300 border border-gray-600/50'
                            }`}>
                              {server.is_public ? <FaLock className="text-xs" /> : <FaUnlock className="text-xs" />}
                              <span>{server.is_public ? 'Public' : 'Private'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg">
                          <FaServer className="text-green-400" />
                        </div>
                      </div>
                      
                      {server.description && (
                        <p className="text-gray-400 mb-6 line-clamp-2">{server.description}</p>
                      )}
                      
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center text-sm text-gray-500">
                          <FaClock className="mr-2" />
                          <span>Created: {formatDate(server.created_at)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FaBolt className="mr-2" />
                          <span>Renews: {formatDate(server.renewal_date)}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(server)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl flex items-center justify-center space-x-2"
                        >
                          <FaEdit />
                          <span>Edit</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => deleteServer(server.id)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 rounded-xl flex items-center justify-center space-x-2"
                        >
                          <FaTrash />
                          <span>Delete</span>
                        </motion.button>
                      </div>
                    </div>
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
                  <div className="text-gray-400 mb-6 text-lg">No tokens yet</div>
                  <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.1}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowTokenModal(true)}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 rounded-xl text-lg font-medium shadow-2xl shadow-purple-900/30"
                    >
                      Generate Your First Token
                    </motion.button>
                  </Tilt>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {tokens.map((token, index) => (
                    <div 
                      key={token.id}
                      ref={el => tokenCardsRef.current[index] = el}
                      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 shadow-xl"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 flex items-center space-x-3">
                            <FaKey className="text-yellow-500" />
                            <span>Token for {token.table_name}</span>
                          </h3>
                          {token.record_name && (
                            <p className="text-gray-400">Record: {token.record_name}</p>
                          )}
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                          token.status === 'active' 
                            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 text-green-300 border border-green-700/50' 
                            : 'bg-gradient-to-r from-gray-700/30 to-gray-800/30 text-gray-300 border border-gray-600/50'
                        }`}>
                          {token.status}
                        </div>
                      </div>
                      
                      <div className="mb-8">
                        <div className="text-sm text-gray-500 mb-3 flex items-center">
                          <FaEye className="mr-2" />
                          <span>Permissions:</span>
                        </div>
                        <div className="flex space-x-4">
                          {token.permissions.read && (
                            <motion.div whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-gradient-to-r from-blue-900/30 to-blue-800/30 text-blue-300 rounded-xl border border-blue-700/50 flex items-center space-x-2">
                              <FaEye />
                              <span>Read</span>
                            </motion.div>
                          )}
                          {token.permissions.write && (
                            <motion.div whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-gradient-to-r from-green-900/30 to-green-800/30 text-green-300 rounded-xl border border-green-700/50 flex items-center space-x-2">
                              <FaEdit />
                              <span>Write</span>
                            </motion.div>
                          )}
                          {token.permissions.delete && (
                            <motion.div whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-gradient-to-r from-red-900/30 to-red-800/30 text-red-300 rounded-xl border border-red-700/50 flex items-center space-x-2">
                              <FaTrash />
                              <span>Delete</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-8">
                        <div className="text-sm text-gray-500 mb-3 flex items-center">
                          <FaLink className="mr-2" />
                          <span>Token URL:</span>
                        </div>
                        <div className="flex items-center">
                          <code className="flex-1 bg-gradient-to-r from-gray-900 to-black p-4 rounded-xl text-sm border border-gray-700/50 truncate">
                            {token.vercel_token_link}
                          </code>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => copyToClipboard(token.vercel_token_link)}
                            className="ml-4 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl flex items-center space-x-2"
                          >
                            <FaCopy />
                            <span>Copy</span>
                          </motion.button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 p-4 rounded-xl border border-gray-700/50">
                          <div className="text-sm text-gray-500 mb-1">Created</div>
                          <div className="flex items-center">
                            <FaClock className="mr-2 text-gray-400" />
                            <span>{formatDate(token.created_at)}</span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 p-4 rounded-xl border border-gray-700/50">
                          <div className="text-sm text-gray-500 mb-1">Expires</div>
                          <div className="flex items-center">
                            <FaBolt className="mr-2 text-gray-400" />
                            <span>{formatDate(token.expires_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => revokeToken(token.id)}
                        className="w-full px-6 py-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 rounded-xl font-medium flex items-center justify-center space-x-3"
                      >
                        <FaTrash />
                        <span>Revoke Token</span>
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals - Using AnimatePresence and motion for smooth transitions */}
      <AnimatePresence>
        {showCreateModal && (
          <ModalOverlay onClose={() => setShowCreateModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Create New Server
              </h2>
              
              <div className="space-y-6">
                <FormInput
                  label="Server Name"
                  value={serverForm.name}
                  onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                  placeholder="My Awesome Server"
                  icon={<FaServer className="text-gray-400" />}
                />
                
                <FormTextarea
                  label="Description (Optional)"
                  value={serverForm.description}
                  onChange={(e) => setServerForm({...serverForm, description: e.target.value})}
                  placeholder="Describe your server..."
                  rows="3"
                />
                
                <FormSelect
                  label="Privacy"
                  value={serverForm.privacy}
                  onChange={(e) => setServerForm({...serverForm, privacy: e.target.value})}
                  options={[
                    { value: 'public', label: 'Public (Anyone can view)' },
                    { value: 'private', label: 'Private (Only you can view)' }
                  ]}
                  icon={serverForm.privacy === 'public' ? <FaUnlock /> : <FaLock />}
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
                  Create Server
                </ModalButton>
              </div>
            </motion.div>
          </ModalOverlay>
        )}

        {showTokenModal && (
          <ModalOverlay onClose={() => setShowTokenModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Generate API Token
              </h2>
              
              <div className="space-y-6">
                <FormSelect
                  label="Table Name"
                  value={tokenForm.table_name}
                  onChange={(e) => setTokenForm({...tokenForm, table_name: e.target.value})}
                  options={[
                    { value: 'servers', label: 'servers' },
                    { value: 'users', label: 'users' },
                    { value: 'boteos', label: 'boteos' },
                    { value: 'bots', label: 'bots' }
                  ]}
                  icon={<FaKey className="text-gray-400" />}
                />
                
                <FormInput
                  label="Record ID (Optional)"
                  value={tokenForm.record_id}
                  onChange={(e) => setTokenForm({...tokenForm, record_id: e.target.value})}
                  placeholder="Leave empty for all records"
                  description="Specific UUID or leave blank for access to all records"
                />
                
                <div>
                  <label className="block text-sm font-medium mb-3 text-gray-300">Permissions</label>
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
                  label="Expires In (Hours)"
                  type="number"
                  value={tokenForm.expires_in_hours}
                  onChange={(e) => setTokenForm({...tokenForm, expires_in_hours: parseInt(e.target.value) || 24})}
                  min="1"
                  max="8760"
                />
              </div>
              
              <div className="flex space-x-4 mt-10">
                <ModalButton onClick={() => setShowTokenModal(false)} variant="secondary">
                  Cancel
                </ModalButton>
                <ModalButton onClick={generateToken} variant="primary">
                  Generate Token
                </ModalButton>
              </div>
            </motion.div>
          </ModalOverlay>
        )}

        {showEditModal && (
          <ModalOverlay onClose={() => setShowEditModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Edit Server
              </h2>
              
              <div className="space-y-6">
                <FormInput
                  label="Server Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  icon={<FaServer className="text-gray-400" />}
                />
                
                <FormTextarea
                  label="Description (Optional)"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows="3"
                />
                
                <FormSelect
                  label="Privacy"
                  value={editForm.privacy}
                  onChange={(e) => setEditForm({...editForm, privacy: e.target.value})}
                  options={[
                    { value: 'public', label: 'Public (Anyone can view)' },
                    { value: 'private', label: 'Private (Only you can view)' }
                  ]}
                  icon={editForm.privacy === 'public' ? <FaUnlock /> : <FaLock />}
                />
              </div>
              
              <div className="flex space-x-4 mt-10">
                <ModalButton onClick={() => setShowEditModal(false)} variant="secondary">
                  Cancel
                </ModalButton>
                <ModalButton onClick={updateServer} variant="primary">
                  Update Server
                </ModalButton>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable Modal Components
const ModalOverlay = ({ children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </motion.div>
);

const ModalButton = ({ children, onClick, variant = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600',
    secondary: 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700',
    danger: 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-1 px-6 py-4 rounded-xl font-medium ${variants[variant]}`}
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
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
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
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
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
      className="w-full bg-gradient-to-r from-gray-900 to-black border border-gray-700/50 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const FormCheckbox = ({ label, checked, onChange, id }) => (
  <label className="flex items-center space-x-3 cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        id={id}
        className="sr-only"
      />
      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
        checked 
          ? 'bg-green-500 border-green-500' 
          : 'bg-gray-900 border-gray-700'
      }`}>
        {checked && <FaCheck className="text-white text-xs" />}
      </div>
    </div>
    <span className="text-gray-300">{label}</span>
  </label>
);

const PermissionToggle = ({ label, checked, onChange, icon, color }) => {
  const colors = {
    blue: 'from-blue-900/30 to-blue-800/30 border-blue-700/50 text-blue-300',
    green: 'from-green-900/30 to-green-800/30 border-green-700/50 text-green-300',
    red: 'from-red-900/30 to-red-800/30 border-red-700/50 text-red-300',
  };

  return (
    <motion.label 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
        checked 
          ? `${colors[color]} bg-gradient-to-br` 
          : 'bg-gray-900/30 border-gray-700/50 text-gray-500'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className="mb-2">{icon}</div>
      <span className="text-sm">{label}</span>
    </motion.label>
  );
};

export default ServerProfileManager;
