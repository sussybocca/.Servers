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
    const { serverId, versionId, published } = req.query;
    
    if (!serverId) {
      return res.status(400).json({ success: false, error: 'Server ID is required' });
    }

    let files = [];
    let source = '';

    if (published === 'true' && versionId) {
      // Get files from a specific published version
      source = `version_files (version: ${versionId})`;
      const { data: versionFiles, error: versionError } = await supabase
        .from('version_files')
        .select('path, content, updated_at')
        .eq('version_id', versionId)
        .eq('server_id', serverId)
        .order('path');

      if (versionError) {
        console.error('Version files error:', versionError);
        return res.status(200).json({ 
          success: true, 
          files: [], 
          folders: [],
          source: source,
          versionInfo: null
        });
      }

      files = versionFiles || [];

      // Also get version metadata
      const { data: versionInfo } = await supabase
        .from('server_versions')
        .select('version_name, version_number, release_date, description')
        .eq('id', versionId)
        .single();

      res.status(200).json({ 
        success: true, 
        files: files.map(f => ({ 
          path: f.path, 
          content: f.content,
          updatedAt: f.updated_at
        })), 
        folders: extractFolders(files),
        source: source,
        versionInfo: versionInfo,
        isPublishedVersion: true
      });
      return;

    } else if (published === 'true') {
      // Get the latest published version's files
      source = 'latest published version';
      
      // First get the latest released version for this server
      const { data: latestVersion, error: versionError } = await supabase
        .from('server_versions')
        .select('id, version_name, version_number, release_date')
        .eq('server_id', serverId)
        .eq('is_released', true)
        .order('release_date', { ascending: false })
        .limit(1)
        .single();

      if (versionError || !latestVersion) {
        console.error('No published version found:', versionError);
        // Fall back to current files
      } else {
        const { data: versionFiles, error: filesError } = await supabase
          .from('version_files')
          .select('path, content, updated_at')
          .eq('version_id', latestVersion.id)
          .eq('server_id', serverId)
          .order('path');

        if (!filesError && versionFiles) {
          files = versionFiles;
          
          res.status(200).json({ 
            success: true, 
            files: files.map(f => ({ 
              path: f.path, 
              content: f.content,
              updatedAt: f.updated_at
            })), 
            folders: extractFolders(files),
            source: source,
            versionInfo: latestVersion,
            isPublishedVersion: true
          });
          return;
        }
      }
    }

    // Default: Get current working files from server_files table
    source = 'current working files';
    const { data: currentFiles, error: filesError } = await supabase
      .from('server_files')
      .select('path, content, updated_at')
      .eq('server_id', serverId)
      .order('path');

    if (filesError) {
      console.error('Current files error:', filesError);
      // Return empty arrays if table doesn't exist yet
      return res.status(200).json({ 
        success: true, 
        files: [], 
        folders: [],
        source: source,
        isPublishedVersion: false
      });
    }

    files = currentFiles || [];

    res.status(200).json({ 
      success: true, 
      files: files.map(f => ({ 
        path: f.path, 
        content: f.content,
        updatedAt: f.updated_at
      })), 
      folders: extractFolders(files),
      source: source,
      isPublishedVersion: false
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load files' 
    });
  }
}

// Helper function to extract folders from file paths
function extractFolders(files) {
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

  return Array.from(folderSet).map(path => ({ path }));
}
