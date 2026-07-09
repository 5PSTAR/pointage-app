// ── Session admin : jeton HMAC signé, cookie httpOnly ──────────────────
import crypto from 'node:crypto';

const DUREE_JOURS = 7;

function signer(exp) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(String(exp)).digest('hex');
}

export function creerJeton() {
  const exp = Date.now() + DUREE_JOURS * 86400_000;
  return `${exp}.${signer(exp)}`;
}

export function verifierJeton(jeton) {
  if (!jeton) return false;
  const [exp, sig] = jeton.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const attendu = signer(exp);
  return sig.length === attendu.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu));
}

export function lireCookie(req, nom) {
  const brut = req.headers.cookie || '';
  const m = brut.match(new RegExp(`(?:^|;\\s*)${nom}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Garde d'accès : renvoie true si la requête est authentifiée, sinon répond 401. */
export function exigerAdmin(req, res) {
  if (verifierJeton(lireCookie(req, 'ptg_admin'))) return true;
  res.status(401).json({ error: 'Accès administrateur requis' });
  return false;
}
