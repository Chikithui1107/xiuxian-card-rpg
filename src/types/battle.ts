export interface Card {
  instanceId: string;
  id: string;
  name: string;
  cost: number;
  isExhaust?: boolean;
  /** 回合結束不棄置；仍計入手牌上限 */
  isRetain?: boolean;
  /** 本回合臨時費用修正（如牽引 −1）；回合結束清除 */
  costModifier?: number;
  /** 本回合由【因果相生】牽引；本回合不可再次觸發相生，回合結束清除 */
  pulledByKarma?: boolean;
}

export function getEffectiveCost(card: Card): number {
  return Math.max(0, card.cost + (card.costModifier ?? 0));
}

export interface BattleDeckState {
  drawPile: Card[];
  hand: Card[];
  discardPile: Card[];
  exhaustPile: Card[];
}
