// File d'attente hors-ligne : les pointages échoués sont stockés
// localement avec leur horodatage RÉEL et rejoués dès le retour du réseau.
import { api } from './api.js';

const CLE = 'ptg_queue';

export const fileAttente = () => JSON.parse(localStorage.getItem(CLE) || '[]');

export function enfiler(pointage) {
  const file = fileAttente();
  file.push(pointage);
  localStorage.setItem(CLE, JSON.stringify(file));
}

export async function synchroniser() {
  const file = fileAttente();
  if (!file.length) return { restants: 0 };
  const restants = [];
  for (const p of file) {
    try {
      await api('/api/pointer', { method: 'POST', body: p });
    } catch (err) {
      // Erreur métier (QR désactivé...) : on abandonne l'entrée pour ne pas bloquer la file.
      // Erreur réseau : on la conserve.
      if (err.message === 'Failed to fetch' || err.message === 'Erreur réseau') restants.push(p);
    }
  }
  localStorage.setItem(CLE, JSON.stringify(restants));
  return { restants: restants.length };
}

// Rejeu automatique au retour du réseau
window.addEventListener('online', () => { synchroniser(); });
