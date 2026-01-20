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

    const { name, userId } = req.query;
    
    const { data: existingServer, error } = await supabase
      .from('servers')
      .select('id, name, owner_id')
      .eq('name', name)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Check server error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ 
      exists: !!existingServer,
      server: existingServer 
    });
  } catch (error) {
    console.error('Server check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
