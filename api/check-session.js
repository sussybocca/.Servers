import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const token = req.cookies['__Host-session_secure'];
  
  if (!token) {
    return res.status(401).json({ error: 'No session' });
  }

  try {
    // Check session in database
    const { data: session, error } = await supabase
      .from('sessions')
      .select('user_id, user_email, expires_at')
      .eq('session_token', token)
      .single();

    if (error || !session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username, profile_picture')
      .eq('id', session.user_id)
      .single();

    if (userError) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
