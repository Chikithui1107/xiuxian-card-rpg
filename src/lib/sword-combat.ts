import type { Card, CardPlayResult, CombatBuffs } from "@/types/card";

/** 舊 MVP 路徑保留；正式白夜戰鬥改走 battle-resolve */
export function createEmptyBuffs(): CombatBuffs {
  return { swordIntent: 0, dodgeStacks: 0, nextSwordDamageBonus: 0 };
}

function applySwordDamageBonus(
  damage: number,
  buffs: CombatBuffs
): { damage: number; buffs: CombatBuffs } {
  if (buffs.nextSwordDamageBonus <= 0) return { damage, buffs };
  return {
    damage: Math.floor(damage * (1 + buffs.nextSwordDamageBonus)),
    buffs: { ...buffs, nextSwordDamageBonus: 0 },
  };
}

export function resolveCardPlay(card: Card, buffs: CombatBuffs): CardPlayResult {
  let nextBuffs = { ...buffs };
  let totalDamage = 0;
  let drawCount = 0;
  let energyDelta = -card.energyCost;

  for (const effect of card.effects) {
    switch (effect.kind) {
      case "damage": {
        const applied = applySwordDamageBonus(effect.amount, nextBuffs);
        totalDamage += applied.damage;
        nextBuffs = applied.buffs;
        break;
      }
      case "damage_consume_sword_intent": {
        const stacks = nextBuffs.swordIntent;
        const applied = applySwordDamageBonus(
          effect.base + stacks * effect.perStack,
          nextBuffs
        );
        totalDamage += applied.damage;
        nextBuffs = { ...applied.buffs, swordIntent: 0 };
        break;
      }
      case "gain_sword_intent":
        nextBuffs = {
          ...nextBuffs,
          swordIntent: nextBuffs.swordIntent + effect.amount,
        };
        break;
      case "gain_dodge":
        nextBuffs = {
          ...nextBuffs,
          dodgeStacks: nextBuffs.dodgeStacks + effect.amount,
        };
        break;
      case "draw":
        drawCount += effect.amount;
        break;
      case "gain_energy":
        energyDelta += effect.amount;
        break;
      case "refund_energy_if_sword_intent_gte":
        if (nextBuffs.swordIntent >= effect.threshold) {
          energyDelta += effect.amount;
        }
        break;
      case "buff_next_sword":
        nextBuffs = { ...nextBuffs, nextSwordDamageBonus: effect.percent };
        break;
    }
  }

  return { buffs: nextBuffs, totalDamage, drawCount, energyDelta };
}
