import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase/client';
import './styles.css';

export default function Explore() {
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);
  
  // Refs for effects
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const particleSystems = useRef([]);
  const lastTime = useRef(0);
  const frameCount = useRef(0);
  
  // Load servers from Supabase
  useEffect(() => {
    fetchServers();
    
    // Set up particle effects
    initParticles();
    
    // Start animation loop
    const animate = (time) => {
      frameCount.current++;
      if (frameCount.current % 2 === 0) { // Target ~30fps
        updateParticles(time);
        frameCount.current = 0;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    
    return () => {
      // Cleanup particle systems
      particleSystems.current = [];
    };
  }, []);
  
  // Filter servers based on search
  useEffect(() => {
    const filtered = servers.filter(server =>
      server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // Sort based on selected criteria
    const sorted = [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'popular': return b.views - a.views;
        case 'newest': return new Date(b.created_at) - new Date(a.created_at);
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    
    setFilteredServers(sorted);
  }, [servers, searchTerm, sortBy]);
  
  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setServers(data || []);
      setFilteredServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const initParticles = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Create multiple particle systems
    for (let i = 0; i < 5; i++) {
      particleSystems.current.push({
        particles: Array.from({ length: 20 }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          color: `hsl(${Math.random() * 60 + 200}, 70%, 60%)`,
          life: 1
        }))
      });
    }
  };
  
  const updateParticles = (time) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear with fade effect
    ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Update and draw particles
    particleSystems.current.forEach(system => {
      system.particles.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
        
        // Draw particle with glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Create glow effect
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius * 3
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Connect nearby particles with lines
        system.particles.forEach(other => {
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(100, 100, 255, ${0.2 * (1 - distance/100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
    });
  };
  
  const handleServerClick = (server) => {
    setSelectedServer(server);
    setWarningVisible(true);
    
    // Update view count
    updateViewCount(server.id);
  };
  
  const updateViewCount = async (serverId) => {
    try {
      const { data } = await supabase
        .from('servers')
        .select('views')
        .eq('id', serverId)
        .single();
      
      await supabase
        .from('servers')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', serverId);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };
  
  const proceedToServer = () => {
    if (!selectedServer) return;
    
    // Warning message
    alert(`⚠️ SECURITY WARNING ⚠️\n\nYou are about to enter: ${selectedServer.name}\n\n• Use a private/incognito browser\n• Don't enter personal information\n• Server has full DOM access\n\nClick OK to proceed (at your own risk)`);
    
    // In production, this would dynamically load and execute the server JSX
    window.location.href = `/api/execute?server=${selectedServer.id}`;
  };
  
  const ServerCard = ({ server, index }) => {
    const cardRef = useRef(null);
    
    useEffect(() => {
      const card = cardRef.current;
      if (!card) return;
      
      const handleMouseMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = (x - centerX) / 25;
        const rotateX = (centerY - y) / 25;
        
        card.style.transform = `
          perspective(1000px)
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          translateZ(10px)
        `;
        
        // Parallax effect for background
        const bgX = (x / rect.width - 0.5) * 20;
        const bgY = (y / rect.height - 0.5) * 20;
        card.style.backgroundPosition = `${50 + bgX}% ${50 + bgY}%`;
      };
      
      const handleMouseLeave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        card.style.backgroundPosition = 'center';
      };
      
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, []);
    
    return (
      <div
        ref={cardRef}
        className="server-card"
        style={{
          animationDelay: `${index * 0.1}s`,
          background: `linear-gradient(45deg, 
            hsl(${index * 30 % 360}, 70%, 15%), 
            hsl(${(index * 30 + 60) % 360}, 70%, 10%)
          )`
        }}
        onClick={() => handleServerClick(server)}
      >
        <div className="server-card-glow"></div>
        <div className="server-card-content">
          <div className="server-header">
            <h3 className="server-name">{server.name}</h3>
            <span className="server-views">
              <i className="fas fa-eye"></i> {server.views || 0}
            </span>
          </div>
          <p className="server-description">{server.description}</p>
          <div className="server-tags">
            {server.tags?.slice(0, 3).map((tag, i) => (
              <span key={i} className="tag">{tag}</span>
            ))}
          </div>
          <div className="server-footer">
            <span className="server-author">
              <i className="fas fa-user"></i> {server.author}
            </span>
            <span className="server-date">
              {new Date(server.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="server-card-hover">
          <i className="fas fa-arrow-right"></i>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p>Loading servers...</p>
      </div>
    );
  }
  
  return (
    <div className="explore-container" ref={containerRef}>
      {/* Animated background canvas */}
      <canvas 
        ref={canvasRef} 
        className="particle-canvas"
      />
      
      {/* Header with search and controls */}
      <header className="explore-header">
        <div className="header-content">
          <h1 className="title">
            <span className="title-gradient">Server's</span>
            <span className="title-badge">BETA</span>
          </h1>
          <p className="subtitle">Explore immersive JSX servers created by the community</p>
          
          <div className="controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search servers, tags, or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            
            <div className="sort-controls">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="name">Name (A-Z)</option>
              </select>
              
              <button 
                className="create-btn"
                onClick={() => window.location.href = '/edit'}
              >
                <i className="fas fa-plus"></i> Create Server
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Servers grid */}
      <main className="servers-grid">
        {filteredServers.length === 0 ? (
          <div className="no-servers">
            <i className="fas fa-server"></i>
            <h3>No servers found</h3>
            <p>Try a different search or create the first one!</p>
          </div>
        ) : (
          filteredServers.map((server, index) => (
            <ServerCard 
              key={server.id} 
              server={server} 
              index={index}
            />
          ))
        )}
      </main>
      
      {/* Server warning modal */}
      {warningVisible && selectedServer && (
        <div className="warning-modal">
          <div className="warning-content">
            <div className="warning-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2>Security Warning</h2>
            <p className="warning-text">
              You are about to enter <strong>{selectedServer.name}</strong>
            </p>
            <div className="warning-details">
              <p><i className="fas fa-exclamation-circle"></i> This server has full DOM access</p>
              <p><i className="fas fa-exclamation-circle"></i> Can modify or access browser data</p>
              <p><i className="fas fa-exclamation-circle"></i> May execute arbitrary JavaScript</p>
              <p><i className="fas fa-shield-alt"></i> <strong>Recommended:</strong> Use private browsing mode</p>
              <p><i className="fas fa-shield-alt"></i> <strong>Do not:</strong> Enter personal information</p>
            </div>
            <div className="warning-actions">
              <button 
                className="warning-btn cancel"
                onClick={() => setWarningVisible(false)}
              >
                Cancel
              </button>
              <button 
                className="warning-btn proceed"
                onClick={proceedToServer}
              >
                I Understand - Proceed
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats footer */}
      <footer className="stats-footer">
        <div className="stat">
          <span className="stat-number">{servers.length}</span>
          <span className="stat-label">Total Servers</span>
        </div>
        <div className="stat">
          <span className="stat-number">
            {servers.reduce((sum, server) => sum + (server.views || 0), 0)}
          </span>
          <span className="stat-label">Total Views</span>
        </div>
        <div className="stat">
          <span className="stat-number">
            {new Set(servers.map(s => s.author)).size}
          </span>
          <span className="stat-label">Active Creators</span>
        </div>
      </footer>
    </div>
  );
}
