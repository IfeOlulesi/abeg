import { useState } from 'react';
import { KeyIcon } from './Icons';

const STORAGE_KEY = 'openrouter_key';

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

// Bring-your-own-key: paste an OpenRouter key so YOUR calls are billed to you
// and skip the demo's rate limit. Stored only in this browser, sent per-request,
// never persisted on the server.
export default function ByokCard() {
  const [saved, setSaved] = useState<boolean>(() => !!read());
  const [draft, setDraft] = useState('');

  const valid = draft.trim().startsWith('sk-or-');

  const save = () => {
    if (!valid) return;
    try {
      localStorage.setItem(STORAGE_KEY, draft.trim());
    } catch {
      /* noop */
    }
    setDraft('');
    setSaved(true);
  };
  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    setSaved(false);
  };

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${
            saved
              ? 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400'
              : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          <KeyIcon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-stone-900 dark:text-stone-100">
            Use your own AI key
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-stone-500 dark:text-stone-400">
            Bring an OpenRouter key and your chats run on your account — no shared limit. Stored only
            in your browser, never on our server.
          </p>
        </div>
      </div>

      {saved ? (
        <div className="mt-3.5 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5 dark:bg-green-500/15">
          <span className="text-[13px] font-bold text-green-700 dark:text-green-400">
            ✓ Using your key — no demo limit
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-stone-500 transition hover:bg-white hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-3.5">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-or-v1-…"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-[13px] text-stone-700 outline-none focus:border-[#F0532B] focus:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:focus:bg-stone-800"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={!valid}
              onClick={save}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${
                valid
                  ? 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white'
                  : 'cursor-not-allowed bg-stone-100 text-stone-300 dark:bg-stone-800 dark:text-stone-600'
              }`}
            >
              Save key
            </button>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold text-[#F0532B] hover:underline"
            >
              Get a free key ↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
