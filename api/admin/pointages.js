// GET  /api/admin/pointages?mois=AAAA-MM&employe=&statut=  — liste filtrée
// GET  /api/admin/pointages?export=csv&mois=AAAA-MM        — export paie
// PATCH /api/admin/pointages — { id, arrivee?, depart?, statut?, commentaire? } correction manuelle
import { DS, query, getPage, updatePage, P, W, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    if (req.method === 'PATCH') {
      const { id, arrivee, depart, statut, commentaire } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id manquant' });
      const trace = ` | Modifié par admin le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`;
      const page = await getPage(id);
      const props = {};
      if (arrivee) props['Heure arrivée'] = W.date(arrivee);
      if (depart) props['Heure départ'] = W.date(depart);
      if (statut) props['Statut'] = W.select(statut);
      props['Commentaire'] = W.text(((commentaire ?? P.text(page, 'Commentaire')) + trace).slice(0, 1900));
      await updatePage(id, props);
      return res.json({ ok: true });
    }

    const mois = req.query.mois || new Date().toISOString().slice(0, 7);
    const debut = `${mois}-01`;
    const fin = new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 1).toISOString().slice(0, 10);
    const and = [
      { property: 'Heure arrivée', date: { on_or_after: debut } },
      { property: 'Heure arrivée', date: { before: fin } },
    ];
    if (req.query.employe) and.push({ property: 'Employé', relation: { contains: req.query.employe } });
    if (req.query.statut) and.push({ property: 'Statut', select: { equals: req.query.statut } });

    const pages = await query(DS.POINTAGES, {
      filter: { and }, sorts: [{ property: 'Heure arrivée', direction: 'descending' }],
    });

    const employesCache = new Map();
    const nomEmploye = async (id) => {
      if (!id) return '';
      if (!employesCache.has(id)) {
        const e = await getPage(id);
        employesCache.set(id, P.title(e, 'Nom complet'));
      }
      return employesCache.get(id);
    };

    const pointages = [];
    for (const p of pages) {
      pointages.push({
        id: p.id,
        libelle: P.title(p, 'Pointage'),
        employe: await nomEmploye(P.relation(p, 'Employé')[0]),
        arrivee: P.date(p, 'Heure arrivée'),
        depart: P.date(p, 'Heure départ'),
        duree: P.formula(p, 'Durée réelle (h)'),
        statut: P.select(p, 'Statut'),
        facture: P.relation(p, 'Facture').length > 0,
        commentaire: P.text(p, 'Commentaire'),
      });
    }

    if (req.query.export === 'csv') {
      const lignes = [['Employée', 'Mission', 'Arrivée', 'Départ', 'Durée (h)', 'Statut'].join(';')];
      for (const p of pointages) {
        lignes.push([p.employe, p.libelle, p.arrivee || '', p.depart || '', p.duree ?? '', p.statut].join(';'));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="pointages-${mois}.csv"`);
      return res.send('\uFEFF' + lignes.join('\n'));
    }
    res.json({ mois, pointages });
  } catch (err) { sendError(res, err); }
}
