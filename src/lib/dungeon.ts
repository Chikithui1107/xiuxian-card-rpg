import dungeonsData from "@/data/dungeons.json";
import { ENEMY_SPRITE_ID } from "@/data/monsters";
import type { CombatEnemy, DungeonTier, Enemy } from "@/types/game";
import type { MapNode, NodeType } from "@/types/map";

const tiers = dungeonsData as DungeonTier[];

/** 煉氣期基準血量（× tier.hpMultiplier 縮放） */
const NODE_BASE_HP: Record<"combat" | "elite" | "boss", number> = {
  combat: 45,
  elite: 80,
  boss: 180,
};

const NODE_BASE_ATTACK: Record<"combat" | "elite" | "boss", number> = {
  combat: 7,
  elite: 11,
  boss: 13,
};

export const ENEMY_INTENT_CYCLE = [
  { id: "attack", label: "斬擊", damage: 7, description: "造成 7 點傷害" },
  { id: "charge", label: "蓄勢", damage: 0, description: "積蓄劍勢，下回合重擊" },
  { id: "heavy", label: "重擊", damage: 12, description: "造成 12 點重擊傷害" },
] as const;

export function getEnemyIntent(enemy: CombatEnemy) {
  const index = enemy.intentIndex ?? 0;
  const base = ENEMY_INTENT_CYCLE[index % ENEMY_INTENT_CYCLE.length];
  if (base.damage <= 0) {
    return { ...base };
  }
  // 依節點攻擊力縮放（基準為普通戰 7）
  const scale = Math.max(0.5, enemy.attackDamage / NODE_BASE_ATTACK.combat);
  const damage = Math.max(1, Math.floor(base.damage * scale));
  return {
    ...base,
    damage,
    description:
      base.id === "heavy" ? `造成 ${damage} 點重擊傷害` : `造成 ${damage} 點傷害`,
  };
}

export function advanceEnemyIntent(enemy: CombatEnemy): CombatEnemy {
  return {
    ...enemy,
    intentIndex: ((enemy.intentIndex ?? 0) + 1) % ENEMY_INTENT_CYCLE.length,
  };
}

export function getAllDungeonTiers(): DungeonTier[] {
  return tiers;
}

export function getDungeonTier(id: string): DungeonTier | undefined {
  return tiers.find((t) => t.id === id);
}

function isCombatNodeType(
  type: NodeType
): type is keyof typeof NODE_BASE_HP {
  return type === "combat" || type === "elite" || type === "boss";
}

const WOLF_ENCOUNTER_SNIPPET = "遭遇野狼";
const BANDIT_ENCOUNTER_SNIPPET = "攔路劫修";

function isWolfEncounter(node: MapNode): boolean {
  return node.title.includes(WOLF_ENCOUNTER_SNIPPET);
}

function isBanditEncounter(node: MapNode): boolean {
  return node.title.includes(BANDIT_ENCOUNTER_SNIPPET);
}

function pickEnemyTemplate(
  node: MapNode,
  pool: Enemy[]
): Enemy {
  if (node.type === "boss") {
    return pool.find((e) => e.id === "enemy_elder") ?? pool[pool.length - 1];
  }
  if (node.type === "elite") {
    return pool.find((e) => e.id === "enemy_traitor") ?? pool[0];
  }
  const normals = pool.filter(
    (e) => e.id !== "enemy_elder" && e.id !== "enemy_traitor"
  );
  return normals[node.tier % normals.length] ?? normals[0];
}

/** 依副本級別與層數生成縮放後的敵人（線性關卡用） */
export function createScaledEnemy(
  base: Enemy,
  tier: DungeonTier,
  floorInTier: number
): CombatEnemy {
  const floorScale = 1 + (floorInTier - 1) * 0.08;
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

/** 依地圖節點生成敵人（血量：普通 45 / 精英 80 / Boss 180 @ 煉氣倍率） */
export function getEnemyForMapNode(
  tier: DungeonTier,
  node: MapNode,
  pool: Enemy[]
): CombatEnemy {
  if (!isCombatNodeType(node.type)) {
    return createScaledEnemy(pool[0], tier, node.tier + 1);
  }

  const template = isWolfEncounter(node)
    ? pool.find((e) => e.id === "enemy_wolf") ?? pickEnemyTemplate(node, pool)
    : isBanditEncounter(node)
      ? pool.find((e) => e.id === "enemy_bandit") ?? pickEnemyTemplate(node, pool)
      : pickEnemyTemplate(node, pool);
  const stepScale = 1 + node.tier * 0.04;
  const maxHp = Math.floor(
    NODE_BASE_HP[node.type] * tier.hpMultiplier * stepScale
  );
  const attackDamage = Math.floor(
    NODE_BASE_ATTACK[node.type] * tier.attackMultiplier
  );

  return {
    ...template,
    maxHp,
    attackDamage,
    currentHp: maxHp,
    tierName: tier.name,
    floorInTier: node.tier + 1,
    totalFloors: tier.floors,
    passive: node.type === "boss" ? tier.enemyPassive : null,
    passiveLabel: node.type === "boss" ? tier.passiveDescription : null,
    attackPattern: node.type === "elite" ? "triple_slash" : null,
    attackPatternLabel:
      node.type === "elite" ? "三連斬（單次攻擊判定閃避）" : null,
    intentIndex: 0,
    monsterSprite:
      (isWolfEncounter(node) ? "demon_wolf" : undefined) ??
      ENEMY_SPRITE_ID[template.id],
  };
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
  // Boss 節點只發戰鬥層獎勵；通關加成在 STAGE_CLEAR 時另發，避免重複
  if (node.type === "boss") return Math.floor(base * 2.5);
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
  const hpEstimate = Math.floor(45 * tier.hpMultiplier);
  const bossEstimate = Math.floor(180 * tier.hpMultiplier);
  return `小怪 ~${hpEstimate} HP · 魔首 ~${bossEstimate} HP`;
}

const CHAPTER_META: Record<
  string,
  {
    stage: number;
    chapterLabel: string;
    realmLabel: string;
    locationName: string;
    stageTab: string;
    lawName: string | null;
  }
> = {
  tier_qi: {
    stage: 1,
    chapterLabel: "新手試煉",
    realmLabel: "煉氣期",
    locationName: "青嵐谷",
    stageTab: "煉氣",
    lawName: null,
  },
  tier_foundation: {
    stage: 2,
    chapterLabel: "進階試煉",
    realmLabel: "築基期",
    locationName: "古修洞府",
    stageTab: "築基",
    lawName: "生生不息",
  },
  tier_golden: {
    stage: 3,
    chapterLabel: "極限挑戰",
    realmLabel: "金丹期",
    locationName: "血禁地",
    stageTab: "金丹",
    lawName: "業火餘燼",
  },
};

export function getDungeonChapterMeta(tier: DungeonTier) {
  return (
    CHAPTER_META[tier.id] ?? {
      stage: 1,
      chapterLabel: "祕境試煉",
      realmLabel: tier.recommendedPower,
      locationName: tier.name,
      stageTab: "秘境",
      lawName: null as string | null,
    }
  );
}

/** 秘境選擇頁全屏場景圖；尚未製作的階段回傳 null，用 CSS 氛圍底 */
const REALM_BACKGROUNDS: Record<string, string> = {
  tier_qi: "/backgrounds/realm-qinglan-valley.jpg",
};

export function getDungeonRealmBackground(tierId: string): string | null {
  return REALM_BACKGROUNDS[tierId] ?? null;
}

/** 前一階通關後解鎖；第一階永遠可挑戰 */
export function isDungeonTierUnlocked(
  tiers: DungeonTier[],
  index: number,
  unlockedAchievements: string[]
): boolean {
  if (index <= 0) return true;
  const prev = tiers[index - 1];
  return Boolean(prev && unlockedAchievements.includes(prev.achievementId));
}

export function getDungeonUnlockHint(
  tiers: DungeonTier[],
  index: number
): string {
  if (index <= 0) return "";
  const prev = tiers[index - 1];
  const meta = prev ? getDungeonChapterMeta(prev) : null;
  return `通關${meta?.locationName ?? prev?.name ?? "前一秘境"}後解鎖`;
}
