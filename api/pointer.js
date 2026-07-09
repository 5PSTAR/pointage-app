// POST /api/pointer — cœur du système
// Corps : { employeId, qrCode, timestamp, geoloc? }
// 1er scan sur un QR → création pointage "En cours" (arrivée)
// 2e scan sur le même QR → complétion du départ, statut "Terminé"
import { DS, query, getPage, createPage, updatePage, P, W, sendError } from './_lib/notion.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  try {
    const { employeId, qrCode, timestamp, geoloc } = req.body || {};
    if (!employeId || !qrCode) return res.status(400).json({ error: 'Paramètres manquants' });

    // ── Décodage et validation du QR ──
    if (!qrCode.startsWith('PTG:')) {
      return res.status(400).json({ error: 'QR code non reconnu. Scannez le QR de pointage affiché dans l’hôtel.' });
    }
    const qrId = qrCode.slice(4);
    let qrPage;
    try { qrPage = await getPage(qrId); }
    catch { return res.status(404).json({ error: 'QR code inconnu.' }); }
    if (!P.check(qrPage, 'Actif')) {
      return res.status(403).json({ error: 'Ce QR code a été désactivé. Contactez votre responsable.' });
    }

    // ── Vérification salariée ──
    const employe = await getPage(employeId);
    if (P.select(employe, 'Statut') !== 'Actif') {
      return res.status(403).json({ error: 'Compte inactif.' });
    }

    // ── Résolution hôtel + prestation ──
    const [hotelId] = P.relation(qrPage, 'Hôtel');
    const [prestaId] = P.relation(qrPage, 'Prestation');
    const [hotel, presta] = await Promise.all([
      hotelId ? getPage(hotelId) : null,
      prestaId ? getPage(prestaId) : null,
    ]);
    const nomHotel = hotel ? P.title(hotel, 'Nom') : 'Hôtel';
    const nomPresta = presta ? P.title(presta, 'Libellé') : 'Prestation';

    const quand = timestamp || new Date().toISOString();

    // ── Pointage en cours sur ce QR ? ──
    const ouverts = await query(DS.POINTAGES, {
      filter: { and: [
        { property: 'Employé', relation: { contains: employeId } },
        { property: 'QR Code', relation: { contains: qrId } },
        { property: 'Statut', select: { equals: 'En cours' } },
      ]},
    });

    if (ouverts.length) {
      // ── DÉPART ──
      const pointage = ouverts[0];
      const arrivee = P.date(pointage, 'Heure arrivée');
      if (arrivee && new Date(quand) <= new Date(arrivee)) {
        return res.status(400).json({ error: 'Heure de départ antérieure à l’arrivée.' });
      }
      await updatePage(pointage.id, {
        'Heure départ': W.date(quand),
        'Statut': W.select('Terminé'),
        ...(geoloc ? { 'Commentaire': W.text(`${P.text(pointage, 'Commentaire')} | Départ GPS ${geoloc.lat.toFixed(5)},${geoloc.lng.toFixed(5)}`.trim()) } : {}),
      });
      const duree = (new Date(quand) - new Date(arrivee)) / 3_600_000;
      return res.json({
        type: 'depart', hotel: nomHotel, prestation: nomPresta,
        heure: quand, dureeHeures: Math.round(duree * 100) / 100,
      });
    }

    // ── ARRIVÉE ──
    const prenom = P.text(employe, 'Prénom') || P.title(employe, 'Nom complet');
    const d = new Date(quand);
    const libelle = `${prenom} — ${nomHotel} — ${nomPresta} — ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    await createPage(DS.POINTAGES, {
      'Pointage': W.title(libelle),
      'Employé': W.relation(employeId),
      'QR Code': W.relation(qrId),
      'Heure arrivée': W.date(quand),
      'Statut': W.select('En cours'),
      ...(geoloc ? { 'Commentaire': W.text(`Arrivée GPS ${geoloc.lat.toFixed(5)},${geoloc.lng.toFixed(5)}`) } : {}),
    });
    res.json({ type: 'arrivee', hotel: nomHotel, prestation: nomPresta, heure: quand });
  } catch (err) { sendError(res, err); }
}
