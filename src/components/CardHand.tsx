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
    <div className="space-y-3">
      <div className="glass-panel p-3">
        <p className="zone-label mb-2">法訣牌庫</p>
        <div className="flex justify-between text-center">
          <MiniStat label="牌庫" value={String(drawPileCount)} color="jade" />
          <MiniStat label="棄牌" value={String(discardPileCount)} color="stone" />
          <MiniStat label="牌組" value={`${deckCount}`} color="gold" />
          {lastDamage && (
            <MiniStat
              label="上式"
              value={lastDamage.damage.toLocaleString()}
              color="gold"
            />
          )}
        </div>
      </div>

      <div className="glass-panel p-3">
        <p className="zone-label mb-2">手牌 · 點選施法</p>
        <div className="hand-scroll min-h-[9.5rem]">
          {hand.length === 0 ? (
            <p className="flex w-full items-center justify-center text-xs text-stone-500">
              手牌已空
            </p>
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
                  className={`card-hover w-[7.2rem] rounded border-2 p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${CARD_TYPE_COLORS[card.type]} hover:border-[#7aab9a]/45 active:scale-95`}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span
                      className={`text-[9px] font-semibold ${CARD_TYPE_ACCENT[card.type]}`}
                    >
                      {card.type}
                    </span>
                    <span
                      className={`text-[9px] font-bold ${canAfford ? "text-[#7aab9a]" : "text-[#a85555]"}`}
                    >
                      真元{card.energyCost}
                    </span>
                  </div>
                  <h3 className="mb-1 text-xs font-bold text-stone-200">
                    {card.name}
                  </h3>
                  <div className="flex items-center justify-between border-t border-stone-700/50 pt-1.5">
                    <span className="text-[9px] text-[#8a7340]/80">
                      ×{card.multiplier}
                    </span>
                    <span className="stat-value text-xs font-bold text-[#c9a84c]">
                      +{card.baseValue}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-1">
        <button
          onClick={onEndTurn}
          disabled={disabled}
          className="btn-cyber-gold w-full py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          收功結束
        </button>
        {lastDamage && (
          <p className="mt-2 text-center text-[9px] leading-relaxed text-stone-500">
            ({lastDamage.breakdown.baseAttack}+{lastDamage.breakdown.equipmentBonus}+{lastDamage.breakdown.cardBaseValue})×
            {lastDamage.breakdown.totalMultiplier.toFixed(1)}
            {lastDamage.isCrit ? " 暴擊" : ""} ={" "}
            <span className="text-[#c9a84c]">{lastDamage.damage.toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "jade" | "stone" | "gold";
}) {
  const c = {
    jade: "text-[#7aab9a]",
    stone: "text-stone-400",
    gold: "text-[#c9a84c]",
  }[color];

  return (
    <div>
      <p className="text-[9px] text-stone-500">{label}</p>
      <p className={`stat-value text-sm font-bold ${c}`}>{value}</p>
    </div>
  );
}
