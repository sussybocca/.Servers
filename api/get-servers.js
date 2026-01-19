import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    const { data: servers, error } = await supabase
      .from('servers')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ servers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load servers' });
  }
}
