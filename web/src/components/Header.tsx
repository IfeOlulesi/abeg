import { BagIcon, LayersIcon, SparkIcon, GitHubIcon, BackstageIcon } from './Icons';
import ThemeToggle from './ThemeToggle';

type View = 'home' | 'how' | 'system';

interface HeaderProps {
  activeView: View;
  connected: boolean;
  onHome: () => void;
  onShowDiagram: (kind: 'how' | 'system') => void;
  onOpenWorkshop: () => void;
}

const base =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition';
const idle =
  'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100';
const active = 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100';

export default function Header({
  activeView,
  connected,
  onHome,
  onShowDiagram,
  onOpenWorkshop,
}: HeaderProps) {
  return (
    <header className="border-b border-stone-100 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-8">
        <button type="button" onClick={onHome} className="flex items-center gap-2.5" title="Home">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
            <BagIcon className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Abeg
          </span>
        </button>

        <nav className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShowDiagram('how')}
            className={`hidden sm:inline-flex ${base} ${activeView === 'how' ? active : idle}`}
          >
            <SparkIcon className="h-4 w-4" />
            How it works
          </button>
          <button
            type="button"
            onClick={() => onShowDiagram('system')}
            className={`hidden sm:inline-flex ${base} ${activeView === 'system' ? active : idle}`}
          >
            <LayersIcon className="h-4 w-4" />
            System architecture
          </button>
          <a
            href="https://selar.com/38531854y1"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex ${base} ${idle}`}
            title="Get the full Break Into AI Engineering masterclass recording"
          >
            <span className="text-[13px] leading-none">🎓</span>
            Masterclass
          </a>
          <a
            href="https://github.com/IfeOlulesi/abeg-app"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex ${base} ${idle}`}
          >
            <GitHubIcon className="h-4 w-4" />
            View source
          </a>

          <span className="mx-1 hidden h-5 w-px bg-stone-200 dark:bg-stone-700 sm:block" />
          <ThemeToggle />

          <button
            type="button"
            onClick={onOpenWorkshop}
            title="Open the Workshop (B)"
            className="ml-1 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            <BackstageIcon className="h-4 w-4" />
            Workshop
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-stone-400'}`}
              title={connected ? 'Live' : 'Reconnecting…'}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}
