// POST /api/admin/login — { motDePasse }
import crypto from 'node:crypto';
import { creerJeton } from '../_lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const { motDePasse } = req.body || {};
  const secret = process.env.ADMIN_SECRET || '';
  const ok = motDePasse && motDePasse.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(motDePasse), Buffer.from(secret));
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });
  res.setHeader('Set-Cookie',
    `ptg_admin=${encodeURIComponent(creerJeton())}; HttpOnly; Path=/; Max-Age=${7 * 86400}; SameSite=Strict; Secure`);
  res.json({ ok: true });
}
