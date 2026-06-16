import { ArrowLeft, Sparkles } from 'lucide-react';
import type { UIStrings } from '../lib/languages';
import { t } from '../lib/languages';

interface Props {
  seenCount: number;
  strings: UIStrings;
  onBack: () => void;
}

export default function FinishedView({ seenCount, strings, onBack }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-6">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--primary) 18%, transparent)',
        }}
      >
        <Sparkles className="w-9 h-9" style={{ color: 'var(--primary)' }} />
      </div>

      {/* Message */}
      <div>
        <h2
          className="text-2xl md:text-3xl font-black mb-2"
          style={{ letterSpacing: '-0.02em' }}
        >
          {strings.practiceComplete}
        </h2>
        <p className="text-base" style={{ color: 'var(--muted)' }}>
          {t(strings, 'practiceCompleteMsg', { n: seenCount })}
        </p>
      </div>

      {/* Pill */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{ background: 'var(--secondary)', color: 'var(--muted)' }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--success)' }}
        />
        {strings.dailyRecorded}
      </div>

      {/* CTA */}
      <button className="btn btn-primary gap-2 min-w-[180px]" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        {strings.backToCenter}
      </button>
    </div>
  );
}
