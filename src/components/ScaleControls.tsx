import { useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import {
  UI_SCALE_CONSTRAINTS,
  resetAllUiScales,
  resetUiScale,
  setUiScale,
  type UiPreferencesV1,
  type UiScaleKey,
} from '../lib/uiPreferences';
import type { PersonalizationStrings } from '../lib/personalizationStrings';

interface Props {
  settings: UiPreferencesV1;
  copy: PersonalizationStrings;
  onChange: (settings: UiPreferencesV1) => void;
}

function percentOf(settings: UiPreferencesV1, key: UiScaleKey): number {
  return Math.round(settings.scales[key] * 100);
}

function draftValues(settings: UiPreferencesV1): Record<UiScaleKey, string> {
  return Object.fromEntries(
    (Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[]).map(key => [key, String(percentOf(settings, key))]),
  ) as Record<UiScaleKey, string>;
}

export default function ScaleControls({ settings, copy, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<UiScaleKey, string>>(() => draftValues(settings));
  const labels: Record<UiScaleKey, string> = {
    base: copy.baseTextSize,
    pageHeading: copy.pageHeadingSize,
    cardTitle: copy.cardTitleSize,
    cardBody: copy.cardBodySize,
    statNumber: copy.statNumberSize,
    icon: copy.iconSize,
    studyPrompt: copy.studyPromptSize,
    studyContent: copy.studyContentSize,
  };

  const syncDraft = (key: UiScaleKey, percent: number) => {
    setDrafts(current => ({ ...current, [key]: String(percent) }));
  };

  const applyPercent = (key: UiScaleKey, percent: number) => {
    const next = setUiScale(settings, key, percent / 100);
    onChange(next);
    syncDraft(key, percentOf(next, key));
  };

  const commitDraft = (key: UiScaleKey) => {
    const raw = drafts[key].trim();
    if (!raw) {
      syncDraft(key, percentOf(settings, key));
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      syncDraft(key, percentOf(settings, key));
      return;
    }
    applyPercent(key, parsed);
  };

  const resetAll = () => {
    const next = resetAllUiScales(settings);
    onChange(next);
    setDrafts(draftValues(next));
  };

  return (
    <section aria-labelledby="typography-heading" className="settings-section">
      <div className="settings-section__heading">
        <h3 id="typography-heading" className="text-sm font-bold">{copy.typography}</h3>
        <button type="button" className="settings-reset-link" data-testid="scale-reset-all" onClick={resetAll}>
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          {copy.resetAll}
        </button>
      </div>
      <div className="scale-control-list">
        {(Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[]).map(key => {
          const constraint = UI_SCALE_CONSTRAINTS[key];
          const percent = percentOf(settings, key);
          const minPercent = Math.round(constraint.min * 100);
          const maxPercent = Math.round(constraint.max * 100);
          const stepPercent = Math.round(constraint.step * 100);
          return (
            <div className="scale-control" key={key}>
              <div className="scale-control__header">
                <label htmlFor={`scale-${key}`} className="text-sm font-semibold">{labels[key]}</label>
                <span className="scale-control__range-label">{minPercent}%–{maxPercent}%</span>
                <button
                  type="button"
                  className="settings-reset-link"
                  data-testid={`scale-${key}-reset`}
                  onClick={() => {
                    const next = resetUiScale(settings, key);
                    onChange(next);
                    syncDraft(key, percentOf(next, key));
                  }}
                >
                  {copy.reset}
                </button>
              </div>
              <div className="scale-stepper">
                <button
                  type="button"
                  className="scale-stepper__button"
                  data-testid={`scale-${key}-decrease`}
                  aria-label={`${copy.decrease} ${labels[key]}`}
                  disabled={percent <= minPercent}
                  onClick={() => applyPercent(key, percent - stepPercent)}
                >
                  <Minus aria-hidden="true" />
                </button>
                <div className="scale-stepper__input-wrap">
                  <input
                    id={`scale-${key}`}
                    data-testid={`scale-${key}`}
                    className="scale-stepper__input"
                    type="number"
                    inputMode="numeric"
                    min={minPercent}
                    max={maxPercent}
                    step={stepPercent}
                    value={drafts[key]}
                    onChange={event => {
                      const raw = event.target.value;
                      setDrafts(current => ({ ...current, [key]: raw }));
                      const parsed = Number(raw);
                      if (
                        raw !== ''
                        && Number.isFinite(parsed)
                        && parsed >= minPercent
                        && parsed <= maxPercent
                        && (parsed - minPercent) % stepPercent === 0
                      ) {
                        onChange(setUiScale(settings, key, parsed / 100));
                      }
                    }}
                    onBlur={() => commitDraft(key)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitDraft(key);
                      }
                    }}
                  />
                  <span aria-hidden="true">%</span>
                </div>
                <button
                  type="button"
                  className="scale-stepper__button"
                  data-testid={`scale-${key}-increase`}
                  aria-label={`${copy.increase} ${labels[key]}`}
                  disabled={percent >= maxPercent}
                  onClick={() => applyPercent(key, percent + stepPercent)}
                >
                  <Plus aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
