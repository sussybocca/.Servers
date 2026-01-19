import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serverId } = req.body;
    
    // Renew server by updating renewal date
    const { data: server, error } = await supabase
      .from('servers')
      .update({
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', serverId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ 
      success: true, 
      new_renewal_date: server.renewal_date 
    });
  } catch (error) {
    console.error('Error renewing server:', error);
    res.status(500).json({ error: 'Failed to renew server' });
  }
}
