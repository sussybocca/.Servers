// pages/api/get-server.js
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
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { 
      serverId, 
      includeComments = false, 
      includeVersions = false, 
      includeStats = false, 
      includeMembers = false,
      includeFiles = false,
      limit = 50,
      offset = 0
    } = req.query;
    
    if (!serverId) {
      return res.status(400).json({ success: false, error: 'Server ID is required' });
    }

    // Get user ID if available
    const userId = await getUserIdFromSession(req);
    
    // Build base query
    let query = supabase
      .from('servers')
      .select(`
        *,
        owner:users!owner_id(id, username, avatar_url, email, online, last_online),
        leader:users!leader_id(id, username, avatar_url)
      `)
      .eq('id', serverId)
      .single();

    const { data: server, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    // Check permissions if server is private
    if (!server.is_public) {
      if (!userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'This server is private. Please log in to view it.' 
        });
      }

      // Check if user is owner or member
      const { data: membership } = await supabase
        .from('server_members')
        .select('id')
        .eq('server_id', serverId)
        .eq('user_id', userId)
        .eq('is_banned', false)
        .single();

      if (server.owner_id !== userId && !membership) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to view this server' 
        });
      }
    }

    // Initialize response object
    const response = {
      success: true,
      server: {
        ...server,
        can_comment: server.allow_comments && (server.is_public || userId !== null)
      },
      metadata: {}
    };

    // 1. GET COMMENTS if requested
    if (includeComments === 'true' && server.allow_comments) {
      const { data: comments, error: commentsError } = await supabase
        .from('server_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          is_edited,
          is_resolved,
          bug_report,
          bug_severity,
          parent_comment_id,
          user:users(id, username, avatar_url)
        `)
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (!commentsError) {
        response.comments = comments || [];
        response.metadata.comment_count = comments?.length || 0;
      }
    }

    // 2. GET VERSIONS & RELEASE HISTORY if requested
    if (includeVersions === 'true') {
      // Get all released versions
      const { data: versions, error: versionsError } = await supabase
        .from('server_versions')
        .select(`
          id,
          version_name,
          version_number,
          description,
          changelog,
          file_url,
          file_size,
          file_hash,
          is_released,
          is_prerelease,
          release_date,
          created_at,
          updated_at,
          download_count,
          created_by,
          creator:users!created_by(id, username, avatar_url)
        `)
        .eq('server_id', serverId)
        .eq('is_released', true)
        .order('release_date', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (!versionsError) {
        response.versions = versions || [];
        
        // Get version files if requested
        if (includeFiles === 'true') {
          for (let version of response.versions) {
            const { data: files } = await supabase
              .from('version_files')
              .select('id, path, file_size, file_hash, created_at, updated_at')
              .eq('version_id', version.id);
            version.files = files || [];
          }
        }
        
        // Get release history
        const { data: releaseHistory } = await supabase
          .from('released_versions')
          .select(`
            id,
            released_at,
            notes,
            released_by,
            releaser:users!released_by(id, username, avatar_url)
          `)
          .eq('server_id', serverId)
          .order('released_at', { ascending: false });

        response.release_history = releaseHistory || [];
        
        // Calculate total downloads
        const totalDownloads = response.versions.reduce((sum, v) => sum + (v.download_count || 0), 0);
        response.metadata.total_downloads = totalDownloads;
        response.metadata.version_count = response.versions.length;
      }
    }

    // 3. GET STATS if requested (only for server owner or admin)
    if (includeStats === 'true' && (userId === server.owner_id || userId === server.leader_id)) {
      // Get download stats for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: downloadStats } = await supabase
        .from('server_stats')
        .select('*')
        .eq('server_id', serverId)
        .eq('action', 'download')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (downloadStats) {
        // Group downloads by day
        const downloadsByDay = {};
        const uniqueDownloaders = new Set();
        
        downloadStats.forEach(stat => {
          const day = stat.created_at.split('T')[0];
          downloadsByDay[day] = (downloadsByDay[day] || 0) + 1;
          
          if (stat.user_id) {
            uniqueDownloaders.add(stat.user_id);
          }
        });

        response.stats = {
          total_downloads_last_30_days: downloadStats.length,
          unique_downloaders_last_30_days: uniqueDownloaders.size,
          downloads_by_day: downloadsByDay,
          recent_downloads: downloadStats.slice(0, 20) // Last 20 downloads
        };
      }
    }

    // 4. GET MEMBERS if requested
    if (includeMembers === 'true') {
      const { data: members, error: membersError } = await supabase
        .from('server_members')
        .select(`
          id,
          role,
          joined_at,
          is_banned,
          banned_reason,
          banned_at,
          user:users(id, username, avatar_url, email, online, last_online)
        `)
        .eq('server_id', serverId)
        .eq('is_banned', false)
        .order('joined_at', { ascending: true });

      if (!membersError) {
        response.members = members || [];
        response.metadata.member_count = members?.length || 0;
      }
    }

    // 5. GET SERVER RULES
    const { data: rules } = await supabase
      .from('server_rules')
      .select('id, rule_text, created_at, created_by')
      .eq('server_id', serverId)
      .eq('active', true)
      .order('created_at', { ascending: true });

    response.rules = rules || [];

    // 6. GET LATEST ACTIVITY (messages, votes, etc.)
    const { data: recentMessages } = await supabase
      .from('server_messages')
      .select(`
        id,
        content,
        message_type,
        created_at,
        user:users(id, username, avatar_url)
      `)
      .eq('server_id', serverId)
      .order('created_at', { ascending: false })
      .limit(10);

    response.recent_activity = recentMessages || [];

    res.status(200).json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load server: ' + error.message 
    });
  }
}
