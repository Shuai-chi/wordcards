import { expect, test } from '@playwright/test';
import type { Card, Deck } from '../src/lib/types';
import {
  collectTodayQueueCandidates,
  materializeTodayQueue,
  summarizeTodayQueue,
  type DeckCardSet,
} from '../src/lib/practiceQueue';
import {
  buildListeningPlaylist,
  createSeededShuffle,
  resolveInitialPlaylistIndex,
  type BuildListeningPlaylistInput,
} from '../src/lib/listeningPlaylist';

const deckA: Deck = {
  id: 'deck-a',
  name: 'A',
  newCardLimit: 20,
  language: 'en',
  deckType: 'vocab',
};
const deckB: Deck = {
  ...deckA,
  id: 'deck-b',
  name: 'B',
  language: 'ja',
};

function card(id: string, state: Card['state'], overrides: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'deck-a',
    group: 'Test',
    front: id,
    back: `${id}-back`,
    state,
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
    ...overrides,
  };
}

test('today queue keeps urgent cards outside the global budget and spends budget on due before new', () => {
  const deckCardSets: DeckCardSet[] = [{
    deck: deckA,
    cards: [
      card('learning-1', 'learning'),
      card('relearning-1', 'relearning'),
      card('due-1', 'graduated', { interval: 3, lastReviewedDate: '2026-07-20' }),
      card('due-2', 'graduated', { interval: 1, lastReviewedDate: '2026-07-22' }),
      card('future-1', 'graduated', { interval: 30, lastReviewedDate: '2026-07-22' }),
      card('new-allowed-1', 'new'),
    ],
  }];

  const candidates = collectTodayQueueCandidates(deckCardSets, 3, '2026-07-23');
  const queue = materializeTodayQueue(candidates, items => [...items]);

  expect(queue.map(item => item.id)).toEqual([
    'learning-1',
    'relearning-1',
    'due-1',
    'due-2',
    'new-allowed-1',
  ]);
  expect(summarizeTodayQueue(candidates)).toEqual({ expected: 5, touchedToday: 0 });
});

test('honors per-deck new limits and the already-introduced global budget', () => {
  const limitedDeck = { ...deckA, newCardLimit: 2 };
  const candidates = collectTodayQueueCandidates([{
    deck: limitedDeck,
    cards: [
      card('introduced-today', 'learning', { introducedDate: '2026-07-23' }),
      card('new-1', 'new'),
      card('new-2', 'new'),
      card('new-3', 'new'),
    ],
  }], 2, '2026-07-23');

  expect(candidates.remainingGlobalBudget).toBe(1);
  expect(candidates.newByDeck[0].slots).toBe(1);
  expect(materializeTodayQueue(candidates, items => [...items]).map(item => item.id))
    .toEqual(['introduced-today', 'new-1']);
});

test('falls back to cards reviewed today only when no pending card exists', () => {
  const candidates = collectTodayQueueCandidates([{
    deck: deckA,
    cards: [
      card('reviewed-today', 'graduated', {
        interval: 30,
        lastReviewedDate: '2026-07-23',
      }),
      card('future', 'graduated', {
        interval: 30,
        lastReviewedDate: '2026-07-22',
      }),
    ],
  }], 30, '2026-07-23');

  expect(materializeTodayQueue(candidates, items => [...items]).map(item => item.id))
    .toEqual(['reviewed-today']);
  expect(summarizeTodayQueue(candidates)).toEqual({ expected: 0, touchedToday: 1 });
});

test('sequential ordering respects deck order and natural card id suffixes', () => {
  const mixedDeckSets: DeckCardSet[] = [
    { deck: deckA, cards: [card('card-10', 'new'), card('card-2', 'new')] },
    {
      deck: deckB,
      cards: [card('card-1', 'new', { deckId: 'deck-b', front: '日本語' })],
    },
  ];
  const input: BuildListeningPlaylistInput = {
    source: 'all',
    order: 'sequential',
    deckCardSets: mixedDeckSets,
    globalLimit: 30,
    today: '2026-07-23',
    seed: 'fixed-seed',
  };

  const playlist = buildListeningPlaylist(input);

  expect(playlist.map(item => item.card.id)).toEqual(['card-2', 'card-10', 'card-1']);
  expect(playlist.map(item => item.ttsLang)).toEqual(['en-US', 'en-US', 'ja-JP']);
});

test('seeded shuffle is deterministic, unique and changes with another seed', () => {
  const items = Array.from({ length: 12 }, (_, index) => index + 1);
  const first = createSeededShuffle('fixed-seed')(items);
  const second = createSeededShuffle('fixed-seed')(items);
  const other = createSeededShuffle('other-seed')(items);

  expect(second).toEqual(first);
  expect(other).not.toEqual(first);
  expect(new Set(first).size).toBe(items.length);
  expect(items).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
});

test('today playlist uses a stable seed and restores a saved card position', () => {
  const deckCardSets: DeckCardSet[] = [{
    deck: deckA,
    cards: [
      card('learning-1', 'learning'),
      card('learning-2', 'learning'),
      card('due-1', 'graduated', { interval: 1, lastReviewedDate: '2026-07-22' }),
      card('new-1', 'new'),
    ],
  }];
  const input: BuildListeningPlaylistInput = {
    source: 'today',
    order: 'shuffle',
    deckCardSets,
    globalLimit: 30,
    today: '2026-07-23',
    seed: 'today-seed',
  };

  const first = buildListeningPlaylist(input);
  const second = buildListeningPlaylist(input);

  expect(second.map(item => item.card.id)).toEqual(first.map(item => item.card.id));
  expect(resolveInitialPlaylistIndex(first, first[2].card.id)).toBe(2);
  expect(resolveInitialPlaylistIndex(first, 'deleted-card')).toBe(0);
});

test('all-card source ignores SRS status and unknown languages fall back to en-US', () => {
  const unknownDeck: Deck = { ...deckA, language: 'unknown' };
  const playlist = buildListeningPlaylist({
    source: 'all',
    order: 'sequential',
    deckCardSets: [{
      deck: unknownDeck,
      cards: [
        card('future', 'graduated', { interval: 365, lastReviewedDate: '2026-07-23' }),
        card('new', 'new'),
      ],
    }],
    globalLimit: 0,
    today: '2026-07-23',
    seed: 'all-seed',
  });

  expect(playlist.map(item => item.card.id)).toEqual(['future', 'new']);
  expect(playlist.every(item => item.ttsLang === 'en-US')).toBe(true);
});
