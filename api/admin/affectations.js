// CRUD du planning
// GET / POST { employeId, hotelId, prestationId, debut, fin?, jours[] } / PATCH { id, ... } / DELETE { id }
import { DS, query, getPage, createPage, updatePage, P, W, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    if (req.method === 'POST' || req.method === 'PATCH') {
      const { id, employeId, hotelId, prestationId, debut, fin, jours } = req.body || {};
      const props = {};
      if (employeId) props['Employé'] = W.relation(employeId);
      if (hotelId) props['Hôtel'] = W.relation(hotelId);
      if (prestationId) props['Prestation'] = W.relation(prestationId);
      if (debut) props['Date début'] = W.date(debut);
      if (fin !== undefined) props['Date fin'] = fin ? W.date(fin) : { date: null };
      if (jours) props['Jours'] = { multi_select: jours.map((j) => ({ name: j })) };

      if (req.method === 'POST') {
        const [emp, hot, pre] = await Promise.all([getPage(employeId), getPage(hotelId), getPage(prestationId)]);
        props['Affectation'] = W.title(
          `${P.text(emp, 'Prénom') || P.title(emp, 'Nom complet')} — ${P.title(hot, 'Nom')} — ${P.title(pre, 'Libellé')}`
        );
        await createPage(DS.AFFECTATIONS, props);
      } else {
        await updatePage(id, props);
      }
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      // Notion ne supprime pas : on archive la page
      const { id } = req.body || {};
      await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      });
      return res.json({ ok: true });
    }

    // GET — toutes les affectations, enrichies
    const pages = await query(DS.AFFECTATIONS);
    const cache = new Map();
    const nom = async (id, champ) => {
      if (!id) return '';
      const cle = `${id}`;
      if (!cache.has(cle)) cache.set(cle, await getPage(id));
      return P.title(cache.get(cle), champ);
    };
    const affectations = [];
    for (const p of pages) {
      affectations.push({
        id: p.id,
        employeId: P.relation(p, 'Employé')[0] || null,
        hotelId: P.relation(p, 'Hôtel')[0] || null,
        prestationId: P.relation(p, 'Prestation')[0] || null,
        employe: await nom(P.relation(p, 'Employé')[0], 'Nom complet'),
        hotel: await nom(P.relation(p, 'Hôtel')[0], 'Nom'),
        prestation: await nom(P.relation(p, 'Prestation')[0], 'Libellé'),
        debut: P.date(p, 'Date début'),
        fin: P.date(p, 'Date fin'),
        jours: P.multi(p, 'Jours'),
      });
    }
    res.json({ affectations });
  } catch (err) { sendError(res, err); }
}
