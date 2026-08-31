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

export interface Card {
  id: string;
  name: string;
  type: "招式" | "法寶" | "增益";
  baseValue: number;
  multiplier: number;
  energyCost: number;
  description: string;
}

export interface Enemy {
  id: string;
  name: string;
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

export type CombatScreen = "tier-select" | "battle";

export type CombatPhase = "playing" | "victory" | "defeat";

export type AppTab = "lobby" | "combat" | "inventory";

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
}

export const HIGH_DAMAGE_THRESHOLD = 500;

export const CARD_TYPE_COLORS: Record<Card["type"], string> = {
  招式: "border-[#8a7340] bg-[#1a1814]",
  法寶: "border-[#3d6b5e] bg-[#141a18]",
  增益: "border-[#8b2020] bg-[#1a1414]",
};

export const CARD_TYPE_ACCENT: Record<Card["type"], string> = {
  招式: "text-[#c9a84c]",
  法寶: "text-[#5a9a88]",
  增益: "text-[#c45c5c]",
};
