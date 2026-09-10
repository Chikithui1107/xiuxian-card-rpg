"use client";

import { createPortal } from "react-dom";

interface CardDetailPanelProps {
  open: boolean;
  name: string;
  type: string;
  cost: number;
  detail: string;
}

/** 獨立詳情面板：不改手牌 transform／扇形 */
export function CardDetailPanel({
  open,
  name,
  type,
  cost,
  detail,
}: CardDetailPanelProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[100001] flex justify-center px-3"
      style={{
        bottom: "calc(var(--hand-zone-h, 13rem) + 4.5rem + env(safe-area-inset-bottom, 0px))",
      }}
      aria-live="polite"
    >
      <div className="max-w-sm rounded-sm border border-[#8a7340]/35 bg-[#121110]/92 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-bold tracking-wide text-[#f0e6d3]">
            {name}
          </p>
          <p className="shrink-0 text-[10px] tabular-nums text-[#7aab9a]">
            真元 {cost}
          </p>
        </div>
        <p className="mt-0.5 text-[9px] tracking-[0.2em] text-stone-500">
          {type}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-stone-300">
          {detail}
        </p>
      </div>
    </div>,
    document.body
  );
}
