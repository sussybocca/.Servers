// pages/api/create-server.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handleCreateServer(req, res);
  } else if (req.method === 'GET') {
    return handleGetServersOrTokens(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateServer(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Create server handler
async function handleCreateServer(req, res) {
  try {
    const { 
      name, 
      description, 
      userId, 
      privacy = 'public',
      generateToken = false
    } = req.body;
    
    // Validate required fields
    if (!name || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server name and user ID are required' 
      });
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
          created_at: new Date().toISOString(),
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
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

    // Generate token if requested
    let serverToken = null;
    if (generateToken && server?.id) {
      try {
        const { data: tokenResult } = await supabase
          .rpc('generate_token_link', {
            p_user_id: userId,
            p_table_name: 'servers',
            p_record_id: server.id,
            p_permissions: { read: true, write: true, delete: false },
            p_expires_in_hours: 720 // 30 days
          });
        
        if (tokenResult) {
          serverToken = tokenResult;
        }
      } catch (tokenGenError) {
        console.warn('Could not generate token for new server:', tokenGenError);
      }
    }

    // Return response
    res.status(200).json({ 
      success: true, 
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        created_at: server.created_at,
        owner_id: server.owner_id,
        is_public: server.is_public,
        renewal_date: server.renewal_date
      },
      ...(serverToken && { token: serverToken })
    });
    
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create server: ' + error.message 
    });
  }
}

// Get servers or tokens handler
async function handleGetServersOrTokens(req, res) {
  try {
    const { userId, getTokens = false, serverId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
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
      // Get specific server
      const { data: server, error } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single();
      
      if (error) {
        console.error('Error fetching server:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error: ' + error.message 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        server
      });
    } else {
      // Get user's servers
      const { data: servers, error } = await supabase
        .from('servers')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch data: ' + error.message 
    });
  }
}

// Update server handler
async function handleUpdateServer(req, res) {
  try {
    const { 
      serverId, 
      name, 
      description, 
      privacy,
      userId 
    } = req.body;
    
    if (!serverId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Server ID and user ID are required' 
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
        error: 'You do not have permission to update this server' 
      });
    }
    
    // Update server
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (privacy !== undefined) updates.is_public = privacy === 'public';
    
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update server: ' + error.message 
    });
  }
}

// Delete handler for servers or tokens
async function handleDelete(req, res) {
  try {
    const { serverId, tokenId, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
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
      
      if (error) throw error;
      
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
      
      if (error) throw error;
      
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete: ' + error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
