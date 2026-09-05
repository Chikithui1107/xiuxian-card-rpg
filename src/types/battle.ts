export interface Card {
  instanceId: string;
  id: string;
  name: string;
  cost: number;
  isExhaust?: boolean;
  /** 本回合臨時費用修正（如牽引 −1）；回合結束清除 */
  costModifier?: number;
  /** 由【因果相生】牽引；不可再觸發相生 */
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
