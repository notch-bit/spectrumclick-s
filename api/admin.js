import { del } from '@vercel/blob';
import { isAdmin, readMeta, writeMeta, parseBody } from '../lib/common.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin only' });
  try {
    if (req.method === 'DELETE') {
      const url = String(req.query.url || '');
      if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/photos\//i.test(url))
        return res.status(400).json({ error: 'Bad url' });
      await del(url);
      const m = await readMeta();
      const pth = decodeURIComponent(new URL(url).pathname.slice(1));
      if (m.caps) delete m.caps[pth];
      m.featured = (m.featured || []).filter(x => x !== pth);
      await writeMeta(m);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'POST') {
      const b = parseBody(req), m = await readMeta();
      m.caps = m.caps || {};
      if ('title' in b) m.title = String(b.title || 'Portfolio').slice(0, 100);
      if ('sub' in b) m.sub = String(b.sub || '').slice(0, 150);
      if (b.caps) for (const [k, v] of Object.entries(b.caps)) if (k.startsWith('photos/')) m.caps[k] = String(v).slice(0, 200);
      if (b.featured) { const s = new Set(m.featured || []); for (const [k, v] of Object.entries(b.featured)) if (k.startsWith('photos/')) v ? s.add(k) : s.delete(k); m.featured = [...s]; }
      await writeMeta(m);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
