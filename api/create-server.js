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
    const { name, description, userId, privacy = 'public' } = req.body;
    
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

    // ✅ RETURN THE FORMAT YOUR FRONTEND EXPECTS
    res.status(200).json({ 
      success: true, 
      server: {
        id: server.id,        // Your frontend needs this for redirect
        name: server.name,
        description: server.description,
        created_at: server.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create server: ' + error.message 
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
