import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { api } from '../api.js';
import { enfiler } from '../offline.js';

export default function Scan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [etat, setEtat] = useState('camera'); // camera | envoi | ok | horsligne | erreur
  const [resultat, setResultat] = useState(null);
  const [message, setMessage] = useState('');
  const [cameraKo, setCameraKo] = useState(false);
  const stopRef = useRef(false);

  async function envoyer(qrCode) {
    if (stopRef.current) return;
    stopRef.current = true;
    if (navigator.vibrate) navigator.vibrate(80);
    setEtat('envoi');

    const pointage = { employeId: id, qrCode, timestamp: new Date().toISOString() };
    // Géolocalisation en meilleur effort (2 s max, jamais bloquante)
    try {
      const pos = await new Promise((ok, ko) =>
        navigator.geolocation
          ? navigator.geolocation.getCurrentPosition(ok, ko, { timeout: 2000, maximumAge: 60000 })
          : ko()
      );
      pointage.geoloc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* pas de GPS : on pointe quand même */ }

    try {
      const r = await api('/api/pointer', { method: 'POST', body: pointage });
      setResultat(r);
      setEtat('ok');
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        enfiler(pointage);
        setEtat('horsligne');
      } else {
        setMessage(err.message);
        setEtat('erreur');
      }
    }
  }

  // ── Scan caméra en continu ──
  useEffect(() => {
    if (etat !== 'camera') return;
    stopRef.current = false;
    let flux;
    let rafId;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const boucle = () => {
      const v = videoRef.current;
      if (v && v.readyState === v.HAVE_ENOUGH_DATA && !stopRef.current) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) { envoyer(code.data); return; }
      }
      rafId = requestAnimationFrame(boucle);
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        flux = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();
        rafId = requestAnimationFrame(boucle);
      })
      .catch(() => setCameraKo(true));

    return () => {
      cancelAnimationFrame(rafId);
      flux?.getTracks().forEach((t) => t.stop());
    };
  }, [etat]);

  // ── Décodage d'un fichier image (secours) ──
  function decoderFichier(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(data.data, data.width, data.height);
      if (code?.data) envoyer(code.data);
      else { setMessage('Aucun QR code lisible sur cette image. Réessayez avec une photo plus nette.'); setEtat('erreur'); }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(fichier);
  }

  const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (etat === 'ok') return (
    <div className="page centre">
      <div style={{ fontSize: '4rem' }}>{resultat.type === 'arrivee' ? '✅' : '🏁'}</div>
      <h1>{resultat.type === 'arrivee' ? 'Arrivée enregistrée' : 'Départ enregistré'}</h1>
      <div className="carte" style={{ width: '100%', textAlign: 'left' }}>
        <strong>{resultat.hotel}</strong>
        <p className="muted">{resultat.prestation}</p>
        <p style={{ marginTop: 8 }}>Heure : <strong>{heure(resultat.heure)}</strong></p>
        {resultat.dureeHeures != null && <p>Durée de la mission : <strong>{resultat.dureeHeures} h</strong></p>}
      </div>
      <button className="btn vert pleine" onClick={() => navigate(`/s/${id}`)}>Retour à l'accueil</button>
    </div>
  );

  if (etat === 'horsligne') return (
    <div className="page centre">
      <div style={{ fontSize: '4rem' }}>📶</div>
      <h1>Pointage enregistré hors-ligne</h1>
      <p className="muted">Pas de réseau ici. Votre pointage est mémorisé avec l'heure exacte du scan et sera envoyé automatiquement dès que le réseau revient.</p>
      <button className="btn pleine" onClick={() => navigate(`/s/${id}`)}>Retour à l'accueil</button>
    </div>
  );

  if (etat === 'erreur') return (
    <div className="page centre">
      <div style={{ fontSize: '4rem' }}>⚠️</div>
      <h1>Pointage impossible</h1>
      <div className="bandeau erreur" style={{ width: '100%' }}>{message}</div>
      <button className="btn pleine" onClick={() => { setEtat('camera'); setMessage(''); }}>Réessayer</button>
      <button className="btn secondaire pleine" onClick={() => navigate(`/s/${id}`)}>Annuler</button>
    </div>
  );

  return (
    <div className="page">
      <div className="entete">
        <h1>Scanner le QR code</h1>
        <button className="btn secondaire" onClick={() => navigate(`/s/${id}`)}>Annuler</button>
      </div>
      {etat === 'envoi' && <div className="bandeau ok">QR détecté — enregistrement…</div>}
      {!cameraKo ? (
        <div className="viseur">
          <video ref={videoRef} muted playsInline />
          <div className="cadre" aria-hidden="true" />
        </div>
      ) : (
        <div className="bandeau erreur">
          Caméra indisponible (permission refusée ?). Utilisez l'option photo ci-dessous.
        </div>
      )}
      <p className="muted" style={{ margin: '14px 0 8px', textAlign: 'center' }}>
        Visez le QR code affiché à l'accueil de l'hôtel
      </p>
      <label className="btn secondaire pleine" style={{ cursor: 'pointer' }}>
        📷 Ou choisir une photo du QR code
        <input type="file" accept="image/*" capture="environment" onChange={decoderFichier} style={{ display: 'none' }} />
      </label>
    </div>
  );
}
