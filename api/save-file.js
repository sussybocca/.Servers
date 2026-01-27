// pages/api/save-file.js
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper to get user from session
async function getUserIdFromSession(req) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => c.split('='))
    );
    
    const sessionToken = cookies['__Host-session_secure'];
    
    if (!sessionToken) {
      return null;
    }
    
    const { data: session, error } = await supabase
      .from('sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();
    
    if (error || !session) {
      return null;
    }
    
    if (new Date(session.expires_at) < new Date()) {
      return null;
    }
    
    return session.user_id;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const userId = await getUserIdFromSession(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please log in.' 
      });
    }

    const { serverId, version_id, path, content } = req.body;
    
    if (!serverId || !path) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID and path are required' 
      });
    }

    // Check if user owns the server
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', serverId)
      .single();
    
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to save files for this server' 
      });
    }

    let actualVersionId = version_id;
    
    // If no version_id provided, create or get a default version
    if (!actualVersionId) {
      // Check if there's a default version for this server
      const { data: existingVersions } = await supabase
        .from('server_versions')
        .select('id')
        .eq('server_id', serverId)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (existingVersions && existingVersions.length > 0) {
        // Use the first version
        actualVersionId = existingVersions[0].id;
      } else {
        // Create a default version - USE CORRECT COLUMN NAMES
        const { data: newVersion, error: versionError } = await supabase
          .from('server_versions')
          .insert({
            server_id: serverId,
            version_name: 'Initial Version',
            version_number: 'v1.0.0',
            description: 'Default version created automatically',
            is_released: false,      // Use correct column name from your schema
            is_prerelease: false,    // Use correct column name from your schema
            created_by: userId,      // This is REQUIRED - add the user ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (versionError) {
          console.error('Error creating default version:', versionError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create default version' 
          });
        }
        
        actualVersionId = newVersion.id;
      }
    } else {
      // Verify the provided version exists and belongs to this server
      const { data: version } = await supabase
        .from('server_versions')
        .select('id, server_id')
        .eq('id', actualVersionId)
        .eq('server_id', serverId)
        .single();
      
      if (!version) {
        return res.status(400).json({ 
          success: false, 
          error: 'Version not found or does not belong to this server' 
        });
      }
    }

    // Create a file hash for the content
    const fileHash = createHash('sha256').update(content || '').digest('hex');
    const fileSize = Buffer.byteLength(content || '', 'utf8');
    
    // Save to version_files table
    const { data: existingVersionFile } = await supabase
      .from('version_files')
      .select('id')
      .eq('version_id', actualVersionId)
      .eq('path', path)
      .single();

    let result;
    
    if (existingVersionFile) {
      // Update existing version file
      const { data, error } = await supabase
        .from('version_files')
        .update({ 
          content: content || '',
          file_hash: fileHash,
          file_size: fileSize,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingVersionFile.id)
        .select();

      result = { data, error };
    } else {
      // Create new version file
      const { data, error } = await supabase
        .from('version_files')
        .insert({
          version_id: actualVersionId,
          server_id: serverId,
          path,
          content: content || '',
          file_hash: fileHash,
          file_size: fileSize,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save file to version' 
      });
    }

    // Also update the server_versions table with aggregated file info
    const { data: versionFiles } = await supabase
      .from('version_files')
      .select('file_size, file_hash')
      .eq('version_id', actualVersionId);
    
    if (versionFiles && versionFiles.length > 0) {
      const totalSize = versionFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
      
      // Create a combined hash of all files
      const combinedHash = createHash('sha256')
        .update(versionFiles.map(f => f.file_hash).sort().join(''))
        .digest('hex');
      
      // Update the version with file info
      await supabase
        .from('server_versions')
        .update({
          file_size: totalSize,
          file_hash: combinedHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', actualVersionId);
    }

    res.status(200).json({ 
      success: true, 
      message: 'File saved successfully',
      version_id: actualVersionId,
      file_path: path
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save file: ' + error.message 
    });
  }
}
