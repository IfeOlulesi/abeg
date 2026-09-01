import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVoice } from '../hooks/useVoice.js';
import { BotIcon, MicIcon, SendIcon, CheckIcon } from './Icons.jsx';

function TypingDots() {
  return (
    <span className="inline-flex gap-1.5 py-1">
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400" />
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400" />
      <i className="dot h-1.5 w-1.5 rounded-full bg-stone-400" />
    </span>
  );
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="max-w-[85%] self-end rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-[15px] font-medium text-white">
        {msg.text}
      </div>
    );
  }
  const empty = !msg.text;
  return (
    <div className="max-w-[92%] self-start rounded-2xl rounded-tl-md bg-stone-100 px-4 py-2.5 text-stone-700">
      {empty && msg.streaming ? (
        <TypingDots />
      ) : (
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function Chat({ messages, onSend, showConfirm }) {
  const [input, setInput] = useState('');
  const [micNote, setMicNote] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const onInterim = useCallback((t) => setInput(t), []);
  const onNote = useCallback((n) => setMicNote(n), []);
  const { recording, start, stop } = useVoice({ onInterim, onNote });

  // Autoscroll to newest message / streamed token.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, showConfirm]);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSend(text);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Hold-to-talk: pointer events cover mouse + touch.
  const micDown = (e) => {
    e.preventDefault();
    start();
  };
  const micUp = async (e) => {
    e.preventDefault();
    const text = await stop();
    setInput('');
    if (text) onSend(text);
  };
  const micLeave = async () => {
    if (recording) {
      const text = await stop();
      setInput('');
      if (text) onSend(text);
    }
  };

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100">
      <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
          <BotIcon className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-stone-900">Order Assistant</div>
          <div className="text-xs text-stone-400">Online — ask me anything</div>
        </div>
      </div>

      <div ref={listRef} className="flex grow flex-col gap-3 overflow-y-auto bg-[#FCFAF9] p-5">
        {messages.map((m) => (
          <Message key={m.id} msg={m} />
        ))}
      </div>

      <div className="border-t border-stone-100 p-3">
        {micNote && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-700 ring-1 ring-amber-100">
            <MicIcon className="h-4 w-4 flex-none" />
            <span>{micNote}</span>
          </div>
        )}

        {showConfirm && (
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSend('yes')}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              <CheckIcon className="h-4 w-4" />
              Confirm order
            </button>
            <button
              type="button"
              onClick={() => onSend('cancel')}
              className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-200"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full bg-stone-100 p-1.5 pl-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
            placeholder={recording ? 'Listening…' : 'Message the assistant…'}
          />
          <button
            type="button"
            title="Hold to talk"
            onPointerDown={micDown}
            onPointerUp={micUp}
            onPointerLeave={micLeave}
            onPointerCancel={micLeave}
            className={`grid h-10 w-10 place-items-center rounded-full transition ${
              recording
                ? 'mic-recording bg-brand text-white'
                : 'text-stone-500 hover:bg-stone-200'
            }`}
          >
            <MicIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={submit}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-600"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
