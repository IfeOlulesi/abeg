import { useCallback, useRef, useState } from 'react';
import { firstLine } from '../lib/format.js';

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

// Chat pipeline: POST /api/chat and read the SSE body via fetch + ReadableStream.
// The parser (buffer + blank-line split + multi `data:` concat) is ported
// verbatim from static/app.js — it's proven-correct.
export function useChat(sessionId, onUserSend) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hey there! 👋 Craving something today? Tell me what you'd like, or ask what's available.",
      streaming: false,
    },
  ]);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const patch = useCallback((id, changes) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }, []);

  const sendChat = useCallback(
    async (text) => {
      const message = String(text == null ? '' : text).trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      onUserSend?.(message);

      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message, streaming: false }]);

      const bubbleId = nextId();
      setMessages((prev) => [...prev, { id: bubbleId, role: 'assistant', text: '', streaming: true }]);

      let acc = '';
      let gotDelta = false;

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, message }),
        });
        if (!resp.ok || !resp.body) throw new Error('chat http ' + resp.status);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep;
          while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + buffer.match(/\r?\n\r?\n/)[0].length);
            const dataLines = [];
            for (const line of rawEvent.split(/\r?\n/)) {
              if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
            }
            if (!dataLines.length) continue;
            const payload = dataLines.join('\n');
            let ev;
            try {
              ev = JSON.parse(payload);
            } catch {
              continue;
            }

            const d = ev.data || {};
            if (ev.type === 'assistant_delta') {
              gotDelta = true;
              acc += d.text || '';
              patch(bubbleId, { text: acc });
            } else if (ev.type === 'assistant_done') {
              if (d.text) {
                acc = d.text;
                patch(bubbleId, { text: acc });
              }
            } else if (ev.type === 'notice') {
              if (!gotDelta && d.message) {
                acc = '_(' + d.message + ')_';
                patch(bubbleId, { text: acc });
              }
            } else if (ev.type === 'error') {
              acc = acc || '⚠ ' + firstLine(d.message);
              patch(bubbleId, { text: acc });
            }
          }
        }
        if (!acc) patch(bubbleId, { text: '_(no reply)_' });
      } catch (e) {
        patch(bubbleId, { text: '⚠ ' + firstLine(e && e.message ? e.message : 'chat failed') });
      } finally {
        patch(bubbleId, { streaming: false });
        busyRef.current = false;
        setBusy(false);
      }
    },
    [sessionId, patch, onUserSend]
  );

  return { messages, sendChat, busy };
}
