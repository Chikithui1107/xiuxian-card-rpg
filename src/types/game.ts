export type EquipmentSlot = "weapon" | "armor" | "accessory" | "treasure";

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: string;
  requiredRealm?: string | null;
  attackBonus: number;
  critRateBonus: number;
  cardMultiplierBonus: number;
  hpBonus: number;
  defenseBonus?: number;
  dodgeRate?: number;
  damageReduction?: number;
  durability?: { current: number; max: number } | null;
  description: string;
  specialEffect: string | null;
  counterOnDodge?: boolean;
  comboOnAttack?: boolean;
  reflectOnHit?: boolean;
  schemaVersion?: string;
}

export interface InventoryState {
  ownedIds: string[];
  equippedIds: string[];
}

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: "武器",
  armor: "防具",
  accessory: "飾品",
  treasure: "法寶",
};

export const RARITY_COLORS: Record<string, string> = {
  凡鐵: "text-[#8a8580]",
  普通: "text-[#9a958a]",
  精良: "text-[#5a9a88]",
  稀有: "text-[#6a8fc9]",
  史詩: "text-[#b06ad4]",
  傳說: "text-[#ffd700]",
};

export type { Card, CardCategory, CombatBuffs } from "@/types/card";

export interface Enemy {
  id: string;
  name: string;
  monsterId?: string;
  realm: string;
  maxHp: number;
  attackDamage: number;
  description: string;
}

export interface DungeonTier {
  id: string;
  name: string;
  difficulty: string;
  recommendedPower: string;
  floors: number;
  hpMultiplier: number;
  attackMultiplier: number;
  rewardMultiplier: number;
  bonusSpiritStones: number;
  achievementId: string;
  achievementName: string;
  description: string;
  passiveDescription: string | null;
  enemyPassive: "regen" | "burn" | null;
  accent: "cyan" | "purple" | "amber";
}

export type CombatScreen = "tier-select" | "path" | "battle";

export type CombatPhase = "playing" | "defeat";

export type BattlePhase =
  | "IN_BATTLE"
  | "VICTORY_ANIM"
  | "REWARD"
  | "STAGE_CLEAR";

export type AppTab = "lobby" | "combat" | "characters";

/** @deprecated use AppTab */
export type GameView = "lobby" | "combat";

export interface DamagePopup {
  id: string;
  value: number;
  isCrit: boolean;
  isHighDamage: boolean;
  x: number;
  y: number;
}

export interface CombatEnemy extends Enemy {
  currentHp: number;
  tierName?: string;
  floorInTier?: number;
  totalFloors?: number;
  passive?: "regen" | "burn" | null;
  passiveLabel?: string | null;
  attackPattern?: "triple_slash" | null;
  attackPatternLabel?: string | null;
  intentIndex?: number;
  /** 僅特定遭遇（如「遭遇野狼」）顯示立繪 */
  monsterSprite?: string;
}

export const HIGH_DAMAGE_THRESHOLD = 20;

export const CARD_TYPE_COLORS: Record<string, string> = {
  基礎劍招: "ink-card-type-basic bg-[#1a1814]",
  劍步身法: "ink-card-type-step bg-[#141820]",
  劍道悟性: "ink-card-type-insight bg-[#18141f]",
  劍道蓄勢: "ink-card-type-charge bg-[#1a1810]",
  劍意增幅: "ink-card-type-boost bg-[#1a1414]",
  絕技終結: "ink-card-type-ultimate bg-[#1a1810]",
};

export const CARD_TYPE_ACCENT: Record<string, string> = {
  基礎劍招: "text-[#c9a84c]",
  劍步身法: "text-[#7aabce]",
  劍道悟性: "text-[#b8a8d8]",
  劍道蓄勢: "text-[#c9a84c]",
  劍意增幅: "text-[#c45c5c]",
  絕技終結: "text-[#ffd700]",
};
