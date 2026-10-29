import { handleUpload } from '@vercel/blob/client';
import { isAdmin, parseBody } from '../lib/common.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const out = await handleUpload({
      body: parseBody(req),
      request: req,
      onBeforeGenerateToken: async pathname => {
        if (!isAdmin(req)) throw new Error('Admin only');
        if (!pathname.startsWith('photos/')) throw new Error('Bad path');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    res.status(200).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
