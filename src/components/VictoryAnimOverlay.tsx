"use client";

interface VictoryAnimOverlayProps {
  enemyName: string;
}

export function VictoryAnimOverlay({ enemyName }: VictoryAnimOverlayProps) {
  return (
    <div className="victory-anim-overlay animate-fade-in pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center">
      <div className="victory-flash absolute inset-0" aria-hidden />
      <div className="relative px-6 text-center">
        <p className="zone-label text-[#7aab9a]/90">斬殺確認</p>
        <h1 className="victory-title mt-2 text-2xl font-extrabold tracking-[0.35em] sm:text-3xl">
          一劍斬落・強敵伏誅
        </h1>
        <p className="mt-3 text-sm text-stone-400">
          {enemyName} 已伏誅
        </p>
      </div>
    </div>
  );
}
