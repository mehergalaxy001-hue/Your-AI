import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in all TS DOM libs).
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SpeechRecognitionLike;

function getCtor(): SRConstructor | null {
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Allow microphone permission in your browser settings.",
  "service-not-allowed": "Speech recognition is blocked in this browser.",
  "no-speech": "No speech was detected. Try again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs a network connection.",
};

/** Browser speech-to-text. `onTranscript` receives the full transcript of the current session. */
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const supported = typeof window !== "undefined" && getCtor() !== null;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const cb = useRef(onTranscript);
  cb.current = onTranscript;

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser. Try Chrome, Edge or Safari.");
      return;
    }
    setError(null);
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      cb.current(text.trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Voice input failed. Please try again.");
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      setError("Couldn't start voice input.");
    }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { supported, listening, error, clearError: () => setError(null), start, stop };
}
