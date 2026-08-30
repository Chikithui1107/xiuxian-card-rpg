"use client";

import type { CardInstance } from "@/lib/deck";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";
import type { DamageResult } from "@/lib/stats";

interface CardHandProps {
  hand: CardInstance[];
  energy: number;
  drawPileCount: number;
  discardPileCount: number;
  deckCount: number;
  onPlayCard: (instance: CardInstance) => void;
  onEndTurn: () => void;
  lastDamage: DamageResult | null;
  disabled: boolean;
}

export function CardHand({
  hand,
  energy,
  drawPileCount,
  discardPileCount,
  deckCount,
  onPlayCard,
  onEndTurn,
  lastDamage,
  disabled,
}: CardHandProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <p className="text-xs tracking-widest text-[#8a7340]">手牌 · 點擊出牌</p>
          <DeckPile label="牌庫" count={drawPileCount} />
          <DeckPile label="棄牌" count={discardPileCount} accent />
          <span className="text-[10px] text-[#5a5550]">牌組 {deckCount} 張</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full border ${
                  i < energy
                    ? "border-[#5a9a88] bg-[#3d6b5e]"
                    : "border-[#3a3530] bg-[#0a0a0a]"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-[#5a9a88]">靈力 {energy}/3</span>
          </div>
          {lastDamage && (
            <p className="text-xs text-[#5a5550]">
              上次：
              <span
                className={`stat-value ml-1 font-bold ${lastDamage.isCrit ? "text-[#ffd700]" : "text-[#c9a84c]"}`}
              >
                {lastDamage.damage.toLocaleString()}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mb-4 flex min-h-[140px] flex-wrap justify-center gap-3">
        {hand.length === 0 ? (
          <p className="self-center text-sm text-[#5a5550]">手牌已空</p>
        ) : (
          hand.map((instance) => {
            const card = instance.card;
            const canAfford = energy >= card.energyCost;
            const cardDisabled = disabled || !canAfford;

            return (
              <button
                key={instance.instanceId}
                onClick={() => onPlayCard(instance)}
                disabled={cardDisabled}
                className={`card-hover group w-36 rounded-lg border-2 p-3 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${CARD_TYPE_COLORS[card.type]}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-semibold tracking-wider ${CARD_TYPE_ACCENT[card.type]}`}
                  >
                    {card.type}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${canAfford ? "text-[#5a9a88]" : "text-[#c45c5c]"}`}
                  >
                    ⚡{card.energyCost}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-bold text-[#f0e6d3]">
                  {card.name}
                </h3>
                <p className="mb-2 text-[10px] leading-relaxed text-[#5a5550]">
                  {card.description}
                </p>
                <div className="flex items-center justify-between border-t border-[#2a2824] pt-2">
                  <span className="text-[10px] text-[#8a7340]">×{card.multiplier}</span>
                  <span className="stat-value text-sm font-bold text-[#c9a84c]">
                    +{card.baseValue}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onEndTurn}
          disabled={disabled}
          className="rounded-lg border-2 border-[#8a7340] bg-[#1a1814] px-6 py-2.5 text-sm font-bold tracking-widest text-[#c9a84c] transition hover:bg-[#c9a84c]/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          結束回合
        </button>
        <p className="text-[10px] text-[#5a5550]">
          結束回合：棄掉手牌 · 敵人反擊 · 恢復靈力 · 重抽 {4} 張
        </p>
      </div>

      {lastDamage && (
        <div className="mt-3 rounded border border-[#2a2824] bg-[#0a0a0a]/60 p-3">
          <p className="mb-1 text-[10px] tracking-wider text-[#8a7340]">
            傷害公式拆解
          </p>
          <p className="stat-value text-xs leading-relaxed text-[#9a958a]">
            ({lastDamage.breakdown.baseAttack} 基礎 +{" "}
            {lastDamage.breakdown.equipmentBonus} 裝備 +{" "}
            {lastDamage.breakdown.cardBaseValue} 卡牌) ×{" "}
            {lastDamage.breakdown.cardMultiplier}
            {lastDamage.isCrit &&
              ` × ${lastDamage.breakdown.critMultiplier} 暴擊`}
            {" = "}
            <span className="font-bold text-[#c9a84c]">
              {lastDamage.damage.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function DeckPile({
  label,
  count,
  accent = false,
}: {
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex h-8 w-6 items-center justify-center rounded border text-[10px] font-bold ${
          accent
            ? "border-[#5a5550] bg-[#2a2824] text-[#9a958a]"
            : "border-[#8a7340] bg-[#1a1814] text-[#c9a84c]"
        }`}
      >
        {count}
      </div>
      <span className="text-[10px] text-[#5a5550]">{label}</span>
    </div>
  );
}
