"use client";

import type { MapNode, NodeType } from "@/types/map";
import { NODE_LABELS } from "@/lib/map";

const NODE_BADGES: Record<NodeType, { icon: string; bg: string }> = {
  combat: {
    icon: "妖",
    bg: "bg-stone-950/90 border-[#8b3a3a]/55 text-[#c48888]",
  },
  elite: {
    icon: "王",
    bg: "bg-stone-950/90 border-[#6a5a8a]/60 text-[#b8a8d8]",
  },
  rest: {
    icon: "息",
    bg: "bg-stone-950/90 border-[#4a7c6f]/55 text-[#7aab9a]",
  },
  shop: {
    icon: "坊",
    bg: "bg-stone-950/90 border-[#8a7340]/55 text-[#c9a84c]",
  },
  event: {
    icon: "緣",
    bg: "bg-stone-950/90 border-[#4a7c6f]/45 text-[#9ab8aa]",
  },
  boss: {
    icon: "塔",
    bg: "bg-stone-950/90 border-[#c9a84c]/65 text-[#e8d5a3]",
  },
};

interface MapViewProps {
  map: MapNode[][];
  tierName?: string;
  playerHp: number;
  maxHp: number;
  currentNodeId?: string | null;
  mapMessage?: string | null;
  readOnly?: boolean;
  onSelectNode?: (node: MapNode) => void;
}

export function MapView({
  map,
  tierName,
  playerHp,
  maxHp,
  currentNodeId,
  mapMessage,
  readOnly = false,
  onSelectNode,
}: MapViewProps) {
  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);
  const chapter = map[0]?.[0]?.chapter ?? 1;

  return (
    <div className="flex flex-col items-center px-4 py-5 font-serif text-stone-100">
      <div className="mb-5 text-center">
        <p className="zone-label text-[#7aab9a]">第{chapter}章</p>
        <h1 className="title-ink mt-1 text-xl font-bold tracking-wider">
          月夜秘境：{tierName ?? "初入江湖"}
        </h1>
        <p className="mt-1 text-[10px] text-stone-500">
          {readOnly
            ? "此圖僅供觀覽，請關閉後於岔路中擇途"
            : "由下往上，擇路而行，直抵通天塔主"}
        </p>
      </div>

      {!readOnly && (
        <div className="glass-panel-gold mb-4 w-full max-w-md px-4 py-2.5">
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="text-[#7aab9a]">氣血</span>
            <span className="stat-value text-[#9ab8aa]">
              {playerHp.toLocaleString()} / {maxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="hp-bar-fill h-full rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="glass-panel w-full max-w-md p-4">
        <div className="flex flex-col-reverse gap-3.5">
          {map.map((stepNodes, stepIdx) => (
            <div key={stepIdx} className="flex flex-col items-center">
              <span className="mb-1.5 text-[10px] tracking-wider text-stone-500">
                第 {stepIdx + 1} 步
              </span>
              <div className="flex w-full justify-center gap-2.5">
                {stepNodes.map((node) => {
                  const badge = NODE_BADGES[node.type];
                  let stateStyle =
                    "opacity-35 border-stone-800 cursor-default";

                  if (node.status === "available") {
                    stateStyle = readOnly
                      ? "opacity-100 border-[#c9a84c]/55 ring-1 ring-[#c9a84c]/25"
                      : "opacity-100 border-[#c9a84c]/55 cursor-pointer hover:border-[#c9a84c]/80 ring-1 ring-[#c9a84c]/20";
                  } else if (node.status === "completed") {
                    stateStyle =
                      "opacity-50 border-stone-700 bg-stone-950/80 cursor-default";
                  }

                  const isCurrent =
                    currentNodeId === node.id ||
                    (readOnly &&
                      !currentNodeId &&
                      node.status === "available");
                  const clickable = !readOnly && node.status === "available";

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        if (clickable) onSelectNode?.(node);
                      }}
                      disabled={!clickable}
                      title={NODE_LABELS[node.type]}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-2.5 py-2.5 text-[11px] font-medium transition-all sm:text-xs ${badge.bg} ${stateStyle} ${isCurrent ? "ring-2 ring-[#c9a84c]/45" : ""}`}
                    >
                      <span className="shrink-0 text-[10px] tracking-wider opacity-80">
                        {badge.icon}
                      </span>
                      <span className="truncate">{node.title}</span>
                      {node.status === "completed" && (
                        <span className="shrink-0 text-[#7aab9a]">成</span>
                      )}
                      {isCurrent && (
                        <span className="shrink-0 text-[#c9a84c]">今</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {mapMessage && !readOnly && (
        <div className="glass-panel-gold mt-5 w-full max-w-md p-4 text-center">
          <p className="zone-label text-[#8a7340]">探索結果</p>
          <p className="mt-1 text-sm font-semibold text-[#e8e0d4]">{mapMessage}</p>
        </div>
      )}
    </div>
  );
}
