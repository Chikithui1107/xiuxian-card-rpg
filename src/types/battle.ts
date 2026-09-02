export interface Card {
  instanceId: string;
  id: string;
  name: string;
  cost: number;
  isExhaust?: boolean;
}

export interface BattleDeckState {
  drawPile: Card[];
  hand: Card[];
  discardPile: Card[];
  exhaustPile: Card[];
}
