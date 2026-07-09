// GET  /api/admin/qrcodes                    — liste enrichie + image dataURL
// POST /api/admin/qrcodes { hotelId, prestationId } — création d'un QR
// PATCH /api/admin/qrcodes { id, actif }     — activation / désactivation
import QRCode from 'qrcode';
import { DS, query, getPage, createPage, updatePage, P, W, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    if (req.method === 'POST') {
      const { hotelId, prestationId } = req.body || {};
      const [hotel, presta] = await Promise.all([getPage(hotelId), getPage(prestationId)]);
      const slug = (s) => s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18);
      const code = `QR-${slug(P.title(hotel, 'Nom'))}-${slug(P.title(presta, 'Libellé'))}-${Date.now().toString(36).toUpperCase()}`;
      const page = await createPage(DS.QR_CODES, {
        'Code unique': W.title(code),
        'Hôtel': W.relation(hotelId),
        'Prestation': W.relation(prestationId),
        'Actif': W.check(true),
      });
      return res.json({ ok: true, id: page.id });
    }
    if (req.method === 'PATCH') {
      const { id, actif } = req.body || {};
      await updatePage(id, { 'Actif': W.check(!!actif) });
      return res.json({ ok: true });
    }

    const pages = await query(DS.QR_CODES);
    const cache = new Map();
    const nom = async (id, champ) => {
      if (!id) return '';
      if (!cache.has(id)) cache.set(id, await getPage(id));
      return P.title(cache.get(id), champ);
    };
    const qrcodes = [];
    for (const p of pages) {
      const contenu = `PTG:${p.id.replace(/-/g, '')}`;
      qrcodes.push({
        id: p.id,
        code: P.title(p, 'Code unique'),
        hotel: await nom(P.relation(p, 'Hôtel')[0], 'Nom'),
        prestation: await nom(P.relation(p, 'Prestation')[0], 'Libellé'),
        actif: P.check(p, 'Actif'),
        image: await QRCode.toDataURL(contenu, { width: 480, margin: 2, color: { dark: '#16283C' } }),
      });
    }
    res.json({ qrcodes });
  } catch (err) { sendError(res, err); }
}
