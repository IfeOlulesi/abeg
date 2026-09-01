import { BackstageIcon, CloseIcon, TrophyIcon, ResetIcon, DotIcon, SearchIcon } from './Icons.jsx';

function Toggle({ label, on, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between px-4 py-3.5">
      <span className="text-[15px] font-semibold text-stone-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          on ? 'bg-green-500' : 'bg-stone-200'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'ml-5' : 'ml-0.5'}`}
        />
      </button>
    </label>
  );
}

const DOT_TONE = {
  order: { ring: 'bg-green-100', dot: 'bg-green-500' },
  refused: { ring: 'bg-rose-100', dot: 'bg-rose-500' },
  default: { ring: 'bg-stone-100', dot: 'bg-stone-400' },
};

export default function Backstage({
  open,
  onClose,
  guardrails,
  cached,
  onToggleGuardrails,
  onToggleCached,
  onRace,
  onReset,
  onScript,
  scripts,
  products,
  timeline,
}) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 flex w-[440px] flex-col border-l border-stone-200 bg-white shadow-xl transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-stone-900 text-white">
          <BackstageIcon className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-stone-900">Backstage</div>
          <div className="text-xs text-stone-400">Behind the scenes</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grow space-y-8 overflow-y-auto p-6">
        {/* controls */}
        <section>
          <div className="rounded-2xl ring-1 ring-stone-100">
            <Toggle label="Guardrails" on={guardrails} onChange={onToggleGuardrails} />
            <div className="mx-4 border-t border-stone-100" />
            <Toggle label="Cached mode" on={cached} onChange={onToggleCached} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onRace}
              className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-stone-800"
            >
              <TrophyIcon className="h-4 w-4" />
              Run the race
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-200"
            >
              <ResetIcon className="h-4 w-4" />
              Reset
            </button>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Scripted messages
            </div>
            <div className="space-y-1.5">
              {(scripts && scripts.length
                ? scripts
                : [1, 2, 3, 4].map((n) => ({ n, message: `Script ${n}` }))
              ).map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => onScript(s.n)}
                  title={s.message}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2.5 text-left transition hover:bg-stone-100"
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-white text-xs font-bold text-stone-500 ring-1 ring-stone-200">
                    {s.n}
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-snug text-stone-600">
                    {s.message}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* inventory */}
        <section>
          <div className="mb-3 text-sm font-bold text-stone-800">Live inventory</div>
          <div className="space-y-1">
            {products.map((p) => {
              const avail = Number(p.available);
              const oversold = avail < 0;
              if (oversold) {
                return (
                  <div
                    key={p.sku}
                    className="flex items-center rounded-xl bg-rose-50 px-3 py-2 text-[14px] ring-1 ring-rose-100"
                  >
                    <span className="w-8 text-rose-400">
                      <SearchIcon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-semibold text-stone-800">{p.name}</span>
                    <span className="tnum font-bold text-rose-500">{avail} · oversold</span>
                  </div>
                );
              }
              return (
                <div key={p.sku} className="flex items-center py-1.5 text-[14px]">
                  <span className="w-8 text-stone-400">
                    <DotIcon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-stone-700">{p.name}</span>
                  <span className="tnum text-stone-500">{avail} left</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* activity */}
        <section>
          <div className="mb-3 text-sm font-bold text-stone-800">Activity</div>
          {timeline.length === 0 ? (
            <p className="text-[13px] text-stone-400">Nothing yet — run a script or the race.</p>
          ) : (
            <ol className="relative ml-1.5 space-y-5 border-l border-stone-200 pl-6">
              {timeline.map((item) => {
                const tone = DOT_TONE[item.tone] || DOT_TONE.default;
                return (
                  <li key={item.id} className="relative">
                    <span
                      className={`absolute -left-[31px] top-0.5 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${tone.ring}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                    </span>
                    <div className="text-[14px] font-semibold text-stone-800">{item.title}</div>
                    {item.meta && <div className="text-[13px] text-stone-400">{item.meta}</div>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}
