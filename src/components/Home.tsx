import { BookOpen, MessageSquareQuote } from 'lucide-react';
import type { Deck, DeckType } from '../lib/types';
import type { UIStrings } from '../lib/languages';
import { t } from '../lib/languages';
import type { ActiveIconAssets } from '../lib/iconAssets';
import CustomIcon from './CustomIcon';

interface Props {
  decks: Deck[];
  strings: UIStrings;
  iconAssets?: ActiveIconAssets;
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

export default function Home({ decks, strings, iconAssets = {}, onSelectMode }: Props) {
  return (
    <div className="home-shell">
      <div className="mode-card-section w-full max-w-3xl">
        <h1
          className="home-heading font-black tracking-tight text-center"
          style={{ letterSpacing: '-0.03em' }}
        >
          {strings.homeTitle}
        </h1>

        <div className="mode-card-grid">
          {MODES.map(({ type, titleKey, descriptionKey, icon: Icon }) => {
            const deckCount = decks.filter(deck => (deck.deckType ?? 'vocab') === type).length;

            return (
              <button
                key={type}
                type="button"
                data-testid={`mode-card-${type}`}
                className="card-container mode-card"
                onClick={() => onSelectMode(type)}
              >
                <div className="mode-card__primary" data-testid="mode-primary">
                  <CustomIcon
                    asset={iconAssets[type]}
                    fallback={Icon}
                    className="mode-card__icon"
                    fallbackClassName="mode-card__fallback-icon"
                  />
                  <div className="mode-card__title font-black" data-testid="mode-title">
                    {strings[titleKey]}
                  </div>
                </div>

                <div className="mode-card__supporting">
                  <div className="mode-card__description" style={{ color: 'var(--muted)' }}>
                    {strings[descriptionKey]}
                  </div>
                  <div className="mode-card__count font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                    {t(strings, 'deckCountLabel', { n: deckCount })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
