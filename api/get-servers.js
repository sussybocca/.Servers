// pages/api/get-servers.js
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
  // Handle GET requests for fetching servers
  if (req.method === 'GET') {
    return handleGetServers(req, res);
  }
  
  // Handle POST requests for posting comments
  if (req.method === 'POST') {
    return handlePostComment(req, res);
  }
  
  // Handle any other methods
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// Handle GET request for fetching servers
async function handleGetServers(req, res) {
  try {
    const {
      category,
      search,
      owner_id,
      virtual_url,
      includeVersions = false,
      includeStats = false,
      includeMembers = false,
      includeComments = false,
      onlyReleased = false,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      showPublicOnly = true
    } = req.query;

    // Get user ID if available
    const userId = await getUserIdFromSession(req);
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build the base query with common fields
    let query = supabase
      .from('servers')
      .select(`
        *,
        owner:users!servers_owner_id_fkey(id, username, avatar_url, email, online),
        members:server_members(count)
      `);

    // Apply visibility filter
    if (showPublicOnly === 'true' || !userId) {
      // Show only public servers for guests or when explicitly requested
      query = query.eq('is_public', true);
    } else if (userId) {
      // For logged-in users, show their servers plus public servers
      // First, get user's member servers
      const { data: userMemberships, error: memberError } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', userId)
        .eq('is_banned', false);

      if (memberError) {
        console.error('Error fetching memberships:', memberError);
      }

      const userServerIds = userMemberships?.map(m => m.server_id) || [];
      
      // Build conditions for user's servers
      let conditions = [];
      
      // User's owned servers
      conditions.push(`owner_id.eq.${userId}`);
      
      // Public servers
      conditions.push(`is_public.eq.true`);
      
      // Servers user is a member of
      if (userServerIds.length > 0) {
        conditions.push(`id.in.(${userServerIds.join(',')})`);
      }
      
      // Join conditions with OR
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    }

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }

    if (virtual_url) {
      query = query.eq('virtual_url', virtual_url);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
    
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    // Execute the query
    const { data: servers, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch servers: ' + error.message 
      });
    }

    // Get total count for pagination metadata
    const { count: totalCount } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    // If no servers found
    if (!servers || servers.length === 0) {
      return res.status(200).json({
        success: true,
        servers: [],
        metadata: {
          total: 0,
          page: pageNum,
          limit: limitNum,
          pages: 0,
          has_more: false
        }
      });
    }

    // Enrich servers with additional data if requested
    const enrichedServers = await Promise.all(
      servers.map(async (server) => {
        const enriched = { ...server };
        
        // Get latest version info
        try {
          const { data: latestVersion } = await supabase
            .from('server_versions')
            .select(`
              id,
              version_name,
              version_number,
              description,
              is_released,
              release_date,
              download_count,
              created_at
            `)
            .eq('server_id', server.id)
            .order('release_date', { ascending: false })
            .limit(1)
            .single();

          enriched.latest_version = latestVersion || null;
        } catch (error) {
          enriched.latest_version = null;
        }

        // Get version info if requested
        if (includeVersions === 'true') {
          let versionsQuery = supabase
            .from('server_versions')
            .select(`
              id,
              version_name,
              version_number,
              description,
              is_released,
              release_date,
              download_count,
              created_at,
              created_by,
              creator:users!server_versions_created_by_fkey(id, username, avatar_url)
            `)
            .eq('server_id', server.id)
            .order('created_at', { ascending: false });

          if (onlyReleased === 'true') {
            versionsQuery = versionsQuery.eq('is_released', true);
          }

          const { data: versions } = await versionsQuery;
          enriched.versions = versions || [];
          
          // Calculate total downloads for this server
          const totalDownloads = enriched.versions.reduce((sum, v) => sum + (v.download_count || 0), 0);
          enriched.total_downloads = totalDownloads;
        }

        // Get member details if requested
        if (includeMembers === 'true') {
          const { data: members } = await supabase
            .from('server_members')
            .select(`
              id,
              role,
              joined_at,
              user:users!server_members_user_id_fkey(id, username, avatar_url, online)
            `)
            .eq('server_id', server.id)
            .eq('is_banned', false)
            .limit(10); // Limit to first 10 members for preview

          enriched.member_preview = members || [];
        }

        // Get comment count if requested
        if (includeComments === 'true') {
          const { data: comments } = await supabase
            .from('server_comments')
            .select('id', { count: 'exact', head: true })
            .eq('server_id', server.id);

          enriched.comment_count = comments ? comments.length : 0;
        }

        // Get basic stats if requested
        if (includeStats === 'true') {
          try {
            // Get total downloads from versions table
            const { data: versionDownloads } = await supabase
              .from('server_versions')
              .select('download_count')
              .eq('server_id', server.id)
              .eq('is_released', true);

            const totalDownloads = versionDownloads?.reduce((sum, v) => sum + (v.download_count || 0), 0) || 0;
            
            enriched.stats = {
              total_downloads: totalDownloads,
              has_downloads: totalDownloads > 0
            };
          } catch (error) {
            enriched.stats = {
              total_downloads: 0,
              has_downloads: false
            };
          }
        }

        // Add user-specific permissions
        if (userId) {
          enriched.user_permissions = {
            is_owner: server.owner_id === userId,
            is_member: false,
            can_comment: server.allow_comments,
            can_edit: server.owner_id === userId
          };

          // Check if user is a member
          if (server.owner_id !== userId) {
            try {
              const { data: membership } = await supabase
                .from('server_members')
                .select('role')
                .eq('server_id', server.id)
                .eq('user_id', userId)
                .eq('is_banned', false)
                .single();

              if (membership) {
                enriched.user_permissions.is_member = true;
                enriched.user_permissions.role = membership.role;
              }
            } catch (error) {
              // User is not a member
            }
          }

          // Check if user is leader
          enriched.user_permissions.is_leader = server.leader_id === userId;
        }

        return enriched;
      })
    );

    // Get categories for filtering
    const { data: categories } = await supabase
      .from('servers')
      .select('category')
      .eq('is_public', true)
      .not('category', 'is', null)
      .order('category');

    const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];

    // Prepare response
    const response = {
      success: true,
      servers: enrichedServers,
      metadata: {
        total: totalCount || 0,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil((totalCount || 0) / limitNum),
        has_more: (pageNum * limitNum) < (totalCount || 0),
        categories: uniqueCategories
      }
    };

    // If user is logged in, add their server count
    if (userId) {
      const { count: userServerCount } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      response.metadata.user_server_count = userServerCount || 0;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load servers: ' + error.message
    });
  }
}

// Handle POST request for posting comments
async function handlePostComment(req, res) {
  try {
    // Get user ID from session
    const userId = await getUserIdFromSession(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Parse and validate request body
    const { server_id, content, parent_comment_id } = req.body;

    if (!server_id) {
      return res.status(400).json({
        success: false,
        error: 'Server ID is required'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    // Trim and validate content length
    const trimmedContent = content.trim();
    if (trimmedContent.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 5000 characters'
      });
    }

    // Check if server exists
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('id, allow_comments, is_public, owner_id')
      .eq('id', server_id)
      .single();

    if (serverError || !server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Check if comments are allowed
    if (!server.allow_comments) {
      return res.status(403).json({
        success: false,
        error: 'Comments are disabled for this server'
      });
    }

    // Check if user has access to the server
    if (!server.is_public) {
      // For private servers, check if user is a member
      const { data: membership, error: membershipError } = await supabase
        .from('server_members')
        .select('id, is_banned')
        .eq('server_id', server_id)
        .eq('user_id', userId)
        .eq('is_banned', false)
        .single();

      if (membershipError || !membership) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to comment on this server'
        });
      }
    }

    // Check for parent comment if replying
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('server_comments')
        .select('id, server_id')
        .eq('id', parent_comment_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }

      if (parentComment.server_id !== server_id) {
        return res.status(400).json({
          success: false,
          error: 'Parent comment does not belong to this server'
        });
      }
    }

    // Insert the comment
    const { data: newComment, error: insertError } = await supabase
      .from('server_comments')
      .insert({
        server_id: server_id,
        user_id: userId,
        content: trimmedContent,
        parent_comment_id: parent_comment_id || null,
        is_edited: false
      })
      .select(`
        *,
        user:users!server_comments_user_id_fkey(id, username, avatar_url, online)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to post comment'
      });
    }

    // Return success response with the new comment
    res.status(201).json({
      success: true,
      comment: newComment,
      message: 'Comment posted successfully'
    });

  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
