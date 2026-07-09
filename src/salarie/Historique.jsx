import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Historique() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api(`/api/pointages/${id}?mois=${mois}`).then(setData).catch(() => setData({ pointages: [], totalHeures: 0 }));
  }, [id, mois]);

  const fmt = (iso, opts) => iso ? new Date(iso).toLocaleString('fr-FR', opts) : '—';

  // Groupement par semaine ISO simplifiée (lundi)
  const semaines = new Map();
  for (const p of data?.pointages || []) {
    const d = new Date(p.arrivee);
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const cle = lundi.toISOString().slice(0, 10);
    if (!semaines.has(cle)) semaines.set(cle, []);
    semaines.get(cle).push(p);
  }

  return (
    <div className="page">
      <div className="entete">
        <h1>Mes heures</h1>
        <button className="btn secondaire" onClick={() => navigate(`/s/${id}`)}>Retour</button>
      </div>
      <input type="month" value={mois} onChange={(e) => setMois(e.target.value)} aria-label="Mois" />
      {!data ? <p className="muted" style={{ marginTop: 16 }}>Chargement…</p> : (
        <>
          <div className="carte accent-vert" style={{ marginTop: 14 }}>
            <p className="muted petit">Total du mois</p>
            <div className="stat"><span className="chiffre" style={{ fontSize: '2rem', fontWeight: 800 }}>{data.totalHeures} h</span></div>
          </div>
          {[...semaines.entries()].map(([lundi, pts]) => {
            const totalSem = Math.round(pts.reduce((s, p) => s + (p.duree || 0), 0) * 100) / 100;
            return (
              <div key={lundi}>
                <h3 style={{ margin: '14px 0 8px' }}>
                  Semaine du {new Date(lundi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  <span className="muted"> — {totalSem} h</span>
                </h3>
                {pts.map((p) => (
                  <div key={p.id} className="carte">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong className="petit">{p.libelle}</strong>
                      <span className={`badge ${p.statut === 'Terminé' ? 'vert' : p.statut === 'En cours' ? 'ambre' : 'rouge'}`}>{p.statut}</span>
                    </div>
                    <p className="muted petit" style={{ marginTop: 4 }}>
                      {fmt(p.arrivee, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {p.depart ? fmt(p.depart, { hour: '2-digit', minute: '2-digit' }) : 'en cours'}
                      {p.duree != null && <strong> · {p.duree} h</strong>}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
          {data.pointages.length === 0 && <p className="muted" style={{ marginTop: 16 }}>Aucun pointage sur ce mois.</p>}
        </>
      )}
    </div>
  );
}
