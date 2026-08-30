import equipmentData from "@/data/equipment.json";
import type { Equipment, EquipmentSlot, InventoryState } from "@/types/game";

const equipmentMap = new Map(
  (equipmentData as Equipment[]).map((eq) => [eq.id, eq])
);

export function getAllEquipment(): Equipment[] {
  return equipmentData as Equipment[];
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

/** 裝備物品：同槽位已有裝備時自動替換 */
export function equipItem(
  inventory: InventoryState,
  equipmentId: string
): InventoryState {
  const item = getEquipment(equipmentId);
  if (!item || !inventory.ownedIds.includes(equipmentId)) {
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

/** 卸下指定裝備 */
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

export function formatAffixes(eq: Equipment): string[] {
  const affixes: string[] = [];
  if (eq.attackBonus > 0) affixes.push(`攻擊 +${eq.attackBonus}`);
  if (eq.critRateBonus > 0)
    affixes.push(`暴擊率 +${(eq.critRateBonus * 100).toFixed(0)}%`);
  if (eq.cardMultiplierBonus > 0)
    affixes.push(`卡牌倍率 +${eq.cardMultiplierBonus}`);
  if (eq.hpBonus > 0) affixes.push(`氣血 +${eq.hpBonus}`);
  return affixes;
}
