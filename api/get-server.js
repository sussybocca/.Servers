// pages/api/get-server.js
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

    const { data: server, error } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    res.status(200).json({ 
      success: true, 
      server 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load server' 
    });
  }
}
