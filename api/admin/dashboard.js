// GET /api/admin/dashboard — temps réel : sur site, anomalies, chiffres du jour
import { DS, query, getPage, P, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

let cache = null; // cache serverless 60 s (best effort, par instance)

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    if (cache && Date.now() - cache.t < 60_000 && !req.query.force) return res.json(cache.data);

    const aujourdhui = new Date().toISOString().slice(0, 10);
    const [enCours, anomalies, termines] = await Promise.all([
      query(DS.POINTAGES, { filter: { property: 'Statut', select: { equals: 'En cours' } } }),
      query(DS.POINTAGES, { filter: { property: 'Statut', select: { equals: 'Anomalie' } } }),
      query(DS.POINTAGES, { filter: { and: [
        { property: 'Statut', select: { equals: 'Terminé' } },
        { property: 'Heure arrivée', date: { on_or_after: aujourdhui } },
      ]}}),
    ]);

    const decrire = async (p) => {
      const [empId] = P.relation(p, 'Employé');
      const emp = empId ? await getPage(empId) : null;
      return {
        id: p.id,
        libelle: P.title(p, 'Pointage'),
        employe: emp ? P.title(emp, 'Nom complet') : '',
        arrivee: P.date(p, 'Heure arrivée'),
        depart: P.date(p, 'Heure départ'),
        duree: P.formula(p, 'Durée réelle (h)'),
        commentaire: P.text(p, 'Commentaire'),
      };
    };

    // Pointages "En cours" depuis plus de 12 h = oublis probables
    const seuilOubli = Date.now() - 12 * 3_600_000;
    const surSite = [];
    const oublis = [];
    for (const p of enCours) {
      const item = await decrire(p);
      (new Date(item.arrivee).getTime() < seuilOubli ? oublis : surSite).push(item);
    }

    const data = {
      surSite,
      oublis,
      anomalies: await Promise.all(anomalies.slice(0, 20).map(decrire)),
      jour: {
        terminees: termines.length,
        enCours: surSite.length,
        totalHeures: Math.round(termines.reduce((s, p) => s + (P.formula(p, 'Durée réelle (h)') || 0), 0) * 100) / 100,
      },
    };
    cache = { t: Date.now(), data };
    res.json(data);
  } catch (err) { sendError(res, err); }
}
