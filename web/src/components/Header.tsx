import { BagIcon, LayersIcon, SparkIcon } from './Icons';
import ThemeToggle from './ThemeToggle';

const linkClass =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100';

export default function Header() {
  return (
    <header className="border-b border-stone-100 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-8">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
            <BagIcon className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Abeg
          </span>
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <a
            href="/static/architecture.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex ${linkClass}`}
          >
            <SparkIcon className="h-4 w-4" />
            How it works
          </a>
          <a
            href="/static/system.html"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex ${linkClass}`}
          >
            <LayersIcon className="h-4 w-4" />
            System architecture
          </a>
          <a
            href="https://github.com/IfeOlulesi/abeg"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex ${linkClass}`}
          >
            View source ↗
          </a>
          <span className="mx-1 hidden h-5 w-px bg-stone-200 dark:bg-stone-700 sm:block" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
