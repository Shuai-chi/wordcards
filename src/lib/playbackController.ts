import type { ListeningPlaylistItem } from './listeningPlaylist';
import {
  normalizeListeningPreferences,
  type ListeningPreferencesV1,
} from './listeningPreferences';
import type { SpeechEnginePort } from './speechEngine';

export type PlaybackStatus =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'previewing'
  | 'paused'
  | 'waiting'
  | 'completed'
  | 'interrupted'
  | 'error';

export type PlaybackPhase = 'front' | 'example';

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  items: ListeningPlaylistItem[];
  playableCount: number;
  cardIndex: number;
  phase: PlaybackPhase;
  repeatIndex: number;
  repeatTotal: number;
  waitingFor: 'repeat' | 'next-card' | null;
  error: string | null;
  previewError: string | null;
}

export interface PlaybackScheduler {
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(id: number): void;
}

function getDefaultScheduler(): PlaybackScheduler {
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

interface PendingWait {
  delayMs: number;
  waitingFor: 'repeat' | 'next-card';
  callback: () => void;
}

export class PlaybackController {
  private readonly speech: SpeechEnginePort;
  private readonly scheduler: PlaybackScheduler;
  private items: ListeningPlaylistItem[] = [];
  private preferences: ListeningPreferencesV1;
  private status: PlaybackStatus = 'idle';
  private cardIndex = 0;
  private phase: PlaybackPhase = 'front';
  private repeatIndex = 1;
  private repeatTotal = 1;
  private waitingFor: PlaybackSnapshot['waitingFor'] = null;
  private error: string | null = null;
  private previewError: string | null = null;
  private generation = 0;
  private timerId: number | null = null;
  private pendingWait: PendingWait | null = null;
  private nativePaused = false;
  private disposed = false;
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();

  constructor(
    speech: SpeechEnginePort,
    scheduler: PlaybackScheduler = getDefaultScheduler(),
    preferences: ListeningPreferencesV1,
  ) {
    this.speech = speech;
    this.scheduler = scheduler;
    this.preferences = normalizeListeningPreferences(preferences);
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PlaybackSnapshot {
    return {
      status: this.status,
      items: [...this.items],
      playableCount: this.getPlayableIndices().length,
      cardIndex: this.cardIndex,
      phase: this.phase,
      repeatIndex: this.repeatIndex,
      repeatTotal: this.repeatTotal,
      waitingFor: this.waitingFor,
      error: this.error,
      previewError: this.previewError,
    };
  }

  setPlaylist(items: ListeningPlaylistItem[], preferredCardId?: string): void {
    if (this.disposed) return;
    const sameOrder = items.length === this.items.length
      && items.every((item, index) => item.card.id === this.items[index]?.card.id);
    if (sameOrder) {
      this.items = [...items];
      this.emit();
      return;
    }

    const wasRunning = this.status === 'playing' || this.status === 'waiting';
    const previousStatus = this.status;
    const currentId = preferredCardId ?? this.items[this.cardIndex]?.card.id;
    this.invalidate();
    this.items = [...items];

    const preferredIndex = currentId
      ? this.items.findIndex(item => item.card.id === currentId && this.isPlayable(item))
      : -1;
    const firstPlayable = this.getPlayableIndices()[0] ?? 0;
    this.cardIndex = preferredIndex >= 0 ? preferredIndex : firstPlayable;
    this.resetCursor();

    if (this.getPlayableIndices().length === 0) {
      this.status = 'ready';
      this.emit();
      return;
    }
    if (wasRunning) {
      this.startCurrent();
      return;
    }
    this.status = previousStatus === 'paused' || previousStatus === 'interrupted'
      ? 'paused'
      : 'ready';
    this.emit();
  }

  setPreferences(preferences: ListeningPreferencesV1): void {
    if (this.disposed) return;
    this.preferences = normalizeListeningPreferences(preferences);
    this.repeatTotal = this.getRepeatTotal(this.phase);

    if (this.status !== 'playing' && this.status !== 'waiting') {
      const playable = this.getPlayableIndices();
      if (playable.length === 0) {
        this.status = 'ready';
      } else if (!playable.includes(this.cardIndex)) {
        this.cardIndex = playable[0];
        this.resetCursor();
      } else {
        this.ensureCursor();
      }
    }
    this.emit();
  }

  play(): void {
    if (this.disposed || this.getPlayableIndices().length === 0) return;
    if (this.status === 'playing' || this.status === 'waiting') return;

    if (this.status === 'previewing') {
      this.invalidate();
      this.ensureCursor();
      this.startCurrent();
      return;
    }

    if (this.status === 'completed') {
      this.cardIndex = this.getPlayableIndices()[0];
      this.resetCursor();
    }

    if (this.status === 'paused' && this.pendingWait) {
      const pending = this.pendingWait;
      this.schedule(pending.delayMs, pending.waitingFor, pending.callback);
      return;
    }

    if (this.status === 'paused' && this.nativePaused) {
      if (this.speech.resume() === 'resumed') {
        this.status = 'playing';
        this.nativePaused = false;
        this.emit();
        return;
      }
    }

    this.ensureCursor();
    this.startCurrent();
  }

  pause(): void {
    if (this.disposed) return;
    if (this.status === 'waiting' && this.timerId !== null) {
      this.scheduler.clearTimeout(this.timerId);
      this.timerId = null;
      this.status = 'paused';
      this.emit();
      return;
    }
    if (this.status !== 'playing') return;

    const result = this.speech.pause();
    this.nativePaused = result === 'paused';
    if (!this.nativePaused) this.speech.cancel();
    this.status = 'paused';
    this.emit();
  }

  previous(): void {
    this.moveBy(-1, this.status === 'playing' || this.status === 'waiting');
  }

  next(): void {
    this.moveBy(1, this.status === 'playing' || this.status === 'waiting');
  }

  jumpTo(index: number): void {
    if (this.disposed || this.items.length === 0) return;
    const playable = this.getPlayableIndices();
    if (playable.length === 0) return;
    const target = playable.includes(index) ? index : playable[0];
    this.moveTo(target, this.status === 'playing' || this.status === 'waiting');
  }

  retry(): void {
    if (this.status !== 'error' || this.disposed) return;
    this.startCurrent(0);
  }

  previewCurrent(options: {
    rate: ListeningPreferencesV1['playbackRate'];
    preferredVoice: ListeningPreferencesV1['preferredVoice'];
  }): void {
    if (this.disposed) return;
    const item = this.items[this.cardIndex];
    const text = item?.card.front.trim() ?? '';
    if (!item || !text) return;

    this.invalidate();
    this.generation += 1;
    const generation = this.generation;
    this.status = 'previewing';
    this.error = null;
    this.previewError = null;
    this.emit();

    this.speech.speak({
      text,
      lang: item.ttsLang,
      rate: options.rate,
      preferredVoice: options.preferredVoice,
      fallbackAttempt: 0,
      forcePreferredVoice: options.preferredVoice !== null,
    }, {
      onEnd: () => {
        if (generation !== this.generation || this.disposed) return;
        this.status = 'paused';
        this.emit();
      },
      onError: error => {
        if (generation !== this.generation || this.disposed) return;
        this.status = 'paused';
        this.previewError = error;
        this.emit();
      },
    });
  }

  skipCard(): void {
    if (this.disposed) return;
    this.moveBy(1, this.status === 'error' || this.status === 'playing' || this.status === 'waiting');
  }

  handleVisibilityReturn(): void {
    if (this.disposed || this.speech.isActive()) return;
    if (this.status === 'previewing') {
      this.invalidate();
      this.status = 'paused';
      this.emit();
      return;
    }
    if (this.status !== 'playing') return;
    this.invalidate();
    this.status = 'interrupted';
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.invalidate();
    this.disposed = true;
    this.speech.dispose();
    this.items = [];
    this.status = 'idle';
    this.listeners.clear();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private isPlayable(item: ListeningPlaylistItem): boolean {
    return this.preferences.frontRepeats > 0
      || (this.preferences.exampleRepeats > 0 && Boolean(item.card.example?.trim()));
  }

  private getPlayableIndices(): number[] {
    const indices: number[] = [];
    this.items.forEach((item, index) => {
      if (this.isPlayable(item)) indices.push(index);
    });
    return indices;
  }

  private getRepeatTotal(phase: PlaybackPhase): number {
    return phase === 'front'
      ? this.preferences.frontRepeats
      : this.preferences.exampleRepeats;
  }

  private resetCursor(): void {
    const item = this.items[this.cardIndex];
    if (this.preferences.frontRepeats > 0) {
      this.phase = 'front';
      this.repeatTotal = this.preferences.frontRepeats;
    } else if (item?.card.example?.trim() && this.preferences.exampleRepeats > 0) {
      this.phase = 'example';
      this.repeatTotal = this.preferences.exampleRepeats;
    } else {
      this.phase = 'front';
      this.repeatTotal = 0;
    }
    this.repeatIndex = 1;
    this.waitingFor = null;
    this.pendingWait = null;
    this.error = null;
    this.previewError = null;
    this.nativePaused = false;
  }

  private ensureCursor(): void {
    const item = this.items[this.cardIndex];
    if (!item || !this.isPlayable(item)) {
      this.cardIndex = this.getPlayableIndices()[0] ?? 0;
      this.resetCursor();
      return;
    }
    if (this.phase === 'front' && this.preferences.frontRepeats === 0) {
      this.phase = 'example';
      this.repeatIndex = 1;
    }
    if (
      this.phase === 'example'
      && (!item.card.example?.trim() || this.preferences.exampleRepeats === 0)
    ) {
      this.phase = 'front';
      this.repeatIndex = 1;
    }
    this.repeatTotal = this.getRepeatTotal(this.phase);
  }

  private currentText(): string {
    const item = this.items[this.cardIndex];
    if (!item) return '';
    return this.phase === 'front' ? item.card.front : (item.card.example ?? '');
  }

  private startCurrent(fallbackAttempt: 0 | 1 = 0): void {
    if (this.disposed) return;
    this.ensureCursor();
    const item = this.items[this.cardIndex];
    const text = this.currentText().trim();
    if (!item || !text || !this.isPlayable(item)) {
      this.status = 'ready';
      this.emit();
      return;
    }

    this.clearTimer();
    this.pendingWait = null;
    this.generation += 1;
    const generation = this.generation;
    this.status = 'playing';
    this.waitingFor = null;
    this.error = null;
    this.previewError = null;
    this.nativePaused = false;
    this.repeatTotal = this.getRepeatTotal(this.phase);
    this.emit();

    this.speech.speak({
      text,
      lang: item.ttsLang,
      rate: this.preferences.playbackRate,
      preferredVoice: this.preferences.preferredVoice,
      fallbackAttempt,
      forcePreferredVoice: false,
    }, {
      onEnd: () => {
        if (generation !== this.generation || this.disposed) return;
        this.advanceAfterSpeech();
      },
      onError: error => {
        if (generation !== this.generation || this.disposed) return;
        if (fallbackAttempt === 0) {
          this.startCurrent(1);
          return;
        }
        this.status = 'error';
        this.error = error;
        this.emit();
      },
    });
  }

  private advanceAfterSpeech(): void {
    const item = this.items[this.cardIndex];
    if (!item) return;

    if (this.phase === 'front') {
      if (this.repeatIndex < this.preferences.frontRepeats) {
        this.schedule(500, 'repeat', () => {
          this.repeatIndex += 1;
          this.startCurrent();
        });
        return;
      }
      if (item.card.example?.trim() && this.preferences.exampleRepeats > 0) {
        this.schedule(500, 'repeat', () => {
          this.phase = 'example';
          this.repeatIndex = 1;
          this.repeatTotal = this.preferences.exampleRepeats;
          this.startCurrent();
        });
        return;
      }
    } else if (this.repeatIndex < this.preferences.exampleRepeats) {
      this.schedule(500, 'repeat', () => {
        this.repeatIndex += 1;
        this.startCurrent();
      });
      return;
    }

    this.schedule(1000, 'next-card', () => this.moveBy(1, true));
  }

  private schedule(
    delayMs: number,
    waitingFor: PendingWait['waitingFor'],
    callback: () => void,
  ): void {
    this.clearTimer();
    this.generation += 1;
    const generation = this.generation;
    this.status = 'waiting';
    this.waitingFor = waitingFor;
    this.pendingWait = { delayMs, waitingFor, callback };
    this.timerId = this.scheduler.setTimeout(() => {
      if (generation !== this.generation || this.disposed) return;
      this.timerId = null;
      this.pendingWait = null;
      callback();
    }, delayMs);
    this.emit();
  }

  private moveBy(direction: -1 | 1, continuePlaying: boolean): void {
    const playable = this.getPlayableIndices();
    if (playable.length === 0) {
      this.invalidate();
      this.status = 'ready';
      this.emit();
      return;
    }

    const currentPosition = playable.indexOf(this.cardIndex);
    const normalizedPosition = currentPosition >= 0 ? currentPosition : 0;
    let nextPosition = normalizedPosition + direction;

    if (nextPosition < 0) {
      nextPosition = this.preferences.loopPlaylist ? playable.length - 1 : 0;
    } else if (nextPosition >= playable.length) {
      if (this.preferences.loopPlaylist) {
        nextPosition = 0;
      } else {
        this.invalidate();
        this.status = 'completed';
        this.waitingFor = null;
        this.emit();
        return;
      }
    }
    this.moveTo(playable[nextPosition], continuePlaying);
  }

  private moveTo(index: number, continuePlaying: boolean): void {
    const previousStatus = this.status;
    this.invalidate();
    this.cardIndex = index;
    this.resetCursor();
    if (continuePlaying) {
      this.startCurrent();
      return;
    }
    this.status = previousStatus === 'paused'
      || previousStatus === 'interrupted'
      || previousStatus === 'error'
      ? 'paused'
      : 'ready';
    this.emit();
  }

  private clearTimer(): void {
    if (this.timerId === null) return;
    this.scheduler.clearTimeout(this.timerId);
    this.timerId = null;
  }

  private invalidate(): void {
    this.generation += 1;
    this.clearTimer();
    this.pendingWait = null;
    this.waitingFor = null;
    this.nativePaused = false;
    this.speech.cancel();
  }
}
