export interface Deck {
  id: string;
  name: string;
  newCardLimit?: number;
  cardCount?: number;
}

export type CardState = 'new' | 'learning' | 'relearning' | 'graduated';

export interface CardBaselineStats {
  easeFactor: number;
  interval: number;
  state: CardState;
  failCount: number;
  hardCount: number;
}

export interface Card {
  id: string;
  deckId: string;
  group: string;
  front: string;
  back: string;
  morphology?: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
  example?: string;
  collocations?: string;
  contextType?: string;
  state: CardState;
  interval: number;
  easeFactor: number;
  failCount: number;
  hardCount: number;
  introducedDate: string;
  lastReviewedDate: string;
  baselineStats?: CardBaselineStats;
  todayRating?: "again" | "hard" | "good" | "easy";
}

export interface ClicksStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface Report {
  dateStr: string;
  uniqueCards: number;
  clicks: ClicksStats;
}
