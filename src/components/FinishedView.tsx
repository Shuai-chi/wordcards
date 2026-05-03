import { ArrowLeft, Sparkles } from 'lucide-react';

export default function FinishedView({ seenCount, onBack }: { seenCount: number; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-6">
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--primary) 20%, transparent)',
        }}
      >
        <Sparkles className="w-9 h-9" style={{ color: 'var(--primary)' }} />
      </div>

      {/* Message */}
      <div>
        <h2 className="text-2xl md:text-3xl font-black mb-2">練習完成！</h2>
        <p className="text-base text-muted">
          你完成了{' '}
          <span className="font-bold" style={{ color: 'var(--foreground)' }}>
            {seenCount}
          </span>{' '}
          張卡片的挑戰
        </p>
      </div>

      {/* Stats pill */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{
          background: 'var(--secondary)',
          color: 'var(--muted)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--success)' }}
        />
        今日學習已記錄
      </div>

      {/* CTA */}
      <button className="btn btn-primary gap-2 min-w-[180px]" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        回到學習中心
      </button>
    </div>
  );
}
