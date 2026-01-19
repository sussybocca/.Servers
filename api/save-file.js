// pages/api/save-file.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { serverId, path, content } = req.body;
    
    if (!serverId || !path) {
      return res.status(400).json({ success: false, error: 'Server ID and path are required' });
    }

    // Check if file exists
    const { data: existingFile } = await supabase
      .from('server_files')
      .select('id')
      .eq('server_id', serverId)
      .eq('path', path)
      .single();

    let result;
    
    if (existingFile) {
      // Update existing file
      const { data, error } = await supabase
        .from('server_files')
        .update({ 
          content: content || '',
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingFile.id)
        .select();

      result = { data, error };
    } else {
      // Create new file
      const { data, error } = await supabase
        .from('server_files')
        .insert({
          server_id: serverId,
          path,
          content: content || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save file' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'File saved successfully' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save file' 
    });
  }
}
