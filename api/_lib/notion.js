// ── Couche d'accès Notion ──────────────────────────────────────────────
// API version 2025-09-03 : les requêtes ciblent les DATA SOURCES
// (et non les databases). IDs figés de l'espace
// « Pointage Hôtels — Société de ménage ».

export const DS = {
  EMPLOYES:     'dc9207f2-8058-8331-ae40-071671fc12f8',
  HOTELS:       '1b2207f2-8058-8236-ae8c-87a8a858850e',
  PRESTATIONS:  '7d2207f2-8058-82ca-baf5-07f51e7d18e8',
  QR_CODES:     'c03207f2-8058-83fa-b19a-074a9b0d7c89',
  AFFECTATIONS: 'b86207f2-8058-82ac-bc4a-079b5239e722',
  POINTAGES:    '81e207f2-8058-83b4-84af-07696e984603',
  TARIFS:       'fe1207f2-8058-820e-994c-07073fb558d7',
  FACTURES:     '0fa207f2-8058-829d-a050-072ce4ff1f19',
};

const BASE = 'https://api.notion.com/v1';
const HEADERS = () => ({
  'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': '2025-09-03',
  'Content-Type': 'application/json',
});

async function notionFetch(path, options = {}, attempt = 0) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: HEADERS() });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    return notionFetch(path, options, attempt + 1);
  }
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `Notion ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Requête un data source avec pagination automatique. */
export async function query(dataSourceId, body = {}) {
  let results = [];
  let cursor;
  do {
    const data = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ ...body, start_cursor: cursor, page_size: 100 }),
    });
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

export const getPage = (pageId) => notionFetch(`/pages/${pageId}`);

export const createPage = (dataSourceId, properties) =>
  notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: dataSourceId },
      properties,
    }),
  });

export const updatePage = (pageId, properties) =>
  notionFetch(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });

// ── Lecture de propriétés (tolérante aux vides) ───────────────────────
export const P = {
  title: (page, name) => page.properties[name]?.title?.map((t) => t.plain_text).join('') || '',
  text:  (page, name) => page.properties[name]?.rich_text?.map((t) => t.plain_text).join('') || '',
  select:(page, name) => page.properties[name]?.select?.name || null,
  number:(page, name) => page.properties[name]?.number ?? null,
  check: (page, name) => page.properties[name]?.checkbox === true,
  date:  (page, name) => page.properties[name]?.date?.start || null,
  dateEnd:(page, name) => page.properties[name]?.date?.end || null,
  relation:(page, name) => (page.properties[name]?.relation || []).map((r) => r.id),
  formula:(page, name) => {
    const f = page.properties[name]?.formula;
    if (!f) return null;
    return f.type === 'number' ? f.number : f.type === 'string' ? f.string : null;
  },
  multi: (page, name) => (page.properties[name]?.multi_select || []).map((o) => o.name),
  phone: (page, name) => page.properties[name]?.phone_number || null,
  uid:   (page, name) => {
    const u = page.properties[name]?.unique_id;
    return u ? `${u.prefix ? u.prefix + '-' : ''}${u.number}` : null;
  },
};

// ── Écriture de propriétés ─────────────────────────────────────────────
export const W = {
  title: (v) => ({ title: [{ text: { content: v } }] }),
  text:  (v) => ({ rich_text: [{ text: { content: v } }] }),
  select:(v) => ({ select: { name: v } }),
  number:(v) => ({ number: v }),
  date:  (start, end = null) => ({ date: { start, ...(end ? { end } : {}) } }),
  relation:(ids) => ({ relation: (Array.isArray(ids) ? ids : [ids]).map((id) => ({ id })) }),
  check: (v) => ({ checkbox: v }),
};

export function sendError(res, err) {
  console.error(err);
  res.status(err.status === 404 ? 404 : 500).json({ error: err.message || 'Erreur serveur' });
}
