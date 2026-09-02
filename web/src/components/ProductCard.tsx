import { catalogFor } from '../lib/catalog';
import { naira, stockTag } from '../lib/format';
import { PlusIcon } from './Icons';
import type { Product } from '../types';

const TAG_TONE: Record<string, string> = {
  amber: 'text-amber-700',
  green: 'text-green-700',
  stone: 'text-stone-500',
};

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const meta = catalogFor(product.sku);
  const tag = stockTag(product.available);

  return (
    <article className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-200/60 dark:bg-stone-900 dark:ring-stone-800">
      <div
        className={`relative grid aspect-[5/4] place-items-center bg-gradient-to-br ${meta.gradient} text-7xl ${
          tag.soldOut ? 'grayscale' : ''
        }`}
      >
        <span aria-hidden="true">{meta.emoji}</span>
        <span
          className={`absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm ${
            TAG_TONE[tag.tone]
          }`}
        >
          {tag.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-stone-900 dark:text-stone-100">{product.name}</h3>
        <p className="text-[13px] text-stone-400 dark:text-stone-500">{meta.blurb}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="tnum text-lg font-extrabold text-stone-900 dark:text-stone-100">{naira(product.price)}</span>
          <button
            type="button"
            disabled={tag.soldOut}
            onClick={() => onAdd(product)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-stone-700 dark:disabled:text-stone-500"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
