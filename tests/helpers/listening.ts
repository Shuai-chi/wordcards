import type { Page } from '@playwright/test';
import type { Card, Deck, Report } from '../../src/lib/types';

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'deck-listening',
    group: 'Test',
    front: id,
    back: `${id}-back`,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
    ...overrides,
  };
}

export interface ListeningFixture {
  deck: Deck;
  cards: Card[];
  reports?: Report[];
}

export const sampleDeckWithCards: ListeningFixture = {
  deck: {
    id: 'deck-listening',
    name: 'Listening',
    newCardLimit: 20,
    cardCount: 3,
    language: 'en',
    deckType: 'vocab',
  },
  cards: [
    makeCard('card-1', { front: 'apple', example: 'An apple a day.' }),
    makeCard('card-2', { front: 'banana', example: 'A yellow banana.' }),
    makeCard('card-3', { front: 'cherry' }),
  ],
};

export async function installFakeSpeechSynthesis(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;

      constructor(readonly text: string) {}
    }

    const requests: Array<{
      text: string;
      lang: string;
      rate: number;
      pitch: number;
      voiceURI: string | null;
    }> = [];
    let current: FakeUtterance | null = null;
    let speaking = false;
    let paused = false;
    let voices = [
      {
        name: 'English Natural',
        lang: 'en-US',
        default: true,
        localService: true,
        voiceURI: 'fake-en-US',
      },
      {
        name: 'Japanese',
        lang: 'ja-JP',
        default: false,
        localService: true,
        voiceURI: 'fake-ja-JP',
      },
    ];
    const voiceListeners = new Set<() => void>();
    const synth = {
      get speaking() { return speaking; },
      get pending() { return false; },
      get paused() { return paused; },
      getVoices: () => voices,
      speak: (utterance: FakeUtterance) => {
        current = utterance;
        speaking = true;
        requests.push({
          text: utterance.text,
          lang: utterance.lang,
          rate: utterance.rate,
          pitch: utterance.pitch,
          voiceURI: utterance.voice?.voiceURI ?? null,
        });
      },
      cancel: () => {
        current = null;
        speaking = false;
        paused = false;
      },
      pause: () => { paused = true; },
      resume: () => { paused = false; },
      addEventListener: (_name: 'voiceschanged', listener: () => void) => {
        voiceListeners.add(listener);
      },
      removeEventListener: (_name: 'voiceschanged', listener: () => void) => {
        voiceListeners.delete(listener);
      },
    };
    const harness = {
      requests,
      finishCurrent: () => {
        const utterance = current;
        current = null;
        speaking = false;
        utterance?.onend?.();
      },
      failCurrent: (error = 'voice-unavailable') => {
        const utterance = current;
        current = null;
        speaking = false;
        utterance?.onerror?.({ error });
      },
      interrupt: () => {
        current = null;
        speaking = false;
        paused = false;
      },
      installVoices: (next: typeof voices) => {
        voices = next;
        voiceListeners.forEach(listener => listener());
      },
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synth,
    });
    Object.assign(window, { __speechHarness: harness });
  });
}

export async function seedSelectedDeck(
  page: Page,
  fixture: ListeningFixture = sampleDeckWithCards,
): Promise<void> {
  await page.goto('/');
  await page.evaluate(async input => {
    localStorage.setItem('srs_selected_decks', JSON.stringify([input.deck.id]));
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('SRS_DB', 2);
      open.onerror = () => reject(open.error);
      open.onupgradeneeded = () => {
        const database = open.result;
        if (!database.objectStoreNames.contains('decks')) {
          database.createObjectStore('decks', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('cards')) {
          const cards = database.createObjectStore('cards', { keyPath: 'id' });
          cards.createIndex('deckId', 'deckId', { unique: false });
        }
        if (!database.objectStoreNames.contains('reports')) {
          database.createObjectStore('reports', { keyPath: 'dateStr' });
        }
        if (!database.objectStoreNames.contains('iconAssets')) {
          database.createObjectStore('iconAssets', { keyPath: 'id' });
        }
      };
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction(['decks', 'cards', 'reports'], 'readwrite');
        const decks = transaction.objectStore('decks');
        const cards = transaction.objectStore('cards');
        const reports = transaction.objectStore('reports');
        decks.clear();
        cards.clear();
        reports.clear();
        decks.put(input.deck);
        input.cards.forEach(card => cards.put(card));
        (input.reports ?? []).forEach(report => reports.put(report));
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      };
    });
  }, fixture);
  await page.reload();
}

export async function seedGraduatedFutureCard(page: Page): Promise<void> {
  await seedSelectedDeck(page, {
    deck: { ...sampleDeckWithCards.deck, cardCount: 1 },
    cards: [makeCard('future-card', {
      front: 'future',
      state: 'graduated',
      interval: 365,
      introducedDate: '2026-01-01',
      lastReviewedDate: '2026-07-23',
    })],
  });
}

export async function seedDeckAndReport(page: Page): Promise<void> {
  await seedSelectedDeck(page, {
    ...sampleDeckWithCards,
    cards: sampleDeckWithCards.cards.map((card, index) => ({
      ...card,
      state: index === 0 ? 'learning' : card.state,
      interval: index + 1,
      easeFactor: 2.3 + index / 10,
      failCount: index,
      hardCount: index + 1,
      introducedDate: '2026-07-20',
      lastReviewedDate: index === 0 ? '2026-07-23' : '',
      todayRating: index === 0 ? 'hard' as const : undefined,
    })),
    reports: [{
      dateStr: '2026-07-23',
      uniqueCards: 1,
      clicks: { again: 0, hard: 1, good: 0, easy: 0 },
    }],
  });
}

export async function openListeningMode(page: Page): Promise<void> {
  await page.getByTestId('mode-card-vocab').click();
  await page.getByTestId('listening-entry').click();
  await page.getByTestId('listening-page').waitFor();
}

export async function readSrsSnapshot(page: Page): Promise<{
  cards: Array<Pick<Card,
    'id' | 'state' | 'interval' | 'easeFactor' | 'failCount' | 'hardCount'
    | 'introducedDate' | 'lastReviewedDate' | 'todayRating'>>;
  reports: Report[];
}> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('SRS_DB', 2);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction(['cards', 'reports'], 'readonly');
      const cardsRequest = transaction.objectStore('cards').getAll();
      const reportsRequest = transaction.objectStore('reports').getAll();
      transaction.oncomplete = () => {
        const cards = (cardsRequest.result as Card[]).map(card => ({
          id: card.id,
          state: card.state,
          interval: card.interval,
          easeFactor: card.easeFactor,
          failCount: card.failCount,
          hardCount: card.hardCount,
          introducedDate: card.introducedDate,
          lastReviewedDate: card.lastReviewedDate,
          todayRating: card.todayRating,
        })).sort((left, right) => left.id.localeCompare(right.id));
        resolve({
          cards,
          reports: (reportsRequest.result as Report[])
            .sort((left, right) => left.dateStr.localeCompare(right.dateStr)),
        });
        database.close();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  }));
}
