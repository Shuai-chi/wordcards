export interface Deck {
  id: string;
  name: string;
  newCardLimit?: number;
  cardCount?: number;
  language?: string; // SupportedLang code, e.g. 'en' | 'ja' | 'ko' ...
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
  // Universal fields (Aligned with srs-flashcard 9-column standard)
  inflections?: string;
  derivatives?: string;
  ipa?: string;
  pos?: string;
  definition?: string;
  definitionLang?: string; // secondary language code, e.g. 'zh' | 'jp' | 'ko' | 'de' | 'es' | 'fr' | 'th'; undefined = monolingual
  example?: string;
  collocations?: string;
  context_type?: string;
  // Language-specific extra fields
  kanji?: string;       // Japanese kanji form
  hanja?: string;       // Korean hanja form
  romaji?: string;      // Romanization (JP/KO/TH)
  gender?: string;      // Grammatical gender (DE/ES/FR)
  tone?: string;        // Thai tone marker
  // SRS state
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
