import heroData from "@/data/hero.json";
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
  avatar?: string;
  portrait?: string;
  /** 大廳海報立繪 */
  lobbyPortrait?: string;
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
  equipmentDefenseBonus: number;
  equipmentDodgeRate: number;
  equipmentDamageReduction: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
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
  const equipmentDefenseBonus = equipped.reduce(
    (sum, eq) => sum + (eq.defenseBonus ?? 0),
    0
  );
  const equipmentDodgeRate = Math.min(
    equipped.reduce((sum, eq) => sum + (eq.dodgeRate ?? 0), 0),
    0.75
  );
  const equipmentDamageReduction = Math.min(
    equipped.reduce((sum, eq) => sum + (eq.damageReduction ?? 0), 0),
    0.75
  );

  return {
    attack: hero.baseAttack + equipmentAttackBonus,
    critRate: Math.min(hero.critRate + equipmentCritBonus, 1),
    critMultiplier: hero.critMultiplier,
    maxHp: hero.maxHp + equipmentHpBonus,
    equipmentAttackBonus,
    equipmentCritBonus,
    equipmentMultiplierBonus,
    equipmentHpBonus,
    equipmentDefenseBonus,
    equipmentDodgeRate,
    equipmentDamageReduction,
  };
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
