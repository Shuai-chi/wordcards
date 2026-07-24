import type { Card, Deck } from './types';

export interface DeckCardSet {
  deck: Deck;
  cards: Card[];
}

export interface TodayQueueCandidates {
  urgent: Card[];
  due: Card[];
  newByDeck: Array<{ deckId: string; slots: number; cards: Card[] }>;
  reviewedToday: Card[];
  remainingGlobalBudget: number;
}

export interface TodayQueueSummary {
  expected: number;
  touchedToday: number;
}

function addDays(dateString: string, days: number): string | null {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isDue(card: Card, today: string): boolean {
  if (card.state !== 'graduated') return false;
  const nextReviewDate = addDays(card.lastReviewedDate, card.interval);
  return nextReviewDate !== null && nextReviewDate <= today;
}

export function collectTodayQueueCandidates(
  deckCardSets: DeckCardSet[],
  globalLimit: number,
  today: string,
): TodayQueueCandidates {
  const urgent: Card[] = [];
  const due: Card[] = [];
  const reviewedToday: Card[] = [];
  const newByDeck: TodayQueueCandidates['newByDeck'] = [];
  let introducedGloballyToday = 0;

  for (const { deck, cards } of deckCardSets) {
    let introducedInDeckToday = 0;
    const newCards: Card[] = [];

    for (const card of cards) {
      if (card.introducedDate === today) {
        introducedInDeckToday += 1;
        introducedGloballyToday += 1;
      }
      if (card.lastReviewedDate === today) reviewedToday.push(card);

      if (card.state === 'new') {
        newCards.push(card);
      } else if (card.state === 'learning' || card.state === 'relearning') {
        urgent.push(card);
      } else if (isDue(card, today)) {
        due.push(card);
      }
    }

    newByDeck.push({
      deckId: deck.id,
      slots: Math.max(0, (deck.newCardLimit ?? 20) - introducedInDeckToday),
      cards: newCards,
    });
  }

  return {
    urgent,
    due,
    newByDeck,
    reviewedToday,
    remainingGlobalBudget: Math.max(0, globalLimit - introducedGloballyToday),
  };
}

export function summarizeTodayQueue(
  candidates: TodayQueueCandidates,
): TodayQueueSummary {
  let remainingBudget = candidates.remainingGlobalBudget;
  const dueCount = Math.min(candidates.due.length, remainingBudget);
  remainingBudget -= dueCount;
  const availableNew = candidates.newByDeck.reduce(
    (total, group) => total + Math.min(group.cards.length, group.slots),
    0,
  );
  return {
    expected: candidates.urgent.length + dueCount + Math.min(availableNew, remainingBudget),
    touchedToday: candidates.reviewedToday.length,
  };
}

export function materializeTodayQueue(
  candidates: TodayQueueCandidates,
  randomize: <T>(items: T[]) => T[],
): Card[] {
  const queue = randomize([...candidates.urgent]);
  let remainingBudget = candidates.remainingGlobalBudget;

  const due = randomize([...candidates.due]).slice(0, remainingBudget);
  queue.push(...due);
  remainingBudget -= due.length;

  const allowedNew = candidates.newByDeck.flatMap(group => (
    randomize([...group.cards]).slice(0, group.slots)
  ));
  queue.push(...randomize(allowedNew).slice(0, remainingBudget));

  if (queue.length > 0) return queue;
  return randomize([...candidates.reviewedToday]);
}
