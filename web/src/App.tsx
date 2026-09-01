import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import Storefront from './components/Storefront';
import Chat from './components/Chat';
import Footer from './components/Footer';
import Backstage from './components/Backstage';
import { BackstageIcon } from './components/Icons';
import { useChat } from './hooks/useChat';
import { useOperatorEvents } from './hooks/useOperatorEvents';
import { getState, getProducts, post } from './lib/api';
import { naira, firstLine } from './lib/format';
import type {
  EventData,
  Model,
  OperatorEvent,
  Product,
  Script,
  SystemPromptBody,
  TimelineItem,
  ToolResult,
  Trace,
} from './types';

const SESSION_ID =
  (crypto.randomUUID && crypto.randomUUID()) ||
  'sess-' + Math.random().toString(36).slice(2) + Date.now();

const MAX_TIMELINE = 40;
let tlSeq = 0;
const tlId = () => `t${Date.now()}_${tlSeq++}`;

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [guardrails, setGuardrails] = useState(true);
  const [cached, setCached] = useState(false);
  const [connected, setConnected] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  // Workshop knobs + the "anatomy of the last answer" trace.
  const [temperature, setTemperature] = useState(0.3);
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [promptCustomized, setPromptCustomized] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);

  // Refs mirror state for use inside event handlers / keyboard without
  // re-subscribing.
  const productsRef = useRef(products);
  productsRef.current = products;
  const guardrailsRef = useRef(guardrails);
  guardrailsRef.current = guardrails;
  const cachedRef = useRef(cached);
  cachedRef.current = cached;

  const nameFor = useCallback((sku: string) => {
    const p = productsRef.current.find((x) => x.sku === sku);
    return p ? p.name : sku;
  }, []);

  const pushTimeline = useCallback((item: Omit<TimelineItem, 'id'>) => {
    setTimeline((prev) => [{ id: tlId(), ...item }, ...prev].slice(0, MAX_TIMELINE));
  }, []);

  const onUserSend = useCallback(() => setShowConfirm(false), []);
  const { messages, sendChat } = useChat(SESSION_ID, onUserSend);
  const sendChatRef = useRef(sendChat);
  sendChatRef.current = sendChat;

  // ---- operator event handling (ports app.js handleEvent, friendlier) ----
  const handleEvent = useCallback(
    (ev: OperatorEvent) => {
      const t = ev.type;
      const d = (ev.data || {}) as EventData;
      switch (t) {
        case 'inventory_update':
          if (Array.isArray(d.products)) setProducts(d.products);
          break;
        case 'state':
          if (typeof d.guardrails === 'boolean') setGuardrails(d.guardrails);
          if (typeof d.cached_mode === 'boolean') setCached(d.cached_mode);
          if (typeof d.temperature === 'number') setTemperature(d.temperature);
          if (typeof d.model === 'string') setModel(d.model);
          if (Array.isArray(d.models)) setModels(d.models);
          if (typeof d.system_prompt === 'string') setSystemPrompt(d.system_prompt);
          if (typeof d.default_system_prompt === 'string') setDefaultPrompt(d.default_system_prompt);
          if (typeof d.system_prompt_customized === 'boolean')
            setPromptCustomized(d.system_prompt_customized);
          break;
        case 'turn_trace':
          setTrace(d as unknown as Trace);
          break;
        case 'guardrails':
          setGuardrails(!!d.on);
          break;
        case 'cached':
          setCached(!!d.on);
          break;
        case 'tool_result': {
          const dur = d.duration_ms != null ? `${d.duration_ms} ms` : '';
          const res = (d.result || {}) as ToolResult;
          if (d.name === 'search_inventory') {
            pushTimeline({
              tone: 'default',
              title: 'Checked the menu',
              meta: ['looked up live prices & stock', dur].filter(Boolean).join(' · '),
            });
          } else if (d.name === 'check_stock') {
            const label = res.name || res.sku || '';
            pushTimeline({
              tone: 'default',
              title: 'Checked stock',
              meta: [label, dur].filter(Boolean).join(' · '),
            });
          } else if (d.name === 'reserve_items') {
            if (res.refused || res.error) {
              pushTimeline({
                tone: 'refused',
                title: 'Refused an order',
                meta: firstLine(res.reason || res.error || 'refused'),
              });
            } else {
              const items = (res.items || [])
                .map((i) => `${i.qty}× ${nameFor(i.sku)}`)
                .join(', ');
              pushTimeline({
                tone: 'default',
                title: items ? `Reserved ${items}` : 'Reserved items',
                meta: ['held for checkout', dur].filter(Boolean).join(' · '),
              });
            }
          } else if (d.name === 'cancel_reservation') {
            pushTimeline({ tone: 'default', title: 'Cancelled reservation', meta: dur });
          }
          // place_order is represented by the richer order_created event below.
          break;
        }
        case 'order_created': {
          const items = (d.items || []).map((i) => `${i.qty}× ${nameFor(i.sku)}`).join(', ');
          pushTimeline({
            tone: 'order',
            title: 'Order placed',
            meta: [d.reference, items, naira(d.total)].filter(Boolean).join(' · '),
          });
          setShowConfirm(false);
          break;
        }
        case 'reservation': {
          if (d.refused) {
            pushTimeline({
              tone: 'refused',
              title: 'Refused an order',
              meta: firstLine(d.reason || 'out of stock'),
            });
          } else if (ev.session_id === SESSION_ID) {
            // Our agent held a reservation → offer a one-tap confirm.
            setShowConfirm(true);
          }
          break;
        }
        case 'notice':
          if (d.message) pushTimeline({ tone: 'default', title: 'Note', meta: firstLine(d.message) });
          break;
        case 'error':
          if (d.message)
            pushTimeline({ tone: 'refused', title: 'Something went wrong', meta: firstLine(d.message) });
          break;
        default:
          break;
      }
    },
    [pushTimeline, nameFor]
  );

  useOperatorEvents(handleEvent, setConnected);

  // ---- bootstrap: seed state + products before first SSE event ----
  useEffect(() => {
    (async () => {
      try {
        const st = await getState();
        setGuardrails(!!st.guardrails);
        setCached(!!st.cached_mode);
        if (typeof st.temperature === 'number') setTemperature(st.temperature);
        if (typeof st.model === 'string') setModel(st.model);
        if (Array.isArray(st.models)) setModels(st.models);
        if (typeof st.system_prompt === 'string') setSystemPrompt(st.system_prompt);
        if (typeof st.default_system_prompt === 'string') setDefaultPrompt(st.default_system_prompt);
        if (typeof st.system_prompt_customized === 'boolean')
          setPromptCustomized(st.system_prompt_customized);
      } catch {
        /* noop */
      }
      try {
        const pr = await getProducts();
        if (pr && Array.isArray(pr.products)) setProducts(pr.products);
      } catch {
        /* noop */
      }
      try {
        const sc = await (await fetch('/api/control/scripts')).json();
        if (sc && Array.isArray(sc.scripts)) setScripts(sc.scripts);
      } catch {
        /* noop */
      }
    })();
  }, []);

  // ---- controls ----
  const onAdd = useCallback((product: Product) => {
    sendChatRef.current(`I'd like one ${product.name}`);
  }, []);
  const onToggleGuardrails = useCallback((next: boolean) => {
    post('/api/control/guardrails', { on: !!next });
  }, []);
  const onToggleCached = useCallback((next: boolean) => {
    post('/api/control/cached', { on: !!next });
  }, []);
  const onTemperature = useCallback((value: number) => {
    setTemperature(value); // optimistic; 'state' event confirms
    post('/api/control/temperature', { value });
  }, []);
  const onModel = useCallback((m: string) => {
    setModel(m);
    post('/api/control/model', { model: m });
  }, []);
  const onSystemPrompt = useCallback((body: SystemPromptBody) => {
    post('/api/control/system_prompt', body); // 'state' event syncs editor
  }, []);
  const onAsk = useCallback((text: string) => {
    if (text) sendChatRef.current(text);
  }, []);
  const onRace = useCallback(() => {
    post('/api/control/race', {});
  }, []);
  const onReset = useCallback(() => {
    post('/api/control/reset', {});
    setTimeline([]);
    setShowConfirm(false);
  }, []);
  const onScript = useCallback(async (n: number) => {
    const res = await post('/api/control/scripted', { n });
    if (res && res.message) sendChatRef.current(res.message);
  }, []);

  // ---- keyboard shortcuts (ignored while typing in inputs) ----
  useEffect(() => {
    const isTyping = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target as HTMLElement | null)) return;
      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          onScript(parseInt(e.key, 10));
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onRace();
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          onToggleGuardrails(!guardrailsRef.current);
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          onReset();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          onToggleCached(!cachedRef.current);
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          setDrawerOpen((v) => !v);
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onScript, onRace, onReset, onToggleGuardrails, onToggleCached]);

  const sortedProducts = useMemo(() => products, [products]);

  return (
    <>
      <div
        className={`flex h-screen flex-col transition-[margin-right] duration-300 ease-out ${
          drawerOpen ? 'mr-[440px]' : ''
        }`}
      >
        <Header />
        <main className="mx-auto grid w-full min-h-0 max-w-7xl flex-1 grid-cols-[1fr_400px] gap-6 px-8 py-6">
          <Storefront products={sortedProducts} onAdd={onAdd} />
          <Chat messages={messages} onSend={sendChat} showConfirm={showConfirm} />
        </main>
        <Footer />
      </div>

      {/* discreet backstage toggle */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-stone-800"
        title="Open the Workshop (B)"
      >
        <BackstageIcon className="h-4 w-4" />
        Workshop
        <span
          className={`ml-0.5 h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-stone-500'}`}
          title={connected ? 'Live' : 'Reconnecting…'}
        />
      </button>

      <Backstage
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        guardrails={guardrails}
        cached={cached}
        onToggleGuardrails={onToggleGuardrails}
        onToggleCached={onToggleCached}
        temperature={temperature}
        onTemperature={onTemperature}
        model={model}
        models={models}
        onModel={onModel}
        systemPrompt={systemPrompt}
        defaultPrompt={defaultPrompt}
        promptCustomized={promptCustomized}
        onSystemPrompt={onSystemPrompt}
        onRace={onRace}
        onReset={onReset}
        onScript={onScript}
        onAsk={onAsk}
        scripts={scripts}
        products={sortedProducts}
        timeline={timeline}
        trace={trace}
      />
    </>
  );
}
