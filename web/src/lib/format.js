const nairaFmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export function naira(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₦—';
  return '₦' + nairaFmt.format(Math.round(n));
}

// Collapse a possibly multi-line / URL-laden error into one tidy line.
export function firstLine(msg) {
  let s = String(msg == null ? 'error' : msg).split(/\r?\n/)[0].trim();
  if (!s) s = 'error';
  if (s.length > 140) s = s.slice(0, 137) + '…';
  return s;
}

// Stock tag derivation from `available`.
export function stockTag(available) {
  const a = Number(available);
  if (a <= 0) return { label: 'Sold out', tone: 'stone', soldOut: true };
  if (a === 1) return { label: 'Only 1 left', tone: 'amber', soldOut: false };
  if (a <= 3) return { label: 'Low stock', tone: 'amber', soldOut: false };
  return { label: 'In stock', tone: 'green', soldOut: false };
}
