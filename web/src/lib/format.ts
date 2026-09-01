import type { StockTag } from '../types';

const nairaFmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export function naira(v: number | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '₦—';
  return '₦' + nairaFmt.format(Math.round(n));
}

// Collapse a possibly multi-line / URL-laden error into one tidy line.
export function firstLine(msg: unknown): string {
  let s = String(msg == null ? 'error' : msg).split(/\r?\n/)[0].trim();
  if (!s) s = 'error';
  if (s.length > 140) s = s.slice(0, 137) + '…';
  return s;
}

// A tiny USD cost, made friendly for beginners. Sub-cent shows in cents.
export function formatCost(usd: number | null | undefined): string {
  const n = Number(usd);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 0.01) {
    const cents = n * 100;
    return (cents < 0.1 ? cents.toFixed(3) : cents.toFixed(2)) + '¢';
  }
  return '$' + n.toFixed(3);
}

// Milliseconds → human ("640 ms" / "1.8 s").
export function formatMs(ms: number | null | undefined): string {
  const n = Number(ms);
  if (!Number.isFinite(n)) return '—';
  return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(1) + ' s';
}

// Temperature → a plain-language mood label.
export function tempLabel(t: number): string {
  const n = Number(t);
  if (n <= 0.2) return 'Focused';
  if (n <= 0.5) return 'Balanced';
  if (n <= 0.9) return 'Creative';
  return 'Wild';
}

// Stock tag derivation from `available`.
export function stockTag(available: number): StockTag {
  const a = Number(available);
  if (a <= 0) return { label: 'Sold out', tone: 'stone', soldOut: true };
  if (a === 1) return { label: 'Only 1 left', tone: 'amber', soldOut: false };
  if (a <= 3) return { label: 'Low stock', tone: 'amber', soldOut: false };
  return { label: 'In stock', tone: 'green', soldOut: false };
}
