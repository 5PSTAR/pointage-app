import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { fileAttente, synchroniser } from '../offline.js';

function Chrono({ depuis }) {
  const [, tic] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - new Date(depuis)) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return <span className="chrono">{h}h{String(m).padStart(2, '0')}</span>;
}

export default function Accueil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profil, setProfil] = useState(null);
  const [missions, setMissions] = useState([]);
  const [erreur, setErreur] = useState('');
  const [enAttente, setEnAttente] = useState(fileAttente().length);

  useEffect(() => {
    localStorage.setItem('ptg_employe_id', id);
    synchroniser().then(({ restants }) => setEnAttente(restants));
    api(`/api/employe/${id}`)
      .then(setProfil)
      .catch((e) => setErreur(e.message));
    api(`/api/missions/${id}`).then((d) => setMissions(d.missions)).catch(() => {});
  }, [id]);

  if (erreur) return (
    <div className="page centre">
      <h1>Accès impossible</h1>
      <p className="muted">{erreur}</p>
    </div>
  );
  if (!profil) return <div className="page centre"><p className="muted">Chargement…</p></div>;

  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const enCours = profil.enCours;

  return (
    <div className="page">
      <div className="entete">
        <div>
          <h1>Bonjour {profil.prenom} 👋</h1>
          <p className="muted" style={{ textTransform: 'capitalize' }}>{jour}</p>
        </div>
        <Link to={`/s/${id}/historique`} className="btn secondaire">Mes heures</Link>
      </div>

      {enAttente > 0 && (
        <div className="bandeau attente">
          {enAttente} pointage{enAttente > 1 ? 's' : ''} en attente de synchronisation — il sera envoyé dès le retour du réseau.
        </div>
      )}

      {enCours ? (
        <div className="carte accent-ambre">
          <span className="badge ambre">En mission</span>
          <h2 style={{ margin: '8px 0 2px' }}>{enCours.libelle}</h2>
          <p className="muted">Arrivée pointée à {new Date(enCours.arrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ) : (
        <div className="carte accent-vert">
          <span className="badge vert">Disponible</span>
          <p className="muted" style={{ marginTop: 6 }}>Aucune mission en cours. Scannez le QR code de l'hôtel en arrivant.</p>
        </div>
      )}

      <button
        className={`poincon ${enCours ? 'depart' : 'arrivee'}`}
        onClick={() => navigate(`/s/${id}/scan`)}
        aria-label={enCours ? 'Pointer mon départ' : 'Pointer mon arrivée'}
      >
        {enCours ? <Chrono depuis={enCours.arrivee} /> : <span style={{ fontSize: '2rem' }}>⏱</span>}
        <span>{enCours ? 'POINTER MON DÉPART' : 'POINTER MON ARRIVÉE'}</span>
      </button>

      <h3 style={{ margin: '8px 0 10px' }}>Mes missions</h3>
      {missions.length === 0 && <p className="muted">Aucune affectation active.</p>}
      {missions.map((m) => (
        <div key={m.id} className="carte">
          <strong>{m.hotel}</strong> — {m.prestation}
          <p className="muted petit">{m.adresse}</p>
          {m.jours.length > 0 && <p className="petit" style={{ marginTop: 4 }}>{m.jours.join(' · ')}</p>}
        </div>
      ))}
    </div>
  );
}
