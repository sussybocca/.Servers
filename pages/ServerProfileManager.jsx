// components/ServerProfileManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tilt } from 'react-parallax-tilt';
import VanillaTilt from 'vanilla-tilt';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { FaCopy, FaTrash, FaEdit, FaEye, FaKey, FaServer, FaLock, FaUnlock, FaBolt, FaClock, FaLink, FaCheck } from 'react-icons/fa';

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

  // Initial load
  useEffect(() => {
    fetchServers();
    fetchTokens();
  }, []);

  // Initialize VanillaTilt
  useEffect(() => {
    serverCardsRef.current.forEach(ref => {
      if (ref && !ref.vanillaTilt) {
        VanillaTilt.init(ref, {
          max: 15,
          speed: 400,
          glare: true,
          'max-glare': 0.3,
        });
      }
    });
    
    tokenCardsRef.current.forEach(ref => {
      if (ref && !ref.vanillaTilt) {
        VanillaTilt.init(ref, {
          max: 10,
          speed: 300,
          glare: true,
          'max-glare': 0.2,
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
        showMessage('success', 'Server created successfully!');
        setShowCreateModal(false);
        setServerForm({ name: '', description: '', privacy: 'public', generateToken: false });
        fetchServers();
        
        if (result.token) {
          showMessage('success', 'Token created successfully!');
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
    if (!window.confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
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
    if (!window.confirm('Are you sure you want to revoke this token?')) {
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
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showMessage('success', 'Copied to clipboard!');
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Message Banner */}
      {message.text && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Server & Token Manager</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Create Server
              </button>
              <button
                onClick={() => setShowTokenModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                Generate Token
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8 mt-6">
            {['servers', 'tokens'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 border-b-2 ${
                  activeTab === tab 
                    ? 'border-green-500 text-green-400' 
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Servers Tab */}
        {activeTab === 'servers' && (
          <div>
            {servers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No servers yet</div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Create Your First Server
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servers.map((server, index) => (
                  <div 
                    key={server.id || index}
                    ref={el => serverCardsRef.current[index] = el}
                    className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold">{server.name || 'Unnamed Server'}</h3>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        server.is_public ? 'bg-green-900' : 'bg-gray-700'
                      }`}>
                        {server.is_public ? 'Public' : 'Private'}
                      </div>
                    </div>
                    
                    {server.description && (
                      <p className="text-gray-400 mb-4">{server.description}</p>
                    )}
                    
                    <div className="text-sm text-gray-500 mb-6">
                      <div>Created: {formatDate(server.created_at)}</div>
                      {server.renewal_date && (
                        <div>Renews: {formatDate(server.renewal_date)}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => openEditModal(server)}
                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteServer(server.id)}
                        className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div>
            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No tokens yet</div>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Generate Your First Token
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {tokens.map((token, index) => (
                  <div 
                    key={token.id || index}
                    ref={el => tokenCardsRef.current[index] = el}
                    className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold">Token for {token.table_name || 'unknown'}</h3>
                        {token.record_name && (
                          <p className="text-gray-400">Record: {token.record_name}</p>
                        )}
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${
                        token.status === 'active' ? 'bg-green-900' : 'bg-gray-700'
                      }`}>
                        {token.status || 'unknown'}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">Permissions:</div>
                      <div className="flex space-x-3">
                        {token.permissions?.read && (
                          <span className="px-2 py-1 bg-blue-900 rounded text-xs">Read</span>
                        )}
                        {token.permissions?.write && (
                          <span className="px-2 py-1 bg-green-900 rounded text-xs">Write</span>
                        )}
                        {token.permissions?.delete && (
                          <span className="px-2 py-1 bg-red-900 rounded text-xs">Delete</span>
                        )}
                      </div>
                    </div>
                    
                    {token.vercel_token_link && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-500 mb-1">Token URL:</div>
                        <div className="flex items-center">
                          <code className="flex-1 bg-gray-900 p-2 rounded text-sm truncate">
                            {token.vercel_token_link}
                          </code>
                          <button
                            onClick={() => copyToClipboard(token.vercel_token_link)}
                            className="ml-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-500 mb-6">
                      <div>Created: {formatDate(token.created_at)}</div>
                      <div>Expires: {formatDate(token.expires_at)}</div>
                    </div>
                    
                    <button
                      onClick={() => revokeToken(token.id)}
                      className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg"
                    >
                      Revoke Token
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Create New Server</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Server Name</label>
                <input
                  type="text"
                  value={serverForm.name}
                  onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  placeholder="My Awesome Server"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={serverForm.description}
                  onChange={(e) => setServerForm({...serverForm, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  rows="3"
                  placeholder="Describe your server..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Privacy</label>
                <select
                  value={serverForm.privacy}
                  onChange={(e) => setServerForm({...serverForm, privacy: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                >
                  <option value="public">Public (Anyone can view)</option>
                  <option value="private">Private (Only you can view)</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={serverForm.generateToken}
                  onChange={(e) => setServerForm({...serverForm, generateToken: e.target.checked})}
                  className="mr-2"
                  id="generateToken"
                />
                <label htmlFor="generateToken" className="text-sm">
                  Generate API token for this server
                </label>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createServer}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}

      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Generate API Token</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Table Name</label>
                <select
                  value={tokenForm.table_name}
                  onChange={(e) => setTokenForm({...tokenForm, table_name: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                >
                  <option value="servers">servers</option>
                  <option value="users">users</option>
                  <option value="boteos">boteos</option>
                  <option value="bots">bots</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Record ID (Optional)</label>
                <input
                  type="text"
                  value={tokenForm.record_id}
                  onChange={(e) => setTokenForm({...tokenForm, record_id: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  placeholder="Leave empty for all records"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tokenForm.permissions.read}
                      onChange={(e) => setTokenForm({
                        ...tokenForm,
                        permissions: {...tokenForm.permissions, read: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span>Read</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tokenForm.permissions.write}
                      onChange={(e) => setTokenForm({
                        ...tokenForm,
                        permissions: {...tokenForm.permissions, write: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span>Write</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tokenForm.permissions.delete}
                      onChange={(e) => setTokenForm({
                        ...tokenForm,
                        permissions: {...tokenForm.permissions, delete: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span>Delete</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Expires In (Hours)</label>
                <input
                  type="number"
                  value={tokenForm.expires_in_hours}
                  onChange={(e) => setTokenForm({...tokenForm, expires_in_hours: parseInt(e.target.value) || 24})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  min="1"
                  max="8760"
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowTokenModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={generateToken}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                Generate Token
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Edit Server</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Server Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                  rows="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Privacy</label>
                <select
                  value={editForm.privacy}
                  onChange={(e) => setEditForm({...editForm, privacy: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                >
                  <option value="public">Public (Anyone can view)</option>
                  <option value="private">Private (Only you can view)</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={updateServer}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Update Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerProfileManager;
