import { useEffect, useRef } from 'react';
import type { OperatorEvent } from '../types';

// Subscribes to GET /api/events (operator SSE). Ported from app.js: the native
// EventSource auto-reconnects, but if it fully closes we re-create it. The
// latest `onEvent` is held in a ref so re-renders don't tear down the stream.
export function useOperatorEvents(
  onEvent: (ev: OperatorEvent) => void,
  onConn: (connected: boolean) => void
) {
  const onEventRef = useRef(onEvent);
  const onConnRef = useRef(onConn);
  onEventRef.current = onEvent;
  onConnRef.current = onConn;

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        source = new EventSource('/api/events');
      } catch {
        onConnRef.current?.(false);
        retryTimer = setTimeout(connect, 3000);
        return;
      }
      source.onopen = () => onConnRef.current?.(true);
      source.onmessage = (m: MessageEvent) => {
        if (!m.data) return;
        let ev: OperatorEvent;
        try {
          ev = JSON.parse(m.data);
        } catch {
          return;
        }
        onEventRef.current?.(ev);
      };
      source.onerror = () => {
        onConnRef.current?.(false);
        if (source && source.readyState === EventSource.CLOSED) {
          try {
            source.close();
          } catch {
            /* noop */
          }
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (source) {
        try {
          source.close();
        } catch {
          /* noop */
        }
      }
    };
  }, []);
}
