import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Helper to get user from session
async function getUserIdFromSession(req) {
  try {
    // Get session token from cookie
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => c.split('='))
    );
    
    const sessionToken = cookies['__Host-session_secure'];
    
    if (!sessionToken) {
      return null;
    }
    
    // Find session in database
    const { data: session, error } = await supabase
      .from('sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();
    
    if (error || !session) {
      return null;
    }
    
    // Check if session is expired
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
    // Get user ID from session
    const userId = await getUserIdFromSession(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please log in.' 
      });
    }
    
    // Route based on resource type
    const { resource } = req.query;
    
    switch (resource) {
      case 'version':
        return await handleVersionRoutes(req, res, userId);
      case 'comment':
        return await handleCommentRoutes(req, res, userId);
      case 'stats':
        return await handleStatsRoutes(req, res, userId);
      default:
        // Original server routes
        return await handleServerRoutes(req, res, userId);
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    });
  }
}

// Main server routes handler
async function handleServerRoutes(req, res, userId) {
  switch (req.method) {
    case 'POST':
      return await handleCreateServer(req, res, userId);
    case 'GET':
      return await handleGetServersOrTokens(req, res, userId);
    case 'PUT':
      return await handleUpdateServer(req, res, userId);
    case 'DELETE':
      return await handleDelete(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Version routes handler
async function handleVersionRoutes(req, res, userId) {
  switch (req.method) {
    case 'POST':
      return await handleCreateVersion(req, res, userId);
    case 'GET':
      return await handleGetVersions(req, res, userId);
    case 'PUT':
      return await handleUpdateVersion(req, res, userId);
    case 'DELETE':
      return await handleDeleteVersion(req, res, userId);
    case 'PATCH':
      return await handleReleaseVersion(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Comment routes handler
async function handleCommentRoutes(req, res, userId) {
  switch (req.method) {
    case 'POST':
      return await handleCreateComment(req, res, userId);
    case 'GET':
      return await handleGetComments(req, res, userId);
    case 'PUT':
      return await handleUpdateComment(req, res, userId);
    case 'DELETE':
      return await handleDeleteComment(req, res, userId);
    case 'PATCH':
      return await handleResolveComment(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Stats routes handler
async function handleStatsRoutes(req, res, userId) {
  switch (req.method) {
    case 'GET':
      return await handleGetStats(req, res, userId);
    case 'POST':
      return await handleTrackDownload(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Create server handler (UPDATED with virtual_url)
async function handleCreateServer(req, res, userId) {
  try {
    const { 
      name, 
      description, 
      privacy = 'public',
      generateToken = false,
      virtual_url = null,
      allow_comments = true,
      category = 'general',
      banner_url = null
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server name is required' 
      });
    }
    
    // Validate virtual URL format if provided
    if (virtual_url) {
      const urlRegex = /^[a-z0-9-]+$/;
      if (!urlRegex.test(virtual_url)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Virtual URL can only contain lowercase letters, numbers, and hyphens' 
        });
      }
      
      // Check if virtual URL already exists
      const { data: existingServer } = await supabase
        .from('servers')
        .select('id')
        .eq('virtual_url', virtual_url)
        .single();
      
      if (existingServer) {
        return res.status(400).json({ 
          success: false, 
          error: 'Virtual URL is already taken' 
        });
      }
    }
    
    // Create server in database
    const { data: server, error } = await supabase
      .from('servers')
      .insert([
        {
          name,
          description,
          owner_id: userId,
          is_public: privacy === 'public',
          virtual_url: virtual_url || null,
          allow_comments: allow_comments,
          category: category,
          banner_url: banner_url,
          created_at: new Date().toISOString(),
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + error.message 
      });
    }

    // Add creator as a member
    await supabase
      .from('server_members')
      .insert([
        {
          server_id: server.id,
          user_id: userId,
          role: 'admin',
          joined_at: new Date().toISOString()
        }
      ]);

    // Generate token if requested
    let serverToken = null;
    if (generateToken && server && server.id) {
      try {
        const { data: tokenResult } = await supabase
          .rpc('generate_token_link', {
            p_user_id: userId,
            p_table_name: 'servers',
            p_record_id: server.id,
            p_permissions: { read: true, write: true, delete: false },
            p_expires_in_hours: 720
          });
        
        if (tokenResult) {
          serverToken = tokenResult;
        }
      } catch (tokenGenError) {
        console.warn('Could not generate token for new server:', tokenGenError);
      }
    }

    // Return response
    const response = { 
      success: true, 
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        virtual_url: server.virtual_url,
        allow_comments: server.allow_comments,
        category: server.category,
        banner_url: server.banner_url,
        created_at: server.created_at,
        owner_id: server.owner_id,
        is_public: server.is_public,
        renewal_date: server.renewal_date
      }
    };
    
    if (serverToken) {
      response.token = serverToken;
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error creating server:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create server: ' + error.message 
    });
  }
}

// Get servers or tokens handler (UPDATED)
async function handleGetServersOrTokens(req, res, userId) {
  try {
    const { 
      getTokens = false, 
      serverId, 
      virtual_url: virtualUrl,
      includeVersions = false,
      includeStats = false,
      includeComments = false,
      category,
      search
    } = req.query;
    
    if (getTokens === 'true') {
      // Get user's tokens
      const { data: tokens, error } = await supabase
        .from('token_link_details')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tokens:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error: ' + error.message 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        tokens: tokens || []
      });
    } else if (serverId) {
      // Get specific server with optional joins
      let query = supabase
        .from('servers')
        .select(`
          *,
          owner:users!owner_id(id, username, avatar_url),
          members:server_members(count),
          latest_version:server_versions!server_id(
            * 
            order_by(release_date desc nulls last, created_at desc) 
            limit 1
          )
          ${includeVersions ? ',versions:server_versions(*, creator:users!created_by(id, username, avatar_url))' : ''}
          ${includeStats ? ',stats:server_stats(count)' : ''}
          ${includeComments ? ',comments:server_comments(count)' : ''}
        `)
        .eq('id', serverId)
        .single();
      
      const { data: server, error } = await query;
      
      if (error) {
        console.error('Error fetching server:', error);
        return res.status(404).json({ 
          success: false, 
          error: 'Server not found' 
        });
      }
      
      // Check if user owns the server or server is public
      if (server.owner_id !== userId && !server.is_public) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to view this server' 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        server
      });
    } else if (virtualUrl) {
      // Get server by virtual URL
      const { data: server, error } = await supabase
        .from('servers')
        .select(`
          *,
          owner:users!owner_id(id, username, avatar_url),
          latest_version:server_versions!server_id(
            * 
            order_by(release_date desc nulls last, created_at desc) 
            limit 1
          )
        `)
        .eq('virtual_url', virtualUrl)
        .single();
      
      if (error) {
        return res.status(404).json({ 
          success: false, 
          error: 'Server not found' 
        });
      }
      
      // Check if server is public
      if (!server.is_public) {
        // Check if user is the owner or member
        const { data: member } = await supabase
          .from('server_members')
          .select('id')
          .eq('server_id', server.id)
          .eq('user_id', userId)
          .single();
        
        if (server.owner_id !== userId && !member) {
          return res.status(403).json({ 
            success: false, 
            error: 'You do not have permission to view this server' 
          });
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        server
      });
    } else {
      // Get servers with filters
      let query = supabase
        .from('servers')
        .select(`
          *,
          owner:users!owner_id(id, username, avatar_url),
          members:server_members(count),
          latest_version:server_versions!server_id(
            * 
            order_by(release_date desc nulls last, created_at desc) 
            limit 1
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      // For non-authenticated or public view
      if (!userId) {
        query = query.eq('is_public', true);
      } else {
        // Get servers user owns or is member of, plus public servers
        const { data: userServers } = await supabase
          .from('server_members')
          .select('server_id')
          .eq('user_id', userId);
        
        const serverIds = userServers?.map(s => s.server_id) || [];
        
        query = query.or(`owner_id.eq.${userId},is_public.eq.true${serverIds.length > 0 ? `,id.in.(${serverIds.join(',')})` : ''}`);
      }
      
      const { data: servers, error } = await query;
      
      if (error) {
        console.error('Error fetching servers:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error: ' + error.message 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        servers: servers || []
      });
    }
    
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data: ' + error.message 
    });
  }
}

// Update server handler (UPDATED with virtual_url)
async function handleUpdateServer(req, res, userId) {
  try {
    const { 
      serverId, 
      name, 
      description, 
      privacy,
      virtual_url,
      allow_comments,
      category,
      banner_url
    } = req.body;
    
    if (!serverId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID is required' 
      });
    }
    
    // Check if user owns the server
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id, virtual_url')
      .eq('id', serverId)
      .single();
    
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to update this server' 
      });
    }
    
    // Validate virtual URL if being changed
    if (virtual_url !== undefined && virtual_url !== server.virtual_url) {
      if (virtual_url) {
        const urlRegex = /^[a-z0-9-]+$/;
        if (!urlRegex.test(virtual_url)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Virtual URL can only contain lowercase letters, numbers, and hyphens' 
          });
        }
        
        // Check if new virtual URL already exists
        const { data: existingServer } = await supabase
          .from('servers')
          .select('id')
          .eq('virtual_url', virtual_url)
          .neq('id', serverId)
          .single();
        
        if (existingServer) {
          return res.status(400).json({ 
            success: false, 
            error: 'Virtual URL is already taken' 
          });
        }
      }
    }
    
    // Update server
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (privacy !== undefined) updates.is_public = privacy === 'public';
    if (virtual_url !== undefined) updates.virtual_url = virtual_url || null;
    if (allow_comments !== undefined) updates.allow_comments = allow_comments;
    if (category !== undefined) updates.category = category;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    
    const { data: updatedServer, error } = await supabase
      .from('servers')
      .update(updates)
      .eq('id', serverId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating server:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + error.message 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      server: updatedServer
    });
    
  } catch (error) {
    console.error('Error updating server:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update server: ' + error.message 
    });
  }
}

// Delete handler for servers or tokens
async function handleDelete(req, res, userId) {
  try {
    const { serverId, tokenId } = req.body;
    
    if (serverId) {
      // Delete server
      const { data: server } = await supabase
        .from('servers')
        .select('owner_id')
        .eq('id', serverId)
        .single();
      
      if (!server || server.owner_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to delete this server' 
        });
      }
      
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', serverId);
      
      if (error) {
        throw error;
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Server deleted successfully'
      });
    } else if (tokenId) {
      // Delete token
      const { error } = await supabase
        .from('token_links')
        .delete()
        .eq('id', tokenId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Token revoked successfully'
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID or Token ID is required' 
      });
    }
    
  } catch (error) {
    console.error('Error deleting:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete: ' + error.message 
    });
  }
}

// ==================== VERSION HANDLERS ====================

// Create a new server version
async function handleCreateVersion(req, res, userId) {
  try {
    const {
      server_id,
      version_name,
      version_number,
      description,
      changelog,
      file_url,
      file_size,
      file_hash,
      is_prerelease = false,
      release_date = null
    } = req.body;
    
    // Validate required fields
    if (!server_id || !version_name || !file_url) {
      return res.status(400).json({
        success: false,
        error: 'Server ID, version name, and file URL are required'
      });
    }
    
    // Check if user owns the server
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', server_id)
      .single();
    
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to create versions for this server'
      });
    }
    
    // Check if version number already exists for this server
    if (version_number) {
      const { data: existingVersion } = await supabase
        .from('server_versions')
        .select('id')
        .eq('server_id', server_id)
        .eq('version_number', version_number)
        .single();
      
      if (existingVersion) {
        return res.status(400).json({
          success: false,
          error: 'Version number already exists for this server'
        });
      }
    }
    
    // Create the version
    const { data: version, error } = await supabase
      .from('server_versions')
      .insert([{
        server_id,
        version_name,
        version_number,
        description,
        changelog,
        file_url,
        file_size,
        file_hash,
        is_released: false, // Not released by default
        is_prerelease,
        release_date: release_date ? new Date(release_date).toISOString() : null,
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating version:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      version
    });
    
  } catch (error) {
    console.error('Error creating version:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create version: ' + error.message
    });
  }
}

// Get server versions
async function handleGetVersions(req, res, userId) {
  try {
    const { 
      server_id, 
      version_id,
      released_only = false,
      include_downloads = false,
      limit = 20,
      offset = 0
    } = req.query;
    
    if (version_id) {
      // Get specific version
      const { data: version, error } = await supabase
        .from('server_versions')
        .select(`
          *,
          creator:users!created_by(id, username, avatar_url),
          release_history:released_versions(*, released_by:users(id, username))
        `)
        .eq('id', version_id)
        .single();
      
      if (error) {
        return res.status(404).json({
          success: false,
          error: 'Version not found'
        });
      }
      
      // Check permissions
      const { data: server } = await supabase
        .from('servers')
        .select('owner_id, is_public')
        .eq('id', version.server_id)
        .single();
      
      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Server not found'
        });
      }
      
      if (server.owner_id !== userId && !server.is_public) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view this version'
        });
      }
      
      return res.status(200).json({
        success: true,
        version
      });
    } else if (server_id) {
      // Get all versions for a server
      let query = supabase
        .from('server_versions')
        .select(`
          *,
          creator:users!created_by(id, username, avatar_url)
        `)
        .eq('server_id', server_id);
      
      if (released_only === 'true') {
        query = query.eq('is_released', true);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      const { data: versions, error } = await query;
      
      if (error) {
        console.error('Error fetching versions:', error);
        return res.status(500).json({
          success: false,
          error: 'Database error: ' + error.message
        });
      }
      
      // Check server permissions
      const { data: server } = await supabase
        .from('servers')
        .select('owner_id, is_public')
        .eq('id', server_id)
        .single();
      
      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Server not found'
        });
      }
      
      // Filter out non-released versions if user is not owner
      if (server.owner_id !== userId && server.is_public) {
        // Public server: only show released versions
        const filteredVersions = versions?.filter(v => v.is_released) || [];
        return res.status(200).json({
          success: true,
          versions: filteredVersions
        });
      } else if (server.owner_id !== userId && !server.is_public) {
        // Private server and not owner
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view versions for this server'
        });
      }
      
      return res.status(200).json({
        success: true,
        versions: versions || []
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Server ID or Version ID is required'
      });
    }
    
  } catch (error) {
    console.error('Error fetching versions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch versions: ' + error.message
    });
  }
}

// Update server version
async function handleUpdateVersion(req, res, userId) {
  try {
    const {
      version_id,
      version_name,
      version_number,
      description,
      changelog,
      file_url,
      file_size,
      file_hash,
      is_prerelease,
      release_date
    } = req.body;
    
    if (!version_id) {
      return res.status(400).json({
        success: false,
        error: 'Version ID is required'
      });
    }
    
    // Get version and check ownership
    const { data: version } = await supabase
      .from('server_versions')
      .select(`
        *,
        server:servers!server_id(owner_id)
      `)
      .eq('id', version_id)
      .single();
    
    if (!version || version.server.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this version'
      });
    }
    
    // Check if version number already exists for this server
    if (version_number && version_number !== version.version_number) {
      const { data: existingVersion } = await supabase
        .from('server_versions')
        .select('id')
        .eq('server_id', version.server_id)
        .eq('version_number', version_number)
        .single();
      
      if (existingVersion) {
        return res.status(400).json({
          success: false,
          error: 'Version number already exists for this server'
        });
      }
    }
    
    // Update the version
    const updates = {};
    if (version_name !== undefined) updates.version_name = version_name;
    if (version_number !== undefined) updates.version_number = version_number;
    if (description !== undefined) updates.description = description;
    if (changelog !== undefined) updates.changelog = changelog;
    if (file_url !== undefined) updates.file_url = file_url;
    if (file_size !== undefined) updates.file_size = file_size;
    if (file_hash !== undefined) updates.file_hash = file_hash;
    if (is_prerelease !== undefined) updates.is_prerelease = is_prerelease;
    if (release_date !== undefined) updates.release_date = release_date ? new Date(release_date).toISOString() : null;
    
    const { data: updatedVersion, error } = await supabase
      .from('server_versions')
      .update(updates)
      .eq('id', version_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating version:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      version: updatedVersion
    });
    
  } catch (error) {
    console.error('Error updating version:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update version: ' + error.message
    });
  }
}

// Release a version
async function handleReleaseVersion(req, res, userId) {
  try {
    const { version_id, release_notes } = req.body;
    
    if (!version_id) {
      return res.status(400).json({
        success: false,
        error: 'Version ID is required'
      });
    }
    
    // Get version and check ownership
    const { data: version } = await supabase
      .from('server_versions')
      .select(`
        *,
        server:servers!server_id(owner_id)
      `)
      .eq('id', version_id)
      .single();
    
    if (!version || version.server.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to release this version'
      });
    }
    
    // Update version to released
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
        error: 'Database error: ' + updateError.message
      });
    }
    
    // Create release history entry
    await supabase
      .from('released_versions')
      .insert([{
        server_id: version.server_id,
        version_id: version_id,
        released_by: userId,
        released_at: new Date().toISOString(),
        notes: release_notes || ''
      }]);
    
    return res.status(200).json({
      success: true,
      version: updatedVersion,
      message: 'Version released successfully'
    });
    
  } catch (error) {
    console.error('Error releasing version:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to release version: ' + error.message
    });
  }
}

// Delete a version
async function handleDeleteVersion(req, res, userId) {
  try {
    const { version_id } = req.body;
    
    if (!version_id) {
      return res.status(400).json({
        success: false,
        error: 'Version ID is required'
      });
    }
    
    // Get version and check ownership
    const { data: version } = await supabase
      .from('server_versions')
      .select(`
        *,
        server:servers!server_id(owner_id)
      `)
      .eq('id', version_id)
      .single();
    
    if (!version || version.server.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this version'
      });
    }
    
    // Delete the version
    const { error } = await supabase
      .from('server_versions')
      .delete()
      .eq('id', version_id);
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({
      success: true,
      message: 'Version deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting version:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete version: ' + error.message
    });
  }
}

// ==================== COMMENT HANDLERS ====================

// Create a comment
async function handleCreateComment(req, res, userId) {
  try {
    const {
      server_id,
      content,
      parent_comment_id = null,
      bug_report = false,
      bug_severity = null
    } = req.body;
    
    if (!server_id || !content) {
      return res.status(400).json({
        success: false,
        error: 'Server ID and content are required'
      });
    }
    
    // Check if server exists and allows comments
    const { data: server } = await supabase
      .from('servers')
      .select('allow_comments, is_public')
      .eq('id', server_id)
      .single();
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }
    
    if (!server.allow_comments) {
      return res.status(403).json({
        success: false,
        error: 'Comments are disabled for this server'
      });
    }
    
    // Check if user can comment (member or public if server is public)
    if (!server.is_public) {
      const { data: member } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', server_id)
        .eq('user_id', userId)
        .single();
      
      if (!member && server.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You must be a member to comment on this server'
        });
      }
    }
    
    // Validate bug severity if bug report
    if (bug_report && bug_severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(bug_severity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid bug severity'
        });
      }
    }
    
    // Create the comment
    const { data: comment, error } = await supabase
      .from('server_comments')
      .insert([{
        server_id,
        user_id: userId,
        parent_comment_id,
        content,
        bug_report,
        bug_severity: bug_report ? bug_severity : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .single();
    
    if (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      comment
    });
    
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create comment: ' + error.message
    });
  }
}

// Get comments
async function handleGetComments(req, res, userId) {
  try {
    const { 
      server_id,
      comment_id,
      include_replies = false,
      bug_reports_only = false,
      unresolved_only = false,
      limit = 50,
      offset = 0
    } = req.query;
    
    if (comment_id) {
      // Get specific comment with replies
      const { data: comment, error } = await supabase
        .from('server_comments')
        .select(`
          *,
          user:users(id, username, avatar_url),
          replies:server_comments!parent_comment_id(
            *,
            user:users(id, username, avatar_url)
          )
        `)
        .eq('id', comment_id)
        .single();
      
      if (error) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }
      
      // Check server permissions
      const { data: server } = await supabase
        .from('servers')
        .select('is_public')
        .eq('id', comment.server_id)
        .single();
      
      if (!server.is_public && server.owner_id !== userId) {
        const { data: member } = await supabase
          .from('server_members')
          .select('id')
          .eq('server_id', comment.server_id)
          .eq('user_id', userId)
          .single();
        
        if (!member) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to view this comment'
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        comment
      });
    } else if (server_id) {
      // Get all comments for a server
      let query = supabase
        .from('server_comments')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('server_id', server_id)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false });
      
      if (bug_reports_only === 'true') {
        query = query.eq('bug_report', true);
      }
      
      if (unresolved_only === 'true') {
        query = query.eq('is_resolved', false);
      }
      
      query = query.range(offset, offset + limit - 1);
      
      const { data: comments, error } = await query;
      
      if (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({
          success: false,
          error: 'Database error: ' + error.message
        });
      }
      
      // Check server permissions
      const { data: server } = await supabase
        .from('servers')
        .select('is_public')
        .eq('id', server_id)
        .single();
      
      if (!server.is_public && server.owner_id !== userId) {
        const { data: member } = await supabase
          .from('server_members')
          .select('id')
          .eq('server_id', server_id)
          .eq('user_id', userId)
          .single();
        
        if (!member) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to view comments for this server'
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        comments: comments || []
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Server ID or Comment ID is required'
      });
    }
    
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch comments: ' + error.message
    });
  }
}

// Update a comment
async function handleUpdateComment(req, res, userId) {
  try {
    const { comment_id, content } = req.body;
    
    if (!comment_id || !content) {
      return res.status(400).json({
        success: false,
        error: 'Comment ID and content are required'
      });
    }
    
    // Get comment and check ownership
    const { data: comment } = await supabase
      .from('server_comments')
      .select('*')
      .eq('id', comment_id)
      .single();
    
    if (!comment || comment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this comment'
      });
    }
    
    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('server_comments')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .single();
    
    if (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      comment: updatedComment
    });
    
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update comment: ' + error.message
    });
  }
}

// Resolve a comment (for bug reports)
async function handleResolveComment(req, res, userId) {
  try {
    const { comment_id, resolved = true } = req.body;
    
    if (!comment_id) {
      return res.status(400).json({
        success: false,
        error: 'Comment ID is required'
      });
    }
    
    // Get comment and check server ownership
    const { data: comment } = await supabase
      .from('server_comments')
      .select(`
        *,
        server:servers!server_id(owner_id)
      `)
      .eq('id', comment_id)
      .single();
    
    if (!comment || (comment.server.owner_id !== userId && comment.user_id !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to resolve this comment'
      });
    }
    
    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('server_comments')
      .update({
        is_resolved: resolved,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .select(`
        *,
        user:users(id, username, avatar_url)
      `)
      .single();
    
    if (error) {
      console.error('Error resolving comment:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    return res.status(200).json({
      success: true,
      comment: updatedComment
    });
    
  } catch (error) {
    console.error('Error resolving comment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve comment: ' + error.message
    });
  }
}

// Delete a comment
async function handleDeleteComment(req, res, userId) {
  try {
    const { comment_id } = req.body;
    
    if (!comment_id) {
      return res.status(400).json({
        success: false,
        error: 'Comment ID is required'
      });
    }
    
    // Get comment and check ownership
    const { data: comment } = await supabase
      .from('server_comments')
      .select(`
        *,
        server:servers!server_id(owner_id)
      `)
      .eq('id', comment_id)
      .single();
    
    if (!comment || (comment.user_id !== userId && comment.server.owner_id !== userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this comment'
      });
    }
    
    // Delete the comment
    const { error } = await supabase
      .from('server_comments')
      .delete()
      .eq('id', comment_id);
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete comment: ' + error.message
    });
  }
}

// ==================== STATS HANDLERS ====================

// Get server stats
async function handleGetStats(req, res, userId) {
  try {
    const { server_id, version_id, timeframe = '30d' } = req.query;
    
    if (!server_id) {
      return res.status(400).json({
        success: false,
        error: 'Server ID is required'
      });
    }
    
    // Check server permissions
    const { data: server } = await supabase
      .from('servers')
      .select('owner_id')
      .eq('id', server_id)
      .single();
    
    if (!server || server.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view stats for this server'
      });
    }
    
    // Calculate timeframe
    const now = new Date();
    let startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Get download stats
    let statsQuery = supabase
      .from('server_stats')
      .select('*')
      .eq('server_id', server_id)
      .gte('created_at', startDate.toISOString());
    
    if (version_id) {
      statsQuery = statsQuery.eq('version_id', version_id);
    }
    
    const { data: stats, error } = await statsQuery;
    
    if (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    // Aggregate stats
    const aggregated = {
      total_downloads: 0,
      unique_users: new Set(),
      by_day: {},
      by_version: {},
      by_action: {}
    };
    
    stats?.forEach(stat => {
      aggregated.total_downloads++;
      if (stat.user_id) aggregated.unique_users.add(stat.user_id);
      
      // Group by day
      const day = stat.created_at.split('T')[0];
      aggregated.by_day[day] = (aggregated.by_day[day] || 0) + 1;
      
      // Group by version
      if (stat.version_id) {
        aggregated.by_version[stat.version_id] = (aggregated.by_version[stat.version_id] || 0) + 1;
      }
      
      // Group by action
      aggregated.by_action[stat.action] = (aggregated.by_action[stat.action] || 0) + 1;
    });
    
    // Get version download counts
    const { data: versions } = await supabase
      .from('server_versions')
      .select('id, version_name, version_number, download_count')
      .eq('server_id', server_id)
      .order('download_count', { ascending: false });
    
    return res.status(200).json({
      success: true,
      stats: {
        ...aggregated,
        unique_user_count: aggregated.unique_users.size,
        versions: versions || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats: ' + error.message
    });
  }
}

// Track a download
async function handleTrackDownload(req, res, userId) {
  try {
    const { server_id, version_id, action = 'download' } = req.body;
    
    if (!server_id) {
      return res.status(400).json({
        success: false,
        error: 'Server ID is required'
      });
    }
    
    // Get IP and user agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Create stat entry
    const { error: statError } = await supabase
      .from('server_stats')
      .insert([{
        server_id,
        version_id,
        user_id: userId,
        action,
        ip_address: ip,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      }]);
    
    if (statError) {
      console.error('Error tracking download:', statError);
    }
    
    // Increment version download count if version_id provided
    if (version_id) {
      await supabase.rpc('increment_download_count', {
        version_id_param: version_id
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Download tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking download:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track download: ' + error.message
    });
  }
}

// ==================== HELPER FUNCTIONS ====================

// Helper to check if user can access server
async function canAccessServer(serverId, userId) {
  const { data: server } = await supabase
    .from('servers')
    .select('owner_id, is_public')
    .eq('id', serverId)
    .single();
  
  if (!server) return false;
  
  if (server.owner_id === userId) return true;
  
  if (server.is_public) return true;
  
  const { data: member } = await supabase
    .from('server_members')
    .select('id')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single();
  
  return !!member;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};
