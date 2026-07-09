// GET /api/missions/{employeId} — affectations actives de la salariée
import { DS, query, getPage, P, sendError } from '../_lib/notion.js';

export default async function handler(req, res) {
  try {
    const { employeId } = req.query;
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const pages = await query(DS.AFFECTATIONS, {
      filter: { property: 'Employé', relation: { contains: employeId } },
    });
    const actives = pages.filter((p) => {
      const debut = P.date(p, 'Date début');
      const fin = P.date(p, 'Date fin');
      return (!debut || debut <= aujourdhui) && (!fin || fin >= aujourdhui);
    });
    const missions = await Promise.all(actives.map(async (p) => {
      const [hotelId] = P.relation(p, 'Hôtel');
      const [prestaId] = P.relation(p, 'Prestation');
      const [hotel, presta] = await Promise.all([
        hotelId ? getPage(hotelId) : null,
        prestaId ? getPage(prestaId) : null,
      ]);
      return {
        id: p.id,
        hotel: hotel ? P.title(hotel, 'Nom') : '',
        adresse: hotel ? P.text(hotel, 'Adresse') : '',
        prestation: presta ? P.title(presta, 'Libellé') : '',
        jours: P.multi(p, 'Jours'),
        fin: P.date(p, 'Date fin'),
      };
    }));
    res.json({ missions });
  } catch (err) { sendError(res, err); }
}
