export interface Card {
  instanceId: string;
  id: string;
  name: string;
  cost: number;
  isExhaust?: boolean;
  /** 能力牌：打出後進 powerPile，本場持續 */
  isPower?: boolean;
  /** 回合結束不棄置；仍計入手牌上限 */
  isRetain?: boolean;
  /** 本回合臨時費用修正（如藏鋒／牽引）；回合結束清除（能力減費會再同步） */
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
  /** 已打出的能力牌（不進棄牌、不重洗） */
  powerPile: Card[];
}
