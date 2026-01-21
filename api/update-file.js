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
    const { serverId, path, content, userId } = req.body;
    
    // Check file extension (no PNG/video files)
    const extension = path.split('.').pop().toLowerCase();
    const blockedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov', 'webm'];
    
    if (blockedExtensions.includes(extension)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Upload to Supabase Storage
    const filePath = `servers/${serverId}/${path}`;
    const { data, error } = await supabase.storage
      .from('server-files')
      .upload(filePath, content, {
        contentType: 'text/plain',
        upsert: true
      });

    if (error) throw error;

    res.status(200).json({ 
      success: true, 
      path: filePath,
      url: data.path
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
