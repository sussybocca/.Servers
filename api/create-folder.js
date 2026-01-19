// pages/api/create-folder.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { serverId, path } = req.body;
    
    if (!serverId || !path) {
      return res.status(400).json({ success: false, error: 'Server ID and path are required' });
    }

    // Create an empty index file in the folder to represent it
    const indexPath = path.endsWith('/') ? `${path}index.html` : `${path}/index.html`;
    
    const { data, error } = await supabase
      .from('server_files')
      .insert({
        server_id: serverId,
        path: indexPath,
        content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Folder</title>\n</head>\n<body>\n  <!-- This folder was created in Server.x -->\n</body>\n</html>',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create folder' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Folder created successfully' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create folder' 
    });
  }
}
