import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Facturation() {
  const [refs, setRefs] = useState(null);
  const [factures, setFactures] = useState([]);
  const [hotel, setHotel] = useState('');
  const [mois, setMois] = useState(new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 7));
  const [tva, setTva] = useState(20);
  const [apercu, setApercu] = useState(null);
  const [info, setInfo] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const chargerFactures = () => api('/api/admin/facture?liste=1').then((d) => setFactures(d.factures));
  useEffect(() => { api('/api/admin/referentiels').then(setRefs); chargerFactures(); }, []);

  async function previsualiser() {
    setChargement(true); setErreur(''); setApercu(null);
    try { setApercu(await api(`/api/admin/facture?hotel=${hotel}&mois=${mois}`)); }
    catch (e) { setErreur(e.message); }
    setChargement(false);
  }

  async function generer() {
    setChargement(true); setErreur('');
    try {
      const r = await api('/api/admin/facture', { method: 'POST', body: { hotelId: hotel, mois, tva: Number(tva) } });
      setInfo(`Facture ${r.numero} créée (${r.totalHT} € HT). Les pointages sont marqués facturés.`);
      setApercu(null); chargerFactures();
    } catch (e) { setErreur(e.message); }
    setChargement(false);
  }

  async function changerStatut(id, statut) {
    await api('/api/admin/facture', { method: 'PATCH', body: { id, statut } });
    chargerFactures();
  }

  if (!refs) return <p className="muted">Chargement…</p>;

  return (
    <>
      <div className="entete"><h1>Facturation</h1></div>

      <div className="carte accent-vert">
        <h3>Nouvelle facture mensuelle</h3>
        <div className="grille-form">
          <div><label>Hôtel</label>
            <select value={hotel} onChange={(e) => { setHotel(e.target.value); setApercu(null); }}>
              <option value="">—</option>{refs.hotels.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
            </select></div>
          <div><label>Mois</label><input type="month" value={mois} onChange={(e) => { setMois(e.target.value); setApercu(null); }} /></div>
          <div><label>TVA (%)</label><input type="number" value={tva} onChange={(e) => setTva(e.target.value)} /></div>
          <div><button className="btn" onClick={previsualiser} disabled={!hotel || chargement}>Prévisualiser</button></div>
        </div>
        {erreur && <div className="bandeau erreur" style={{ marginTop: 10 }}>{erreur}</div>}
        {info && <div className="bandeau ok" style={{ marginTop: 10 }}>{info}</div>}

        {apercu && (
          <div style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Prestation</th><th>Heures</th><th>Interv.</th><th>Calcul</th><th>Montant HT</th></tr></thead>
              <tbody>
                {apercu.details.map((d, i) => (
                  <tr key={i}><td>{d.prestation}</td><td>{d.heures}</td><td>{d.interventions}</td><td className="petit">{d.detail}</td><td><strong>{d.montant.toFixed(2)} €</strong></td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <p><strong>Total HT : {apercu.totalHT.toFixed(2)} €</strong> · TTC : {(apercu.totalHT * (1 + tva / 100)).toFixed(2)} € · {apercu.nbPointages} pointage(s)</p>
              {apercu.sansTarif && <div className="bandeau erreur" style={{ marginTop: 8 }}>Tarif manquant pour une prestation — complétez la base 💶 Tarifs dans Notion avant de générer.</div>}
              <button className="btn vert" style={{ marginTop: 10 }} onClick={generer} disabled={apercu.sansTarif || !apercu.nbPointages || chargement}>
                Générer la facture
              </button>
            </div>
          </div>
        )}
      </div>

      <h2 style={{ margin: '18px 0 10px' }}>Factures émises</h2>
      <div className="carte" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Numéro</th><th>Hôtel</th><th>Période</th><th>HT</th><th>TTC</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id}>
                <td><strong>{f.numero}</strong></td>
                <td>{f.hotel}</td>
                <td className="petit">{f.periode?.slice(0, 7)}</td>
                <td>{f.ht?.toFixed(2)} €</td>
                <td>{f.ttc?.toFixed(2)} €</td>
                <td>
                  <select value={f.statut || 'Brouillon'} onChange={(e) => changerStatut(f.id, e.target.value)} style={{ padding: '4px 8px', width: 'auto' }}>
                    <option>Brouillon</option><option>Émise</option><option>Payée</option><option>En retard</option>
                  </select>
                </td>
                <td><a className="btn secondaire" href={`/api/admin/facture?pdf=${f.id}`}>PDF</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {factures.length === 0 && <p className="muted" style={{ padding: 12 }}>Aucune facture pour le moment.</p>}
      </div>
    </>
  );
}
