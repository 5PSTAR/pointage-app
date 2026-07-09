import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Equipe() {
  const [refs, setRefs] = useState(null);
  const [copie, setCopie] = useState('');

  useEffect(() => { api('/api/admin/referentiels').then(setRefs); }, []);
  if (!refs) return <p className="muted">Chargement…</p>;

  const lien = (id) => `${window.location.origin}/s/${id}`;
  async function copier(e) {
    await navigator.clipboard.writeText(lien(e.id));
    setCopie(e.id);
    setTimeout(() => setCopie(''), 1500);
  }

  return (
    <>
      <div className="entete"><h1>Équipe</h1></div>
      <div className="carte accent-vert">
        <p className="petit"><strong>Lien personnel :</strong> c'est l'accès de chaque salariée à son espace de pointage.
        Copiez-le et envoyez-le par SMS ou WhatsApp. La fiche s'administre dans Notion (base 👥 Employés) —
        passer une salariée en « Inactif » coupe son accès instantanément.</p>
      </div>
      <div className="carte" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Salariée</th><th>Matricule</th><th>Téléphone</th><th>Statut</th><th>Lien personnel</th></tr></thead>
          <tbody>
            {refs.employes.map((e) => (
              <tr key={e.id}>
                <td>{e.nomComplet}</td>
                <td>{e.matricule}</td>
                <td>{e.telephone || '—'}</td>
                <td><span className={`badge ${e.statut === 'Actif' ? 'vert' : 'gris'}`}>{e.statut || '—'}</span></td>
                <td>
                  <button className="btn secondaire" onClick={() => copier(e)}>
                    {copie === e.id ? '✓ Copié' : 'Copier le lien'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
