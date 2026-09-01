import ProductCard from './ProductCard';
import type { Product } from '../types';

interface StorefrontProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

export default function Storefront({ products, onAdd }: StorefrontProps) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            What are you craving? 👋
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Fresh from the kitchen — order by tapping Add, or just ask the assistant.
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-stone-500 ring-1 ring-stone-100 sm:flex">
          <span className="tnum">{products.length} items</span>
        </div>
      </div>

      {/* Scroll container is separate from the grid so rows size to card
          content (an aspect-ratio tile inside a definite-height grid would
          otherwise stretch rows equally and clip the card footer). */}
      <div className="min-h-0 grow overflow-y-auto pr-1">
        <div className="grid content-start gap-5 pb-2 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
          {products.map((p) => (
            <ProductCard key={p.sku} product={p} onAdd={onAdd} />
          ))}
        </div>
      </div>
    </section>
  );
}
