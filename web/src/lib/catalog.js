// SKU → presentation metadata. The backend has no images, so emoji + gradient
// + blurb are hardcoded here and merged with the live product data by SKU.
export const CATALOG = {
  JOLLOF: { emoji: '🍚', gradient: 'from-amber-100 to-orange-200', blurb: 'Smoky, party-style' },
  SUYA: { emoji: '🍢', gradient: 'from-rose-100 to-red-200', blurb: 'Spicy grilled skewers' },
  PUFFPUFF: { emoji: '🍩', gradient: 'from-yellow-100 to-amber-200', blurb: '6 golden pieces' },
  CHINCHIN: { emoji: '🍪', gradient: 'from-orange-100 to-amber-100', blurb: 'Crunchy sweet bites' },
  ZOBO: { emoji: '🧃', gradient: 'from-pink-100 to-rose-200', blurb: 'Chilled hibiscus cooler' },
  MEATPIE: { emoji: '🥟', gradient: 'from-amber-100 to-yellow-200', blurb: 'Flaky, savoury' },
  PLANTAIN: { emoji: '🍌', gradient: 'from-yellow-100 to-lime-100', blurb: 'Sweet fried dodo' },
  MOIMOI: { emoji: '🫘', gradient: 'from-orange-100 to-red-100', blurb: 'Steamed bean pudding' },
  EGUSI: { emoji: '🥣', gradient: 'from-lime-100 to-green-200', blurb: 'Rich melon-seed stew' },
  PEPPERSOUP: { emoji: '🍲', gradient: 'from-red-100 to-rose-200', blurb: 'Catfish, peppery broth' },
};

const FALLBACK = { emoji: '🍽️', gradient: 'from-stone-100 to-stone-200', blurb: '' };

export function catalogFor(sku) {
  return CATALOG[sku] || FALLBACK;
}
