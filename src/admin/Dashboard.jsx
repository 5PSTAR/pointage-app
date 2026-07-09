import { useEffect, useState } from 'react';
import { api } from '../api.js';

function Duree({ depuis }) {
  const s = Math.floor((Date.now() - new Date(depuis)) / 60000);
  return <>{Math.floor(s / 60)}h{String(s % 60).padStart(2, '0')}</>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState('');

  const charger = (force) =>
    api(`/api/admin/dashboard${force ? '?force=1' : ''}`).then(setData).catch((e) => setErreur(e.message));
  useEffect(() => { charger(); }, []);

  if (erreur) return <div className="bandeau erreur">{erreur}</div>;
  if (!data) return <p className="muted">Chargement…</p>;

  return (
    <>
      <div className="entete">
        <h1>Tableau de bord</h1>
        <button className="btn secondaire" onClick={() => charger(true)}>Actualiser</button>
      </div>

      <div className="stats">
        <div className="carte stat accent-vert"><p className="muted petit">Sur site maintenant</p><span className="chiffre">{data.jour.enCours}</span></div>
        <div className="carte stat"><p className="muted petit">Missions terminées aujourd'hui</p><span className="chiffre">{data.jour.terminees}</span></div>
        <div className="carte stat"><p className="muted petit">Heures du jour</p><span className="chiffre">{data.jour.totalHeures}</span></div>
        <div className="carte stat accent-rouge"><p className="muted petit">Anomalies</p><span className="chiffre">{data.anomalies.length + data.oublis.length}</span></div>
      </div>

      <h2 style={{ margin: '8px 0 10px' }}>🟢 En mission actuellement</h2>
      {data.surSite.length === 0 && <p className="muted">Personne sur site pour le moment.</p>}
      {data.surSite.map((p) => (
        <div key={p.id} className="carte accent-vert">
          <strong>{p.employe}</strong> — {p.libelle}
          <p className="muted petit">Depuis {new Date(p.arrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · <Duree depuis={p.arrivee} /></p>
        </div>
      ))}

      {(data.oublis.length > 0 || data.anomalies.length > 0) && (
        <>
          <h2 style={{ margin: '18px 0 10px' }}>🔴 À traiter</h2>
          {data.oublis.map((p) => (
            <div key={p.id} className="carte accent-rouge">
              <span className="badge rouge">Départ non pointé</span>
              <p style={{ marginTop: 6 }}><strong>{p.employe}</strong> — {p.libelle}</p>
              <p className="muted petit">Arrivée : {new Date(p.arrivee).toLocaleString('fr-FR')} — à clôturer dans l'onglet Pointages</p>
            </div>
          ))}
          {data.anomalies.map((p) => (
            <div key={p.id} className="carte accent-rouge">
              <span className="badge rouge">Anomalie</span>
              <p style={{ marginTop: 6 }}><strong>{p.employe}</strong> — {p.libelle}</p>
              {p.commentaire && <p className="muted petit">{p.commentaire}</p>}
            </div>
          ))}
        </>
      )}
    </>
  );
}
