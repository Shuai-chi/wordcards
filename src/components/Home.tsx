import { BookOpen, MessageSquareQuote } from 'lucide-react';
import type { Deck, DeckType } from '../lib/types';
import type { UIStrings } from '../lib/languages';
import { t } from '../lib/languages';

interface Props {
  decks: Deck[];
  strings: UIStrings;
  onSelectMode: (mode: DeckType) => void;
}

const MODES = [
  {
    type: 'vocab' as const,
    titleKey: 'modeVocab' as const,
    descriptionKey: 'modeVocabDesc' as const,
    icon: BookOpen,
  },
  {
    type: 'phrase' as const,
    titleKey: 'modePhrase' as const,
    descriptionKey: 'modePhraseDesc' as const,
    icon: MessageSquareQuote,
  },
];

export default function Home({ decks, strings, onSelectMode }: Props) {
  return (
    <div className="min-h-[calc(100dvh-8.5rem)] flex flex-col items-center justify-center py-8 md:py-12">
      <div className="w-full max-w-3xl">
        <h1
          className="text-3xl md:text-4xl font-black tracking-tight text-center mb-8 md:mb-10"
          style={{ letterSpacing: '-0.03em' }}
        >
          {strings.homeTitle}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {MODES.map(({ type, titleKey, descriptionKey, icon: Icon }) => {
            const deckCount = decks.filter(deck => (deck.deckType ?? 'vocab') === type).length;

            return (
              <button
                key={type}
                type="button"
                className="card-container p-6 md:p-8 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'var(--card)', borderRadius: '1.5rem' }}
                onClick={() => onSelectMode(type)}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, var(--card))',
                    color: 'var(--primary)',
                  }}
                >
                  <Icon className="w-7 h-7" />
                </div>

                <div className="text-2xl font-black mb-2" style={{ letterSpacing: '-0.02em' }}>
                  {strings[titleKey]}
                </div>
                <div className="text-sm md:text-base leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
                  {strings[descriptionKey]}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                  {t(strings, 'deckCountLabel', { n: deckCount })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
