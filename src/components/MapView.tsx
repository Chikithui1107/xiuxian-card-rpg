"use client";

import { NODE_ICONS } from "@/lib/map";
import type { MapNode } from "@/types/map";

interface MapViewProps {
  map: MapNode[][];
  tierName?: string;
  playerHp: number;
  maxHp: number;
  currentNodeId?: string | null;
  onSelectNode: (node: MapNode) => void;
  onAbandon?: () => void;
}

export function MapView({
  map,
  tierName,
  playerHp,
  maxHp,
  currentNodeId,
  onSelectNode,
  onAbandon,
}: MapViewProps) {
  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);

  return (
    <div className="flex flex-col gap-3 px-3 pt-3 pb-4">
      <div className="text-center">
        <p className="zone-label">登天路</p>
        <h2 className="title-ink mt-1 text-lg font-bold">
          ⛰ {tierName ?? "修仙秘境"} · 登天路
        </h2>
        <p className="mt-1 text-[10px] text-stone-500">
          由下往上，擇路而行，直抵通天塔主
        </p>
      </div>

      <div className="glass-panel-gold px-3 py-2">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-[#7aab9a]">氣血</span>
          <span className="text-[#9ab8aa]">
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

      {onAbandon && (
        <button
          onClick={onAbandon}
          className="btn-cyber self-start px-3 py-1 text-xs"
        >
          ← 放棄試煉
        </button>
      )}

      <div className="glass-panel overflow-x-auto p-4">
        <div className="flex min-w-[18rem] flex-col-reverse gap-5">
          {map.map((tierNodes, tierIndex) => (
            <div key={tierIndex} className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-right text-[9px] text-stone-500">
                第 {tierIndex + 1} 層
              </span>
              <div className="flex flex-1 flex-wrap justify-center gap-3">
                {tierNodes.map((node) => {
                  const config = NODE_ICONS[node.type];
                  let statusStyle =
                    "opacity-35 cursor-not-allowed border-stone-700/50";

                  if (node.status === "available") {
                    statusStyle = `opacity-100 cursor-pointer hover:scale-105 active:scale-95 shadow-md ${config.ring}`;
                  } else if (node.status === "completed") {
                    statusStyle =
                      "opacity-55 cursor-default border-stone-600/40 bg-stone-950/80";
                  }

                  const isCurrent = currentNodeId === node.id;

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      disabled={node.status !== "available"}
                      className={`rounded-lg border-2 px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 ${config.color} ${statusStyle} ${isCurrent ? "ring-2 ring-[#c9a84c]/50" : ""}`}
                    >
                      {config.label}
                      {node.status === "completed" && (
                        <span className="ml-1 text-[#7aab9a]">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentNodeId && (
        <p className="text-center text-[10px] text-stone-500">
          當前節點：
          <span className="text-[#c9a84c]">{currentNodeId}</span>
        </p>
      )}
    </div>
  );
}
