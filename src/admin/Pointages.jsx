import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Pointages() {
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7));
  const [statut, setStatut] = useState('');
  const [data, setData] = useState(null);
  const [edition, setEdition] = useState(null); // pointage en cours d'édition
  const [info, setInfo] = useState('');

  const charger = () => {
    setData(null);
    api(`/api/admin/pointages?mois=${mois}${statut ? `&statut=${statut}` : ''}`).then(setData);
  };
  useEffect(charger, [mois, statut]);

  async function corriger() {
    await api('/api/admin/pointages', { method: 'PATCH', body: {
      id: edition.id,
      arrivee: edition.arrivee || undefined,
      depart: edition.depart || undefined,
      statut: edition.statut || undefined,
    }});
    setEdition(null);
    setInfo('Pointage corrigé (modification tracée dans le commentaire).');
    charger();
  }

  const local = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : '';
  const fmt = (iso) => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <>
      <div className="entete"><h1>Pointages</h1>
        <a className="btn secondaire" href={`/api/admin/pointages?export=csv&mois=${mois}`}>Exporter CSV (paie)</a>
      </div>
      <div className="grille-form carte">
        <div><label>Mois</label><input type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></div>
        <div><label>Statut</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous</option><option>En cours</option><option>Terminé</option><option>Anomalie</option>
          </select>
        </div>
      </div>
      {info && <div className="bandeau ok">{info}</div>}
      {!data ? <p className="muted">Chargement…</p> : (
        <div className="carte" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Mission</th><th>Employée</th><th>Arrivée</th><th>Départ</th><th>Durée</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {data.pointages.map((p) => (
                <tr key={p.id}>
                  <td>{p.libelle}{p.facture && <span className="badge gris" style={{ marginLeft: 6 }}>Facturé</span>}</td>
                  <td>{p.employe}</td>
                  <td>{fmt(p.arrivee)}</td>
                  <td>{fmt(p.depart)}</td>
                  <td>{p.duree ?? '—'}</td>
                  <td><span className={`badge ${p.statut === 'Terminé' ? 'vert' : p.statut === 'En cours' ? 'ambre' : 'rouge'}`}>{p.statut}</span></td>
                  <td><button className="btn secondaire" onClick={() => setEdition({ id: p.id, arrivee: p.arrivee, depart: p.depart, statut: p.statut, libelle: p.libelle })}>Corriger</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pointages.length === 0 && <p className="muted" style={{ padding: 12 }}>Aucun pointage.</p>}
        </div>
      )}

      {edition && (
        <div className="carte accent-ambre">
          <h3>Correction — {edition.libelle}</h3>
          <div className="grille-form">
            <div><label>Heure d'arrivée</label>
              <input type="datetime-local" value={local(edition.arrivee)} onChange={(e) => setEdition({ ...edition, arrivee: new Date(e.target.value).toISOString() })} /></div>
            <div><label>Heure de départ</label>
              <input type="datetime-local" value={local(edition.depart)} onChange={(e) => setEdition({ ...edition, depart: new Date(e.target.value).toISOString() })} /></div>
            <div><label>Statut</label>
              <select value={edition.statut} onChange={(e) => setEdition({ ...edition, statut: e.target.value })}>
                <option>En cours</option><option>Terminé</option><option>Anomalie</option>
              </select></div>
          </div>
          <div className="ligne-boutons">
            <button className="btn vert" onClick={corriger}>Enregistrer la correction</button>
            <button className="btn secondaire" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </div>
      )}
    </>
  );
}
