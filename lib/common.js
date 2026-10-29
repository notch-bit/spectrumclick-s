import crypto from 'node:crypto';
import { list, put } from '@vercel/blob';

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function makeToken() {
  const exp = String(Date.now() + 7 * 864e5);
  return exp + '.' + sign(exp);
}
export function isAdmin(req) {
  if (!secret()) return false;
  const m = /(?:^|;\s*)sid=(\d+)\.([a-f0-9]+)/.exec(req.headers.cookie || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(sign(m[1]));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const same = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
export const parseBody = req => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});

// Title, subtitle and captions live in one small JSON file inside the Blob store.
export async function readMeta() {
  try {
    const { blobs } = await list({ prefix: 'meta.json' });
    const b = blobs.find(x => x.pathname === 'meta.json');
    if (b) {
      const r = await fetch(b.url + '?t=' + Date.now()); // cache-bust
      if (r.ok) return await r.json();
    }
  } catch {}
  return { title: 'Spectrum Clicks', sub: 'Photography', caps: {} };
}
export const writeMeta = m =>
  put('meta.json', JSON.stringify(m), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
