import type {
  ListeningRate,
  PreferredVoiceV1,
} from './listeningPreferences';

export interface SpeechRequest {
  text: string;
  lang: string;
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  fallbackAttempt: 0 | 1;
  forcePreferredVoice?: boolean;
}

export interface SpeechEvents {
  onEnd: () => void;
  onError: (error: string) => void;
}

export interface SpeechUtteranceLike {
  readonly text: string;
  lang: string;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

export interface SpeechSynthesisLike {
  readonly speaking: boolean;
  readonly pending: boolean;
  readonly paused: boolean;
  getVoices(): SpeechSynthesisVoice[];
  speak(utterance: SpeechUtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  addEventListener(name: 'voiceschanged', listener: () => void): void;
  removeEventListener(name: 'voiceschanged', listener: () => void): void;
}

export interface TimerPort {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(id: number): void;
}

export interface SpeechEnginePort {
  isSupported(): boolean;
  prepareVoices(): Promise<SpeechSynthesisVoice[]>;
  listVoices(): SpeechSynthesisVoice[];
  subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void;
  speak(request: SpeechRequest, events: SpeechEvents): void;
  pause(): 'paused' | 'interrupted';
  resume(): 'resumed' | 'interrupted';
  cancel(): void;
  isActive(): boolean;
  dispose(): void;
}

function pushUnique(
  output: SpeechSynthesisVoice[],
  voices: SpeechSynthesisVoice[],
): void {
  for (const voice of voices) {
    if (!output.some(candidate => candidate.voiceURI === voice.voiceURI)) output.push(voice);
  }
}

export function resolveVoiceCandidates(
  voices: SpeechSynthesisVoice[],
  lang: string,
  preferred: PreferredVoiceV1 | null = null,
  forcePreferredVoice = false,
): SpeechSynthesisVoice[] {
  const language = lang.toLowerCase();
  const baseLanguage = primaryLanguage(lang);
  const exact = voices.filter(voice => voice.lang.toLowerCase() === language);
  const sameLanguage = voices.filter(
    voice => primaryLanguage(voice.lang) === baseLanguage,
  );
  const ordered: SpeechSynthesisVoice[] = [];
  const preferredVoice = findPreferredVoice(voices, preferred);

  if (
    preferredVoice
    && (
      forcePreferredVoice
      || isVoiceLanguageCompatible(preferredVoice.lang, lang)
    )
  ) {
    pushUnique(ordered, [preferredVoice]);
  }

  for (const marker of ['natural', 'online', 'google']) {
    pushUnique(
      ordered,
      exact.filter(voice => voice.name.toLowerCase().includes(marker)),
    );
  }
  pushUnique(ordered, exact);
  pushUnique(ordered, sameLanguage);
  return ordered;
}

export function primaryLanguage(lang: string): string {
  return lang.trim().toLowerCase().split('-')[0] ?? '';
}

export function isVoiceLanguageCompatible(
  voiceLang: string,
  requestLang: string,
): boolean {
  return primaryLanguage(voiceLang) === primaryLanguage(requestLang);
}

export function findPreferredVoice(
  voices: SpeechSynthesisVoice[],
  preferred: PreferredVoiceV1 | null,
): SpeechSynthesisVoice | null {
  if (!preferred) return null;
  return voices.find(voice => voice.voiceURI === preferred.voiceURI)
    ?? voices.find(voice => (
      voice.name === preferred.name
      && voice.lang.toLowerCase() === preferred.lang.toLowerCase()
    ))
    ?? null;
}

function getDefaultSynth(): SpeechSynthesisLike | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis as unknown as SpeechSynthesisLike;
}

function getDefaultUtteranceFactory(): ((text: string) => SpeechUtteranceLike) | null {
  if (typeof SpeechSynthesisUtterance === 'undefined') return null;
  return text => new SpeechSynthesisUtterance(text) as unknown as SpeechUtteranceLike;
}

function getDefaultTimers(): TimerPort {
  if (typeof window !== 'undefined') {
    return {
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: id => window.clearTimeout(id),
    };
  }
  return {
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay) as unknown as number,
    clearTimeout: id => globalThis.clearTimeout(id),
  };
}

export class BrowserSpeechEngine implements SpeechEnginePort {
  private readonly synth: SpeechSynthesisLike | null;
  private readonly createUtterance: ((text: string) => SpeechUtteranceLike) | null;
  private readonly timers: TimerPort;
  private generation = 0;
  private active = false;
  private disposed = false;
  private voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  private finishVoiceWait: (() => void) | null = null;
  private readonly voiceSubscriptions = new Map<
    (voices: SpeechSynthesisVoice[]) => void,
    () => void
  >();

  constructor(
    synth: SpeechSynthesisLike | null = getDefaultSynth(),
    createUtterance: ((text: string) => SpeechUtteranceLike) | null
      = getDefaultUtteranceFactory(),
    timers: TimerPort = getDefaultTimers(),
  ) {
    this.synth = synth;
    this.createUtterance = createUtterance;
    this.timers = timers;
  }

  isSupported(): boolean {
    return !this.disposed && this.synth !== null && this.createUtterance !== null;
  }

  prepareVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.synth || this.disposed) return Promise.resolve([]);
    const loaded = this.synth.getVoices();
    if (loaded.length > 0) return Promise.resolve(loaded);
    if (this.voicesPromise) return this.voicesPromise;

    const waiting = new Promise<SpeechSynthesisVoice[]>(resolve => {
      let settled = false;
      let timeoutId = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
        this.timers.clearTimeout(timeoutId);
        this.finishVoiceWait = null;
        resolve(this.synth?.getVoices() ?? []);
      };
      const handleVoicesChanged = () => {
        if ((this.synth?.getVoices().length ?? 0) > 0) finish();
      };
      timeoutId = this.timers.setTimeout(finish, 3000);
      this.finishVoiceWait = finish;
      this.synth?.addEventListener('voiceschanged', handleVoicesChanged);
    });
    const prepared = waiting.finally(() => {
      if (this.voicesPromise === prepared) this.voicesPromise = null;
    });
    this.voicesPromise = prepared;
    return prepared;
  }

  listVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() ?? [];
  }

  subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void {
    if (!this.synth || this.disposed) return () => undefined;
    const previous = this.voiceSubscriptions.get(listener);
    if (previous) this.synth.removeEventListener('voiceschanged', previous);
    const handleVoicesChanged = () => listener(this.listVoices());
    this.synth.addEventListener('voiceschanged', handleVoicesChanged);
    this.voiceSubscriptions.set(listener, handleVoicesChanged);
    listener(this.listVoices());
    return () => {
      this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
      this.voiceSubscriptions.delete(listener);
    };
  }

  speak(request: SpeechRequest, events: SpeechEvents): void {
    if (!this.isSupported()) {
      events.onError('unsupported');
      return;
    }

    this.generation += 1;
    const generation = this.generation;
    this.active = true;
    this.synth?.cancel();

    void this.prepareVoices().then(voices => {
      if (
        generation !== this.generation
        || this.disposed
        || !this.synth
        || !this.createUtterance
      ) {
        return;
      }

      const utterance = this.createUtterance(request.text);
      const candidates = resolveVoiceCandidates(
        voices,
        request.lang,
        request.preferredVoice,
        request.forcePreferredVoice ?? false,
      );
      utterance.voice = candidates[request.fallbackAttempt] ?? null;
      utterance.lang = request.lang;
      utterance.rate = request.rate;
      utterance.pitch = 1;
      utterance.onend = () => {
        if (generation !== this.generation || this.disposed) return;
        this.active = false;
        events.onEnd();
      };
      utterance.onerror = event => {
        if (generation !== this.generation || this.disposed) return;
        this.active = false;
        events.onError(event.error || 'speech_error');
      };
      this.synth.speak(utterance);
    });
  }

  pause(): 'paused' | 'interrupted' {
    if (!this.synth || !this.active || this.disposed) return 'interrupted';
    this.synth.pause();
    return 'paused';
  }

  resume(): 'resumed' | 'interrupted' {
    if (!this.synth || !this.active || this.disposed) return 'interrupted';
    this.synth.resume();
    return 'resumed';
  }

  cancel(): void {
    this.generation += 1;
    this.active = false;
    this.synth?.cancel();
  }

  isActive(): boolean {
    return Boolean(
      !this.disposed
      && this.active
      && this.synth
      && (this.synth.speaking || this.synth.pending || this.synth.paused),
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.cancel();
    for (const handleVoicesChanged of this.voiceSubscriptions.values()) {
      this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
    }
    this.voiceSubscriptions.clear();
    this.finishVoiceWait?.();
    this.finishVoiceWait = null;
    this.disposed = true;
  }
}
