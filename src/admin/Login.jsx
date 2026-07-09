import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function connecter() {
    setEnvoi(true); setErreur('');
    try {
      await api('/api/admin/login', { method: 'POST', body: { motDePasse: mdp } });
      navigate('/admin');
    } catch (e) { setErreur(e.message); }
    setEnvoi(false);
  }

  return (
    <div className="page centre">
      <img src="/icon-192.png" alt="" width="64" style={{ borderRadius: 16 }} />
      <h1>Espace administrateur</h1>
      <div className="carte" style={{ width: '100%', maxWidth: 360, textAlign: 'left' }}>
        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" value={mdp} onChange={(e) => setMdp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && connecter()} autoFocus />
        {erreur && <div className="bandeau erreur" style={{ marginTop: 10 }}>{erreur}</div>}
        <button className="btn pleine" style={{ marginTop: 14 }} onClick={connecter} disabled={envoi || !mdp}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}
