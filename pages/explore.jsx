'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ExplorePage() {
  const [servers, setServers] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverFiles, setServerFiles] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverContent, setServerContent] = useState('');

  useEffect(() => {
    loadUser();
    loadServers();
  }, []);

  const loadUser = async () => {
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

  const enterServer = async (serverId) => {
    setLoadingServer(true);
    setSelectedServer(serverId);
    
    try {
      // 1. Fetch server details
      const serverRes = await fetch(`/api/get-server?serverId=${serverId}`);
      const serverData = await serverRes.json();
      
      // 2. Fetch server files
      const filesRes = await fetch(`/api/get-server-files?serverId=${serverId}`);
      const filesData = await filesRes.json();
      
      if (filesData.success && filesData.files) {
        setServerFiles(filesData.files);
        
        // Find index.html to display
        const indexFile = filesData.files.find(f => f.path === '/index.html');
        if (indexFile) {
          setServerContent(indexFile.content);
        } else {
          setServerContent('<h1>No index.html found</h1><p>This server has no homepage.</p>');
        }
      } else {
        setServerContent('<h1>Failed to load server files</h1>');
      }
      
      // 3. Increment view count
      await fetch('/api/increment-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      
    } catch (error) {
      console.error('Failed to load server:', error);
      setServerContent('<h1>Error loading server</h1><p>Try again later.</p>');
    } finally {
      setLoadingServer(false);
    }
  };

  const goBackToExplore = () => {
    setSelectedServer(null);
    setServerFiles([]);
    setServerContent('');
  };

  const logout = () => {
    document.cookie = '__Host-session_secure=; Max-Age=0; Path=/';
    window.location.href = '/login';
  };

  const goToEditor = () => {
    window.location.href = '/editor';
  };

  // Render server content in an iframe
  const renderServerContent = () => {
    const server = servers.find(s => s.id === selectedServer);
    
    return (
      <div style={styles.serverView}>
        <div style={styles.serverHeader}>
          <button style={styles.backButton} onClick={goBackToExplore}>
            ← Back to Explore
          </button>
          <div style={styles.serverInfo}>
            <h2 style={styles.serverTitle}>{server?.name || 'Server'}</h2>
            <p style={styles.serverDesc}>{server?.description || 'No description'}</p>
          </div>
          <div style={styles.serverMeta}>
            <span>👁️ {server?.views || 0} views</span>
            <span>{server?.is_public ? '🌐 Public' : '🔒 Private'}</span>
          </div>
        </div>
        
        <div style={styles.warningBox}>
          ⚠️ You are viewing user-generated content. This content runs in a sandboxed iframe.
        </div>
        
        {loadingServer ? (
          <div style={styles.loading}>
            Loading server content...
          </div>
        ) : (
          <iframe
            srcDoc={serverContent}
            style={styles.serverIframe}
            title="Server Content"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
        
        <div style={styles.fileList}>
          <h4>Available Files:</h4>
          {serverFiles.map(file => (
            <div key={file.path} style={styles.fileItem}>
              📄 {file.path}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Server.x - {selectedServer ? 'Viewing Server' : 'Explore'}</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo} onClick={selectedServer ? goBackToExplore : undefined}>
            Server.x
          </div>
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
          {selectedServer ? (
            renderServerContent()
          ) : (
            <>
              <h1 style={styles.title}>Explore Servers</h1>
              
              <div style={styles.warning}>
                ⚠️ Click on any server to view its content right here.
                The entire page DOM will change to show the server's files.
              </div>

              <div style={styles.serversGrid}>
                {servers.map(server => (
                  <div 
                    key={server.id} 
                    style={styles.serverCard}
                    onClick={() => enterServer(server.id)}
                  >
                    <div style={styles.serverHeaderSmall}>
                      <h3 style={styles.serverName}>{server.name}</h3>
                      <span style={{
                        ...styles.serverBadge,
                        backgroundColor: server.is_public ? '#d4edda' : '#f8d7da',
                        color: server.is_public ? '#155724' : '#721c24'
                      }}>
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
            </>
          )}
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
    color: '#4285f4',
    cursor: 'pointer'
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
    padding: 0,
    maxWidth: '100%',
    margin: 0
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    color: '#1a1a1a',
    padding: '40px 40px 0'
  },
  warning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    color: '#856404',
    padding: 16,
    borderRadius: 8,
    margin: '0 40px 30px'
  },
  serversGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
    padding: '0 40px 40px'
  },
  serverCard: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
    }
  },
  serverHeaderSmall: {
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
  },
  // Server view styles
  serverView: {
    height: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column'
  },
  serverHeader: {
    backgroundColor: '#252526',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    marginRight: 20
  },
  serverInfo: {
    flex: 1
  },
  serverTitle: {
    margin: 0,
    fontSize: 24,
    color: 'white'
  },
  serverDesc: {
    margin: '5px 0 0',
    color: '#ccc',
    fontSize: 14
  },
  serverMeta: {
    display: 'flex',
    gap: 20,
    color: '#888',
    fontSize: 14
  },
  warningBox: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '12px 20px',
    textAlign: 'center',
    fontSize: 14
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: 18,
    color: '#666'
  },
  serverIframe: {
    flex: 1,
    width: '100%',
    border: 'none',
    backgroundColor: 'white'
  },
  fileList: {
    backgroundColor: 'white',
    borderTop: '1px solid #ddd',
    padding: '15px 20px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  fileItem: {
    padding: '5px 0',
    fontSize: 14,
    color: '#666',
    borderBottom: '1px solid #f0f0f0'
  }
};
