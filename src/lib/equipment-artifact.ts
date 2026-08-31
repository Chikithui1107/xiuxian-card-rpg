import type { Equipment, EquipmentSlot } from "@/types/game";

const SLOT_MAP: Record<string, EquipmentSlot> = {
  MAIN_HAND: "weapon",
  OFF_HAND: "weapon",
  weapon: "weapon",
  武器: "weapon",
  armor: "armor",
  防具: "armor",
  accessory: "accessory",
  飾品: "accessory",
  treasure: "treasure",
  法寶: "treasure",
};

interface WeaponArtifactV1 {
  metadata: {
    id: string;
    name: string;
    rarity: string;
    requiredRealm?: string;
    description: string;
  };
  stats: {
    attack?: number;
    critRate?: number;
    durability?: { current: number; max: number };
  };
  effects?: Array<{
    type: string;
    target: string;
    value: number;
    operator: string;
  }>;
  equipmentSlots: string[];
}

interface CompactArtifact {
  id: string;
  name: string;
  type: string;
  rarity?: string;
  requiredRealm?: string;
  description?: string;
  stats: {
    attack?: number;
    critRate?: number;
    defense?: number;
    dodgeRate?: number;
    damageReduction?: number;
    hp?: number;
  };
  effect?: string;
}

function resolveSlot(slots: string[] | undefined, fallbackType?: string): EquipmentSlot {
  const key = slots?.[0] ?? fallbackType ?? "accessory";
  return SLOT_MAP[key] ?? "accessory";
}

function attackFromEffects(artifact: WeaponArtifactV1): number {
  const buff = artifact.effects?.find(
    (e) => e.type === "STAT_BUFF" && e.target.includes("attack")
  );
  return buff?.value ?? artifact.stats.attack ?? 0;
}

function parseCombatFlags(effect: string | null | undefined) {
  const text = effect ?? "";
  return {
    counterOnDodge: text.includes("反擊"),
    comboOnAttack: text.includes("連擊"),
    reflectOnHit: text.includes("反彈"),
  };
}

function toEquipment(
  base: Omit<
    Equipment,
    "counterOnDodge" | "comboOnAttack" | "reflectOnHit" | "specialEffect"
  >,
  effect: string | null
): Equipment {
  const flags = parseCombatFlags(effect);
  return { ...base, specialEffect: effect, ...flags };
}

export function weaponArtifactToEquipment(artifact: WeaponArtifactV1): Equipment {
  return toEquipment(
    {
      id: artifact.metadata.id,
      name: artifact.metadata.name,
      slot: resolveSlot(artifact.equipmentSlots, "weapon"),
      rarity: artifact.metadata.rarity,
      requiredRealm: artifact.metadata.requiredRealm ?? null,
      attackBonus: attackFromEffects(artifact),
      critRateBonus: artifact.stats.critRate ?? 0,
      cardMultiplierBonus: 0,
      hpBonus: 0,
      defenseBonus: 0,
      dodgeRate: 0,
      damageReduction: 0,
      durability: artifact.stats.durability ?? null,
      description: artifact.metadata.description,
      schemaVersion: "weapon.v1",
    },
    null
  );
}

export function compactArtifactToEquipment(artifact: CompactArtifact): Equipment {
  const slot = resolveSlot(undefined, artifact.type);
  const isWeapon = slot === "weapon";

  return toEquipment(
    {
      id: artifact.id,
      name: artifact.name,
      slot,
      rarity: artifact.rarity ?? "普通",
      requiredRealm: artifact.requiredRealm ?? null,
      attackBonus: isWeapon ? (artifact.stats.attack ?? 0) : (artifact.stats.attack ?? 0),
      critRateBonus: artifact.stats.critRate ?? 0,
      cardMultiplierBonus: 0,
      hpBonus: artifact.stats.hp ?? 0,
      defenseBonus: artifact.stats.defense ?? 0,
      dodgeRate: artifact.stats.dodgeRate ?? 0,
      damageReduction: artifact.stats.damageReduction ?? 0,
      durability: null,
      description: artifact.description ?? "",
      schemaVersion: "compact.v1",
    },
    artifact.effect ?? null
  );
}

/** @deprecated use compactArtifactToEquipment */
export const armorArtifactToEquipment = compactArtifactToEquipment;

export function meetsRealmRequirement(
  heroRealm: string,
  requiredRealm: string | null | undefined
): boolean {
  if (!requiredRealm) return true;
  const tiers = ["煉氣", "築基", "金丹", "元嬰", "化神"];
  const heroTier = tiers.findIndex((t) => heroRealm.includes(t));
  const reqTier = tiers.findIndex((t) => requiredRealm.includes(t));
  if (heroTier === -1 || reqTier === -1) return true;
  return heroTier >= reqTier;
}
