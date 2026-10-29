import { makeToken, same, parseBody } from '../lib/common.js';

const fails = new Map(); // best-effort brute-force limit (per server instance)
const COOKIE = '; Path=/; HttpOnly; Secure; SameSite=Strict';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'sid=; Max-Age=0' + COOKIE);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set in Vercel environment variables' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (Date.now() - f.t > 15 * 60e3) f.n = 0;
  if (f.n >= 5) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });

  const { password = '' } = parseBody(req);
  if (!same(String(password), pw)) {
    fails.set(ip, { n: f.n + 1, t: Date.now() });
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Wrong password' });
  }
  fails.delete(ip);
  res.setHeader('Set-Cookie', `sid=${makeToken()}; Max-Age=604800` + COOKIE);
  res.status(200).json({ ok: true });
}
