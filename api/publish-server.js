// pages/api/publish-server.js
import { createClient } from '@supabase/supabase-js';

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

    const { serverId, version_id, release_notes = '' } = req.body;
    
    if (!serverId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID is required' 
      });
    }

    // Check if user owns the server
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id, name, virtual_url')
      .eq('id', serverId)
      .single();
    
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to publish this server' 
      });
    }

    // If version_id is provided, publish that specific version
    if (version_id) {
      // Check if version exists and belongs to this server
      const { data: version } = await supabase
        .from('server_versions')
        .select('*')
        .eq('id', version_id)
        .eq('server_id', serverId)
        .single();
      
      if (!version) {
        return res.status(400).json({ 
          success: false, 
          error: 'Version not found or does not belong to this server' 
        });
      }

      // Mark version as released
      const { data: updatedVersion, error: updateError } = await supabase
        .from('server_versions')
        .update({
          is_released: true,
          release_date: new Date().toISOString()
        })
        .eq('id', version_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error releasing version:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to publish version: ' + updateError.message 
        });
      }

      // Create release history entry
      await supabase
        .from('released_versions')
        .insert([{
          server_id: serverId,
          version_id: version_id,
          released_by: userId,
          released_at: new Date().toISOString(),
          notes: release_notes
        }]);

      return res.status(200).json({ 
        success: true, 
        message: `Version "${version.version_name}" published successfully!`,
        version: updatedVersion,
        url: server.virtual_url ? 
          `https://servers-wveg.vercel.app/server/${server.virtual_url}` :
          `https://servers-wveg.vercel.app/s/${serverId}`
      });
    }

    // If no version_id provided, create a new version from current files
    // First get all files from server_files table
    const { data: currentFiles, error: filesError } = await supabase
      .from('server_files')
      .select('path, content, updated_at')
      .eq('server_id', serverId);
    
    if (filesError) {
      console.error('Error fetching files:', filesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch server files' 
      });
    }

    if (!currentFiles || currentFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files found to publish' 
      });
    }

    // Create version name based on date
    const versionName = `Release ${new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`;
    
    const versionNumber = `v${Date.now()}`;

    // Calculate total size and create file URL (in production, you'd upload to storage)
    const totalSize = currentFiles.reduce((sum, file) => 
      sum + Buffer.byteLength(file.content || '', 'utf8'), 0);
    
    // Create version in database
    const { data: newVersion, error: versionError } = await supabase
      .from('server_versions')
      .insert([{
        server_id: serverId,
        version_name: versionName,
        version_number: versionNumber,
        description: `Published version of "${server.name}"`,
        changelog: release_notes || 'Published from editor',
        file_url: '', // Would be actual file URL if uploaded to storage
        file_size: totalSize,
        file_hash: '', // Would be actual hash if files were stored
        is_released: true,
        is_prerelease: false,
        release_date: new Date().toISOString(),
        created_by: userId,
        created_at: new Date().toISOString(),
        download_count: 0
      }])
      .select()
      .single();
    
    if (versionError) {
      console.error('Error creating version:', versionError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create version: ' + versionError.message 
      });
    }

    // Copy all files to version_files table
    for (const file of currentFiles) {
      await supabase
        .from('version_files')
        .insert({
          version_id: newVersion.id,
          server_id: serverId,
          path: file.path,
          content: file.content || '',
          file_size: Buffer.byteLength(file.content || '', 'utf8'),
          file_hash: '', // Would be actual hash
          created_at: new Date().toISOString(),
          updated_at: file.updated_at || new Date().toISOString()
        });
    }

    // Create release history entry
    await supabase
      .from('released_versions')
      .insert([{
        server_id: serverId,
        version_id: newVersion.id,
        released_by: userId,
        released_at: new Date().toISOString(),
        notes: release_notes
      }]);

    res.status(200).json({ 
      success: true, 
      message: `Server "${server.name}" published as version "${versionName}"`,
      version: newVersion,
      url: server.virtual_url ? 
        `https://servers-wveg.vercel.app/server/${server.virtual_url}` :
        `https://servers-wveg.vercel.app/s/${serverId}`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to publish server: ' + error.message 
    });
  }
}
