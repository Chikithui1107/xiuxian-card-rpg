import type { Card, CardPlayResult, CombatBuffs } from "@/types/card";

export function createEmptyBuffs(): CombatBuffs {
  return { swordIntent: 0, dodgeStacks: 0, nextSwordDamageBonus: 0 };
}

/** 層數閃避：1 層 50%、2 層及以上 100%，觸發後清零 */
export function rollStackDodge(stacks: number): boolean {
  if (stacks <= 0) return false;
  const chance = Math.min(1, stacks * 0.5);
  return Math.random() < chance;
}

export function getStackDodgeChance(stacks: number): number {
  if (stacks <= 0) return 0;
  return Math.min(1, stacks * 0.5);
}

function isSwordTechnique(card: Card): boolean {
  return card.tags?.includes("劍法") ?? false;
}

function applySwordDamageBonus(
  damage: number,
  card: Card,
  buffs: CombatBuffs
): { damage: number; buffs: CombatBuffs } {
  if (!isSwordTechnique(card) || buffs.nextSwordDamageBonus <= 0) {
    return { damage, buffs };
  }
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
        let applied = applySwordDamageBonus(effect.amount, card, nextBuffs);
        nextBuffs = applied.buffs;
        totalDamage += applied.damage;
        break;
      }
      case "damage_consume_sword_intent": {
        const stacks = nextBuffs.swordIntent;
        let raw = effect.base + stacks * effect.perStack;
        let applied = applySwordDamageBonus(raw, card, nextBuffs);
        nextBuffs = { ...applied.buffs, swordIntent: 0 };
        totalDamage += applied.damage;
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
        nextBuffs = {
          ...nextBuffs,
          nextSwordDamageBonus: effect.percent,
        };
        break;
    }
  }

  return { buffs: nextBuffs, totalDamage, drawCount, energyDelta };
}
