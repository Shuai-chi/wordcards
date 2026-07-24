import { LANG_CONFIGS } from './languages';
import type { SupportedLang } from './languages';
import {
  collectTodayQueueCandidates,
  materializeTodayQueue,
  type DeckCardSet,
} from './practiceQueue';
import type { Card, Deck } from './types';

export interface ListeningPlaylistItem {
  card: Card;
  deck: Deck;
  ttsLang: string;
}

export interface BuildListeningPlaylistInput {
  source: 'today' | 'all';
  order: 'sequential' | 'shuffle';
  deckCardSets: DeckCardSet[];
  globalLimit: number;
  today: string;
  seed: string;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededShuffle(
  seed: string,
): <T>(items: T[]) => T[] {
  const random = createRandom(seed);
  return <T>(items: T[]) => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  };
}

function numericSuffix(id: string): number | null {
  const match = id.match(/(\d+)$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(value) ? value : null;
}

export function sortCardsSequentially(
  items: ListeningPlaylistItem[],
  deckOrder: string[],
): ListeningPlaylistItem[] {
  const deckRanks = new Map(deckOrder.map((deckId, index) => [deckId, index]));
  return [...items].sort((left, right) => {
    const deckDifference = (deckRanks.get(left.deck.id) ?? Number.MAX_SAFE_INTEGER)
      - (deckRanks.get(right.deck.id) ?? Number.MAX_SAFE_INTEGER);
    if (deckDifference !== 0) return deckDifference;

    const leftSuffix = numericSuffix(left.card.id);
    const rightSuffix = numericSuffix(right.card.id);
    if (leftSuffix !== null && rightSuffix !== null && leftSuffix !== rightSuffix) {
      return leftSuffix - rightSuffix;
    }
    return left.card.id.localeCompare(right.card.id);
  });
}

function getTtsLanguage(deck: Deck): string {
  if (!deck.language) return 'en-US';
  return LANG_CONFIGS[deck.language as SupportedLang]?.ttsLang ?? 'en-US';
}

function createItems(
  cards: Card[],
  deckCardSets: DeckCardSet[],
): ListeningPlaylistItem[] {
  const deckById = new Map(deckCardSets.map(set => [set.deck.id, set.deck]));
  const seen = new Set<string>();
  const items: ListeningPlaylistItem[] = [];

  for (const card of cards) {
    if (seen.has(card.id)) continue;
    const deck = deckById.get(card.deckId);
    if (!deck) continue;
    seen.add(card.id);
    items.push({ card, deck, ttsLang: getTtsLanguage(deck) });
  }
  return items;
}

export function buildListeningPlaylist(
  input: BuildListeningPlaylistInput,
): ListeningPlaylistItem[] {
  const seededShuffle = createSeededShuffle(input.seed);
  const cards = input.source === 'all'
    ? input.deckCardSets.flatMap(set => set.cards)
    : materializeTodayQueue(
      collectTodayQueueCandidates(input.deckCardSets, input.globalLimit, input.today),
      seededShuffle,
    );
  const items = createItems(cards, input.deckCardSets);
  if (input.order === 'shuffle') return seededShuffle(items);
  return sortCardsSequentially(items, input.deckCardSets.map(set => set.deck.id));
}

export function resolveInitialPlaylistIndex(
  items: ListeningPlaylistItem[],
  lastCardId?: string,
): number {
  if (!lastCardId) return 0;
  const index = items.findIndex(item => item.card.id === lastCardId);
  return index >= 0 ? index : 0;
}
