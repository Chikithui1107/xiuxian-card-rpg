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

export type CombatPhase = "playing" | "victory" | "defeat";

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
