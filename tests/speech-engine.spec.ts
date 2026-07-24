import { expect, test } from '@playwright/test';
import {
  BrowserSpeechEngine,
  resolveVoiceCandidates,
  type SpeechSynthesisLike,
  type SpeechUtteranceLike,
  type TimerPort,
} from '../src/lib/speechEngine';

function voice(
  name: string,
  lang: string,
  options: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    default: false,
    localService: true,
    voiceURI: name,
    ...options,
  };
}

class FakeTimers implements TimerPort {
  private nextId = 1;
  private now = 0;
  private readonly tasks = new Map<number, { at: number; callback: () => void }>();

  setTimeout = (callback: () => void, delay: number) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.now + delay, callback });
    return id;
  };

  clearTimeout = (id: number) => {
    this.tasks.delete(id);
  };

  advanceBy(ms: number) {
    this.now += ms;
    for (const [id, task] of [...this.tasks]) {
      if (task.at <= this.now) {
        this.tasks.delete(id);
        task.callback();
      }
    }
  }
}

class FakeUtterance implements SpeechUtteranceLike {
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(readonly text: string) {}
}

class FakeSpeechSynthesis implements SpeechSynthesisLike {
  speaking = false;
  pending = false;
  paused = false;
  lastUtterance: FakeUtterance | null = null;
  cancelCount = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private voices: SpeechSynthesisVoice[]) {}

  getVoices = () => this.voices;

  speak = (utterance: SpeechUtteranceLike) => {
    this.lastUtterance = utterance as FakeUtterance;
    this.speaking = true;
    this.pending = false;
  };

  cancel = () => {
    this.cancelCount += 1;
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  };

  pause = () => {
    this.paused = true;
  };

  resume = () => {
    this.paused = false;
  };

  addEventListener = (_name: 'voiceschanged', listener: () => void) => {
    this.listeners.add(listener);
  };

  removeEventListener = (_name: 'voiceschanged', listener: () => void) => {
    this.listeners.delete(listener);
  };

  installVoices(next: SpeechSynthesisVoice[]) {
    this.voices = next;
    this.listeners.forEach(listener => listener());
  }
}

const voices = [
  voice('English Local', 'en-GB'),
  voice('Exact Local', 'en-US'),
  voice('Google US English', 'en-US'),
  voice('English Online', 'en-US'),
  voice('English Natural', 'en-US'),
  voice('Japanese', 'ja-JP'),
];

function createEngine(synth = new FakeSpeechSynthesis(voices), timers = new FakeTimers()) {
  return {
    engine: new BrowserSpeechEngine(synth, text => new FakeUtterance(text), timers),
    synth,
    timers,
  };
}

test('orders exact Natural, Online, Google, exact-local and same-language voices', () => {
  expect(resolveVoiceCandidates(voices, 'en-US').map(item => item.name)).toEqual([
    'English Natural',
    'English Online',
    'Google US English',
    'Exact Local',
    'English Local',
  ]);
});

test('places a compatible preferred voice before automatic candidates', () => {
  const ava = voice('Microsoft Ava', 'en-US', { voiceURI: 'urn:ava' });
  const preferredAva = {
    voiceURI: 'urn:ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  expect(resolveVoiceCandidates(
    [...voices, ava],
    'en-GB',
    preferredAva,
  ).map(item => item.name)).toEqual([
    'Microsoft Ava',
    'English Local',
    'Exact Local',
    'Google US English',
    'English Online',
    'English Natural',
  ]);
});

test('ignores an incompatible preferred voice during formal playback', () => {
  const japanese = { voiceURI: 'Japanese', name: 'Japanese', lang: 'ja-JP' };
  expect(resolveVoiceCandidates(voices, 'en-US', japanese)[0]?.name)
    .toBe('English Natural');
});

test('recovers a moved preferred voice by exact name and language', () => {
  const moved = voice('Microsoft Ava', 'en-US', { voiceURI: 'urn:new-device-ava' });
  const preferredAva = {
    voiceURI: 'urn:old-device-ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  expect(resolveVoiceCandidates(
    [moved, ...voices],
    'en-US',
    preferredAva,
  )[0]?.voiceURI).toBe('urn:new-device-ava');
});

test('forces an explicitly selected preview voice even across languages', () => {
  const japanese = { voiceURI: 'Japanese', name: 'Japanese', lang: 'ja-JP' };
  expect(resolveVoiceCandidates(voices, 'en-US', japanese, true)[0]?.name)
    .toBe('Japanese');
});

test('waits at most 3000ms for voiceschanged then allows browser default voice', async () => {
  const synth = new FakeSpeechSynthesis([]);
  const timers = new FakeTimers();
  const engine = new BrowserSpeechEngine(synth, text => new FakeUtterance(text), timers);
  const pending = engine.prepareVoices();
  let resolved = false;
  void pending.then(() => { resolved = true; });

  await Promise.resolve();
  timers.advanceBy(2999);
  await Promise.resolve();
  expect(resolved).toBe(false);

  timers.advanceBy(1);
  await expect(pending).resolves.toEqual([]);
});

test('resolves voice preparation early when voiceschanged fires', async () => {
  const synth = new FakeSpeechSynthesis([]);
  const timers = new FakeTimers();
  const engine = new BrowserSpeechEngine(synth, text => new FakeUtterance(text), timers);
  const pending = engine.prepareVoices();

  synth.installVoices([voice('Loaded Later', 'en-US')]);

  await expect(pending).resolves.toEqual([voice('Loaded Later', 'en-US')]);
});

test('notifies voice catalog subscribers after voiceschanged', () => {
  const { engine, synth } = createEngine();
  const seen: string[][] = [];
  const unsubscribe = engine.subscribeVoices(next => {
    seen.push(next.map(item => item.name));
  });

  synth.installVoices([voice('Installed Later', 'en-US')]);

  expect(seen.at(-1)).toEqual(['Installed Later']);
  unsubscribe();
});

test('speaks one utterance with the selected voice and configured rate', async () => {
  const { engine, synth } = createEngine();
  const events: string[] = [];

  engine.speak({
    text: 'hello',
    lang: 'en-US',
    rate: 1.75,
    preferredVoice: null,
    fallbackAttempt: 0,
  }, {
    onEnd: () => events.push('end'),
    onError: error => events.push(error),
  });
  await Promise.resolve();

  expect(synth.lastUtterance).toMatchObject({
    text: 'hello',
    lang: 'en-US',
    rate: 1.75,
    pitch: 1,
    voice: { name: 'English Natural' },
  });
  synth.lastUtterance?.onend?.();
  expect(events).toEqual(['end']);
  expect(engine.isActive()).toBe(false);
});

test('uses the next distinct voice for the one allowed fallback attempt', async () => {
  const { engine, synth } = createEngine();

  engine.speak({
    text: 'hello',
    lang: 'en-US',
    rate: 0.85,
    preferredVoice: null,
    fallbackAttempt: 1,
  }, {
    onEnd: () => undefined,
    onError: () => undefined,
  });
  await Promise.resolve();

  expect(synth.lastUtterance?.voice?.name).toBe('English Online');
});

test('cancel invalidates voice preparation and old utterance callbacks', async () => {
  const synth = new FakeSpeechSynthesis([]);
  const timers = new FakeTimers();
  const engine = new BrowserSpeechEngine(synth, text => new FakeUtterance(text), timers);
  const events: string[] = [];

  engine.speak({
    text: 'delayed',
    lang: 'en-US',
    rate: 0.85,
    preferredVoice: null,
    fallbackAttempt: 0,
  }, {
    onEnd: () => events.push('end'),
    onError: error => events.push(error),
  });
  engine.cancel();
  synth.installVoices([voice('Loaded Later', 'en-US')]);
  await Promise.resolve();
  expect(synth.lastUtterance).toBeNull();

  const ready = createEngine();
  ready.engine.speak({
    text: 'ready',
    lang: 'en-US',
    rate: 0.85,
    preferredVoice: null,
    fallbackAttempt: 0,
  }, {
    onEnd: () => events.push('stale-end'),
    onError: () => events.push('stale-error'),
  });
  await Promise.resolve();
  const oldUtterance = ready.synth.lastUtterance;
  ready.engine.cancel();
  oldUtterance?.onend?.();
  oldUtterance?.onerror?.({ error: 'cancelled' });
  expect(events).toEqual([]);
});

test('pause and resume report native behavior only for an active request', async () => {
  const { engine } = createEngine();
  expect(engine.pause()).toBe('interrupted');
  expect(engine.resume()).toBe('interrupted');

  engine.speak({
    text: 'hello',
    lang: 'en-US',
    rate: 0.85,
    preferredVoice: null,
    fallbackAttempt: 0,
  }, {
    onEnd: () => undefined,
    onError: () => undefined,
  });
  await Promise.resolve();

  expect(engine.pause()).toBe('paused');
  expect(engine.resume()).toBe('resumed');
});

test('reports unsupported instead of constructing a fake utterance', async () => {
  const engine = new BrowserSpeechEngine(null, null, new FakeTimers());
  const errors: string[] = [];

  expect(engine.isSupported()).toBe(false);
  engine.speak({
    text: 'hello',
    lang: 'en-US',
    rate: 0.85,
    preferredVoice: null,
    fallbackAttempt: 0,
  }, {
    onEnd: () => undefined,
    onError: error => errors.push(error),
  });
  await Promise.resolve();

  expect(errors).toEqual(['unsupported']);
});
