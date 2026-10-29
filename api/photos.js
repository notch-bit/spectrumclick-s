import { list } from '@vercel/blob';
import { isAdmin, readMeta } from '../lib/common.js';

const nameOf = p => p.split('/').pop().replace(/\.[^.]+$/, '').replace(/-[A-Za-z0-9]{16,}$/, '').replace(/[_-]+/g, ' ');

export default async function handler(req, res) {
  try {
    const [meta, { blobs }] = await Promise.all([readMeta(), list({ prefix: 'photos/', limit: 1000 })]);
    const photos = blobs
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))
      .map(b => ({ url: b.url, pathname: b.pathname, cap: meta.caps?.[b.pathname] ?? nameOf(b.pathname), featured: !!meta.featured?.includes(b.pathname) }));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ title: meta.title, sub: meta.sub, photos, admin: isAdmin(req) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
