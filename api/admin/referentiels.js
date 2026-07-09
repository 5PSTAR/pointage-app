// GET /api/admin/referentiels — hôtels, prestations, employées, tarifs (pour les formulaires)
import { DS, query, P, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    const [hotels, prestations, employes, tarifs] = await Promise.all([
      query(DS.HOTELS, { sorts: [{ property: 'Nom', direction: 'ascending' }] }),
      query(DS.PRESTATIONS),
      query(DS.EMPLOYES, { sorts: [{ property: 'Nom complet', direction: 'ascending' }] }),
      query(DS.TARIFS, { filter: { property: 'Actif', checkbox: { equals: true } } }),
    ]);
    res.json({
      hotels: hotels.map((h) => ({ id: h.id, nom: P.title(h, 'Nom'), ville: P.text(h, 'Ville'), actif: P.check(h, 'Actif') })),
      prestations: prestations.map((p) => ({ id: p.id, libelle: P.title(p, 'Libellé'), dureePrevue: P.number(p, 'Durée prévue (h)') })),
      employes: employes.map((e) => ({
        id: e.id, nomComplet: P.title(e, 'Nom complet'), matricule: P.uid(e, 'Matricule'),
        statut: P.select(e, 'Statut'), telephone: P.phone(e, 'Téléphone'),
      })),
      tarifs: tarifs.map((t) => ({
        id: t.id, hotelId: P.relation(t, 'Hôtel')[0] || null, prestationId: P.relation(t, 'Prestation')[0] || null,
        mode: P.select(t, 'Mode'), tauxHoraire: P.number(t, 'Taux horaire (€)'), forfait: P.number(t, 'Montant forfait (€)'),
      })),
    });
  } catch (err) { sendError(res, err); }
}
