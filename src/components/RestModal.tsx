"use client";

interface RestModalProps {
  maxHp: number;
  currentHp: number;
  onHeal: () => void;
  onGainSpirit: () => void;
}

export function RestModal({
  maxHp,
  currentHp,
  onHeal,
  onGainSpirit,
}: RestModalProps) {
  const healAmount = Math.floor(maxHp * 0.3);
  const atFull = currentHp >= maxHp;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="glass-panel-gold w-full max-w-md p-4 sm:p-5">
        <p className="zone-label text-[#8a7340]">秘境休整</p>
        <h2 className="mt-1 text-lg font-bold tracking-[0.2em] text-[#c9a84c]">
          靈泉休整
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-stone-300">
          泉眼隱於石縫，水汽清涼。此刻只能擇一：療傷，或採納散落靈息化為靈石。
        </p>
        <p className="mt-2 text-[11px] tracking-wide text-stone-500">
          氣血 {currentHp}/{maxHp}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={atFull}
            onClick={onHeal}
            className={`rounded-lg border px-3 py-3 text-left transition active:scale-[0.99] ${
              atFull
                ? "cursor-not-allowed border-stone-700/40 bg-stone-950/40 opacity-45"
                : "border-[#8a7340]/40 bg-stone-950/70 hover:border-[#c9a84c]/55 hover:bg-stone-900/80"
            }`}
          >
            <span className="block text-sm font-semibold tracking-wide text-[#e8e0d4]">
              調息療傷
            </span>
            <span className="mt-1 block text-[11px] text-stone-400">
              {atFull ? "氣血已滿" : `恢復 ${healAmount} 氣血`}
            </span>
          </button>

          <button
            type="button"
            onClick={onGainSpirit}
            className="rounded-lg border border-[#8a7340]/40 bg-stone-950/70 px-3 py-3 text-left transition hover:border-[#c9a84c]/55 hover:bg-stone-900/80 active:scale-[0.99]"
          >
            <span className="block text-sm font-semibold tracking-wide text-[#e8e0d4]">
              吐納聚靈
            </span>
            <span className="mt-1 block text-[11px] text-stone-400">
              獲得 80 靈石
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
