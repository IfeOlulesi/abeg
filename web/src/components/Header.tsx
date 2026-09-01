import { BagIcon } from './Icons';

export default function Header() {
  return (
    <header className="border-b border-stone-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-8">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
            <BagIcon className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-stone-900">Abeg</span>
        </div>
      </div>
    </header>
  );
}
