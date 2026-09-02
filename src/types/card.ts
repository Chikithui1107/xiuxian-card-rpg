export type CardCategory =
  | "基礎劍招"
  | "劍步身法"
  | "劍道悟性"
  | "劍道蓄勢"
  | "劍意增幅"
  | "絕技終結";

export type CardEffect =
  | { kind: "damage"; amount: number }
  | { kind: "damage_consume_sword_intent"; base: number; perStack: number }
  | { kind: "gain_sword_intent"; amount: number }
  | { kind: "gain_dodge"; amount: number }
  | { kind: "draw"; amount: number }
  | { kind: "gain_energy"; amount: number }
  | { kind: "refund_energy_if_sword_intent_gte"; threshold: number; amount: number }
  | { kind: "buff_next_sword"; percent: number };

export interface Card {
  id: string;
  name: string;
  type: CardCategory;
  energyCost: number;
  description: string;
  effects: CardEffect[];
  tags?: string[];
  exhaust?: boolean;
}

export interface CombatBuffs {
  swordIntent: number;
  dodgeStacks: number;
  nextSwordDamageBonus: number;
}

export const INITIAL_COMBAT_BUFFS: CombatBuffs = {
  swordIntent: 0,
  dodgeStacks: 0,
  nextSwordDamageBonus: 0,
};

export interface CardPlayResult {
  buffs: CombatBuffs;
  totalDamage: number;
  drawCount: number;
  energyDelta: number;
}
