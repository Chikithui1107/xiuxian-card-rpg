import heroData from "@/data/hero.json";
import equipmentData from "@/data/equipment.json";
import type { Card } from "@/types/game";

export interface Equipment {
  id: string;
  name: string;
  slot: string;
  attackBonus: number;
  critRateBonus: number;
  description: string;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  realm: string;
  baseAttack: number;
  critRate: number;
  critMultiplier: number;
  maxHp: number;
  equippedIds: string[];
}

export interface HeroStats {
  attack: number;
  critRate: number;
  critMultiplier: number;
  maxHp: number;
  equipmentAttackBonus: number;
  equipmentCritBonus: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  breakdown: {
    baseAttack: number;
    equipmentBonus: number;
    cardBaseValue: number;
    cardMultiplier: number;
    rawTotal: number;
    critMultiplier: number;
  };
}

const equipmentMap = new Map(
  (equipmentData as Equipment[]).map((eq) => [eq.id, eq])
);

export function getHero(): Hero {
  return heroData as Hero;
}

export function getEquipment(id: string): Equipment | undefined {
  return equipmentMap.get(id);
}

export function getEquippedItems(hero: Hero): Equipment[] {
  return hero.equippedIds
    .map((id) => equipmentMap.get(id))
    .filter((eq): eq is Equipment => eq !== undefined);
}

export function calculateHeroStats(hero: Hero): HeroStats {
  const equipped = getEquippedItems(hero);
  const equipmentAttackBonus = equipped.reduce(
    (sum, eq) => sum + eq.attackBonus,
    0
  );
  const equipmentCritBonus = equipped.reduce(
    (sum, eq) => sum + eq.critRateBonus,
    0
  );

  return {
    attack: hero.baseAttack + equipmentAttackBonus,
    critRate: Math.min(hero.critRate + equipmentCritBonus, 1),
    critMultiplier: hero.critMultiplier,
    maxHp: hero.maxHp,
    equipmentAttackBonus,
    equipmentCritBonus,
  };
}

/** 傷害公式：(基礎攻擊 + 裝備加成 + 卡牌基礎值) × 卡牌倍率 × (暴擊倍率) */
export function calculateCardDamage(
  heroStats: HeroStats,
  card: Card,
  forceCrit = false
): DamageResult {
  const baseAttack = heroStats.attack - heroStats.equipmentAttackBonus;
  const equipmentBonus = heroStats.equipmentAttackBonus;
  const cardBaseValue = card.baseValue;
  const cardMultiplier = card.multiplier;

  const rawTotal =
    (baseAttack + equipmentBonus + cardBaseValue) * cardMultiplier;

  const isCrit = forceCrit || Math.random() < heroStats.critRate;
  const critMultiplier = isCrit ? heroStats.critMultiplier : 1;
  const damage = Math.floor(rawTotal * critMultiplier);

  return {
    damage,
    isCrit,
    breakdown: {
      baseAttack,
      equipmentBonus,
      cardBaseValue,
      cardMultiplier,
      rawTotal: Math.floor(rawTotal),
      critMultiplier,
    },
  };
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
