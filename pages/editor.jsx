'use client';

import { useState } from 'react';
import Head from 'next/head';

export default function EditorPage() {
  const [serverName, setServerName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createServer = async () => {
    if (!serverName.trim()) {
      setMessage('Server name is required');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serverName,
          description,
          is_public: isPublic
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Server created successfully!');
        // Redirect to editor for that server
        setTimeout(() => {
          window.location.href = `/editor/${data.server.id}`;
        }, 1500);
      } else {
        setMessage(data.error || 'Failed to create server');
      }
    } catch (error) {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Server.x - Create Server</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo} onClick={() => window.location.href = '/explore'}>
            Server.x
          </div>
          <div style={styles.nav}>
            <button 
              style={styles.backButton}
              onClick={() => window.location.href = '/explore'}
            >
              ← Back to Explore
            </button>
          </div>
        </div>

        <div style={styles.main}>
          <div style={styles.editorBox}>
            <h2 style={styles.title}>Create New Server</h2>
            
            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Server Name *</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  style={styles.input}
                  placeholder="My Awesome Server"
                  maxLength={50}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="Describe your server..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Make server public (visible to everyone)
                </label>
              </div>

              <div style={styles.infoBox}>
                <strong>⚠️ Important:</strong> Servers expire after 60 days unless renewed.
                You cannot upload PNG, JPG, MP4, or any media files.
              </div>

              {message && (
                <div style={message.includes('success') ? styles.successMessage : styles.errorMessage}>
                  {message}
                </div>
              )}

              <button
                style={styles.createButton}
                onClick={createServer}
                disabled={loading || !serverName.trim()}
              >
                {loading ? 'Creating...' : 'Create Server & Open Editor'}
              </button>
            </div>
          </div>

          <div style={styles.instructions}>
            <h3>How it works:</h3>
            <ol style={styles.instructionsList}>
              <li>Create server with name and description</li>
              <li>Use code editor to add HTML, CSS, JS files</li>
              <li>Organize files in folders</li>
              <li>Publish when ready</li>
              <li>Renew every 60 days to keep it alive</li>
            </ol>
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
    color: '#4285f4',
    cursor: 'pointer'
  },
  nav: {
    display: 'flex',
    gap: 20
  },
  backButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 6,
    cursor: 'pointer'
  },
  main: {
    padding: 40,
    maxWidth: 800,
    margin: '0 auto'
  },
  editorBox: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 30,
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    color: '#1a1a1a'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none'
  },
  textarea: {
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer'
  },
  checkbox: {
    width: 18,
    height: 18
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    color: '#856404',
    padding: 16,
    borderRadius: 8,
    fontSize: 14
  },
  successMessage: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724',
    padding: 12,
    borderRadius: 8
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24',
    padding: 12,
    borderRadius: 8
  },
  createButton: {
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  instructions: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 20
  },
  instructionsList: {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.8,
    color: '#555'
  }
};
