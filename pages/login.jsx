'use client';

import { useState } from 'react';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login'); // 'login' or 'verify'
  const [verificationCode, setVerificationCode] = useState('');

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
          captcha_token: 'your-captcha-token' // Add actual CAPTCHA
        })
      });

      const data = await response.json();

      if (data.verification_required) {
        setStep('verify');
      } else if (data.success) {
        // Redirect to explore page
        window.location.href = '/explore';
      } else {
        setError(data.error || 'Login failed');
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

  return (
    <>
      <Head>
        <title>Server.x - Login</title>
        <style>{`
          body {
            margin: 0;
            background: #0078D4;
            font-family: 'Segoe UI', system-ui;
          }
        `}</style>
      </Head>
      <div style={styles.container}>
        <div style={styles.window}>
          <div style={styles.titleBar}>
            <div style={styles.title}>Server.x Login</div>
            <div style={styles.windowControls}>
              <div style={styles.controlMinimize}>—</div>
              <div style={styles.controlMaximize}>□</div>
              <div style={styles.controlClose}>×</div>
            </div>
          </div>
          
          <div style={styles.content}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>🖥️</div>
              <div style={styles.logoText}>Server.x</div>
            </div>

            {step === 'login' ? (
              <form onSubmit={handleLogin} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    placeholder="user@example.com"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
                
                {error && <div style={styles.errorBox}>{error}</div>}
                
                <button 
                  type="submit" 
                  style={styles.loginButton}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerification} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    style={styles.input}
                    placeholder="123456"
                    required
                    disabled={loading}
                  />
                  <div style={styles.helpText}>
                    Check your email for the 6-digit code
                  </div>
                </div>
                
                {error && <div style={styles.errorBox}>{error}</div>}
                
                <button 
                  type="submit" 
                  style={styles.loginButton}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                
                <button 
                  type="button" 
                  style={styles.backButton}
                  onClick={() => setStep('login')}
                >
                  Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)'
  },
  window: {
    width: 400,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  titleBar: {
    backgroundColor: '#2D2D2D',
    color: 'white',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1E1E1E'
  },
  title: {
    fontSize: 14,
    fontWeight: 400
  },
  windowControls: {
    display: 'flex',
    gap: 8
  },
  controlMinimize: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#FFBD2E',
    cursor: 'pointer'
  },
  controlMaximize: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#28CA42',
    cursor: 'pointer'
  },
  controlClose: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#FF5F56',
    cursor: 'pointer'
  },
  content: {
    padding: 40
  },
  logo: {
    textAlign: 'center',
    marginBottom: 30
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 10
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0078D4'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 14,
    color: '#323130',
    fontWeight: 500
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #8A8886',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'Segoe UI'
  },
  helpText: {
    fontSize: 12,
    color: '#605E5C',
    marginTop: 4
  },
  errorBox: {
    backgroundColor: '#FDE7E9',
    border: '1px solid #F3B8BC',
    color: '#D13438',
    padding: 12,
    borderRadius: 4,
    fontSize: 13
  },
  loginButton: {
    backgroundColor: '#0078D4',
    color: 'white',
    border: 'none',
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Segoe UI'
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#0078D4',
    border: '1px solid #0078D4',
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8
  }
};
