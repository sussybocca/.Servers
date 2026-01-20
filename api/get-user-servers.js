import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { userId } = req.query;
    
    const { data: servers, error } = await supabase
      .from('servers')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get user servers error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ 
      success: true, 
      servers: servers || [] 
    });
  } catch (error) {
    console.error('Get user servers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
