import dungeonsData from "@/data/dungeons.json";
import type { CombatEnemy, DungeonTier, Enemy } from "@/types/game";

const tiers = dungeonsData as DungeonTier[];

export function getAllDungeonTiers(): DungeonTier[] {
  return tiers;
}

export function getDungeonTier(id: string): DungeonTier | undefined {
  return tiers.find((t) => t.id === id);
}

/** 依副本級別與層數生成縮放後的敵人 */
export function createScaledEnemy(
  base: Enemy,
  tier: DungeonTier,
  floorInTier: number
): CombatEnemy {
  const floorScale = 1 + (floorInTier - 1) * 0.15;
  const maxHp = Math.floor(base.maxHp * tier.hpMultiplier * floorScale);
  const attackDamage = Math.floor(
    base.attackDamage * tier.attackMultiplier * floorScale
  );

  return {
    ...base,
    maxHp,
    attackDamage,
    currentHp: maxHp,
    tierName: tier.name,
    floorInTier,
    totalFloors: tier.floors,
    passive: tier.enemyPassive,
    passiveLabel: tier.passiveDescription,
  };
}

export function getEnemyForTierFloor(
  tier: DungeonTier,
  floorInTier: number,
  pool: Enemy[]
): CombatEnemy {
  const index = (floorInTier - 1) % pool.length;
  return createScaledEnemy(pool[index], tier, floorInTier);
}

/** 單層通關靈石獎勵 */
export function getFloorSpiritReward(tier: DungeonTier): number {
  return Math.floor(
    (tier.bonusSpiritStones / tier.floors) * tier.rewardMultiplier
  );
}

/** 全通關額外靈石獎勵 */
export function getCompletionSpiritReward(tier: DungeonTier): number {
  return Math.floor(tier.bonusSpiritStones * tier.rewardMultiplier);
}

/** 敵人被动：灼烧额外伤害 */
export function applyBurnPassive(baseDamage: number): number {
  return Math.floor(baseDamage * 1.1);
}

/** 敵人被动：回合回血 */
export function applyRegenPassive(enemy: CombatEnemy): CombatEnemy {
  if (enemy.passive !== "regen" || enemy.currentHp <= 0) return enemy;
  const heal = Math.max(1, Math.floor(enemy.maxHp * 0.02));
  return {
    ...enemy,
    currentHp: Math.min(enemy.maxHp, enemy.currentHp + heal),
  };
}

export function getRecommendedPowerLabel(tier: DungeonTier): string {
  const attackEstimate = Math.floor(280 * tier.attackMultiplier);
  const hpEstimate = Math.floor(2500 * tier.hpMultiplier);
  return `攻 ~${attackEstimate} · HP ~${hpEstimate.toLocaleString()}`;
}
