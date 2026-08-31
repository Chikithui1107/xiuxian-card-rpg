import equipmentData from "@/data/equipment.json";
import ironSwordArtifact from "@/data/equipment/wpn_iron_sword_001.json";
import prajnaSword from "@/data/equipment/wpn_prajna_sword.json";
import mysticIronArmor from "@/data/equipment/arm_mystic_iron.json";
import reverseFlowSeal from "@/data/equipment/arm_reverse_flow_seal.json";
import {
  compactArtifactToEquipment,
  meetsRealmRequirement,
  weaponArtifactToEquipment,
} from "@/lib/equipment-artifact";
import type { Equipment, EquipmentSlot, InventoryState } from "@/types/game";

const ARTIFACT_EQUIPMENT: Equipment[] = [
  weaponArtifactToEquipment(
    ironSwordArtifact as Parameters<typeof weaponArtifactToEquipment>[0]
  ),
  compactArtifactToEquipment(
    prajnaSword as Parameters<typeof compactArtifactToEquipment>[0]
  ),
  compactArtifactToEquipment(
    mysticIronArmor as Parameters<typeof compactArtifactToEquipment>[0]
  ),
  compactArtifactToEquipment(
    reverseFlowSeal as Parameters<typeof compactArtifactToEquipment>[0]
  ),
];

/** 舊裝備僅保留飾品與法寶，武器防具由 artifact 定義 */
const LEGACY_EQUIPMENT = (equipmentData as Equipment[]).filter(
  (eq) => eq.slot !== "weapon" && eq.slot !== "armor"
);

const ALL_EQUIPMENT: Equipment[] = [...ARTIFACT_EQUIPMENT, ...LEGACY_EQUIPMENT];

const equipmentMap = new Map(ALL_EQUIPMENT.map((eq) => [eq.id, eq]));

export function getAllEquipment(): Equipment[] {
  return ALL_EQUIPMENT;
}

export function getEquipment(id: string): Equipment | undefined {
  return equipmentMap.get(id);
}

export function getEquipmentList(ids: string[]): Equipment[] {
  return ids
    .map((id) => equipmentMap.get(id))
    .filter((eq): eq is Equipment => eq !== undefined);
}

export function createInitialInventory(data: InventoryState): InventoryState {
  return {
    ownedIds: [...data.ownedIds],
    equippedIds: [...data.equippedIds],
  };
}

export function canEquipItem(
  inventory: InventoryState,
  equipmentId: string,
  heroRealm: string
): { ok: true } | { ok: false; reason: string } {
  const item = getEquipment(equipmentId);
  if (!item) return { ok: false, reason: "找不到此裝備" };
  if (!inventory.ownedIds.includes(equipmentId)) {
    return { ok: false, reason: "尚未擁有此裝備" };
  }
  if (!meetsRealmRequirement(heroRealm, item.requiredRealm)) {
    return { ok: false, reason: `需修為 ${item.requiredRealm} 以上` };
  }
  return { ok: true };
}

export function equipItem(
  inventory: InventoryState,
  equipmentId: string,
  heroRealm?: string
): InventoryState {
  const item = getEquipment(equipmentId);
  if (!item || !inventory.ownedIds.includes(equipmentId)) {
    return inventory;
  }
  if (heroRealm && !meetsRealmRequirement(heroRealm, item.requiredRealm)) {
    return inventory;
  }

  const withoutSameSlot = inventory.equippedIds.filter((id) => {
    const eq = getEquipment(id);
    return eq?.slot !== item.slot;
  });

  return {
    ...inventory,
    equippedIds: [...withoutSameSlot, equipmentId],
  };
}

export function unequipItem(
  inventory: InventoryState,
  equipmentId: string
): InventoryState {
  return {
    ...inventory,
    equippedIds: inventory.equippedIds.filter((id) => id !== equipmentId),
  };
}

export function isEquipped(
  inventory: InventoryState,
  equipmentId: string
): boolean {
  return inventory.equippedIds.includes(equipmentId);
}

export function getEquippedBySlot(
  inventory: InventoryState
): Partial<Record<EquipmentSlot, Equipment>> {
  const result: Partial<Record<EquipmentSlot, Equipment>> = {};
  for (const id of inventory.equippedIds) {
    const eq = getEquipment(id);
    if (eq) result[eq.slot] = eq;
  }
  return result;
}

export function hasCounterOnDodge(equippedIds: string[]): boolean {
  return getEquipmentList(equippedIds).some((eq) => eq.counterOnDodge);
}

export function hasComboOnAttack(equippedIds: string[]): boolean {
  return getEquipmentList(equippedIds).some((eq) => eq.comboOnAttack);
}

export function hasReflectOnHit(equippedIds: string[]): boolean {
  return getEquipmentList(equippedIds).some((eq) => eq.reflectOnHit);
}

export function getTotalDamageReduction(equippedIds: string[]): number {
  return Math.min(
    getEquipmentList(equippedIds).reduce(
      (sum, eq) => sum + (eq.damageReduction ?? 0),
      0
    ),
    0.75
  );
}

export function formatAffixes(eq: Equipment): string[] {
  const affixes: string[] = [];
  if (eq.attackBonus > 0) affixes.push(`攻擊 +${eq.attackBonus}`);
  if ((eq.defenseBonus ?? 0) > 0) affixes.push(`防禦 +${eq.defenseBonus}`);
  if (eq.critRateBonus > 0)
    affixes.push(`暴擊率 +${(eq.critRateBonus * 100).toFixed(0)}%`);
  if ((eq.dodgeRate ?? 0) > 0)
    affixes.push(`閃避 +${((eq.dodgeRate ?? 0) * 100).toFixed(0)}%`);
  if ((eq.damageReduction ?? 0) > 0)
    affixes.push(`減傷 +${((eq.damageReduction ?? 0) * 100).toFixed(0)}%`);
  if (eq.cardMultiplierBonus > 0)
    affixes.push(`卡牌倍率 +${eq.cardMultiplierBonus}`);
  if (eq.hpBonus > 0) affixes.push(`氣血 +${eq.hpBonus}`);
  if (eq.durability) {
    affixes.push(`耐久 ${eq.durability.current}/${eq.durability.max}`);
  }
  return affixes;
}
