import { useCallback, useRef, useState } from 'react';

const TARGET_RATE = 16000;

interface VoiceHandlers {
  onInterim?: (t: string) => void;
  onNote?: (n: string | null) => void;
}

interface VoiceState {
  active: boolean;
  stream: MediaStream | null;
  audioCtx: AudioContext | null;
  processor: ScriptProcessorNode | null;
  source: MediaStreamAudioSourceNode | null;
  ws: WebSocket | null;
  finalTranscript: string;
  interimTranscript: string;
  lastFinal: string;
}

// Linear resample Float32 [-1,1] → 16k Int16 LE PCM. Ported verbatim from app.js.
function floatTo16kPCM(input: Float32Array, inRate: number): Int16Array {
  const ratio = inRate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    let s = input[i0] * (1 - frac) + input[i1] * frac;
    s = Math.max(-1, Math.min(1, s));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// Hold-to-talk voice capture. getUserMedia → AudioContext/ScriptProcessor →
// downsample → WS /ws/stt binary frames. Live interim transcript is surfaced
// via onInterim; the final transcript is returned from stop() to be sent
// through the chat pipeline. Mic-denied is handled gracefully with a note.
export function useVoice({ onInterim, onNote }: VoiceHandlers) {
  const [recording, setRecording] = useState(false);
  const st = useRef<VoiceState>({
    active: false,
    stream: null,
    audioCtx: null,
    processor: null,
    source: null,
    ws: null,
    finalTranscript: '',
    interimTranscript: '',
    lastFinal: '',
  });

  const start = useCallback(async () => {
    const s = st.current;
    if (s.active) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onNote?.('Microphone not available in this browser — type instead.');
      return;
    }
    s.active = true;
    s.finalTranscript = '';
    s.interimTranscript = '';
    s.lastFinal = '';
    setRecording(true);
    onNote?.(null);
    onInterim?.('');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      s.active = false;
      setRecording(false);
      onNote?.('Mic permission denied — text still works.');
      return;
    }
    s.stream = stream;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + location.host + '/ws/stt');
    ws.binaryType = 'arraybuffer';
    s.ws = ws;
    ws.onmessage = (m: MessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(m.data);
      } catch {
        return;
      }
      if (msg.type === 'interim') {
        s.interimTranscript = msg.transcript || '';
        onInterim?.((s.finalTranscript + ' ' + s.interimTranscript).trim());
      } else if (msg.type === 'final') {
        // Deepgram can re-emit the same final (esp. around CloseStream) or send
        // cumulative-growing finals. Merge defensively so a single utterance is
        // never duplicated: skip exact/contained repeats, replace on growth,
        // append only genuinely new segments.
        const seg = (msg.transcript || '').trim();
        if (seg) {
          const cur = s.finalTranscript;
          if (!cur) {
            s.finalTranscript = seg;
          } else if (seg === s.lastFinal || cur.endsWith(seg)) {
            /* duplicate — ignore */
          } else if (seg.startsWith(cur)) {
            s.finalTranscript = seg; // cumulative growth → replace
          } else {
            s.finalTranscript = (cur + ' ' + seg).trim(); // new segment → append
          }
          s.lastFinal = seg;
          s.interimTranscript = '';
          onInterim?.(s.finalTranscript);
        }
      } else if (msg.type === 'error') {
        onNote?.('STT error: ' + (msg.message || 'unknown'));
      }
    };
    ws.onerror = () => {
      /* handled on release */
    };

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();
    s.audioCtx = audioCtx;
    const inRate = audioCtx.sampleRate;
    const source = audioCtx.createMediaStreamSource(stream);
    s.source = source;
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    s.processor = processor;
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!s.active) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = floatTo16kPCM(input, inRate);
      if (ws.readyState === WebSocket.OPEN) ws.send(pcm.buffer as ArrayBuffer);
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
  }, [onInterim, onNote]);

  // Returns the final transcript string (may be empty).
  const stop = useCallback(async () => {
    const s = st.current;
    if (!s.active) return '';
    s.active = false;
    setRecording(false);

    try {
      if (s.processor) {
        s.processor.disconnect();
        s.processor.onaudioprocess = null;
      }
    } catch {
      /* noop */
    }
    try {
      if (s.source) s.source.disconnect();
    } catch {
      /* noop */
    }
    try {
      if (s.audioCtx) await s.audioCtx.close();
    } catch {
      /* noop */
    }
    try {
      if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }

    const ws = s.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send('stop');
      } catch {
        /* noop */
      }
    }
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (ws) ws.close();
    } catch {
      /* noop */
    }
    s.ws = null;

    const text = (s.finalTranscript || s.interimTranscript || '').trim();
    s.audioCtx = null;
    s.processor = null;
    s.source = null;
    s.stream = null;
    return text;
  }, []);

  return { recording, start, stop };
}
