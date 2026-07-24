import { BookOpen, Target } from 'lucide-react';
import type { UIStrings } from '../lib/languages';
import type { PersonalizationStrings } from '../lib/personalizationStrings';

interface Props {
  strings: UIStrings;
  copy: PersonalizationStrings;
}

export default function AppearancePreview({ strings, copy }: Props) {
  return (
    <section className="appearance-preview settings-section" aria-labelledby="appearance-preview-heading" data-testid="appearance-preview">
      <h3 id="appearance-preview-heading" className="appearance-preview__heading">{copy.preview}</h3>
      <div className="appearance-preview__panels">
        <div className="appearance-preview__panel appearance-preview__interface-panel">
          <span className="appearance-preview__panel-label">{strings.homeTitle}</span>
          <span className="appearance-preview__base-text" data-testid="appearance-preview-base-text">
            {copy.baseTextSize}
          </span>
          <div className="appearance-preview__mode-card" data-testid="appearance-preview-mode-card">
            <span className="appearance-preview__icon" aria-hidden="true"><BookOpen /></span>
            <span className="appearance-preview__card-title">{strings.modeVocab}</span>
            <span className="appearance-preview__card-body preview-secondary-copy">{strings.modeVocabDesc}</span>
          </div>
          <div className="appearance-preview__stat-card">
            <span className="appearance-preview__stat-label"><Target aria-hidden="true" />{strings.todayPracticed}</span>
            <span className="appearance-preview__stat-number" data-testid="appearance-preview-stat-number">128</span>
          </div>
        </div>
        <div className="appearance-preview__panel appearance-preview__study-card" data-testid="appearance-preview-study-card">
          <span className="appearance-preview__panel-label">{copy.studyPromptSize}</span>
          <span className="appearance-preview__study-prompt" data-testid="appearance-preview-study-prompt">example</span>
          <span className="appearance-preview__study-content" data-testid="appearance-preview-study-content">
            {copy.previewStudyAnswer}
          </span>
        </div>
      </div>
    </section>
  );
}
