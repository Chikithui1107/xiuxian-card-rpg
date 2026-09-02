import type { CardTemplate } from "@/lib/battle-deck";

export interface PlayerBattleState {
  hp: number;
  energy: number;
  swordIntent: number;
  dodge: number;
  nextSwordBonus: number;
}

export function rollStackDodge(stacks: number): boolean {
  if (stacks <= 0) return false;
  return Math.random() < Math.min(1, stacks * 0.5);
}

export function getStackDodgeChance(stacks: number): number {
  if (stacks <= 0) return 0;
  return Math.min(1, stacks * 0.5);
}

export const INITIAL_COMBAT_BUFFS = {
  swordIntent: 0,
  dodge: 0,
  nextSwordBonus: 0,
};

export type CombatBuffs = typeof INITIAL_COMBAT_BUFFS;

export function resolveCardEffects(
  template: CardTemplate,
  player: PlayerBattleState
): {
  player: PlayerBattleState;
  damage: number;
  draw: number;
  energyDelta: number;
} {
  let next = { ...player };
  let damage = 0;
  let draw = 0;
  let energyDelta = -template.cost;

  const applySwordBonus = (raw: number): number => {
    if (!template.sword || next.nextSwordBonus <= 0) return raw;
    const boosted = Math.floor(raw * (1 + next.nextSwordBonus));
    next = { ...next, nextSwordBonus: 0 };
    return boosted;
  };

  for (const fx of template.effects) {
    switch (fx.kind) {
      case "damage":
        damage += applySwordBonus(fx.amount);
        break;
      case "damage_consume_intent": {
        const stacks = next.swordIntent;
        damage += applySwordBonus(fx.base + stacks * fx.perStack);
        next = { ...next, swordIntent: 0 };
        break;
      }
      case "gain_intent":
        next = { ...next, swordIntent: next.swordIntent + fx.amount };
        break;
      case "gain_dodge":
        next = { ...next, dodge: next.dodge + fx.amount };
        break;
      case "draw":
        draw += fx.amount;
        break;
      case "gain_energy":
        energyDelta += fx.amount;
        break;
      case "refund_if_intent_gte":
        if (next.swordIntent >= fx.threshold) energyDelta += fx.amount;
        break;
      case "buff_next_sword":
        next = { ...next, nextSwordBonus: fx.percent };
        break;
    }
  }

  return { player: next, damage, draw, energyDelta };
}
