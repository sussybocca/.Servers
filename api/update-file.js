// pages/api/server-files.js
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
  try {
    const userId = await getUserIdFromSession(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    switch (req.method) {
      case 'POST':
        return await handleUploadFile(req, res, userId);
      case 'PUT':
        return await handleUpdateFile(req, res, userId);
      case 'DELETE':
        return await handleDeleteFile(req, res, userId);
      case 'PATCH':
        return await handleReleaseManagement(req, res, userId);
      case 'GET':
        return await handleGetFiles(req, res, userId);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
}

// Upload a new file to server
async function handleUploadFile(req, res, userId) {
  try {
    const { serverId, path, content, fileType = 'file' } = req.body;
    
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
        error: 'You do not have permission to upload files to this server' 
      });
    }

    // Validate file extension
    const extension = path.split('.').pop().toLowerCase();
    const blockedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov', 'webm', 'exe', 'dll', 'bat', 'sh'];
    
    if (blockedExtensions.includes(extension)) {
      return res.status(400).json({ 
        success: false, 
        error: 'File type not allowed. Please upload text-based files only.' 
      });
    }

    // Create file hash
    const fileHash = createHash('sha256').update(content || '').digest('hex');
    const fileSize = Buffer.byteLength(content || '', 'utf8');

    // Determine if this is a regular file or version file
    if (fileType === 'version') {
      const { version_id } = req.body;
      
      if (!version_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Version ID is required for version files' 
        });
      }

      // Check if version belongs to this server
      const { data: version } = await supabase
        .from('server_versions')
        .select('id, server_id')
        .eq('id', version_id)
        .eq('server_id', serverId)
        .single();
      
      if (!version) {
        return res.status(400).json({ 
          success: false, 
          error: 'Version not found or does not belong to this server' 
        });
      }

      // Save to version_files table
      const { data: existingFile } = await supabase
        .from('version_files')
        .select('id')
        .eq('version_id', version_id)
        .eq('path', path)
        .single();

      let result;
      
      if (existingFile) {
        // Update existing version file
        const { data, error } = await supabase
          .from('version_files')
          .update({ 
            content: content || '',
            file_hash: fileHash,
            file_size: fileSize,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingFile.id)
          .select();

        result = { data, error };
      } else {
        // Create new version file
        const { data, error } = await supabase
          .from('version_files')
          .insert({
            version_id: version_id,
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
        throw result.error;
      }

      // Update version file info
      await updateVersionFileInfo(version_id);

      return res.status(200).json({ 
        success: true, 
        message: 'File saved to version successfully',
        file: result.data?.[0],
        version_id
      });
    } else {
      // Regular server file (to server_files table)
      const { data: existingFile } = await supabase
        .from('server_files')
        .select('id')
        .eq('server_id', serverId)
        .eq('path', path)
        .single();

      let result;
      
      if (existingFile) {
        // Update existing file
        const { data, error } = await supabase
          .from('server_files')
          .update({ 
            content: content || '',
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingFile.id)
          .select();

        result = { data, error };
      } else {
        // Create new file
        const { data, error } = await supabase
          .from('server_files')
          .insert({
            server_id: serverId,
            path,
            content: content || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        result = { data, error };
      }

      if (result.error) {
        throw result.error;
      }

      return res.status(200).json({ 
        success: true, 
        message: 'File uploaded successfully',
        file: result.data?.[0]
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to upload file: ' + error.message 
    });
  }
}

// Update an existing file
async function handleUpdateFile(req, res, userId) {
  try {
    const { fileId, content, fileType = 'file' } = req.body;
    
    if (!fileId || content === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'File ID and content are required' 
      });
    }

    if (fileType === 'version') {
      // Update version file
      const { data: versionFile } = await supabase
        .from('version_files')
        .select(`
          *,
          version:server_versions!inner(server_id, server:servers(owner_id))
        `)
        .eq('id', fileId)
        .single();
      
      if (!versionFile || versionFile.version.server.owner_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to update this file' 
        });
      }

      const fileHash = createHash('sha256').update(content || '').digest('hex');
      const fileSize = Buffer.byteLength(content || '', 'utf8');

      const { data, error } = await supabase
        .from('version_files')
        .update({ 
          content: content || '',
          file_hash: fileHash,
          file_size: fileSize,
          updated_at: new Date().toISOString() 
        })
        .eq('id', fileId)
        .select();

      if (error) throw error;

      // Update version file info
      await updateVersionFileInfo(versionFile.version_id);

      return res.status(200).json({ 
        success: true, 
        message: 'Version file updated successfully',
        file: data?.[0]
      });
    } else {
      // Update regular server file
      const { data: serverFile } = await supabase
        .from('server_files')
        .select(`
          *,
          server:servers!inner(owner_id)
        `)
        .eq('id', fileId)
        .single();
      
      if (!serverFile || serverFile.server.owner_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to update this file' 
        });
      }

      const { data, error } = await supabase
        .from('server_files')
        .update({ 
          content: content || '',
          updated_at: new Date().toISOString() 
        })
        .eq('id', fileId)
        .select();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'File updated successfully',
        file: data?.[0]
      });
    }
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update file: ' + error.message 
    });
  }
}

// Delete a file
async function handleDeleteFile(req, res, userId) {
  try {
    const { fileId, fileType = 'file' } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ 
        success: false, 
        error: 'File ID is required' 
      });
    }

    if (fileType === 'version') {
      // Delete version file
      const { data: versionFile } = await supabase
        .from('version_files')
        .select(`
          *,
          version:server_versions!inner(server_id, server:servers(owner_id))
        `)
        .eq('id', fileId)
        .single();
      
      if (!versionFile || versionFile.version.server.owner_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to delete this file' 
        });
      }

      const { error } = await supabase
        .from('version_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      // Update version file info
      await updateVersionFileInfo(versionFile.version_id);

      return res.status(200).json({ 
        success: true, 
        message: 'Version file deleted successfully'
      });
    } else {
      // Delete regular server file
      const { data: serverFile } = await supabase
        .from('server_files')
        .select(`
          *,
          server:servers!inner(owner_id)
        `)
        .eq('id', fileId)
        .single();
      
      if (!serverFile || serverFile.server.owner_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to delete this file' 
        });
      }

      const { error } = await supabase
        .from('server_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'File deleted successfully'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete file: ' + error.message 
    });
  }
}

// Release management (PATCH method)
async function handleReleaseManagement(req, res, userId) {
  try {
    const { 
      action, 
      serverId, 
      version_id,
      version_name,
      version_number,
      description,
      changelog,
      release_notes,
      is_prerelease = false
    } = req.body;

    if (!action || !serverId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Action and Server ID are required' 
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
        error: 'You do not have permission to manage releases for this server' 
      });
    }

    switch (action) {
      case 'create_version':
        return await handleCreateVersion(req, res, userId, serverId);
      case 'release_version':
        return await handleReleaseVersion(req, res, userId, serverId, version_id, release_notes);
      case 'update_version':
        return await handleUpdateVersion(req, res, userId, serverId, version_id);
      case 'delete_version':
        return await handleDeleteVersion(req, res, userId, serverId, version_id);
      case 'create_release':
        return await handleCreateRelease(req, res, userId, serverId);
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
    }
  } catch (error) {
    console.error('Release management error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to manage release: ' + error.message 
    });
  }
}

// Create a new version
async function handleCreateVersion(req, res, userId, serverId) {
  try {
    const { 
      version_name,
      version_number,
      description,
      changelog,
      is_prerelease = false
    } = req.body;

    if (!version_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Version name is required' 
      });
    }

    // Check if version number already exists
    if (version_number) {
      const { data: existingVersion } = await supabase
        .from('server_versions')
        .select('id')
        .eq('server_id', serverId)
        .eq('version_number', version_number)
        .single();
      
      if (existingVersion) {
        return res.status(400).json({ 
          success: false, 
          error: 'Version number already exists for this server' 
        });
      }
    }

    // Get all current files from server_files
    const { data: currentFiles } = await supabase
      .from('server_files')
      .select('path, content')
      .eq('server_id', serverId);

    if (!currentFiles || currentFiles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files found to create a version' 
      });
    }

    // Calculate total size and create combined hash
    let totalSize = 0;
    let combinedHash = '';
    const fileHashes = [];

    for (const file of currentFiles) {
      const fileSize = Buffer.byteLength(file.content || '', 'utf8');
      const fileHash = createHash('sha256').update(file.content || '').digest('hex');
      
      totalSize += fileSize;
      fileHashes.push(fileHash);
    }

    // Sort and combine hashes for consistent combined hash
    combinedHash = createHash('sha256')
      .update(fileHashes.sort().join(''))
      .digest('hex');

    // Create the version
    const { data: version, error } = await supabase
      .from('server_versions')
      .insert([{
        server_id: serverId,
        version_name,
        version_number: version_number || `v${Date.now()}`,
        description: description || `Version of ${version_name}`,
        changelog: changelog || 'Initial version',
        file_url: '', // Would be actual URL if uploaded to storage
        file_size: totalSize,
        file_hash: combinedHash,
        is_released: false,
        is_prerelease,
        release_date: null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Copy all files to version_files
    for (const file of currentFiles) {
      const fileSize = Buffer.byteLength(file.content || '', 'utf8');
      const fileHash = createHash('sha256').update(file.content || '').digest('hex');
      
      await supabase
        .from('version_files')
        .insert({
          version_id: version.id,
          server_id: serverId,
          path: file.path,
          content: file.content || '',
          file_hash: fileHash,
          file_size: fileSize,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Version created successfully',
      version
    });
  } catch (error) {
    console.error('Create version error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create version: ' + error.message 
    });
  }
}

// Release a version
async function handleReleaseVersion(req, res, userId, serverId, version_id, release_notes) {
  try {
    if (!version_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Version ID is required' 
      });
    }

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

    if (version.is_released) {
      return res.status(400).json({ 
        success: false, 
        error: 'Version is already released' 
      });
    }

    // Update version to released
    const { data: updatedVersion, error: updateError } = await supabase
      .from('server_versions')
      .update({
        is_released: true,
        release_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', version_id)
      .select()
      .single();
    
    if (updateError) throw updateError;

    // Create release history entry
    await supabase
      .from('released_versions')
      .insert([{
        server_id: serverId,
        version_id: version_id,
        released_by: userId,
        released_at: new Date().toISOString(),
        notes: release_notes || ''
      }]);

    return res.status(200).json({ 
      success: true, 
      message: 'Version released successfully',
      version: updatedVersion
    });
  } catch (error) {
    console.error('Release version error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to release version: ' + error.message 
    });
  }
}

// Get files (GET method)
async function handleGetFiles(req, res, userId) {
  try {
    const { 
      serverId, 
      version_id,
      fileType = 'file',
      includeContent = false
    } = req.query;

    if (!serverId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID is required' 
      });
    }

    // Check server permissions
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id, is_public')
      .eq('id', serverId)
      .single();
    
    if (!server) {
      return res.status(404).json({ 
        success: false, 
        error: 'Server not found' 
      });
    }

    // Check if user can access (owner, member, or public)
    if (!server.is_public && server.owner_id !== userId) {
      const { data: member } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', serverId)
        .eq('user_id', userId)
        .eq('is_banned', false)
        .single();
      
      if (!member) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to view files for this server' 
        });
      }
    }

    if (fileType === 'version' && version_id) {
      // Get version files
      let query = supabase
        .from('version_files')
        .select('*')
        .eq('version_id', version_id)
        .eq('server_id', serverId)
        .order('path', { ascending: true });

      if (includeContent !== 'true') {
        query = query.select('id, path, file_size, file_hash, created_at, updated_at');
      }

      const { data: files, error } = await query;

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        files: files || []
      });
    } else {
      // Get regular server files
      let query = supabase
        .from('server_files')
        .select('*')
        .eq('server_id', serverId)
        .order('path', { ascending: true });

      if (includeContent !== 'true') {
        query = query.select('id, path, created_at, updated_at');
      }

      const { data: files, error } = await query;

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        files: files || []
      });
    }
  } catch (error) {
    console.error('Get files error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get files: ' + error.message 
    });
  }
}

// Helper function to update version file info
async function updateVersionFileInfo(version_id) {
  try {
    // Get all files for this version
    const { data: versionFiles } = await supabase
      .from('version_files')
      .select('file_size, file_hash')
      .eq('version_id', version_id);
    
    if (versionFiles && versionFiles.length > 0) {
      const totalSize = versionFiles.reduce((sum, file) => sum + (file.file_size || 0), 0);
      
      // Create combined hash
      const combinedHash = createHash('sha256')
        .update(versionFiles.map(f => f.file_hash).sort().join(''))
        .digest('hex');
      
      // Update the version
      await supabase
        .from('server_versions')
        .update({
          file_size: totalSize,
          file_hash: combinedHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', version_id);
    }
  } catch (error) {
    console.error('Error updating version file info:', error);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb' // Increased for larger files
    }
  }
};
