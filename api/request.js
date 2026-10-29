import { list, put, del } from '@vercel/blob';
import { isAdmin, parseBody } from '../lib/common.js';

const hits = new Map(); // best-effort spam limit per server instance

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') { // anyone can send a request
      const b = parseBody(req);
      if (b.website) return res.status(200).json({ ok: true }); // honeypot field: bots fill it in
      const name = String(b.name || '').trim().slice(0, 80);
      const email = String(b.email || '').trim().slice(0, 120);
      const message = String(b.message || '').trim().slice(0, 1000);
      if (message.length < 5) return res.status(400).json({ error: 'Please write a short message.' });
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'That email address looks invalid.' });
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
      const h = (hits.get(ip) || []).filter(t => Date.now() - t < 36e5);
      if (h.length >= 3) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      hits.set(ip, [...h, Date.now()]);
      const { blobs } = await list({ prefix: 'requests/', limit: 300 });
      if (blobs.length >= 300) return res.status(429).json({ error: 'The request box is full right now. Please try again later.' });
      await put(`requests/${Date.now()}.json`, JSON.stringify({ name, email, message, createdAt: new Date().toISOString() }),
        { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
      return res.status(200).json({ ok: true });
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin only' });
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'requests/', limit: 100 });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const requests = (await Promise.all(blobs.map(async b => {
        try { return { ...(await (await fetch(b.url)).json()), url: b.url }; } catch { return null; }
      }))).filter(Boolean);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ requests });
    }
    if (req.method === 'DELETE') {
      const url = String(req.query.url || '');
      if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/requests\//i.test(url)) return res.status(400).json({ error: 'Bad url' });
      await del(url);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
