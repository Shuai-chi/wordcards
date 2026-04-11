import type { Card } from './types';
import { getTodayStr } from './db';

export function updateSRS(card: Card, buttonIndex: number): Card {
  const nextCard: Card = {
    ...card,
    baselineStats: card.baselineStats ? { ...card.baselineStats } : undefined
  };
  const todayStr = getTodayStr();

  if (nextCard.lastReviewedDate === todayStr) {
    if (nextCard.baselineStats) {
      nextCard.easeFactor = nextCard.baselineStats.easeFactor;
      nextCard.interval = nextCard.baselineStats.interval;
      nextCard.state = nextCard.baselineStats.state;
      nextCard.failCount = nextCard.baselineStats.failCount || 0;
      nextCard.hardCount = nextCard.baselineStats.hardCount || 0;
    }
  } else {
    nextCard.baselineStats = { 
      easeFactor: nextCard.easeFactor || 2.5, 
      interval: nextCard.interval || 0, 
      state: nextCard.state || 'new',
      failCount: nextCard.failCount || 0,
      hardCount: nextCard.hardCount || 0
    };
    if ((nextCard.state || 'new') === 'new' && !nextCard.introducedDate) {
      nextCard.introducedDate = todayStr;
    }
  }

  nextCard.lastReviewedDate = todayStr;
  
  let { interval = 0, easeFactor = 2.5, failCount = 0, hardCount = 0, state = 'new' } = nextCard;
  
  if (buttonIndex < 1 || buttonIndex > 4) return nextCard;
  
  const previousState = state;

  if (buttonIndex === 1) { // again
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    interval = 0;
    failCount += 1;
    state = (previousState === 'new' || previousState === 'learning') ? 'learning' : 'relearning';
  } else if (buttonIndex === 2) { // hard
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    hardCount += 1;
    if (previousState === 'new' || previousState === 'learning' || previousState === 'relearning') {
      interval = 1;
      state = 'learning';
    } else {
      interval = Math.max(1, Math.round(interval * 1.2));
    }
  } else if (buttonIndex === 3) { // good
    if (previousState === 'new' || previousState === 'learning' || previousState === 'relearning') {
      interval = 1;
      state = 'graduated';
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
    }
  } else if (buttonIndex === 4) { // easy
    easeFactor += 0.15;
    if (previousState === 'new' || previousState === 'learning' || previousState === 'relearning') {
      interval = 4;
      state = 'graduated';
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor * 1.3));
    }
  }

  nextCard.easeFactor = easeFactor;
  nextCard.interval = interval;
  nextCard.failCount = failCount;
  nextCard.hardCount = hardCount;
  nextCard.state = state;

  return nextCard;
}

export const getNextReviewDate = (card: Card): string | null => {
  if (card.state === 'new' || card.state === 'learning' || card.state === 'relearning') {
    return card.lastReviewedDate || null;
  }
  if (!card.lastReviewedDate || card.interval === undefined) return null;
  const d = new Date(card.lastReviewedDate + 'T00:00:00');
  d.setDate(d.getDate() + card.interval);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const shuffleArray = <T,>(arr: T[]): T[] => {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};
