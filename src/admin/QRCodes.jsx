import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function QRCodes() {
  const [qrcodes, setQrcodes] = useState(null);
  const [refs, setRefs] = useState(null);
  const [form, setForm] = useState(null);
  const [aImprimer, setAImprimer] = useState(null);

  const charger = () => api('/api/admin/qrcodes').then((d) => setQrcodes(d.qrcodes));
  useEffect(() => { charger(); api('/api/admin/referentiels').then(setRefs); }, []);

  async function creer() {
    await api('/api/admin/qrcodes', { method: 'POST', body: form });
    setForm(null); charger();
  }
  async function basculer(qr) {
    await api('/api/admin/qrcodes', { method: 'PATCH', body: { id: qr.id, actif: !qr.actif } });
    charger();
  }

  useEffect(() => {
    if (aImprimer) { setTimeout(() => { window.print(); setAImprimer(null); }, 150); }
  }, [aImprimer]);

  if (!qrcodes) return <p className="muted">Chargement…</p>;

  const parHotel = qrcodes.reduce((acc, q) => {
    (acc[q.hotel] = acc[q.hotel] || []).push(q);
    return acc;
  }, {});

  return (
    <>
      <div className="entete"><h1>QR codes de pointage</h1>
        <button className="btn vert" onClick={() => setForm({ hotelId: '', prestationId: '' })}>+ Générer un QR</button>
      </div>

      {form && refs && (
        <div className="carte accent-vert">
          <div className="grille-form">
            <div><label>Hôtel</label>
              <select value={form.hotelId} onChange={(e) => setForm({ ...form, hotelId: e.target.value })}>
                <option value="">—</option>{refs.hotels.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
              </select></div>
            <div><label>Prestation</label>
              <select value={form.prestationId} onChange={(e) => setForm({ ...form, prestationId: e.target.value })}>
                <option value="">—</option>{refs.prestations.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
              </select></div>
          </div>
          <div className="ligne-boutons">
            <button className="btn vert" onClick={creer} disabled={!form.hotelId || !form.prestationId}>Créer le QR code</button>
            <button className="btn secondaire" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      )}

      {Object.entries(parHotel).map(([hotel, qrs]) => (
        <div key={hotel}>
          <h2 style={{ margin: '14px 0 8px' }}>🏨 {hotel}</h2>
          <div className="stats">
            {qrs.map((q) => (
              <div key={q.id} className={`carte ${q.actif ? '' : 'accent-rouge'}`} style={{ textAlign: 'center' }}>
                <img src={q.image} alt={`QR ${q.code}`} style={{ width: '100%', maxWidth: 180, opacity: q.actif ? 1 : 0.3 }} />
                <p className="petit" style={{ fontWeight: 700 }}>{q.prestation}</p>
                <p className="muted petit">{q.code}</p>
                <div className="ligne-boutons" style={{ justifyContent: 'center' }}>
                  <button className="btn secondaire" onClick={() => setAImprimer(q)} disabled={!q.actif}>Imprimer</button>
                  <button className={`btn ${q.actif ? 'danger' : 'vert'}`} onClick={() => basculer(q)}>
                    {q.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {aImprimer && (
        <div className="planche-print" style={{ background: '#fff', padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem' }}>{aImprimer.hotel}</h1>
          <h2 style={{ color: '#0E8A5F', margin: '8px 0 24px' }}>{aImprimer.prestation}</h2>
          <img src={aImprimer.image} alt="" style={{ width: 340 }} />
          <p style={{ marginTop: 24, fontSize: '1.1rem', fontWeight: 700 }}>Pointage des équipes de ménage</p>
          <p style={{ maxWidth: 420, margin: '10px auto', color: '#555' }}>
            Scannez ce QR code avec l'application Pointage à votre arrivée, puis à nouveau à votre départ.
          </p>
          <p style={{ marginTop: 16, fontSize: '0.75rem', color: '#999' }}>{aImprimer.code}</p>
        </div>
      )}
    </>
  );
}
