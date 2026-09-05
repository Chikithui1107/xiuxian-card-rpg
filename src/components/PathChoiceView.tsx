"use client";

import { useState } from "react";
import { MapView } from "@/components/MapView";
import { NODE_ICONS, NODE_LABELS } from "@/lib/map";
import type { MapNode } from "@/types/map";

interface PathChoiceViewProps {
  map: MapNode[][];
  choices: MapNode[];
  tierName: string;
  playerHp: number;
  maxHp: number;
  completedCount: number;
  totalCount: number;
  mapMessage?: string | null;
  onSelectNode: (node: MapNode) => void;
}

export function PathChoiceView({
  map,
  choices,
  tierName,
  playerHp,
  maxHp,
  completedCount,
  totalCount,
  mapMessage,
  onSelectNode,
}: PathChoiceViewProps) {
  const [showMap, setShowMap] = useState(false);
  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);
  const chapter = map[0]?.[0]?.chapter ?? 1;
  const progressPercent =
    totalCount > 0 ? Math.min(100, (completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 px-3 pb-4 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="zone-label">第{chapter}章 · 秘境前路</p>
          <h2 className="title-ink mt-1 text-lg font-bold tracking-wider">
            {tierName}
          </h2>
          <p className="mt-1 text-[11px] text-stone-400">
            擇一路而行 · 全圖僅供觀覽
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="btn-cyber shrink-0 px-3 py-1.5 text-[11px]"
        >
          觀秘境全圖
        </button>
      </div>

      <div className="glass-panel-gold px-3 py-2.5">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-[#7aab9a]">氣血</span>
          <span className="stat-value text-[#9ab8aa]">
            {playerHp.toLocaleString()} / {maxHp.toLocaleString()}
          </span>
        </div>
        <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="hp-bar-fill h-full rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-stone-500">修行進度</span>
          <span className="text-[#c9a84c]">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-[#c9a84c]/70 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {mapMessage && (
        <div className="rounded-lg border border-[#8a7340]/35 bg-stone-950/80 px-3 py-2.5 text-center">
          <p className="text-[10px] tracking-wider text-[#8a7340]">探索結果</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#e8e0d4]">
            {mapMessage}
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-center text-[11px] tracking-[0.2em] text-stone-500">
          {choices.length <= 1 ? "前方唯餘一路" : "前方岔路 · 二選一"}
        </p>
        <div
          className={`grid gap-3 ${
            choices.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {choices.map((node) => {
            const icon = NODE_ICONS[node.type];
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node)}
                className={`card-hover rounded-xl border-2 p-3 text-left transition active:scale-[0.98] ${icon.color} ${icon.ring} ring-1`}
              >
                <p className="text-[10px] tracking-wider text-stone-400">
                  {NODE_LABELS[node.type]}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug tracking-wide">
                  {node.title}
                </p>
                <p className="mt-3 text-[10px] text-[#c9a84c]/90">踏入此途 →</p>
              </button>
            );
          })}
        </div>
        {choices.length === 0 && (
          <p className="mt-4 text-center text-xs text-stone-500">
            此間無路可走，請從選單退出本次修行。
          </p>
        )}
      </div>

      <p className="text-center text-[10px] leading-relaxed text-stone-500">
        右上選單可隨時退出 · 通關後本章封印，需重新挑戰
      </p>

      {showMap && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-[#4a7c6f]/20 px-3 py-2.5">
            <p className="zone-label text-[#7aab9a]">秘境全圖 · 僅供觀覽</p>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="btn-cyber px-3 py-1 text-[11px]"
            >
              關閉
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MapView
              map={map}
              tierName={tierName}
              playerHp={playerHp}
              maxHp={maxHp}
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}
