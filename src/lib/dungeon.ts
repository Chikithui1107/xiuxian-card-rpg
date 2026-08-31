import dungeonsData from "@/data/dungeons.json";
import type { CombatEnemy, DungeonTier, Enemy } from "@/types/game";
import type { MapNode } from "@/types/map";

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

/** 依地圖節點生成敵人（含精英 / Boss 加成） */
export function getEnemyForMapNode(
  tier: DungeonTier,
  node: MapNode,
  pool: Enemy[]
): CombatEnemy {
  const floorInTier = node.tier + 1;
  const index = node.tier % pool.length;
  const enemy = createScaledEnemy(pool[index], tier, floorInTier);

  if (node.type === "elite") {
    const maxHp = Math.floor(enemy.maxHp * 1.5);
    return {
      ...enemy,
      maxHp,
      attackDamage: Math.floor(enemy.attackDamage * 1.35),
      currentHp: maxHp,
    };
  }

  if (node.type === "boss") {
    const maxHp = Math.floor(enemy.maxHp * 2.5);
    return {
      ...enemy,
      maxHp,
      attackDamage: Math.floor(enemy.attackDamage * 1.8),
      currentHp: maxHp,
      passive: tier.enemyPassive,
      passiveLabel: tier.passiveDescription,
    };
  }

  return enemy;
}

/** 地圖節點靈石獎勵 */
export function getMapNodeSpiritReward(
  tier: DungeonTier,
  node: MapNode
): number {
  const base = Math.floor(
    (tier.bonusSpiritStones / 10) * tier.rewardMultiplier
  );
  if (node.type === "elite") return Math.floor(base * 1.5);
  if (node.type === "boss") return getCompletionSpiritReward(tier);
  return base;
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

const CHAPTER_META: Record<
  string,
  { stage: number; chapterLabel: string; realmLabel: string }
> = {
  tier_qi: { stage: 1, chapterLabel: "新手試煉", realmLabel: "煉氣期" },
  tier_foundation: { stage: 2, chapterLabel: "進階試煉", realmLabel: "築基期" },
  tier_golden: { stage: 3, chapterLabel: "極限挑戰", realmLabel: "金丹期" },
};

export function getDungeonChapterMeta(tier: DungeonTier) {
  return (
    CHAPTER_META[tier.id] ?? {
      stage: 1,
      chapterLabel: "祕境試煉",
      realmLabel: tier.recommendedPower,
    }
  );
}
