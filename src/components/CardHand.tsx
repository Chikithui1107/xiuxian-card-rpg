"use client";

import {
  CARD_TEMPLATES,
  getCardTemplate,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface CardHandProps {
  hand: Card[];
  energy: number;
  drawPileCount: number;
  discardPileCount: number;
  exhaustPileCount: number;
  deckCount: number;
  onPlayCard: (card: Card) => void;
  onEndTurn: () => void;
  lastDamage: number | null;
  disabled: boolean;
}

export function CardHand({
  hand,
  energy,
  drawPileCount,
  discardPileCount,
  exhaustPileCount,
  deckCount,
  onPlayCard,
  onEndTurn,
  lastDamage,
  disabled,
}: CardHandProps) {
  return (
    <div className="space-y-3">
      <div className="glass-panel p-3">
        <p className="zone-label mb-2">霜寒劍訣</p>
        <div className="flex justify-between text-center">
          <MiniStat label="牌庫" value={String(drawPileCount)} color="jade" />
          <MiniStat label="棄牌" value={String(discardPileCount)} color="stone" />
          <MiniStat label="消耗" value={String(exhaustPileCount)} color="stone" />
          <MiniStat label="牌組" value={`${deckCount}`} color="gold" />
          {lastDamage !== null && (
            <MiniStat
              label="上式"
              value={lastDamage.toLocaleString()}
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
            hand.map((card) => {
              const template = CARD_TEMPLATES[card.id as CardTemplateId];
              const canAfford = energy >= card.cost;
              const cardDisabled = disabled || !canAfford;
              const typeStyle =
                CARD_TYPE_COLORS[template?.type ?? ""] ??
                "border-[#8a7340] bg-[#1a1814]";
              const typeAccent =
                CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

              return (
                <button
                  key={card.instanceId}
                  onClick={() => onPlayCard(card)}
                  disabled={cardDisabled}
                  className={`card-hover w-[7.8rem] rounded border-2 p-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${typeStyle} hover:border-[#7aab9a]/45 active:scale-95`}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className={`text-[9px] font-semibold ${typeAccent}`}>
                      {template?.type}
                    </span>
                    <span
                      className={`text-[9px] font-bold ${canAfford ? "text-[#7aab9a]" : "text-[#a85555]"}`}
                    >
                      真元{card.cost}
                    </span>
                  </div>
                  <h3 className="mb-1 text-xs font-bold text-stone-200">
                    {card.name}
                  </h3>
                  <p className="line-clamp-3 text-[9px] leading-snug text-stone-500">
                    {template?.description}
                  </p>
                  {card.isExhaust && (
                    <p className="mt-1 text-[8px] text-amber-500/80">消耗</p>
                  )}
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
