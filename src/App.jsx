import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Accueil from './salarie/Accueil.jsx';
import Scan from './salarie/Scan.jsx';
import Historique from './salarie/Historique.jsx';
import AdminLayout from './admin/Layout.jsx';
import Login from './admin/Login.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Pointages from './admin/Pointages.jsx';
import Affectations from './admin/Affectations.jsx';
import QRCodes from './admin/QRCodes.jsx';
import Equipe from './admin/Equipe.jsx';
import Facturation from './admin/Facturation.jsx';

function Portail() {
  const dernierLien = localStorage.getItem('ptg_employe_id');
  if (dernierLien) return <Navigate to={`/s/${dernierLien}`} replace />;
  return (
    <div className="page centre">
      <img src="/icon-192.png" alt="" width="72" style={{ borderRadius: 18 }} />
      <h1>Pointage Hôtels</h1>
      <p className="muted">
        Ouvrez le lien personnel qui vous a été envoyé par votre responsable pour accéder à votre espace de pointage.
      </p>
      <a className="btn secondaire" href="/admin">Accès administrateur</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portail />} />
        <Route path="/s/:id" element={<Accueil />} />
        <Route path="/s/:id/scan" element={<Scan />} />
        <Route path="/s/:id/historique" element={<Historique />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pointages" element={<Pointages />} />
          <Route path="calendrier" element={<Affectations />} />
          <Route path="qrcodes" element={<QRCodes />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="facturation" element={<Facturation />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
