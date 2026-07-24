import { expect, test } from '@playwright/test';
import type { Card, Deck } from '../src/lib/types';
import type { ListeningPlaylistItem } from '../src/lib/listeningPlaylist';
import {
  createDefaultListeningPreferences,
  type ListeningPreferencesV1,
} from '../src/lib/listeningPreferences';
import type {
  SpeechEnginePort,
  SpeechEvents,
  SpeechRequest,
} from '../src/lib/speechEngine';
import {
  PlaybackController,
  type PlaybackScheduler,
} from '../src/lib/playbackController';

class FakeSpeechEngine implements SpeechEnginePort {
  requests: SpeechRequest[] = [];
  currentEvents: SpeechEvents | null = null;
  active = false;
  disposed = false;
  pauseResult: 'paused' | 'interrupted' = 'paused';
  resumeResult: 'resumed' | 'interrupted' = 'resumed';

  isSupported = () => true;
  prepareVoices = async () => [];
  listVoices = () => [];
  subscribeVoices = () => () => undefined;

  speak(request: SpeechRequest, events: SpeechEvents) {
    this.requests.push(request);
    this.currentEvents = events;
    this.active = true;
  }

  pause = () => {
    if (!this.active) return 'interrupted' as const;
    return this.pauseResult;
  };

  resume = () => {
    if (!this.active) return 'interrupted' as const;
    return this.resumeResult;
  };

  cancel() {
    this.active = false;
    this.currentEvents = null;
  }

  isActive = () => this.active;

  dispose() {
    this.disposed = true;
    this.cancel();
  }

  finish() {
    const events = this.currentEvents;
    this.currentEvents = null;
    this.active = false;
    events?.onEnd();
  }

  fail(code: string) {
    const events = this.currentEvents;
    this.currentEvents = null;
    this.active = false;
    events?.onError(code);
  }

  captureEnd() {
    return this.currentEvents?.onEnd ?? (() => undefined);
  }
}

class FakeScheduler implements PlaybackScheduler {
  private nextId = 1;
  private readonly tasks = new Map<number, { delay: number; callback: () => void }>();

  setTimeout(callback: () => void, delayMs: number) {
    const id = this.nextId++;
    this.tasks.set(id, { delay: delayMs, callback });
    return id;
  }

  clearTimeout(id: number) {
    this.tasks.delete(id);
  }

  advanceBy(delayMs: number) {
    const matching = [...this.tasks].filter(([, task]) => task.delay === delayMs);
    for (const [id, task] of matching) {
      this.tasks.delete(id);
      task.callback();
    }
  }

  get size() {
    return this.tasks.size;
  }
}

const deck: Deck = {
  id: 'deck-a',
  name: 'A',
  newCardLimit: 20,
  language: 'en',
  deckType: 'vocab',
};

function makeCard(
  id: string,
  front: string,
  example?: string,
): Card {
  return {
    id,
    deckId: deck.id,
    group: 'Test',
    front,
    back: `${front}-back`,
    example,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
  };
}

const items: ListeningPlaylistItem[] = [
  { card: makeCard('card-1', 'apple', 'An apple a day.'), deck, ttsLang: 'en-US' },
  { card: makeCard('card-2', 'banana', 'A yellow banana.'), deck, ttsLang: 'en-US' },
  { card: makeCard('card-3', 'cherry'), deck, ttsLang: 'en-US' },
];

function createHarness(overrides: Partial<ListeningPreferencesV1> = {}) {
  const speech = new FakeSpeechEngine();
  const scheduler = new FakeScheduler();
  const preferences = {
    ...createDefaultListeningPreferences('2026-07-23T00:00:00.000Z'),
    ...overrides,
  };
  const controller = new PlaybackController(speech, scheduler, preferences);
  controller.setPlaylist(items);
  return { controller, speech, scheduler, preferences };
}

test('plays front three times, example twice, then advances after exact gaps', () => {
  const { controller, speech, scheduler } = createHarness({
    frontRepeats: 3,
    exampleRepeats: 2,
  });

  controller.play();
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(1000);

  expect(speech.requests.map(request => request.text)).toEqual([
    'apple',
    'apple',
    'apple',
    'An apple a day.',
    'An apple a day.',
    'banana',
  ]);
  expect(controller.getSnapshot()).toMatchObject({
    status: 'playing',
    cardIndex: 1,
    phase: 'front',
    repeatIndex: 1,
    repeatTotal: 3,
  });
});

test('skips missing examples and disables playback when both repeat counts are zero', () => {
  const missingExample = createHarness({ frontRepeats: 1, exampleRepeats: 2 });
  missingExample.controller.jumpTo(2);
  missingExample.controller.play();
  missingExample.speech.finish();
  expect(missingExample.controller.getSnapshot().waitingFor).toBe('next-card');

  const disabled = createHarness({ frontRepeats: 0, exampleRepeats: 0 });
  expect(disabled.controller.getSnapshot()).toMatchObject({ status: 'ready', playableCount: 0 });
  disabled.controller.play();
  expect(disabled.speech.requests).toEqual([]);
});

test('supports example-only playback and excludes cards without examples', () => {
  const { controller, speech } = createHarness({ frontRepeats: 0, exampleRepeats: 2 });
  controller.jumpTo(2);
  expect(controller.getSnapshot().cardIndex).toBe(0);

  controller.play();
  expect(speech.requests[0].text).toBe('An apple a day.');
  expect(controller.getSnapshot()).toMatchObject({
    phase: 'example',
    repeatIndex: 1,
    repeatTotal: 2,
    playableCount: 2,
  });
});

test('old onend cannot advance after next, playlist rebuild or dispose', () => {
  const { controller, speech } = createHarness();
  controller.play();
  const staleEnd = speech.captureEnd();

  controller.next();
  staleEnd();
  expect(controller.getSnapshot()).toMatchObject({
    cardIndex: 1,
    phase: 'front',
    repeatIndex: 1,
  });

  const secondStaleEnd = speech.captureEnd();
  controller.setPlaylist([items[1], items[2]], 'card-2');
  secondStaleEnd();
  expect(controller.getSnapshot().cardIndex).toBe(0);

  const disposedEnd = speech.captureEnd();
  controller.dispose();
  disposedEnd();
  expect(controller.getSnapshot()).toMatchObject({ status: 'idle', items: [] });
  expect(speech.disposed).toBe(true);
});

test('retries the current repetition once with fallback then enters a recoverable error', () => {
  const { controller, speech } = createHarness();
  controller.play();

  speech.fail('voice-unavailable');
  expect(speech.requests.at(-1)).toMatchObject({ text: 'apple', fallbackAttempt: 1 });

  speech.fail('voice-unavailable');
  expect(controller.getSnapshot()).toMatchObject({
    status: 'error',
    cardIndex: 0,
    phase: 'front',
    repeatIndex: 1,
    error: 'voice-unavailable',
  });

  controller.retry();
  expect(speech.requests.at(-1)).toMatchObject({ text: 'apple', fallbackAttempt: 0 });
});

test('obeys first and last card boundaries with loop off and on', () => {
  const noLoop = createHarness({ loopPlaylist: false });
  noLoop.controller.previous();
  expect(noLoop.controller.getSnapshot().cardIndex).toBe(0);
  noLoop.controller.jumpTo(2);
  noLoop.controller.next();
  expect(noLoop.controller.getSnapshot()).toMatchObject({ cardIndex: 2, status: 'completed' });

  const loop = createHarness({ loopPlaylist: true });
  loop.controller.previous();
  expect(loop.controller.getSnapshot().cardIndex).toBe(2);
  loop.controller.next();
  expect(loop.controller.getSnapshot().cardIndex).toBe(0);
});

test('completed playback restarts at the first playable card', () => {
  const { controller, speech, scheduler } = createHarness({
    frontRepeats: 1,
    exampleRepeats: 0,
    loopPlaylist: false,
  });
  controller.jumpTo(2);
  controller.play();
  speech.finish();
  scheduler.advanceBy(1000);
  expect(controller.getSnapshot().status).toBe('completed');

  controller.play();
  expect(controller.getSnapshot()).toMatchObject({ status: 'playing', cardIndex: 0 });
  expect(speech.requests.at(-1)?.text).toBe('apple');
});

test('native pause resumes in place while browser interruption restarts the current repetition', () => {
  const native = createHarness({ frontRepeats: 2 });
  native.controller.play();
  native.controller.pause();
  expect(native.controller.getSnapshot().status).toBe('paused');
  native.controller.play();
  expect(native.speech.requests).toHaveLength(1);
  expect(native.controller.getSnapshot().status).toBe('playing');

  const interrupted = createHarness({ frontRepeats: 2 });
  interrupted.controller.play();
  interrupted.speech.active = false;
  interrupted.controller.handleVisibilityReturn();
  expect(interrupted.controller.getSnapshot().status).toBe('interrupted');
  interrupted.controller.play();
  expect(interrupted.speech.requests.map(request => request.text)).toEqual(['apple', 'apple']);
  expect(interrupted.controller.getSnapshot()).toMatchObject({ repeatIndex: 1, phase: 'front' });
});

test('changing repeat counts does not cancel the current utterance and applies after onend', () => {
  const { controller, speech, preferences } = createHarness({ frontRepeats: 3, exampleRepeats: 0 });
  controller.play();
  controller.setPreferences({ ...preferences, frontRepeats: 1 });
  expect(speech.requests).toHaveLength(1);

  speech.finish();
  expect(controller.getSnapshot().waitingFor).toBe('next-card');
});

test('changing rate does not cancel the current utterance and applies to the next repetition', () => {
  const { controller, speech, scheduler, preferences } = createHarness({
    frontRepeats: 2,
    exampleRepeats: 0,
    playbackRate: 0.85,
  });
  controller.play();
  controller.setPreferences({ ...preferences, playbackRate: 1.5 });
  expect(speech.requests).toHaveLength(1);
  expect(speech.requests[0]?.rate).toBe(0.85);

  speech.finish();
  scheduler.advanceBy(500);
  expect(speech.requests[1]?.rate).toBe(1.5);
});

test('preview cancels formal playback, preserves the cursor, and ends paused', () => {
  const { controller, speech } = createHarness({
    frontRepeats: 3,
    exampleRepeats: 2,
  });
  controller.play();
  const staleFormalEnd = speech.captureEnd();

  controller.previewCurrent({
    rate: 1.25,
    preferredVoice: {
      voiceURI: 'Japanese',
      name: 'Japanese',
      lang: 'ja-JP',
    },
  });

  expect(controller.getSnapshot()).toMatchObject({
    status: 'previewing',
    cardIndex: 0,
    phase: 'front',
    repeatIndex: 1,
    repeatTotal: 3,
  });
  expect(speech.requests.at(-1)).toMatchObject({
    text: 'apple',
    rate: 1.25,
    forcePreferredVoice: true,
  });

  staleFormalEnd();
  expect(controller.getSnapshot().status).toBe('previewing');
  speech.finish();
  expect(controller.getSnapshot()).toMatchObject({
    status: 'paused',
    cardIndex: 0,
    phase: 'front',
    repeatIndex: 1,
  });
});

test('play during preview cancels preview and restarts the current formal repetition', () => {
  const { controller, speech } = createHarness({ frontRepeats: 2 });
  controller.play();
  controller.previewCurrent({ rate: 0.75, preferredVoice: null });
  const stalePreviewEnd = speech.captureEnd();

  controller.play();
  expect(controller.getSnapshot().status).toBe('playing');
  expect(speech.requests.map(request => request.text)).toEqual([
    'apple',
    'apple',
    'apple',
  ]);

  stalePreviewEnd();
  expect(controller.getSnapshot().status).toBe('playing');
});

test('preview errors remain recoverable and never enter formal fallback', () => {
  const { controller, speech } = createHarness();
  controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  speech.fail('voice-unavailable');

  expect(controller.getSnapshot()).toMatchObject({
    status: 'paused',
    previewError: 'voice-unavailable',
    error: null,
  });
  expect(speech.requests).toHaveLength(1);
});

test('navigation and visibility interruption invalidate stale preview callbacks', () => {
  const navigation = createHarness();
  navigation.controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  const staleNavigationEnd = navigation.speech.captureEnd();
  navigation.controller.next();
  staleNavigationEnd();
  expect(navigation.controller.getSnapshot()).toMatchObject({
    status: 'ready',
    cardIndex: 1,
  });

  const visibility = createHarness();
  visibility.controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  const staleVisibilityEnd = visibility.speech.captureEnd();
  visibility.speech.active = false;
  visibility.controller.handleVisibilityReturn();
  staleVisibilityEnd();
  expect(visibility.controller.getSnapshot()).toMatchObject({
    status: 'paused',
    cardIndex: 0,
    repeatIndex: 1,
  });
});

test('playlist rebuild preserves the current card when it still exists', () => {
  const { controller } = createHarness();
  controller.jumpTo(1);
  controller.setPlaylist([items[2], items[1]], 'card-2');
  expect(controller.getSnapshot()).toMatchObject({ cardIndex: 1, status: 'ready' });
});
