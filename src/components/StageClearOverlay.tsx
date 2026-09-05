"use client";

interface StageClearOverlayProps {
  tierName?: string;
  onContinue: () => void;
}

export function StageClearOverlay({ tierName, onContinue }: StageClearOverlayProps) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4 backdrop-blur-md">
      <p className="zone-label text-[#7aab9a]">試煉圓滿</p>
      <h1 className="victory-title mt-2 text-2xl font-extrabold tracking-[0.3em]">
        重天已破
      </h1>
      {tierName && (
        <p className="mt-3 text-sm text-stone-400">【{tierName}】通關</p>
      )}
      <p className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-stone-500">
        本章秘境已封印。若要再入，須從山門重新開啟挑戰。
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="btn-start-game mt-8 !px-10"
      >
        <span className="relative block text-base font-bold tracking-[0.28em]">
          返回山門
        </span>
      </button>
    </div>
  );
}
