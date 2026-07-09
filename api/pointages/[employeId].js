// GET /api/pointages/{employeId}?mois=AAAA-MM — historique salariée
import { DS, query, P, sendError } from '../_lib/notion.js';

export default async function handler(req, res) {
  try {
    const { employeId, mois } = req.query;
    const m = mois || new Date().toISOString().slice(0, 7);
    const debut = `${m}-01`;
    const finDate = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 1);
    const fin = finDate.toISOString().slice(0, 10);

    const pages = await query(DS.POINTAGES, {
      filter: { and: [
        { property: 'Employé', relation: { contains: employeId } },
        { property: 'Heure arrivée', date: { on_or_after: debut } },
        { property: 'Heure arrivée', date: { before: fin } },
      ]},
      sorts: [{ property: 'Heure arrivée', direction: 'descending' }],
    });

    const pointages = pages.map((p) => ({
      id: p.id,
      libelle: P.title(p, 'Pointage'),
      arrivee: P.date(p, 'Heure arrivée'),
      depart: P.date(p, 'Heure départ'),
      duree: P.formula(p, 'Durée réelle (h)'),
      statut: P.select(p, 'Statut'),
    }));
    const totalHeures = Math.round(pointages.reduce((s, p) => s + (p.duree || 0), 0) * 100) / 100;
    res.json({ mois: m, totalHeures, pointages });
  } catch (err) { sendError(res, err); }
}
