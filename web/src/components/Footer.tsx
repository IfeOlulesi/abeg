import { LayersIcon, SparkIcon } from './Icons';

// Slim footer with links out to the (non-SPA) explainer pages. Opens in a new
// tab so the live demo/session isn't lost.
export default function Footer() {
  return (
    <footer className="border-t border-stone-100 bg-white">
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-4 px-8 text-[13px]">
        <span className="hidden font-semibold text-stone-400 sm:inline">Learn how it works</span>
        <a
          href="/static/architecture.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-stone-500 transition hover:text-brand"
        >
          <SparkIcon className="h-3.5 w-3.5" />
          How Abeg works
        </a>
        <a
          href="/static/system.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-stone-500 transition hover:text-brand"
        >
          <LayersIcon className="h-3.5 w-3.5" />
          System architecture
        </a>
        <a
          href="https://github.com/IfeOlulesi/abeg"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto font-medium text-stone-400 transition hover:text-stone-700"
        >
          View source ↗
        </a>
      </div>
    </footer>
  );
}
