// GET  /api/admin/facture?hotel={id}&mois=AAAA-MM          — prévisualisation
// POST /api/admin/facture { hotelId, mois, tva? }          — génération
// GET  /api/admin/facture?pdf={factureId}                  — téléchargement PDF
// GET  /api/admin/facture?liste=1                          — liste des factures
// PATCH /api/admin/facture { id, statut }                  — changement de statut
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DS, query, getPage, createPage, updatePage, P, W, sendError } from '../_lib/notion.js';
import { exigerAdmin } from '../_lib/auth.js';

const bornes = (mois) => {
  const debut = `${mois}-01`;
  const finExcl = new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 1).toISOString().slice(0, 10);
  const finIncl = new Date(new Date(finExcl) - 86_400_000).toISOString().slice(0, 10);
  return { debut, finExcl, finIncl };
};

// Pointages Terminé, non facturés, du mois, pour un hôtel (via ses QR codes)
async function pointagesFacturables(hotelId, mois) {
  const { debut, finExcl } = bornes(mois);
  const qrs = await query(DS.QR_CODES, { filter: { property: 'Hôtel', relation: { contains: hotelId } } });
  if (!qrs.length) return { pointages: [], qrs: [] };
  const pages = await query(DS.POINTAGES, {
    filter: { and: [
      { or: qrs.map((q) => ({ property: 'QR Code', relation: { contains: q.id } })) },
      { property: 'Statut', select: { equals: 'Terminé' } },
      { property: 'Facture', relation: { is_empty: true } },
      { property: 'Heure arrivée', date: { on_or_after: debut } },
      { property: 'Heure arrivée', date: { before: finExcl } },
    ]},
    sorts: [{ property: 'Heure arrivée', direction: 'ascending' }],
  });
  return { pointages: pages, qrs };
}

// Agrégation par prestation avec application de la grille tarifaire
async function agreger(hotelId, mois) {
  const { pointages, qrs } = await pointagesFacturables(hotelId, mois);
  const qrPresta = new Map(qrs.map((q) => [q.id, P.relation(q, 'Prestation')[0] || null]));
  const tarifs = await query(DS.TARIFS, {
    filter: { and: [
      { property: 'Hôtel', relation: { contains: hotelId } },
      { property: 'Actif', checkbox: { equals: true } },
    ]},
  });
  const tarifParPresta = new Map(tarifs.map((t) => [P.relation(t, 'Prestation')[0], t]));

  const lignes = new Map(); // prestaId → agrégat
  for (const p of pointages) {
    const prestaId = qrPresta.get(P.relation(p, 'QR Code')[0]) || 'inconnu';
    if (!lignes.has(prestaId)) lignes.set(prestaId, { heures: 0, interventions: 0, pointageIds: [] });
    const l = lignes.get(prestaId);
    l.heures += P.formula(p, 'Durée réelle (h)') || 0;
    l.interventions += 1;
    l.pointageIds.push(p.id);
  }

  const details = [];
  let totalHT = 0;
  let sansTarif = false;
  for (const [prestaId, l] of lignes) {
    const presta = prestaId !== 'inconnu' ? await getPage(prestaId) : null;
    const tarif = tarifParPresta.get(prestaId);
    const mode = tarif ? P.select(tarif, 'Mode') : null;
    let montant = 0;
    let detail = 'Aucun tarif défini';
    if (mode === 'Horaire') {
      const taux = P.number(tarif, 'Taux horaire (€)') || 0;
      montant = l.heures * taux;
      detail = `${Math.round(l.heures * 100) / 100} h × ${taux} €/h`;
    } else if (mode === 'Forfait') {
      const forfait = P.number(tarif, 'Montant forfait (€)') || 0;
      montant = l.interventions * forfait;
      detail = `${l.interventions} intervention(s) × ${forfait} €`;
    } else sansTarif = true;
    montant = Math.round(montant * 100) / 100;
    totalHT += montant;
    details.push({
      prestation: presta ? P.title(presta, 'Libellé') : 'Prestation inconnue',
      heures: Math.round(l.heures * 100) / 100,
      interventions: l.interventions,
      detail, montant,
      pointageIds: l.pointageIds,
    });
  }
  return { details, totalHT: Math.round(totalHT * 100) / 100, nbPointages: pointages.length, sansTarif };
}

async function genererPDF(factureId) {
  const facture = await getPage(factureId);
  const [hotelId] = P.relation(facture, 'Hôtel');
  const hotel = hotelId ? await getPage(hotelId) : null;
  const pointageIds = P.relation(facture, 'Pointages');

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.086, 0.157, 0.235);
  const gris = rgb(0.45, 0.47, 0.52);
  let y = 790;
  const txt = (s, x, size = 10, f = font, color = navy) => page.drawText(String(s), { x, y, size, font: f, color });

  txt('FACTURE', 50, 26, bold); y -= 20;
  txt(P.title(facture, 'Numéro'), 50, 12, bold, gris); y -= 40;
  txt('Adressée à :', 50, 9, font, gris); y -= 14;
  txt(hotel ? P.title(hotel, 'Nom') : '', 50, 12, bold); y -= 14;
  if (hotel) { txt(`${P.text(hotel, 'Adresse')} — ${P.text(hotel, 'Ville')}`, 50, 10); y -= 14; }
  const periode = P.date(facture, 'Période');
  txt(`Période : ${periode ? periode.slice(0, 7) : ''}`, 50, 10); y -= 30;

  // En-tête tableau
  page.drawRectangle({ x: 50, y: y - 4, width: 495, height: 18, color: navy });
  page.drawText('Mission', { x: 56, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Date', { x: 300, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Durée (h)', { x: 470, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  y -= 22;

  let totalHeures = 0;
  for (const pid of pointageIds) {
    if (y < 120) { y = 790; doc.addPage([595, 842]); }
    const pt = await getPage(pid);
    const duree = P.formula(pt, 'Durée réelle (h)') || 0;
    totalHeures += duree;
    const arrivee = P.date(pt, 'Heure arrivée');
    txt(P.title(pt, 'Pointage').slice(0, 48), 56, 8.5);
    txt(arrivee ? arrivee.slice(0, 10) : '', 300, 8.5);
    txt(duree.toFixed(2), 480, 8.5);
    y -= 14;
  }

  y -= 16;
  page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 545, y: y + 8 }, thickness: 0.5, color: gris });
  txt(`Total heures : ${totalHeures.toFixed(2)} h`, 380, 10, bold); y -= 16;
  const ht = P.number(facture, 'Montant HT (€)') || 0;
  const tva = P.number(facture, 'TVA (%)') ?? 20;
  txt(`Montant HT : ${ht.toFixed(2)} €`, 380, 10, bold); y -= 16;
  txt(`TVA ${tva}% : ${(ht * tva / 100).toFixed(2)} €`, 380, 10); y -= 16;
  txt(`Montant TTC : ${(ht * (1 + tva / 100)).toFixed(2)} €`, 380, 12, bold); y -= 40;
  txt('Document généré automatiquement — mentions légales à compléter (SIRET, conditions de règlement).', 50, 7.5, font, gris);

  return Buffer.from(await doc.save());
}

export default async function handler(req, res) {
  if (!exigerAdmin(req, res)) return;
  try {
    if (req.method === 'GET' && req.query.pdf) {
      const pdf = await genererPDF(req.query.pdf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="facture.pdf"');
      return res.send(pdf);
    }
    if (req.method === 'GET' && req.query.liste) {
      const pages = await query(DS.FACTURES, { sorts: [{ timestamp: 'created_time', direction: 'descending' }] });
      const cache = new Map();
      const factures = [];
      for (const p of pages) {
        const [hid] = P.relation(p, 'Hôtel');
        if (hid && !cache.has(hid)) cache.set(hid, P.title(await getPage(hid), 'Nom'));
        factures.push({
          id: p.id,
          numero: P.title(p, 'Numéro'),
          hotel: hid ? cache.get(hid) : '',
          periode: P.date(p, 'Période'),
          ht: P.number(p, 'Montant HT (€)'),
          ttc: P.formula(p, 'Montant TTC (€)'),
          statut: P.select(p, 'Statut'),
        });
      }
      return res.json({ factures });
    }
    if (req.method === 'GET') {
      const { hotel, mois } = req.query;
      if (!hotel || !mois) return res.status(400).json({ error: 'hotel et mois requis' });
      return res.json(await agreger(hotel, mois));
    }
    if (req.method === 'PATCH') {
      const { id, statut } = req.body || {};
      await updatePage(id, { 'Statut': W.select(statut) });
      return res.json({ ok: true });
    }
    if (req.method === 'POST') {
      const { hotelId, mois, tva = 20 } = req.body || {};
      const agg = await agreger(hotelId, mois);
      if (!agg.nbPointages) return res.status(400).json({ error: 'Aucun pointage facturable sur cette période.' });
      if (agg.sansTarif) return res.status(400).json({ error: 'Tarif manquant pour au moins une prestation. Complétez la base 💶 Tarifs.' });

      // Numérotation FAC-AAAA-MM-XXX
      const existantes = await query(DS.FACTURES, {
        filter: { property: 'Numéro', title: { starts_with: `FAC-${mois}` } },
      });
      const numero = `FAC-${mois}-${String(existantes.length + 1).padStart(3, '0')}`;
      const tousPointages = agg.details.flatMap((d) => d.pointageIds);
      const { debut, finIncl } = bornes(mois);

      const facture = await createPage(DS.FACTURES, {
        'Numéro': W.title(numero),
        'Hôtel': W.relation(hotelId),
        'Pointages': W.relation(tousPointages),
        'Période': W.date(debut, finIncl),
        'Montant HT (€)': W.number(agg.totalHT),
        'TVA (%)': W.number(tva),
        'Statut': W.select('Brouillon'),
        "Date d'émission": W.date(new Date().toISOString().slice(0, 10)),
      });
      return res.json({ ok: true, id: facture.id, numero, totalHT: agg.totalHT });
    }
    res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) { sendError(res, err); }
}
