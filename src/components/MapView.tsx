"use client";

import type { MapNode, NodeType } from "@/types/map";

const NODE_BADGES: Record<NodeType, { icon: string; bg: string }> = {
  combat: {
    icon: "⚔️",
    bg: "bg-red-950/80 border-red-600/60 text-red-200",
  },
  elite: {
    icon: "💀",
    bg: "bg-purple-950/80 border-purple-600/60 text-purple-200",
  },
  rest: {
    icon: "🏕️",
    bg: "bg-blue-950/80 border-blue-600/60 text-blue-200",
  },
  shop: {
    icon: "💰",
    bg: "bg-amber-950/80 border-amber-600/60 text-amber-200",
  },
  event: {
    icon: "❓",
    bg: "bg-emerald-950/80 border-emerald-600/60 text-emerald-200",
  },
  boss: {
    icon: "👑",
    bg: "bg-orange-950/80 border-orange-500 text-orange-100 animate-pulse",
  },
};

interface MapViewProps {
  map: MapNode[][];
  tierName?: string;
  playerHp: number;
  maxHp: number;
  currentNodeId?: string | null;
  mapMessage?: string | null;
  onSelectNode: (node: MapNode) => void;
  onAbandon?: () => void;
}

export function MapView({
  map,
  tierName,
  playerHp,
  maxHp,
  currentNodeId,
  mapMessage,
  onSelectNode,
  onAbandon,
}: MapViewProps) {
  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);
  const chapter = map[0]?.[0]?.chapter ?? 1;

  return (
    <div className="flex flex-col items-center px-4 py-5 font-serif text-stone-100">
      <div className="mb-5 text-center">
        <h2 className="text-xs uppercase tracking-widest text-amber-500">
          第{chapter}章
        </h2>
        <h1 className="mt-1 text-xl font-bold tracking-wider text-amber-200">
          月夜秘境：{tierName ?? "初入江湖"}
        </h1>
        <p className="mt-1 text-[10px] text-stone-500">
          由下往上，擇路而行，直抵通天塔主
        </p>
      </div>

      <div className="mb-4 w-full max-w-md rounded-xl border border-amber-500/20 bg-stone-900/80 px-4 py-2.5">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-blue-300">氣血</span>
          <span className="text-stone-400">
            {playerHp.toLocaleString()} / {maxHp.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-900 to-red-500 transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {onAbandon && (
        <button
          onClick={onAbandon}
          className="mb-4 self-start rounded-lg border border-stone-700 px-3 py-1 text-xs text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-200"
        >
          ← 放棄試煉
        </button>
      )}

      <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-2xl backdrop-blur">
        <div className="flex flex-col-reverse gap-4">
          {map.map((stepNodes, stepIdx) => (
            <div key={stepIdx} className="flex flex-col items-center">
              <span className="mb-2 text-[10px] text-stone-500">
                第 {stepIdx + 1} 步
              </span>
              <div className="flex w-full justify-center gap-3">
                {stepNodes.map((node) => {
                  const badge = NODE_BADGES[node.type];
                  let stateStyle =
                    "opacity-30 border-stone-800 cursor-not-allowed grayscale";

                  if (node.status === "available") {
                    stateStyle =
                      "opacity-100 border-amber-400/80 cursor-pointer hover:scale-105 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/30";
                  } else if (node.status === "completed") {
                    stateStyle =
                      "opacity-40 border-stone-700 bg-stone-900 cursor-default";
                  }

                  const isCurrent = currentNodeId === node.id;

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      disabled={node.status !== "available"}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-all sm:text-sm ${badge.bg} ${stateStyle} ${isCurrent ? "ring-2 ring-amber-300/60" : ""}`}
                    >
                      <span className="shrink-0">{badge.icon}</span>
                      <span className="truncate">{node.title}</span>
                      {node.status === "completed" && (
                        <span className="shrink-0 text-emerald-400">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {mapMessage && (
        <div className="mt-5 w-full max-w-md rounded-xl border border-amber-500/40 bg-stone-900 p-4 text-center">
          <p className="mb-1 text-xs text-amber-400">探索結果</p>
          <p className="text-sm font-semibold text-amber-100">{mapMessage}</p>
        </div>
      )}
    </div>
  );
}
