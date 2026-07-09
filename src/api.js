// Client API minimal avec gestion d'erreurs uniformisée
export async function api(chemin, options = {}) {
  const res = await fetch(chemin, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && chemin.startsWith('/api/admin') && !chemin.includes('login')) {
    window.location.href = '/admin/login';
    throw new Error('Session expirée');
  }
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.blob();
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}
