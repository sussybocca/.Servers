// components/ServerProfileManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ParallaxTilt from 'react-parallax-tilt';
import * as THREE from 'three';
import { 
  FaCopy, FaTrash, FaEdit, FaEye, FaKey, FaServer, FaLock, FaUnlock, 
  FaBolt, FaClock, FaLink, FaCheck, FaShieldAlt, FaRocket, FaGlobe, 
  FaDatabase, FaTerminal, FaStar, FaCog, FaNetworkWired, FaCloud, 
  FaSatellite, FaWifi, FaGhost, FaRobot, FaUserAstronaut, FaMagic,
  FaGamepad, FaVrCardboard, FaBrain, FaAtom, FaMeteor, FaShapes,
  FaCube, FaRing, FaCrosshairs, FaLayerGroup, FaInfinity, FaWaveSquare,
  FaSparkles, FaFire, FaWater, FaMountain, FaSpaceShuttle, FaSatelliteDish,
  FaChartLine, FaMicrochip, FaCodeBranch, FaEllipsisH,
  FaRegMoon, FaRegSun, FaRegStar, FaRegCompass, FaTimes,
  FaExpand, FaVolumeUp, FaPalette,
  FaBomb, FaCrown, FaDragon, FaFireAlt, FaFish, FaFrog,
  FaGem, FaHatWizard, FaHelicopter, FaIceCream, FaJedi,
  FaMoon, FaPastafarianism, FaRainbow,
  FaSkullCrossbones, FaSnowflake, FaSun, FaTheaterMasks,
  FaUfo, FaVolcano, FaWind, FaPaintBrush
} from 'react-icons/fa';
import { SiJsonwebtokens } from 'react-icons/si';

// Create aliases for icons that need different names
const FaRainbowIcon = FaRainbow;
const FaPaletteIcon = FaPalette;
const FaFireIcon = FaFire;
const FaFishIcon = FaFish;
const FaDragonIcon = FaDragon;
const FaCrownIcon = FaCrown;
const FaMeteorIcon = FaMeteor;
const FaSpaceShuttleIcon = FaSpaceShuttle;
const FaAtomIcon = FaAtom;

// PSYCHEDELIC COLOR PALETTES - ABSOLUTELY ZERO GRAY/BLACK
const PSYCHEDELIC_PALETTES = {
  NEON_EXPLOSION: {
    primary: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#00FF00', '#FF8000', '#8000FF', '#00FF80'],
    secondary: ['#FF00AA', '#AA00FF', '#00FFAA', '#FFAA00', '#00AAFF', '#FF0080', '#80FF00', '#0080FF'],
    accent: ['#FF0066', '#6600FF', '#00FF66', '#FF6600', '#0066FF', '#FF3300', '#33FF00', '#0033FF'],
    bg: 'linear-gradient(135deg, #FF00FF10, #00FFFF10, #FFFF0010, #FF000010, #00FF0010)',
    particle: '#FFFFFF50'
  },
  CYBERPUNK_DREAM: {
    primary: ['#00F7FF', '#FF00AA', '#00FFAA', '#FFAA00', '#7700FF', '#00FF77', '#FF0077', '#00AAFF'],
    secondary: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0066', '#00FF66', '#FF6600', '#6600FF', '#00FFCC'],
    accent: ['#FF00FF', '#00FFAA', '#FFAA00', '#7700FF', '#00FF77', '#FF0077', '#00AAFF', '#FF5500'],
    bg: 'linear-gradient(135deg, #00F7FF10, #FF00AA10, #00FFAA10, #FFAA0010, #7700FF10)',
    particle: '#00F7FF50'
  },
  RAINBOW_VORTEX: {
    primary: ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8000FF', '#FF00FF'],
    secondary: ['#FF3333', '#FF9933', '#FFFF33', '#33FF33', '#33FFFF', '#3333FF', '#9933FF', '#FF33FF'],
    accent: ['#FF6666', '#FFB366', '#FFFF66', '#66FF66', '#66FFFF', '#6666FF', '#B366FF', '#FF66FF'],
    bg: 'linear-gradient(135deg, #FF000010, #FF800010, #FFFF0010, #00FF0010, #00FFFF10, #0000FF10, #8000FF10, #FF00FF10)',
    particle: '#FFFFFF60'
  },
  GALACTIC_NEBULA: {
    primary: ['#FF00FF', '#00FFFF', '#FF8000', '#00FF80', '#FF0080', '#80FF00', '#0080FF', '#FF00AA'],
    secondary: ['#FF33FF', '#33FFFF', '#FFB366', '#33FFB3', '#FF3366', '#B3FF33', '#33B3FF', '#FF33AA'],
    accent: ['#FF66FF', '#66FFFF', '#FFCC99', '#66FFCC', '#FF6699', '#CCFF66', '#66CCFF', '#FF66CC'],
    bg: 'linear-gradient(135deg, #FF00FF10, #00FFFF10, #FF800010, #00FF8010, #FF008010, #80FF0010, #0080FF10, #FF00AA10)',
    particle: '#FF00FF40'
  },
  ATOMIC_FUSION: {
    primary: ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FF8000', '#8000FF'],
    secondary: ['#33FF33', '#FF3333', '#3333FF', '#FFFF33', '#33FFFF', '#FF33FF', '#FFB366', '#B366FF'],
    accent: ['#66FF66', '#FF6666', '#6666FF', '#FFFF66', '#66FFFF', '#FF66FF', '#FFCC99', '#CC99FF'],
    bg: 'linear-gradient(135deg, #00FF0010, #FF000010, #0000FF10, #FFFF0010, #00FFFF10, #FF00FF10, #FF800010, #8000FF10)',
    particle: '#00FF0050'
  }
};

const ServerProfileManager = () => {
  // State
  const [servers, setServers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('servers');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [colorPalette, setColorPalette] = useState('NEON_EXPLOSION');
  const [visualIntensity, setVisualIntensity] = useState(100);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  
  // Forms
  const [serverForm, setServerForm] = useState({
    name: '',
    description: '',
    privacy: 'public',
    generateToken: false,
    serverType: 'quantum',
    powerLevel: 100
  });
  
  const [tokenForm, setTokenForm] = useState({
    table_name: 'servers',
    record_id: '',
    permissions: { read: true, write: true, delete: false, admin: false },
    expires_in_hours: 72,
    tokenType: 'quantum'
  });
  
  const [editForm, setEditForm] = useState({
    serverId: '',
    name: '',
    description: '',
    privacy: 'public',
    serverType: 'quantum'
  });

  // Refs
  const canvasRef = useRef(null);
  const threeRef = useRef(null);
  const rafRef = useRef(null);
  const frameInterval = 1000 / 30;

  const currentPalette = PSYCHEDELIC_PALETTES[colorPalette];

  // Initialize Three.js Psychedelic Background
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create psychedelic particle system
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta) * (Math.random() * 0.5 + 0.5);
      positions[i3 + 1] = radius * Math.cos(phi) * (Math.random() * 0.5 + 0.5);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta) * (Math.random() * 0.5 + 0.5);
      
      const color = currentPalette.primary[Math.floor(Math.random() * currentPalette.primary.length)];
      const hex = parseInt(color.replace('#', ''), 16);
      colors[i3] = ((hex >> 16) & 255) / 255;
      colors[i3 + 1] = ((hex >> 8) & 255) / 255;
      colors[i3 + 2] = (hex & 255) / 255;
      
      sizes[i] = Math.random() * 5 + 1;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    // Create psychedelic orbs
    const orbs = currentPalette.primary.map((color, i) => {
      const geometry = new THREE.SphereGeometry(50 + i * 20, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.2,
        wireframe: true
      });
      
      const orb = new THREE.Mesh(geometry, material);
      orb.position.set(
        (Math.random() - 0.5) * 1500,
        (Math.random() - 0.5) * 1500,
        (Math.random() - 0.5) * 1500
      );
      scene.add(orb);
      return orb;
    });
    
    // Create connection lines
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3
    });
    
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    
    camera.position.z = 1000;
    
    // Animation loop
    let time = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      
      const delta = performance.now() - (rafRef.current || 0);
      if (delta < frameInterval) return;
      
      time += 0.01;
      
      // Animate particles
      particles.rotation.x = time * 0.1;
      particles.rotation.y = time * 0.15;
      
      // Animate orbs
      orbs.forEach((orb, i) => {
        orb.rotation.x = time * (0.02 + i * 0.005);
        orb.rotation.y = time * (0.03 + i * 0.005);
        orb.position.x = Math.sin(time * 0.5 + i) * 300;
        orb.position.y = Math.cos(time * 0.3 + i) * 300;
      });
      
      // Animate connection lines
      const linePositions = [];
      const lineColors = [];
      
      for (let i = 0; i < 100; i++) {
        const x1 = (Math.random() - 0.5) * 2000;
        const y1 = (Math.random() - 0.5) * 2000;
        const z1 = (Math.random() - 0.5) * 2000;
        const x2 = x1 + (Math.random() - 0.5) * 400;
        const y2 = y1 + (Math.random() - 0.5) * 400;
        const z2 = z1 + (Math.random() - 0.5) * 400;
        
        linePositions.push(x1, y1, z1, x2, y2, z2);
        
        const color = currentPalette.accent[Math.floor(Math.random() * currentPalette.accent.length)];
        const hex = parseInt(color.replace('#', ''), 16);
        const r = ((hex >> 16) & 255) / 255;
        const g = ((hex >> 8) & 255) / 255;
        const b = (hex & 255) / 255;
        
        lineColors.push(r, g, b, r, g, b);
      }
      
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
  }, [colorPalette]);

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      fetchServers();
      fetchTokens();
    };
    loadData();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/create-server', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setServers(Array.isArray(result.servers) ? result.servers : []);
    } catch (error) {
      showMessage('error', 'Connection Error');
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/create-server?getTokens=true', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setTokens(Array.isArray(result.tokens) ? result.tokens : []);
    } catch (error) {
      showMessage('error', 'Connection Error');
    } finally {
      setLoading(false);
    }
  };

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
        showMessage('success', '🚀 QUANTUM SERVER ACTIVATED!');
        setShowCreateModal(false);
        setServerForm({ name: '', description: '', privacy: 'public', generateToken: false, serverType: 'quantum', powerLevel: 100 });
        fetchServers();
        if (result.token) showMessage('success', '🔑 NEURAL TOKEN GENERATED!');
      }
    } catch (error) {
      showMessage('error', 'Quantum Flux Error');
    }
  };

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
        showMessage('success', '⚡ SERVER RESYNCHRONIZED!');
        setShowEditModal(false);
        fetchServers();
      }
    } catch (error) {
      showMessage('error', 'Sync Failure');
    }
  };

  const deleteServer = async (serverId) => {
    const confirmed = await immersiveConfirm('QUANTUM DECOMPILATION', 'Initiate server de-rez protocol?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/create-server', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serverId })
      });
      const result = await response.json();
      if (result.success) {
        showMessage('success', '💥 SERVER DISINTEGRATED');
        fetchServers();
      }
    } catch (error) {
      showMessage('error', 'Decomp Failed');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const immersiveConfirm = async (title, message) => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center';
      modal.innerHTML = `
        <div class="absolute inset-0" style="background: ${currentPalette.bg}"></div>
        <div class="relative z-10 p-12 rounded-4xl max-w-md w-full mx-4" style="
          background: ${currentPalette.bg};
          border: 4px solid ${currentPalette.primary[0]};
          box-shadow: 0 0 100px ${currentPalette.primary[0]};
        ">
          <div class="text-center mb-8">
            <div class="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse" style="
              border: 4px solid ${currentPalette.primary[1]};
              box-shadow: 0 0 60px ${currentPalette.primary[1]};
              background: ${currentPalette.bg};
            ">
              <FaBomb class="text-6xl" style="color: ${currentPalette.primary[2]}" />
            </div>
            <h3 class="text-4xl font-black mb-4" style="color: ${currentPalette.primary[0]}">${title}</h3>
            <p class="text-2xl" style="color: ${currentPalette.secondary[0]}">${message}</p>
          </div>
          <div class="grid grid-cols-2 gap-6">
            <button id="confirm-cancel" class="px-8 py-4 rounded-2xl text-2xl font-black transition-all duration-300 hover:scale-105" style="
              background: ${currentPalette.bg};
              border: 3px solid ${currentPalette.primary[3]};
              color: ${currentPalette.primary[3]};
              box-shadow: 0 0 30px ${currentPalette.primary[3]};
            ">
              ABORT
            </button>
            <button id="confirm-ok" class="px-8 py-4 rounded-2xl text-2xl font-black transition-all duration-300 hover:scale-105" style="
              background: linear-gradient(135deg, ${currentPalette.primary[0]}, ${currentPalette.primary[1]});
              color: white;
              box-shadow: 0 0 50px ${currentPalette.primary[0]};
            ">
              CONFIRM
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('confirm-cancel').onclick = () => { modal.remove(); resolve(false); };
      document.getElementById('confirm-ok').onclick = () => { modal.remove(); resolve(true); };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: currentPalette.bg }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative mb-16"
          >
            {currentPalette.primary.map((color, i) => (
              <motion.div
                key={i}
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -inset-12 rounded-full"
                style={{
                  border: `4px solid ${color}${Math.floor(20 + i * 10)}`,
                  filter: `blur(${4 + i}px)`
                }}
              />
            ))}
            
            <div className="relative w-80 h-80 rounded-full flex items-center justify-center" style={{
              background: `radial-gradient(circle, ${currentPalette.primary[0]}30, transparent 70%)`,
              border: `6px solid ${currentPalette.primary[1]}`,
              boxShadow: `0 0 100px ${currentPalette.primary[1]}, inset 0 0 100px ${currentPalette.primary[2]}`
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 rounded-full border-4"
                style={{ borderColor: currentPalette.primary[3] }}
              />
              <FaServer className="text-9xl" style={{ color: currentPalette.primary[4] }} />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <h1 className="text-8xl font-black mb-10 tracking-tighter">
              {currentPalette.primary.map((color, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                  className="inline-block"
                  style={{ color, textShadow: `0 0 30px ${color}` }}
                >
                  HYPERDOCK
                </motion.span>
              ))}
            </h1>
            
            <div className="relative w-[800px] h-4 rounded-full overflow-hidden mx-auto mb-14" style={{
              background: `linear-gradient(90deg, ${currentPalette.primary.join(', ')})`,
              opacity: 0.6
            }}>
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-y-0 w-1/3"
                style={{
                  background: `linear-gradient(90deg, transparent, white, transparent)`,
                  filter: 'blur(10px)'
                }}
              />
            </div>
            
            <div className="space-y-6">
              {['INITIALIZING QUANTUM CORE', 'CALIBRATING NEURAL MATRIX', 'SYNCING CYBERSPACE', 'BOOTING HYPERDRIVE'].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -200, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1 + i * 0.3 }}
                  className="text-3xl font-bold flex items-center justify-center space-x-4"
                  style={{ color: currentPalette.secondary[i % currentPalette.secondary.length] }}
                >
                  <div className="w-4 h-4 rounded-full animate-pulse" style={{
                    background: currentPalette.accent[i % currentPalette.accent.length],
                    boxShadow: `0 0 20px ${currentPalette.accent[i % currentPalette.accent.length]}`
                  }} />
                  <span style={{ textShadow: `0 0 20px ${currentPalette.secondary[i % currentPalette.secondary.length]}` }}>
                    {text}
                  </span>
                  <div className="w-4 h-4 rounded-full animate-pulse" style={{
                    background: currentPalette.accent[i % currentPalette.accent.length],
                    boxShadow: `0 0 20px ${currentPalette.accent[i % currentPalette.accent.length]}`
                  }} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: currentPalette.bg }}>
      {/* Three.js Psychedelic Background */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />
      
      {/* Pulsing Border */}
      <div className="fixed inset-0 pointer-events-none">
        {currentPalette.primary.map((color, i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.02, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 3 + i,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 border-[20px] rounded-[100px]"
            style={{ 
              borderColor: color,
              filter: 'blur(20px)'
            }}
          />
        ))}
      </div>
      
      {/* Floating Particles Effect */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              rotate: 360
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-4 h-4 rounded-full"
            style={{
              background: currentPalette.primary[i % currentPalette.primary.length],
              boxShadow: `0 0 30px ${currentPalette.primary[i % currentPalette.primary.length]}`,
              filter: 'blur(2px)'
            }}
          />
        ))}
      </div>
      
      {/* Palette Selector */}
      <div className="fixed top-6 right-6 z-50">
        <ParallaxTilt
          tiltMaxAngleX={15}
          tiltMaxAngleY={15}
          scale={1.1}
          glareEnable={true}
          glareMaxOpacity={0.8}
          className="relative"
        >
          <motion.button
            whileHover={{ scale: 1.1, rotate: 360 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPaletteModal(!showPaletteModal)}
            className="p-4 rounded-3xl shadow-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${currentPalette.primary[0]}, ${currentPalette.primary[1]})`,
              border: `3px solid ${currentPalette.primary[2]}`,
              boxShadow: `0 0 50px ${currentPalette.primary[0]}`
            }}
          >
            <FaPaletteIcon className="text-3xl" style={{ color: 'white' }} />
          </motion.button>
        </ParallaxTilt>
      </div>
      
      {/* Main Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10"
      >
        <div className="max-w-8xl mx-auto px-10 py-16">
          <div className="flex items-center justify-between mb-20">
            <div className="flex items-center space-x-10">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                {currentPalette.primary.map((color, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 15 + i * 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -inset-10 rounded-full"
                    style={{
                      border: `6px solid ${color}${Math.floor(30 + i * 10)}`,
                      filter: 'blur(8px)'
                    }}
                  />
                ))}
                
                <div className="relative p-12 rounded-5xl shadow-2xl" style={{
                  background: `linear-gradient(135deg, ${currentPalette.primary[0]}30, ${currentPalette.primary[1]}20, ${currentPalette.primary[2]}10)`,
                  border: `6px solid ${currentPalette.primary[3]}`,
                  boxShadow: `0 0 100px ${currentPalette.primary[3]}, inset 0 0 100px ${currentPalette.primary[4]}`
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-4"
                    style={{ borderColor: currentPalette.primary[5] }}
                  />
                  <FaServer className="text-8xl" style={{ color: currentPalette.primary[6] }} />
                </div>
              </motion.div>
              
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-9xl font-black mb-8 tracking-tighter"
                >
                  <span className="bg-gradient-to-r from-transparent via-transparent to-transparent bg-clip-text">
                    {currentPalette.primary.map((color, i) => (
                      <motion.span
                        key={i}
                        animate={{ 
                          y: [0, -15, 0],
                          textShadow: [
                            `0 0 10px ${color}`,
                            `0 0 40px ${color}`,
                            `0 0 10px ${color}`
                          ]
                        }}
                        transition={{ 
                          duration: 2,
                          delay: i * 0.1,
                          repeat: Infinity 
                        }}
                        className="inline-block mr-2"
                        style={{ color }}
                      >
                        HYPERDOCK
                      </motion.span>
                    ))}
                  </span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl flex items-center space-x-6"
                  style={{ color: currentPalette.secondary[0] }}
                >
                  <FaSatellite className="text-5xl animate-spin" style={{ animationDuration: '5s' }} />
                  <span className="font-black tracking-widest">QUANTUM SERVER MANAGEMENT INTERFACE</span>
                  <FaSparkles className="text-5xl animate-bounce" style={{ color: currentPalette.accent[0] }} />
                </motion.p>
              </div>
            </div>
            
            <div className="flex space-x-8">
              <ParallaxTilt
                tiltMaxAngleX={20}
                tiltMaxAngleY={20}
                scale={1.15}
                glareEnable={true}
                glareMaxOpacity={0.9}
                glareColor={currentPalette.primary[0]}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="relative group"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        `0 0 60px ${currentPalette.primary[0]}`,
                        `0 0 100px ${currentPalette.primary[1]}`,
                        `0 0 60px ${currentPalette.primary[0]}`
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-5xl blur-2xl opacity-80"
                    style={{ background: `linear-gradient(135deg, ${currentPalette.primary[0]}, ${currentPalette.primary[1]})` }}
                  />
                  <div className="relative px-20 py-8 rounded-5xl font-black text-3xl flex items-center space-x-8 overflow-hidden" style={{
                    background: `linear-gradient(135deg, ${currentPalette.primary[0]}, ${currentPalette.primary[1]}, ${currentPalette.primary[2]})`,
                    border: `4px solid ${currentPalette.primary[3]}`,
                    boxShadow: `0 0 80px ${currentPalette.primary[0]}`
                  }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <FaRocket className="text-5xl animate-bounce" />
                    <span className="tracking-widest">ACTIVATE SERVER</span>
                    <FaBolt className="text-5xl animate-pulse" />
                  </div>
                </motion.button>
              </ParallaxTilt>
              
              <ParallaxTilt
                tiltMaxAngleX={20}
                tiltMaxAngleY={20}
                scale={1.15}
                glareEnable={true}
                glareMaxOpacity={0.9}
                glareColor={currentPalette.secondary[0]}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTokenModal(true)}
                  className="relative group"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        `0 0 60px ${currentPalette.secondary[0]}`,
                        `0 0 100px ${currentPalette.secondary[1]}`,
                        `0 0 60px ${currentPalette.secondary[0]}`
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-5xl blur-2xl opacity-80"
                    style={{ background: `linear-gradient(135deg, ${currentPalette.secondary[0]}, ${currentPalette.secondary[1]})` }}
                  />
                  <div className="relative px-20 py-8 rounded-5xl font-black text-3xl flex items-center space-x-8 overflow-hidden" style={{
                    background: `linear-gradient(135deg, ${currentPalette.secondary[0]}, ${currentPalette.secondary[1]}, ${currentPalette.secondary[2]})`,
                    border: `4px solid ${currentPalette.secondary[3]}`,
                    boxShadow: `0 0 80px ${currentPalette.secondary[0]}`
                  }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <SiJsonwebtokens className="text-5xl animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="tracking-widest">GENERATE TOKEN</span>
                    <FaKey className="text-5xl animate-pulse" />
                  </div>
                </motion.button>
              </ParallaxTilt>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="relative">
            <div className="absolute inset-0 rounded-5xl backdrop-blur-2xl" style={{
              background: `linear-gradient(135deg, ${currentPalette.primary.map(c => c + '20').join(', ')})`,
              border: `3px solid ${currentPalette.primary[0]}`,
              boxShadow: `0 0 60px ${currentPalette.primary[0]}`
            }} />
            
            <div className="relative z-10 p-3">
              <div className="flex space-x-4">
                {[
                  { id: 'servers', label: 'QUANTUM SERVERS', icon: FaServer, count: servers.length, color: currentPalette.primary[0] },
                  { id: 'tokens', label: 'NEURAL TOKENS', icon: SiJsonwebtokens, count: tokens.length, color: currentPalette.primary[1] },
                  { id: 'network', label: 'CYBER NETWORK', icon: FaNetworkWired, color: currentPalette.primary[2] },
                  { id: 'analytics', label: 'QUANTUM ANALYTICS', icon: FaChartLine, color: currentPalette.primary[3] },
                  { id: 'settings', label: 'DIMENSION SETTINGS', icon: FaCog, color: currentPalette.primary[4] }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-10 px-8 rounded-4xl transition-all duration-300 flex items-center justify-center space-x-6 group ${
                      activeTab === tab.id ? 'scale-105' : ''
                    }`}
                    style={{
                      background: activeTab === tab.id 
                        ? `linear-gradient(135deg, ${tab.color}40, ${currentPalette.secondary[0]}20, transparent)`
                        : `linear-gradient(135deg, ${tab.color}20, transparent)`,
                      border: `3px solid ${activeTab === tab.id ? tab.color : tab.color + '60'}`,
                      boxShadow: activeTab === tab.id 
                        ? `0 0 40px ${tab.color}, inset 0 0 40px ${currentPalette.accent[0]}20`
                        : `0 0 20px ${tab.color}60`
                    }}
                  >
                    {React.createElement(tab.icon, {
                      className: `text-4xl ${activeTab === tab.id ? 'animate-pulse' : ''}`,
                      style: { color: tab.color }
                    })}
                    <span className={`text-2xl font-black tracking-wider ${activeTab === tab.id ? '' : 'opacity-80'}`} style={{ color: tab.color }}>
                      {tab.label}
                    </span>
                    {tab.count !== undefined && (
                      <span className="px-6 py-3 rounded-full text-xl font-black" style={{
                        background: `linear-gradient(135deg, ${tab.color}, ${currentPalette.accent[0]})`,
                        boxShadow: `0 0 30px ${tab.color}`,
                        color: 'white'
                      }}>
                        {tab.count}
                      </span>
                    )}
                    
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4/5 h-2 rounded-full"
                        style={{ 
                          background: `linear-gradient(90deg, ${tab.color}, ${currentPalette.accent[0]})`,
                          boxShadow: `0 0 20px ${tab.color}`
                        }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <motion.main 
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-8xl mx-auto px-10 py-16 relative z-10"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'servers' && (
            <motion.div
              key="servers"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="relative"
            >
              {servers.length === 0 ? (
                <EmptyState 
                  title="NO QUANTUM SERVERS DETECTED"
                  description="Initiate your first quantum server instance"
                  icon={<FaServer />}
                  action={() => setShowCreateModal(true)}
                  actionText="ACTIVATE QUANTUM SERVER"
                  colorPalette={currentPalette}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-12">
                  {servers.map((server, index) => (
                    <ServerCard 
                      key={server.id || index}
                      server={server}
                      index={index}
                      colorPalette={currentPalette}
                      onEdit={() => {
                        setEditForm({
                          serverId: server.id || '',
                          name: server.name || '',
                          description: server.description || '',
                          privacy: server.is_public ? 'public' : 'private',
                          serverType: server.type || 'quantum'
                        });
                        setShowEditModal(true);
                      }}
                      onDelete={() => deleteServer(server.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'tokens' && (
            <motion.div
              key="tokens"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              {tokens.length === 0 ? (
                <EmptyState 
                  title="NO NEURAL TOKENS GENERATED"
                  description="Create your first quantum access token"
                  icon={<SiJsonwebtokens />}
                  action={() => setShowTokenModal(true)}
                  actionText="GENERATE QUANTUM TOKEN"
                  colorPalette={currentPalette}
                />
              ) : (
                <div className="space-y-12">
                  {tokens.map((token, index) => (
                    <TokenCard 
                      key={token.id || index}
                      token={token}
                      index={index}
                      colorPalette={currentPalette}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
      
      {/* Palette Modal */}
      {showPaletteModal && (
        <PaletteModal 
          currentPalette={colorPalette}
          setColorPalette={setColorPalette}
          onClose={() => setShowPaletteModal(false)}
          palettes={PSYCHEDELIC_PALETTES}
        />
      )}
      
      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal 
          form={serverForm}
          onChange={setServerForm}
          onSubmit={createServer}
          onClose={() => setShowCreateModal(false)}
          colorPalette={currentPalette}
        />
      )}
      
      {/* Edit Server Modal */}
      {showEditModal && (
        <EditServerModal 
          form={editForm}
          onChange={setEditForm}
          onSubmit={updateServer}
          onClose={() => setShowEditModal(false)}
          colorPalette={currentPalette}
        />
      )}
      
      {/* Token Modal */}
      {showTokenModal && (
        <TokenModal 
          form={tokenForm}
          onChange={setTokenForm}
          onSubmit={() => {}}
          onClose={() => setShowTokenModal(false)}
          colorPalette={currentPalette}
        />
      )}
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.5;
            filter: blur(5px);
          }
          50% { 
            opacity: 1;
            filter: blur(10px);
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 16px;
          background: transparent;
        }
        
        ::-webkit-scrollbar-track {
          background: ${currentPalette.bg};
          border-radius: 20px;
          border: 2px solid ${currentPalette.primary[0]};
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, ${currentPalette.primary[0]}, ${currentPalette.primary[1]});
          border-radius: 20px;
          border: 3px solid ${currentPalette.accent[0]};
          box-shadow: 0 0 20px ${currentPalette.primary[0]};
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, ${currentPalette.primary[1]}, ${currentPalette.primary[2]});
          box-shadow: 0 0 30px ${currentPalette.primary[1]};
        }
        
        /* Selection color */
        ::selection {
          background: ${currentPalette.primary[0]}80;
          color: white;
          text-shadow: 0 0 10px white;
        }
        
        /* Smooth transitions */
        * {
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
        }
      `}</style>
    </div>
  );
};

// Server Card Component - PURE COLOR EXPLOSION
const ServerCard = ({ server, index, colorPalette, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 60, rotateX: 45 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.1, type: "spring", damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ParallaxTilt
        tiltMaxAngleX={15}
        tiltMaxAngleY={15}
        scale={1.1}
        glareEnable={true}
        glareMaxOpacity={0.8}
        glareColor={colorPalette.primary[0]}
        className="relative"
      >
        <div className="relative rounded-5xl overflow-hidden group cursor-pointer">
          {/* Animated Gradient Background */}
          <motion.div 
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, 
                ${colorPalette.primary[0]}30, 
                ${colorPalette.primary[1]}30, 
                ${colorPalette.primary[2]}30, 
                ${colorPalette.primary[3]}30, 
                ${colorPalette.primary[4]}30
              )`,
              backgroundSize: '400% 400%'
            }}
          />
          
          {/* Pulsing Border */}
          <motion.div
            animate={{ 
              borderColor: colorPalette.primary,
              boxShadow: [
                `0 0 40px ${colorPalette.primary[0]}, inset 0 0 40px ${colorPalette.secondary[0]}`,
                `0 0 80px ${colorPalette.primary[1]}, inset 0 0 80px ${colorPalette.secondary[1]}`,
                `0 0 40px ${colorPalette.primary[0]}, inset 0 0 40px ${colorPalette.secondary[0]}`
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-5xl border-4"
            style={{ borderColor: colorPalette.primary[0] }}
          />
          
          {/* Content */}
          <div className="relative z-10 p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="flex-1">
                <div className="flex items-center space-x-6 mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="p-6 rounded-3xl flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${colorPalette.primary[0]}40, ${colorPalette.primary[1]}20)`,
                      border: `3px solid ${colorPalette.primary[2]}`,
                      boxShadow: `0 0 40px ${colorPalette.primary[2]}`
                    }}
                  >
                    <FaServer className="text-5xl" style={{ color: colorPalette.primary[3] }} />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-4xl font-black mb-4 tracking-tight" style={{ 
                      color: colorPalette.primary[0],
                      textShadow: `0 0 20px ${colorPalette.primary[0]}`
                    }}>
                      {server.name || 'QUANTUM SERVER'}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4">
                      <motion.span 
                        whileHover={{ scale: 1.1 }}
                        className="px-6 py-3 rounded-full text-lg font-black flex items-center space-x-3"
                        style={{
                          background: server.is_public 
                            ? `linear-gradient(135deg, ${colorPalette.secondary[1]}, ${colorPalette.secondary[2]})`
                            : `linear-gradient(135deg, ${colorPalette.primary[3]}, ${colorPalette.primary[4]})`,
                          border: `2px solid ${server.is_public ? colorPalette.secondary[3] : colorPalette.primary[5]}`,
                          boxShadow: `0 0 30px ${server.is_public ? colorPalette.secondary[1] : colorPalette.primary[3]}`,
                          color: 'white'
                        }}
                      >
                        {server.is_public ? <FaGlobe /> : <FaLock />}
                        <span>{server.is_public ? 'PUBLIC' : 'PRIVATE'}</span>
                      </motion.span>
                      
                      <motion.span 
                        whileHover={{ scale: 1.1 }}
                        className="px-6 py-3 rounded-full text-lg font-black flex items-center space-x-3"
                        style={{
                          background: `linear-gradient(135deg, ${colorPalette.primary[2]}, ${colorPalette.primary[3]})`,
                          border: `2px solid ${colorPalette.primary[4]}`,
                          boxShadow: `0 0 30px ${colorPalette.primary[2]}`,
                          color: 'white'
                        }}
                      >
                        <FaBolt className="animate-pulse" />
                        <span>QUANTUM</span>
                      </motion.span>
                    </div>
                  </div>
                </div>
                
                {server.description && (
                  <div className="mb-10">
                    <p className="text-2xl p-8 rounded-4xl" style={{
                      background: `linear-gradient(135deg, ${colorPalette.primary[0]}20, ${colorPalette.primary[1]}10)`,
                      border: `2px solid ${colorPalette.primary[2]}40`,
                      color: colorPalette.secondary[0],
                      textShadow: `0 0 10px ${colorPalette.secondary[0]}`
                    }}>
                      {server.description}
                    </p>
                  </div>
                )}
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="p-8 rounded-4xl" style={{
                    background: `linear-gradient(135deg, ${colorPalette.primary[0]}30, ${colorPalette.primary[1]}20)`,
                    border: `2px solid ${colorPalette.primary[2]}`,
                    boxShadow: `0 0 30px ${colorPalette.primary[0]}`
                  }}>
                    <div className="text-lg mb-3 flex items-center space-x-3" style={{ color: colorPalette.secondary[1] }}>
                      <FaClock />
                      <span className="font-black">CREATED</span>
                    </div>
                    <div className="text-2xl font-black" style={{ color: colorPalette.accent[0] }}>
                      {new Date(server.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="p-8 rounded-4xl" style={{
                    background: `linear-gradient(135deg, ${colorPalette.primary[1]}30, ${colorPalette.primary[2]}20)`,
                    border: `2px solid ${colorPalette.primary[3]}`,
                    boxShadow: `0 0 30px ${colorPalette.primary[1]}`
                  }}>
                    <div className="text-lg mb-3 flex items-center space-x-3" style={{ color: colorPalette.secondary[2] }}>
                      <FaBolt className="animate-pulse" />
                      <span className="font-black">STATUS</span>
                    </div>
                    <div className="text-2xl font-black flex items-center space-x-4">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-4 h-4 rounded-full"
                        style={{ 
                          background: `linear-gradient(135deg, ${colorPalette.secondary[0]}, ${colorPalette.secondary[1]})`,
                          boxShadow: `0 0 20px ${colorPalette.secondary[0]}`
                        }}
                      />
                      <span style={{ color: colorPalette.accent[1] }}>ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex space-x-8">
              <motion.button
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEdit}
                className="flex-1 px-10 py-6 rounded-4xl text-2xl font-black flex items-center justify-center space-x-4 group"
                style={{
                  background: `linear-gradient(135deg, ${colorPalette.primary[2]}40, ${colorPalette.primary[3]}20)`,
                  border: `3px solid ${colorPalette.primary[4]}`,
                  boxShadow: `0 0 40px ${colorPalette.primary[2]}`,
                  color: colorPalette.primary[2]
                }}
              >
                <FaEdit className="text-3xl group-hover:rotate-12 transition-transform" />
                <span>EDIT</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDelete}
                className="flex-1 px-10 py-6 rounded-4xl text-2xl font-black flex items-center justify-center space-x-4 group"
                style={{
                  background: `linear-gradient(135deg, #FF006640, #FF330020)`,
                  border: `3px solid #FF0000`,
                  boxShadow: `0 0 40px #FF0000`,
                  color: '#FF0000'
                }}
              >
                <FaTrash className="text-3xl group-hover:scale-110 transition-transform" />
                <span>DELETE</span>
              </motion.button>
            </div>
          </div>
        </div>
      </ParallaxTilt>
    </motion.div>
  );
};

// Empty State Component
const EmptyState = ({ title, description, icon, action, actionText, colorPalette }) => {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center py-40"
    >
      <div className="relative inline-block">
        {/* Orbital Rings */}
        {colorPalette.primary.map((color, i) => (
          <motion.div
            key={i}
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 15 + i * 3,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -inset-24 rounded-full"
            style={{
              border: `6px solid ${color}${Math.floor(20 + i * 10)}`,
              filter: 'blur(10px)'
            }}
          />
        ))}
        
        {/* Central Icon */}
        <div className="relative w-96 h-96 mx-auto mb-16 rounded-full flex items-center justify-center" style={{
          background: `radial-gradient(circle, ${colorPalette.primary[0]}40, ${colorPalette.primary[1]}20, transparent 70%)`,
          border: `8px solid ${colorPalette.primary[2]}`,
          boxShadow: `
            0 0 100px ${colorPalette.primary[0]},
            0 0 200px ${colorPalette.primary[1]},
            inset 0 0 100px ${colorPalette.primary[2]}
          `
        }}>
          <div className="text-9xl" style={{ color: colorPalette.primary[3] }}>
            {icon}
          </div>
        </div>
        
        <h3 className="text-6xl font-black mb-10 tracking-tighter" style={{ 
          color: colorPalette.primary[0],
          textShadow: `0 0 30px ${colorPalette.primary[0]}`
        }}>
          {title}
        </h3>
        
        <p className="text-3xl mb-16" style={{ 
          color: colorPalette.secondary[0],
          textShadow: `0 0 20px ${colorPalette.secondary[0]}`
        }}>
          {description}
        </p>
        
        <ParallaxTilt
          tiltMaxAngleX={20}
          tiltMaxAngleY={20}
          scale={1.15}
          glareEnable={true}
          glareMaxOpacity={0.9}
          className="relative"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action}
            className="relative group"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                boxShadow: [
                  `0 0 80px ${colorPalette.primary[0]}`,
                  `0 0 120px ${colorPalette.primary[1]}`,
                  `0 0 80px ${colorPalette.primary[0]}`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-5xl blur-3xl opacity-80"
              style={{ background: `linear-gradient(135deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]})` }}
            />
            
            <div className="relative px-24 py-8 rounded-5xl font-black text-4xl flex items-center justify-center space-x-8 overflow-hidden" style={{
              background: `linear-gradient(135deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]}, ${colorPalette.primary[2]})`,
              border: `6px solid ${colorPalette.primary[3]}`,
              boxShadow: `0 0 100px ${colorPalette.primary[0]}`,
              color: 'white'
            }}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <span className="tracking-widest">{actionText}</span>
              <FaRocket className="text-5xl animate-bounce" />
            </div>
          </motion.button>
        </ParallaxTilt>
      </div>
    </motion.div>
  );
};

// Palette Modal Component
const PaletteModal = ({ currentPalette, setColorPalette, onClose, palettes }) => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-8">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-3xl"
        style={{ background: palettes[currentPalette].bg }}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateX: 45 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotateX: -45 }}
        className="relative rounded-5xl p-16 w-full max-w-6xl"
        style={{
          background: palettes[currentPalette].bg,
          border: `6px solid ${palettes[currentPalette].primary[0]}`,
          boxShadow: `0 0 100px ${palettes[currentPalette].primary[0]}`
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center space-x-8">
            <div className="p-6 rounded-4xl" style={{
              background: `linear-gradient(135deg, ${palettes[currentPalette].primary[0]}40, ${palettes[currentPalette].primary[1]}20)`,
              border: `3px solid ${palettes[currentPalette].primary[2]}`
            }}>
              <FaPaletteIcon className="text-6xl" style={{ color: palettes[currentPalette].primary[3] }} />
            </div>
            <div>
              <h2 className="text-6xl font-black mb-4 tracking-tighter" style={{ 
                color: palettes[currentPalette].primary[0],
                textShadow: `0 0 30px ${palettes[currentPalette].primary[0]}`
              }}>
                DIMENSION PALETTES
              </h2>
              <p className="text-3xl" style={{ color: palettes[currentPalette].secondary[0] }}>
                Choose your reality frequency
              </p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-6 rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${palettes[currentPalette].primary[0]}40, ${palettes[currentPalette].primary[1]}20)`,
              border: `3px solid ${palettes[currentPalette].primary[2]}`,
              boxShadow: `0 0 40px ${palettes[currentPalette].primary[0]}`
            }}
          >
            <FaTimes className="text-4xl" style={{ color: palettes[currentPalette].primary[3] }} />
          </motion.button>
        </div>
        
        <div className="grid grid-cols-5 gap-8">
          {Object.entries(palettes).map(([name, palette]) => (
            <motion.button
              key={name}
              whileHover={{ scale: 1.05, y: -8 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setColorPalette(name);
                onClose();
              }}
              className={`relative p-8 rounded-4xl transition-all ${currentPalette === name ? 'scale-105' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${palette.primary[0]}, ${palette.primary[1]}, ${palette.primary[2]})`,
                border: `4px solid ${currentPalette === name ? 'white' : palette.primary[3]}`,
                boxShadow: currentPalette === name 
                  ? `0 0 60px ${palette.primary[0]}, 0 0 100px ${palette.primary[1]}`
                  : `0 0 30px ${palette.primary[0]}`
              }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">
                  {name === 'NEON_EXPLOSION' && <FaRainbowIcon />}
                  {name === 'CYBERPUNK_DREAM' && <FaRobot />}
                  {name === 'RAINBOW_VORTEX' && <FaMagic />}
                  {name === 'GALACTIC_NEBULA' && <FaSpaceShuttleIcon />}
                  {name === 'ATOMIC_FUSION' && <FaAtomIcon />}
                </div>
                <div className="text-xl font-black tracking-wider" style={{ color: 'white' }}>
                  {name.split('_').join(' ')}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// Create Server Modal Component
const CreateServerModal = ({ form, onChange, onSubmit, onClose, colorPalette }) => {
  const [powerLevel, setPowerLevel] = useState(100);
  
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-10">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-4xl"
        style={{ background: colorPalette.bg }}
        onClick={onClose}
      />
      
      {/* Animated Border */}
      <div className="absolute inset-8 rounded-6xl overflow-hidden">
        {colorPalette.primary.map((color, i) => (
          <motion.div
            key={i}
            animate={{ 
              x: [0, 100, 0],
              background: [`linear-gradient(90deg, transparent, ${color}, transparent)`, 
                         `linear-gradient(90deg, transparent, ${colorPalette.secondary[i]}, transparent)`]
            }}
            transition={{ duration: 8 + i * 2, repeat: Infinity }}
            className="absolute h-2 w-full"
            style={{
              top: `${i * 20}%`,
              filter: 'blur(20px)'
            }}
          />
        ))}
      </div>
      
      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: 45 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotateY: -45 }}
        className="relative rounded-6xl p-16 w-full max-w-5xl"
        style={{
          background: colorPalette.bg,
          border: `8px solid ${colorPalette.primary[0]}`,
          boxShadow: `
            0 0 100px ${colorPalette.primary[0]},
            0 0 200px ${colorPalette.primary[1]},
            inset 0 0 100px ${colorPalette.primary[2]}
          `
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-20">
          <div className="flex items-center space-x-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="p-10 rounded-4xl"
              style={{
                background: `linear-gradient(135deg, ${colorPalette.primary[0]}40, ${colorPalette.primary[1]}20)`,
                border: `4px solid ${colorPalette.primary[2]}`,
                boxShadow: `0 0 60px ${colorPalette.primary[0]}`
              }}
            >
              <FaRocket className="text-7xl" style={{ color: colorPalette.primary[3] }} />
            </motion.div>
            
            <div>
              <h2 className="text-7xl font-black mb-6 tracking-tighter" style={{
                background: `linear-gradient(135deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]}, ${colorPalette.primary[2]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: `0 0 40px ${colorPalette.primary[0]}`
              }}>
                ACTIVATE SERVER
              </h2>
              <p className="text-3xl flex items-center space-x-6" style={{ color: colorPalette.secondary[0] }}>
                <FaSatellite className="animate-spin" style={{ animationDuration: '6s' }} />
                <span>Configure your quantum server instance</span>
              </p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-6 rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${colorPalette.primary[0]}40, ${colorPalette.primary[1]}20)`,
              border: `3px solid ${colorPalette.primary[2]}`,
              boxShadow: `0 0 40px ${colorPalette.primary[0]}`
            }}
          >
            <FaTimes className="text-4xl" style={{ color: colorPalette.primary[3] }} />
          </motion.button>
        </div>
        
        {/* Form */}
        <div className="space-y-12">
          <div>
            <label className="block text-3xl font-black mb-8 flex items-center space-x-6">
              <FaServer className="text-4xl" style={{ color: colorPalette.primary[0] }} />
              <span style={{ color: colorPalette.primary[0] }}>SERVER NAME</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({...form, name: e.target.value})}
              className="w-full rounded-4xl px-10 py-8 text-3xl focus:outline-none transition-all"
              placeholder="Enter quantum server designation..."
              style={{
                background: `linear-gradient(135deg, ${colorPalette.primary[0]}20, ${colorPalette.primary[1]}10)`,
                border: `4px solid ${colorPalette.primary[2]}`,
                color: colorPalette.secondary[0],
                boxShadow: `0 0 40px ${colorPalette.primary[0]}`,
                fontSize: '2rem'
              }}
            />
          </div>
          
          <div>
            <label className="block text-3xl font-black mb-8 flex items-center space-x-6">
              <FaTerminal className="text-4xl" style={{ color: colorPalette.primary[1] }} />
              <span style={{ color: colorPalette.primary[1] }}>DESCRIPTION</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({...form, description: e.target.value})}
              className="w-full rounded-4xl px-10 py-8 text-3xl focus:outline-none resize-none"
              placeholder="Describe your server's quantum purpose..."
              rows={4}
              style={{
                background: `linear-gradient(135deg, ${colorPalette.primary[1]}20, ${colorPalette.primary[2]}10)`,
                border: `4px solid ${colorPalette.primary[3]}`,
                color: colorPalette.secondary[1],
                boxShadow: `0 0 40px ${colorPalette.primary[1]}`,
                fontSize: '2rem'
              }}
            />
          </div>
          
          <div>
            <label className="block text-3xl font-black mb-8 flex items-center space-x-6">
              <FaBolt className="text-4xl animate-pulse" style={{ color: colorPalette.primary[2] }} />
              <span style={{ color: colorPalette.primary[2] }}>POWER LEVEL</span>
              <span className="ml-auto text-4xl font-black" style={{ color: colorPalette.accent[0] }}>
                {powerLevel}%
              </span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={powerLevel}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setPowerLevel(value);
                  onChange({...form, powerLevel: value});
                }}
                className="w-full h-6 rounded-full appearance-none"
                style={{
                  background: `linear-gradient(90deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]}, ${colorPalette.primary[2]})`,
                  boxShadow: `0 0 30px ${colorPalette.primary[0]}`,
                  WebkitAppearance: 'none'
                }}
              />
              <div className="flex justify-between text-2xl font-black mt-6" style={{ color: colorPalette.secondary[2] }}>
                <span>ECONOMY</span>
                <span>BALANCED</span>
                <span>PERFORMANCE</span>
                <span>EXTREME</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12">
            <div>
              <label className="block text-3xl font-black mb-8 flex items-center space-x-6">
                <FaGlobe className="text-4xl" style={{ color: colorPalette.primary[3] }} />
                <span style={{ color: colorPalette.primary[3] }}>VISIBILITY</span>
              </label>
              <select
                value={form.privacy}
                onChange={(e) => onChange({...form, privacy: e.target.value})}
                className="w-full rounded-4xl px-10 py-8 text-3xl focus:outline-none appearance-none"
                style={{
                  background: `linear-gradient(135deg, ${colorPalette.primary[3]}20, ${colorPalette.primary[4]}10)`,
                  border: `4px solid ${colorPalette.primary[5]}`,
                  color: colorPalette.secondary[3],
                  boxShadow: `0 0 40px ${colorPalette.primary[3]}`,
                  fontSize: '2rem'
                }}
              >
                <option value="public" style={{ background: colorPalette.bg, color: colorPalette.primary[0] }}>🌐 PUBLIC</option>
                <option value="private" style={{ background: colorPalette.bg, color: colorPalette.primary[1] }}>🔒 PRIVATE</option>
              </select>
            </div>
            
            <div>
              <label className="block text-3xl font-black mb-8 flex items-center space-x-6">
                <FaCube className="text-4xl" style={{ color: colorPalette.primary[4] }} />
                <span style={{ color: colorPalette.primary[4] }}>SERVER TYPE</span>
              </label>
              <select
                value={form.serverType}
                onChange={(e) => onChange({...form, serverType: e.target.value})}
                className="w-full rounded-4xl px-10 py-8 text-3xl focus:outline-none appearance-none"
                style={{
                  background: `linear-gradient(135deg, ${colorPalette.primary[4]}20, ${colorPalette.primary[5]}10)`,
                  border: `4px solid ${colorPalette.primary[6]}`,
                  color: colorPalette.secondary[4],
                  boxShadow: `0 0 40px ${colorPalette.primary[4]}`,
                  fontSize: '2rem'
                }}
              >
                <option value="quantum" style={{ background: colorPalette.bg, color: colorPalette.primary[0] }}>🌀 QUANTUM</option>
                <option value="cyber" style={{ background: colorPalette.bg, color: colorPalette.primary[1] }}>🤖 CYBER</option>
                <option value="neural" style={{ background: colorPalette.bg, color: colorPalette.primary[2] }}>🧠 NEURAL</option>
                <option value="fusion" style={{ background: colorPalette.bg, color: colorPalette.primary[3] }}>⚛️ FUSION</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-8 p-12 rounded-4xl" style={{
            background: `linear-gradient(135deg, ${colorPalette.primary[0]}20, ${colorPalette.primary[1]}10)`,
            border: `4px solid ${colorPalette.primary[2]}`,
            boxShadow: `0 0 40px ${colorPalette.primary[0]}`
          }}>
            <input
              type="checkbox"
              id="generateToken"
              checked={form.generateToken}
              onChange={(e) => onChange({...form, generateToken: e.target.checked})}
              className="w-10 h-10 rounded-xl cursor-pointer"
              style={{
                background: form.generateToken 
                  ? `linear-gradient(135deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]})`
                  : `linear-gradient(135deg, ${colorPalette.primary[2]}20, ${colorPalette.primary[3]}10)`,
                border: `3px solid ${colorPalette.primary[4]}`,
                boxShadow: `0 0 20px ${colorPalette.primary[0]}`
              }}
            />
            <label htmlFor="generateToken" className="flex-1 cursor-pointer">
              <div className="text-3xl font-black mb-3" style={{ color: colorPalette.primary[0] }}>
                GENERATE QUANTUM TOKEN
              </div>
              <div className="text-2xl" style={{ color: colorPalette.secondary[0] }}>
                Create access token for immediate API integration
              </div>
            </label>
            <FaKey className="text-5xl animate-pulse" style={{ color: colorPalette.primary[1] }} />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-12 mt-24">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-1 px-12 py-10 rounded-5xl text-3xl font-black flex items-center justify-center space-x-6 group"
            style={{
              background: `linear-gradient(135deg, ${colorPalette.primary[5]}40, ${colorPalette.primary[6]}20)`,
              border: `4px solid ${colorPalette.primary[7]}`,
              boxShadow: `0 0 50px ${colorPalette.primary[5]}`,
              color: colorPalette.primary[5]
            }}
          >
            <FaTimes className="text-4xl group-hover:rotate-90 transition-transform" />
            <span>CANCEL</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSubmit}
            className="flex-1 px-12 py-10 rounded-5xl text-3xl font-black flex items-center justify-center space-x-6 group relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colorPalette.primary[0]}, ${colorPalette.primary[1]}, ${colorPalette.primary[2]})`,
              border: `4px solid ${colorPalette.primary[3]}`,
              boxShadow: `0 0 80px ${colorPalette.primary[0]}`,
              color: 'white'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <FaRocket className="text-5xl group-hover:animate-bounce" />
            <span>ACTIVATE SERVER</span>
            <FaSparkles className="text-5xl animate-pulse" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// Token Card Component (similar pattern as ServerCard)
const TokenCard = ({ token, index, colorPalette }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: "spring" }}
    >
      <div className="relative rounded-5xl p-12" style={{
        background: `linear-gradient(135deg, ${colorPalette.secondary[0]}30, ${colorPalette.secondary[1]}20, ${colorPalette.secondary[2]}10)`,
        border: `6px solid ${colorPalette.secondary[3]}`,
        boxShadow: `
          0 0 80px ${colorPalette.secondary[0]},
          0 0 160px ${colorPalette.secondary[1]},
          inset 0 0 80px ${colorPalette.secondary[2]}
        `
      }}>
        {/* Token content here */}
      </div>
    </motion.div>
  );
};

export default ServerProfileManager;
