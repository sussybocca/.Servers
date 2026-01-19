// pages/api/get-server-files.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { serverId } = req.query;
    
    if (!serverId) {
      return res.status(400).json({ success: false, error: 'Server ID is required' });
    }

    // Get files from server_files table
    const { data: files, error: filesError } = await supabase
      .from('server_files')
      .select('*')
      .eq('server_id', serverId)
      .order('path');

    if (filesError) {
      console.error('Files error:', filesError);
      // Return empty arrays if table doesn't exist yet
      return res.status(200).json({ 
        success: true, 
        files: [], 
        folders: [] 
      });
    }

    // Extract folders from file paths
    const folderSet = new Set();
    files.forEach(file => {
      const pathParts = file.path.split('/').slice(0, -1);
      let currentPath = '';
      pathParts.forEach(part => {
        if (part) {
          currentPath += '/' + part;
          folderSet.add(currentPath);
        }
      });
    });

    const folders = Array.from(folderSet).map(path => ({ path }));

    res.status(200).json({ 
      success: true, 
      files: files.map(f => ({ 
        path: f.path, 
        content: f.content 
      })), 
      folders 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load files' 
    });
  }
}
