'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ExplorePage() {
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadServers();
  }, []);

  const loadUser = async () => {
    // Check session cookie
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

  const enterServer = (serverId) => {
    // Navigate to server view
    window.location.href = `/server/${serverId}`;
  };

  const logout = () => {
    // Clear session
    document.cookie = '__Host-session_secure=; Max-Age=0; Path=/';
    window.location.href = '/login';
  };

  const goToEditor = () => {
    window.location.href = '/editor';
  };

  return (
    <>
      <Head>
        <title>Server.x - Explore</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>Server.x</div>
          <div style={styles.nav}>
            <button style={styles.navButton} onClick={goToEditor}>
              Create Server
            </button>
            <div style={styles.userInfo}>
              <span style={styles.username}>{user?.username || 'User'}</span>
              <button style={styles.logoutButton} onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div style={styles.main}>
          <h1 style={styles.title}>Explore Servers</h1>
          
          <div style={styles.warning}>
            ⚠️ Warning: When entering a server, the entire page content changes.
            Only visit servers from trusted creators.
          </div>

          <div style={styles.serversGrid}>
            {servers.map(server => (
              <div 
                key={server.id} 
                style={styles.serverCard}
                onClick={() => enterServer(server.id)}
              >
                <div style={styles.serverHeader}>
                  <h3 style={styles.serverName}>{server.name}</h3>
                  <span style={styles.serverBadge}>
                    {server.is_public ? 'PUBLIC' : 'PRIVATE'}
                  </span>
                </div>
                <p style={styles.serverDescription}>
                  {server.description || 'No description'}
                </p>
                <div style={styles.serverStats}>
                  <span>👁️ {server.views || 0}</span>
                  <span>🔄 {server.renewal_date ? 'Renews: ' + new Date(server.renewal_date).toLocaleDateString() : 'No renewal'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285f4'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  navButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  username: {
    color: '#ccc'
  },
  logoutButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer'
  },
  main: {
    padding: 40,
    maxWidth: 1200,
    margin: '0 auto'
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    color: '#1a1a1a'
  },
  warning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    color: '#856404',
    padding: 16,
    borderRadius: 8,
    marginBottom: 30
  },
  serversGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24
  },
  serverCard: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  serverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  serverName: {
    margin: 0,
    fontSize: 18,
    color: '#1a1a1a'
  },
  serverBadge: {
    backgroundColor: '#e9ecef',
    color: '#495057',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  serverDescription: {
    color: '#666',
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 16
  },
  serverStats: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#888',
    fontSize: 13,
    borderTop: '1px solid #eee',
    paddingTop: 12
  }
};
