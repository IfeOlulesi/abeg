import { useState } from 'react';
import { LayersIcon, SparkIcon, SunIcon, MoonIcon } from './Icons';

// Self-contained dark-mode toggle. Reads the initial state from the <html>
// class (set by the FOUC-prevention script in index.html), then flips the
// class + persists the choice on click.
function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch (e) {
      /* noop */
    }
    setDark(next);
  };
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full text-stone-400 transition hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200"
    >
      {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}

// Slim footer with links out to the (non-SPA) explainer pages. Opens in a new
// tab so the live demo/session isn't lost.
export default function Footer() {
  return (
    <footer className="border-t border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-4 px-8 text-[13px]">
        <span className="hidden font-semibold text-stone-400 sm:inline dark:text-stone-500">Learn how it works</span>
        <a
          href="/static/architecture.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-stone-500 transition hover:text-brand dark:text-stone-400"
        >
          <SparkIcon className="h-3.5 w-3.5" />
          How Abeg works
        </a>
        <a
          href="/static/system.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-stone-500 transition hover:text-brand dark:text-stone-400"
        >
          <LayersIcon className="h-3.5 w-3.5" />
          System architecture
        </a>
        <a
          href="https://github.com/IfeOlulesi/abeg"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-medium text-stone-400 transition hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200"
        >
          View source ↗
        </a>
        <ThemeToggle />
      </div>
    </footer>
  );
}
