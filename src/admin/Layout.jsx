import { NavLink, Outlet } from 'react-router-dom';

const liens = [
  ['/admin', 'Tableau de bord', true],
  ['/admin/pointages', 'Pointages'],
  ['/admin/calendrier', 'Planning'],
  ['/admin/facturation', 'Facturation'],
  ['/admin/qrcodes', 'QR codes'],
  ['/admin/equipe', 'Équipe'],
];

export default function Layout() {
  return (
    <>
      <nav className="admin-nav" aria-label="Navigation administrateur">
        {liens.map(([chemin, libelle, fin]) => (
          <NavLink key={chemin} to={chemin} end={fin} className={({ isActive }) => isActive ? 'actif' : ''}>
            {libelle}
          </NavLink>
        ))}
      </nav>
      <div className="page large">
        <Outlet />
      </div>
    </>
  );
}
