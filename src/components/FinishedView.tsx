import { Target, ArrowLeft } from 'lucide-react';

export default function FinishedView({ seenCount, onBack }: { seenCount: number; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border mt-12 shadow-sm rounded-xl text-center">
      <h2 className="text-3xl font-extrabold mb-4 mt-4">練習完成！</h2>
      <Target className="w-20 h-20 text-accent mb-6 bg-accent/10 p-4 rounded-full" />
      <p className="text-muted text-lg font-medium mb-10">您剛才完成了 <span className="text-foreground font-bold">{seenCount}</span> 張卡片的挑戰。</p>
      <button 
        className="btn btn-primary min-w-[200px]"
        onClick={onBack}
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        回到學習中心
      </button>
    </div>
  );
}
