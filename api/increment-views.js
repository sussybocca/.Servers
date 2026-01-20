// File: /pages/api/increment-views.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serverId } = req.body;
    
    if (!serverId) {
      return res.status(400).json({ error: 'serverId is required' });
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if server exists
    const { data: server, error: fetchError } = await supabase
      .from('servers')
      .select('id, views')
      .eq('id', serverId)
      .single();

    if (fetchError) {
      console.error('Error fetching server:', fetchError);
      return res.status(404).json({ error: 'Server not found' });
    }

    // Increment views using atomic increment
    const { data: updatedServer, error: updateError } = await supabase
      .from('servers')
      .update({ 
        views: (server.views || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', serverId)
      .select()
      .single();

    if (updateError) {
      console.error('Error incrementing views:', updateError);
      return res.status(500).json({ error: 'Failed to increment views' });
    }

    // Return updated server data
    return res.status(200).json({ 
      success: true, 
      views: updatedServer.views 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
