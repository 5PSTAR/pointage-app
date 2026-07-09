// GET /api/employe/{id} — profil salariée + état courant
import { DS, getPage, query, P, sendError } from '../_lib/notion.js';

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const page = await getPage(id);
    const statut = P.select(page, 'Statut');
    if (statut !== 'Actif') {
      return res.status(403).json({ error: 'Compte inactif. Contactez votre responsable.' });
    }
    // Pointage en cours éventuel
    const enCours = await query(DS.POINTAGES, {
      filter: { and: [
        { property: 'Employé', relation: { contains: id } },
        { property: 'Statut', select: { equals: 'En cours' } },
      ]},
    });
    let mission = null;
    if (enCours.length) {
      const p = enCours[0];
      mission = {
        pointageId: p.id,
        arrivee: P.date(p, 'Heure arrivée'),
        libelle: P.title(p, 'Pointage'),
      };
    }
    res.json({
      id,
      prenom: P.text(page, 'Prénom'),
      nom: P.text(page, 'Nom'),
      nomComplet: P.title(page, 'Nom complet'),
      matricule: P.uid(page, 'Matricule'),
      enCours: mission,
    });
  } catch (err) { sendError(res, err); }
}
