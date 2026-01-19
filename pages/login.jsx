import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Redirect to index.html
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.window}>
        <div style={styles.titleBar}>
          <div style={styles.title}>Server.x Login</div>
          <div style={styles.windowControls}>
            <button style={styles.controlButton}>—</button>
            <button style={styles.controlButton}>□</button>
            <button style={styles.controlButton}>×</button>
          </div>
        </div>
        
        <div style={styles.content}>
          <div style={styles.logo}>Server.x</div>
          
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
              />
            </div>
            
            {error && <div style={styles.error}>{error}</div>}
            
            <button 
              type="submit" 
              style={styles.loginButton}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <div style={styles.footer}>
              <a href="#" style={styles.link}>Forgot password?</a>
              <span style={styles.separator}>|</span>
              <a href="/signup" style={styles.link}>Create account</a>
            </div>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0078D4',
    background: 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)',
    fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
    animation: 'fadeIn 0.5s ease-out'
  },
  window: {
    width: '400px',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    animation: 'glow 2s infinite alternate'
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
    fontSize: '14px',
    fontWeight: '400'
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
    padding: '0'
  },
  content: {
    padding: '40px'
  },
  logo: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0078D4',
    textAlign: 'center',
    marginBottom: '30px',
    fontFamily: 'Segoe UI, system-ui'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    color: '#323130',
    fontWeight: '500'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #8A8886',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'Segoe UI'
  },
  error: {
    color: '#D13438',
    fontSize: '13px',
    padding: '8px',
    backgroundColor: '#FDE7E9',
    borderRadius: '4px',
    border: '1px solid #F3B8BC'
  },
  loginButton: {
    backgroundColor: '#0078D4',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'Segoe UI'
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
    fontSize: '13px'
  },
  link: {
    color: '#0078D4',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  separator: {
    color: '#8A8886'
  }
};
