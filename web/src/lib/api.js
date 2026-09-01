// Same-origin backend calls. FastAPI serves the built app, so relative paths
// resolve correctly whether in dev (proxy-less) or prod.

export async function getState() {
  const r = await fetch('/api/state');
  if (!r.ok) throw new Error('state http ' + r.status);
  return r.json();
}

export async function getProducts() {
  const r = await fetch('/api/products');
  if (!r.ok) throw new Error('products http ' + r.status);
  return r.json();
}

// POST a control endpoint; returns parsed JSON or null.
export async function post(path, body) {
  try {
    const resp = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    return ct.includes('application/json') ? await resp.json() : null;
  } catch {
    return null;
  }
}
