import { useEffect, useState } from 'react';
import { api } from '../api.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const vide = { employeId: '', hotelId: '', prestationId: '', debut: new Date().toISOString().slice(0, 10), fin: '', jours: [] };

export default function Affectations() {
  const [refs, setRefs] = useState(null);
  const [affectations, setAffectations] = useState(null);
  const [form, setForm] = useState(null);
  const [info, setInfo] = useState('');

  const charger = () => api('/api/admin/affectations').then((d) => setAffectations(d.affectations));
  useEffect(() => { api('/api/admin/referentiels').then(setRefs); charger(); }, []);

  async function enregistrer() {
    // Détection de conflit simple : même employée, périodes qui se chevauchent, jours communs
    const conflit = affectations.some((a) =>
      a.id !== form.id && a.employeId === form.employeId &&
      (!form.fin || !a.debut || a.debut <= form.fin) && (!a.fin || a.fin >= form.debut) &&
      a.jours.some((j) => form.jours.includes(j))
    );
    if (conflit && !confirm('⚠️ Cette employée a déjà une affectation qui se chevauche sur ces jours. Créer quand même ?')) return;

    await api('/api/admin/affectations', {
      method: form.id ? 'PATCH' : 'POST',
      body: { ...form, fin: form.fin || undefined },
    });
    setForm(null); setInfo('Planning mis à jour.'); charger();
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette affectation ?')) return;
    await api('/api/admin/affectations', { method: 'DELETE', body: { id } });
    charger();
  }

  if (!refs || !affectations) return <p className="muted">Chargement…</p>;
  const actifs = refs.employes.filter((e) => e.statut === 'Actif');

  return (
    <>
      <div className="entete"><h1>Planning des missions</h1>
        <button className="btn vert" onClick={() => setForm({ ...vide })}>+ Nouvelle affectation</button>
      </div>
      {info && <div className="bandeau ok">{info}</div>}

      {form && (
        <div className="carte accent-vert">
          <h3>{form.id ? 'Modifier' : 'Nouvelle'} affectation</h3>
          <div className="grille-form">
            <div><label>Employée</label>
              <select value={form.employeId} onChange={(e) => setForm({ ...form, employeId: e.target.value })}>
                <option value="">—</option>{actifs.map((e) => <option key={e.id} value={e.id}>{e.nomComplet}</option>)}
              </select></div>
            <div><label>Hôtel</label>
              <select value={form.hotelId} onChange={(e) => setForm({ ...form, hotelId: e.target.value })}>
                <option value="">—</option>{refs.hotels.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
              </select></div>
            <div><label>Prestation</label>
              <select value={form.prestationId} onChange={(e) => setForm({ ...form, prestationId: e.target.value })}>
                <option value="">—</option>{refs.prestations.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
              </select></div>
            <div><label>Début</label><input type="date" value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} /></div>
            <div><label>Fin (optionnel)</label><input type="date" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></div>
          </div>
          <label>Jours de la semaine</label>
          <div className="ligne-boutons">
            {JOURS.map((j) => (
              <button key={j} className={`btn ${form.jours.includes(j) ? 'vert' : 'secondaire'}`}
                onClick={() => setForm({ ...form, jours: form.jours.includes(j) ? form.jours.filter((x) => x !== j) : [...form.jours, j] })}>
                {j.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="ligne-boutons">
            <button className="btn vert" onClick={enregistrer} disabled={!form.employeId || !form.hotelId || !form.prestationId || !form.debut}>Enregistrer</button>
            <button className="btn secondaire" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="carte" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Employée</th><th>Hôtel</th><th>Prestation</th><th>Période</th><th>Jours</th><th></th></tr></thead>
          <tbody>
            {affectations.map((a) => (
              <tr key={a.id}>
                <td>{a.employe}</td><td>{a.hotel}</td><td>{a.prestation}</td>
                <td className="petit">{a.debut || '…'} → {a.fin || '∞'}</td>
                <td className="petit">{a.jours.map((j) => j.slice(0, 3)).join(' ')}</td>
                <td className="ligne-boutons" style={{ marginTop: 0 }}>
                  <button className="btn secondaire" onClick={() => setForm({ id: a.id, employeId: a.employeId, hotelId: a.hotelId, prestationId: a.prestationId, debut: a.debut || '', fin: a.fin || '', jours: a.jours })}>Modifier</button>
                  <button className="btn danger" onClick={() => supprimer(a.id)}>Suppr.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {affectations.length === 0 && <p className="muted" style={{ padding: 12 }}>Aucune affectation planifiée.</p>}
      </div>
    </>
  );
}
