import heroData from "@/data/hero.json";
import type { Card } from "@/types/game";
import { getEquipmentList } from "@/lib/equipment";

export interface Hero {
  id: string;
  name: string;
  title: string;
  realm: string;
  baseAttack: number;
  critRate: number;
  critMultiplier: number;
  maxHp: number;
  spiritStones: number;
}

export interface HeroStats {
  attack: number;
  critRate: number;
  critMultiplier: number;
  maxHp: number;
  equipmentAttackBonus: number;
  equipmentCritBonus: number;
  equipmentMultiplierBonus: number;
  equipmentHpBonus: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  breakdown: {
    baseAttack: number;
    equipmentBonus: number;
    cardBaseValue: number;
    cardMultiplier: number;
    equipmentMultiplierBonus: number;
    totalMultiplier: number;
    rawTotal: number;
    critMultiplier: number;
  };
}

export function getHero(): Hero {
  return heroData as Hero;
}

export function calculateHeroStats(
  hero: Hero,
  equippedIds: string[]
): HeroStats {
  const equipped = getEquipmentList(equippedIds);
  const equipmentAttackBonus = equipped.reduce(
    (sum, eq) => sum + eq.attackBonus,
    0
  );
  const equipmentCritBonus = equipped.reduce(
    (sum, eq) => sum + eq.critRateBonus,
    0
  );
  const equipmentMultiplierBonus = equipped.reduce(
    (sum, eq) => sum + eq.cardMultiplierBonus,
    0
  );
  const equipmentHpBonus = equipped.reduce((sum, eq) => sum + eq.hpBonus, 0);

  return {
    attack: hero.baseAttack + equipmentAttackBonus,
    critRate: Math.min(hero.critRate + equipmentCritBonus, 1),
    critMultiplier: hero.critMultiplier,
    maxHp: hero.maxHp + equipmentHpBonus,
    equipmentAttackBonus,
    equipmentCritBonus,
    equipmentMultiplierBonus,
    equipmentHpBonus,
  };
}

/**
 * 傷害公式：
 * (基礎攻擊 + 裝備攻擊 + 卡牌基礎值) × (卡牌倍率 + 裝備倍率加成) × 暴擊倍率
 */
export function calculateCardDamage(
  heroStats: HeroStats,
  card: Card,
  forceCrit = false
): DamageResult {
  const baseAttack = heroStats.attack - heroStats.equipmentAttackBonus;
  const equipmentBonus = heroStats.equipmentAttackBonus;
  const cardBaseValue = card.baseValue;
  const cardMultiplier = card.multiplier;
  const equipmentMultiplierBonus = heroStats.equipmentMultiplierBonus;
  const totalMultiplier = cardMultiplier + equipmentMultiplierBonus;

  const rawTotal =
    (baseAttack + equipmentBonus + cardBaseValue) * totalMultiplier;

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
      equipmentMultiplierBonus,
      totalMultiplier,
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
