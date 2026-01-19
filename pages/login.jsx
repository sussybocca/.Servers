'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiLock, 
  FiMail, 
  FiEye, 
  FiEyeOff, 
  FiCheck, 
  FiX,
  FiChevronRight,
  FiGlobe,
  FiMoon,
  FiSun,
  FiVolume2,
  FiVolumeX,
  FiWifi,
  FiBattery,
  FiSettings,
  FiPower
} from 'react-icons/fi';
import Tilt from 'vanilla-tilt';
import dynamic from 'next/dynamic';

// Dynamic import for performance
const Particles = dynamic(() => import('react-tsparticles'), { ssr: false });

export default function WindowsLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [theme, setTheme] = useState('dark');
  const [sound, setSound] = useState(true);
  const [network, setNetwork] = useState(true);
  const [battery, setBattery] = useState(87);
  const [windowState, setWindowState] = useState('normal'); // normal, minimized, maximized
  const [particlesLoaded, setParticlesLoaded] = useState(false);
  
  const windowRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);

  // Update time and date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Initialize window tilt effect
  useEffect(() => {
    if (windowRef.current) {
      Tilt.init(windowRef.current, {
        max: 5,
        speed: 400,
        glare: true,
        'max-glare': 0.2,
        gyroscope: false,
        scale: 1.02
      });
    }
  }, []);

  // Play subtle sound effects
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.3;
  }, []);

  // Focus management for animations
  useEffect(() => {
    if (step === 'login' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [step]);

  // FPS limiter for animations
  const useAnimationFrame = (callback) => {
    const requestRef = useRef();
    const previousTimeRef = useRef();
    
    const animate = time => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        if (deltaTime > 33) { // 30 FPS (1000ms / 30 ≈ 33ms)
          callback(deltaTime);
          previousTimeRef.current = time;
        }
      } else {
        previousTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    
    useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
    }, []);
  };

  // Window control animations
  const handleWindowControl = (action) => {
    if (!sound) return;
    
    setWindowState(action);
    
    // Play sound effect
    if (audioRef.current) {
      audioRef.current.src = action === 'close' 
        ? 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3'
        : 'https://assets.mixkit.co/sfx/preview/mixkit-plastic-bubble-click-1124.mp3';
      audioRef.current.play().catch(() => {});
    }
    
    if (action === 'close') {
      // Animate close
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captcha_token: 'bypass-for-now' // Temporary bypass
        })
      });

      const data = await response.json();

      if (data.verification_required) {
        setStep('verify');
      } else if (data.success) {
        // Success animation
        setTimeout(() => {
          window.location.href = '/explore';
        }, 800);
      } else {
        setError(data.error || 'Login failed');
        // Shake animation on error
        if (windowRef.current) {
          windowRef.current.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            if (windowRef.current) windowRef.current.style.animation = '';
          }, 500);
        }
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          verification_code: verificationCode
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = '/explore';
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const particlesInit = async (engine) => {
    setParticlesLoaded(true);
  };

  const particlesConfig = {
    fpsLimit: 30,
    particles: {
      number: { value: 30, density: { enable: true, value_area: 800 } },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: 0.3, random: true },
      size: { value: 3, random: true },
      move: { 
        enable: true, 
        speed: 1, 
        direction: "none",
        random: true,
        out_mode: "out"
      }
    },
    interactivity: {
      events: {
        onhover: { enable: true, mode: "repulse" },
        onclick: { enable: true, mode: "push" }
      }
    }
  };

  return (
    <>
      <Head>
        <title>Server.x - Windows Login</title>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 120, 212, 0.3); }
            50% { box-shadow: 0 0 40px rgba(0, 120, 212, 0.6); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          
          @keyframes typing {
            from { width: 0 }
            to { width: 100% }
          }
          
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          
          body {
            margin: 0;
            overflow: hidden;
            background: ${theme === 'dark' ? '#000' : '#f0f0f0'};
            font-family: 'Segoe UI', 'Microsoft YaHei', system-ui, sans-serif;
            transition: background 0.5s ease;
          }
          
          ::selection {
            background: rgba(0, 120, 212, 0.3);
          }
          
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 120, 212, 0.5);
            border-radius: 4px;
          }
          
          .glass-effect {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .windows-shadow {
            box-shadow: 
              0 10px 40px rgba(0, 0, 0, 0.3),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          }
          
          .gradient-border {
            position: relative;
            border-radius: 12px;
          }
          
          .gradient-border::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #0078D4, #00BCF2, #7B83FF);
            border-radius: 14px;
            z-index: -1;
            animation: glow 3s ease-in-out infinite;
          }
          
          .typewriter {
            overflow: hidden;
            border-right: 2px solid #0078D4;
            white-space: nowrap;
            animation: typing 3.5s steps(40, end), blink 0.75s step-end infinite;
          }
          
          .fps-limit {
            animation-duration: 0.33s !important;
            transition-duration: 0.33s !important;
          }
        `}</style>
      </Head>

      {/* Background Particles */}
      {particlesLoaded && (
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0
          }}
        />
      )}

      {/* System Tray */}
      <div style={styles.systemTray}>
        <div style={styles.trayLeft}>
          <button 
            style={styles.trayButton}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
          
          <button 
            style={styles.trayButton}
            onClick={() => setSound(!sound)}
            title={sound ? "Mute" : "Unmute"}
          >
            {sound ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
          </button>
          
          <button style={styles.trayButton} title="Network">
            <FiWifi size={14} />
          </button>
          
          <div style={styles.batteryIndicator}>
            <FiBattery size={14} />
            <span style={styles.batteryText}>{battery}%</span>
          </div>
        </div>
        
        <div style={styles.trayRight}>
          <div style={styles.timeDisplay}>
            <div style={styles.time}>{time}</div>
            <div style={styles.date}>{date}</div>
          </div>
        </div>
      </div>

      {/* Main Login Window */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: windowState === 'maximized' ? 1 : windowState === 'minimized' ? 0.7 : 0.95,
          opacity: 1,
          rotateX: windowState === 'minimized' ? -5 : 0
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        style={styles.container}
      >
        <div 
          ref={windowRef}
          className="gradient-border windows-shadow"
          style={{
            ...styles.window,
            transform: windowState === 'maximized' ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.33s ease'
          }}
        >
          {/* Window Title Bar */}
          <div className="glass-effect" style={styles.titleBar}>
            <div style={styles.titleContent}>
              <div style={styles.logoIcon}>
                <FiGlobe size={18} />
              </div>
              <div style={styles.title}>
                <span style={styles.titleText}>Server.x</span>
                <span style={styles.titleSub}>Windows Authentication</span>
              </div>
            </div>
            
            <div style={styles.windowControls}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ ...styles.controlButton, ...styles.controlMinimize }}
                onClick={() => handleWindowControl('minimize')}
                title="Minimize"
              >
                —
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ ...styles.controlButton, ...styles.controlMaximize }}
                onClick={() => handleWindowControl('maximize')}
                title="Maximize"
              >
                {windowState === 'maximized' ? '🗗' : '□'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{ ...styles.controlButton, ...styles.controlClose }}
                onClick={() => handleWindowControl('close')}
                title="Close"
              >
                ×
              </motion.button>
            </div>
          </div>
          
          {/* Window Content */}
          <div style={styles.content}>
            <AnimatePresence mode="wait">
              {step === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={styles.formContainer}
                >
                  <div style={styles.welcomeSection}>
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      style={styles.avatar}
                    >
                      <div style={styles.avatarIcon}>
                        <FiLock size={32} />
                      </div>
                    </motion.div>
                    
                    <div style={styles.welcomeText}>
                      <h2 style={styles.welcomeTitle}>Welcome to Server.x</h2>
                      <p style={styles.welcomeSubtitle}>Sign in to your account</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLogin} style={styles.form}>
                    <motion.div 
                      animate={{ 
                        scale: isFocused.email ? 1.02 : 1,
                        borderColor: isFocused.email ? '#0078D4' : '#3a3a3a'
                      }}
                      transition={{ duration: 0.2 }}
                      style={styles.inputWrapper}
                    >
                      <div style={styles.inputIcon}>
                        <FiMail size={18} />
                      </div>
                      <input
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsFocused({ ...isFocused, email: true })}
                        onBlur={() => setIsFocused({ ...isFocused, email: false })}
                        style={styles.input}
                        placeholder="Enter your email address"
                        required
                        disabled={loading}
                      />
                    </motion.div>
                    
                    <motion.div 
                      animate={{ 
                        scale: isFocused.password ? 1.02 : 1,
                        borderColor: isFocused.password ? '#0078D4' : '#3a3a3a'
                      }}
                      transition={{ duration: 0.2 }}
                      style={styles.inputWrapper}
                    >
                      <div style={styles.inputIcon}>
                        <FiLock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setIsFocused({ ...isFocused, password: true })}
                        onBlur={() => setIsFocused({ ...isFocused, password: false })}
                        style={styles.input}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        style={styles.togglePassword}
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </motion.div>
                    
                    <div style={styles.rememberSection}>
                      <label style={styles.checkboxLabel}>
                        <input type="checkbox" style={styles.checkbox} />
                        <span>Remember me</span>
                      </label>
                      <a href="#" style={styles.forgotLink}>Forgot password?</a>
                    </div>
                    
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={styles.errorBox}
                      >
                        <FiX size={16} />
                        <span>{error}</span>
                      </motion.div>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      style={styles.loginButton}
                      disabled={loading || !email || !password}
                    >
                      {loading ? (
                        <div style={styles.loadingSpinner} />
                      ) : (
                        <>
                          Sign In
                          <FiChevronRight size={18} />
                        </>
                      )}
                    </motion.button>
                    
                    <div style={styles.divider}>
                      <span style={styles.dividerText}>or</span>
                    </div>
                    
                    <button type="button" style={styles.alternativeButton}>
                      <FiSettings size={16} />
                      <span>Use security key</span>
                    </button>
                    
                    <div style={styles.footerLinks}>
                      <a href="#" style={styles.footerLink}>Create account</a>
                      <a href="#" style={styles.footerLink}>Privacy policy</a>
                      <a href="#" style={styles.footerLink}>Terms of use</a>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="verify"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={styles.formContainer}
                >
                  <div style={styles.welcomeSection}>
                    <div style={{ ...styles.avatar, background: 'linear-gradient(135deg, #48bb78, #38a169)' }}>
                      <div style={styles.avatarIcon}>
                        <FiCheck size={32} />
                      </div>
                    </div>
                    
                    <div style={styles.welcomeText}>
                      <h2 style={styles.welcomeTitle}>Verification Required</h2>
                      <p style={styles.welcomeSubtitle}>Check your email for the code</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleVerification} style={styles.form}>
                    <div style={styles.verificationInfo}>
                      <p style={styles.verificationText}>
                        We've sent a 6-digit verification code to:
                        <br />
                        <strong>{email}</strong>
                      </p>
                    </div>
                    
                    <div style={styles.codeInputs}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          type="text"
                          maxLength="1"
                          style={styles.codeInput}
                          value={verificationCode[index] || ''}
                          onChange={(e) => {
                            const newCode = verificationCode.split('');
                            newCode[index] = e.target.value;
                            setVerificationCode(newCode.join('').slice(0, 6));
                            if (e.target.value && index < 5) {
                              document.querySelectorAll('.code-input')[index + 1]?.focus();
                            }
                          }}
                          className="code-input"
                        />
                      ))}
                    </div>
                    
                    <div style={styles.timerSection}>
                      <span style={styles.timerText}>Code expires in: 01:00</span>
                      <button type="button" style={styles.resendButton}>
                        Resend code
                      </button>
                    </div>
                    
                    {error && (
                      <div style={styles.errorBox}>
                        <FiX size={16} />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    <div style={styles.verifyActions}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        style={styles.verifyButton}
                        disabled={loading || verificationCode.length !== 6}
                      >
                        {loading ? 'Verifying...' : 'Verify & Continue'}
                      </motion.button>
                      
                      <button
                        type="button"
                        style={styles.backButton}
                        onClick={() => setStep('login')}
                      >
                        Back to login
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Power Button */}
            <motion.button
              whileHover={{ rotate: 90 }}
              style={styles.powerButton}
              onClick={() => handleWindowControl('close')}
              title="Shutdown"
            >
              <FiPower size={20} />
            </motion.button>
          </div>
          
          {/* Window Status Bar */}
          <div className="glass-effect" style={styles.statusBar}>
            <div style={styles.statusLeft}>
              <span style={styles.statusText}>Ready</span>
            </div>
            <div style={styles.statusRight}>
              <span style={styles.statusText}>Server.x v1.0</span>
              <span style={styles.statusSeparator}>|</span>
              <span style={styles.statusText}>Secure Connection</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
    zIndex: 1
  },
  
  systemTray: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 20px',
    zIndex: 1000
  },
  
  trayLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  
  trayButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#fff',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  batteryIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#fff',
    fontSize: '12px'
  },
  
  batteryText: {
    fontSize: '11px'
  },
  
  trayRight: {
    display: 'flex',
    alignItems: 'center'
  },
  
  timeDisplay: {
    textAlign: 'right',
    color: '#fff'
  },
  
  time: {
    fontSize: '14px',
    fontWeight: '500'
  },
  
  date: {
    fontSize: '11px',
    opacity: '0.8'
  },
  
  window: {
    width: '450px',
    background: 'rgba(26, 26, 26, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative'
  },
  
  titleBar: {
    background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
    color: '#fff',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    userSelect: 'none'
  },
  
  titleContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #0078D4 0%, #00BCF2 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  title: {
    display: 'flex',
    flexDirection: 'column'
  },
  
  titleText: {
    fontSize: '14px',
    fontWeight: '600'
  },
  
  titleSub: {
    fontSize: '11px',
    opacity: '0.7'
  },
  
  windowControls: {
    display: 'flex',
    gap: '8px'
  },
  
  controlButton: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  
  controlMinimize: {
    background: '#FFBD2E',
    color: '#000'
  },
  
  controlMaximize: {
    background: '#28CA42',
    color: '#000'
  },
  
  controlClose: {
    background: '#FF5F56',
    color: '#000'
  },
  
  content: {
    padding: '40px',
    position: 'relative'
  },
  
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  
  welcomeSection: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  },
  
  avatar: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #0078D4 0%, #764ba2 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  
  avatarIcon: {
    color: '#fff'
  },
  
  welcomeText: {
    color: '#fff'
  },
  
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 8px 0'
  },
  
  welcomeSubtitle: {
    fontSize: '14px',
    opacity: '0.7',
    margin: 0
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid #3a3a3a',
    borderRadius: '8px',
    padding: '0 15px',
    transition: 'all 0.2s ease'
  },
  
  inputIcon: {
    color: '#666',
    marginRight: '12px'
  },
  
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    padding: '15px 0',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'Segoe UI, system-ui'
  },
  
  togglePassword: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '5px'
  },
  
  rememberSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px'
  },
  
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#aaa',
    cursor: 'pointer'
  },
  
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#0078D4'
  },
  
  forgotLink: {
    color: '#0078D4',
    textDecoration: 'none',
    fontSize: '13px'
  },
  
  errorBox: {
    background: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    color: '#f87171',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  loginButton: {
    background: 'linear-gradient(135deg, #0078D4 0%, #005a9e 100%)',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s ease'
  },
  
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '10px 0'
  },
  
  dividerText: {
    background: '#1a1a1a',
    color: '#666',
    padding: '0 15px',
    fontSize: '12px',
    position: 'relative',
    zIndex: 1
  },
  
  divider: {
    position: 'relative',
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '20px 0'
  },
  
  dividerText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#1a1a1a',
    color: '#666',
    padding: '0 15px',
    fontSize: '12px'
  },
  
  alternativeButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#aaa',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s ease'
  },
  
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '20px',
    fontSize: '12px'
  },
  
  footerLink: {
    color: '#666',
    textDecoration: 'none',
    transition: 'color 0.2s ease'
  },
  
  verificationInfo: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  
  verificationText: {
    margin: 0
  },
  
  codeInputs: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px'
  },
  
  codeInput: {
    width: '50px',
    height: '60px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid #3a3a3a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '24px',
    textAlign: 'center',
    outline: 'none',
    fontFamily: 'monospace'
  },
  
  timerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#aaa'
  },
  
  timerText: {
    fontSize: '12px'
  },
  
  resendButton: {
    background: 'transparent',
    border: 'none',
    color: '#0078D4',
    fontSize: '12px',
    cursor: 'pointer'
  },
  
  verifyActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  
  verifyButton: {
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: '#fff',
    border: 'none',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  
  backButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#aaa',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  
  powerButton: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none'
  },
  
  statusBar: {
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#666',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
  },
  
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  statusRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  statusText: {
    fontSize: '11px'
  },
  
  statusSeparator: {
    opacity: '0.3'
  }
};
