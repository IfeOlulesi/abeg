import { useCallback, useRef, useState } from 'react';
import { firstLine } from '../lib/format';
import type { ChatMessage, EventData, OperatorEvent } from '../types';

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

// Map a backend guard notice to a short, friendly chip label.
function friendlyNote(message: unknown): string {
  const m = String(message || '').toLowerCase();
  if (m.includes('ungrounded')) return 'Guardrail: held back an unverified answer';
  if (m.includes('off-task')) return 'Guardrail: blocked an off-task request';
  if (m.includes('bounded')) return 'Reached the tool-step limit';
  return firstLine(message);
}

// Chat pipeline: POST /api/chat and read the SSE body via fetch + ReadableStream.
// The parser (buffer + blank-line split + multi `data:` concat) is ported
// verbatim from static/app.js — it's proven-correct.
export function useChat(sessionId: string, onUserSend?: (msg: string) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hey there! 👋 Craving something today? Tell me what you'd like, or ask what's available.",
      streaming: false,
    },
  ]);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const patch = useCallback((id: string, changes: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }, []);

  const sendChat = useCallback(
    async (text: string) => {
      const message = String(text == null ? '' : text).trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      onUserSend?.(message);

      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message, streaming: false }]);

      const bubbleId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: bubbleId, role: 'assistant', text: '', streaming: true, status: null, guardNote: null },
      ]);

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
            buffer = buffer.slice(sep + buffer.match(/\r?\n\r?\n/)![0].length);
            const dataLines: string[] = [];
            for (const line of rawEvent.split(/\r?\n/)) {
              if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
            }
            if (!dataLines.length) continue;
            const payload = dataLines.join('\n');
            let ev: OperatorEvent;
            try {
              ev = JSON.parse(payload);
            } catch {
              continue;
            }

            const d = (ev.data || {}) as EventData;
            if (ev.type === 'assistant_delta') {
              gotDelta = true;
              acc += d.text || '';
              // Text is flowing again → clear any "searching…" status line.
              patch(bubbleId, { text: acc, status: null });
            } else if (ev.type === 'activity') {
              // Live feedback while a tool runs, and a "Thinking…" beat after it
              // returns (the model still has to compose its reply).
              if (d.state === 'start') patch(bubbleId, { status: d.label || 'Working on it' });
              else if (d.state === 'end') patch(bubbleId, { status: 'Thinking…' });
            } else if (ev.type === 'assistant_done') {
              if (d.text) {
                acc = d.text;
                patch(bubbleId, { text: acc, status: null });
              }
            } else if (ev.type === 'notice') {
              if (!gotDelta && d.message) {
                acc = '_(' + d.message + ')_';
                patch(bubbleId, { text: acc, status: null });
              } else if (d.message) {
                // A guardrail fired after text streamed — label the correction so
                // the upcoming text swap reads as intentional, not a glitch.
                patch(bubbleId, { guardNote: friendlyNote(d.message) });
              }
            } else if (ev.type === 'error') {
              acc = acc || '⚠ ' + firstLine(d.message);
              patch(bubbleId, { text: acc, status: null });
            }
          }
        }
        if (!acc) patch(bubbleId, { text: '_(no reply)_' });
      } catch (e: any) {
        patch(bubbleId, { text: '⚠ ' + firstLine(e && e.message ? e.message : 'chat failed') });
      } finally {
        patch(bubbleId, { streaming: false, status: null });
        busyRef.current = false;
        setBusy(false);
      }
    },
    [sessionId, patch, onUserSend]
  );

  return { messages, sendChat, busy };
}
