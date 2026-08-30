"use client";

import {
  formatAffixes,
  getEquippedBySlot,
  getEquipmentList,
  isEquipped,
} from "@/lib/equipment";
import type { InventoryState } from "@/types/game";
import { RARITY_COLORS, SLOT_LABELS } from "@/types/game";

interface InventoryPanelProps {
  inventory: InventoryState;
  onEquip: (equipmentId: string) => void;
  onUnequip: (equipmentId: string) => void;
}

export function InventoryPanel({
  inventory,
  onEquip,
  onUnequip,
}: InventoryPanelProps) {
  const owned = getEquipmentList(inventory.ownedIds);
  const equippedBySlot = getEquippedBySlot(inventory);

  return (
    <div className="glass-panel p-4">
      <p className="zone-label mb-3">行囊 · 法寶欄</p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(Object.keys(SLOT_LABELS) as Array<keyof typeof SLOT_LABELS>).map(
          (slot) => {
            const eq = equippedBySlot[slot];
            return (
              <div
                key={slot}
                className="rounded border border-stone-700/40 bg-black/30 px-2 py-2"
              >
                <p className="text-[10px] text-stone-500">{SLOT_LABELS[slot]}</p>
                {eq ? (
                  <p className="text-xs font-semibold text-[#7aab9a]">{eq.name}</p>
                ) : (
                  <p className="text-xs text-stone-700">空</p>
                )}
              </div>
            );
          }
        )}
      </div>

      <div className="max-h-none space-y-2">
        {owned.map((eq) => {
          const equipped = isEquipped(inventory, eq.id);
          const affixes = formatAffixes(eq);

          return (
            <div
              key={eq.id}
              className={`rounded border px-3 py-2 transition-all duration-200 ${
                equipped
                  ? "border-[#8a7340]/30 bg-stone-900/40"
                  : "border-stone-700/40 bg-black/20 hover:border-[#4a7c6f]/35"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-stone-200">
                    {eq.name}
                  </span>
                  <span
                    className={`ml-2 text-[10px] ${RARITY_COLORS[eq.rarity] ?? "text-stone-400"}`}
                  >
                    {eq.rarity}
                  </span>
                </div>
                {equipped ? (
                  <button
                    onClick={() => onUnequip(eq.id)}
                    className="btn-cyber shrink-0 px-2 py-0.5 text-[10px]"
                  >
                    卸下
                  </button>
                ) : (
                  <button
                    onClick={() => onEquip(eq.id)}
                    className="btn-cyber shrink-0 px-2 py-0.5 text-[10px]"
                  >
                    裝備
                  </button>
                )}
              </div>
              <p className="mb-1 text-[10px] text-stone-500">{eq.description}</p>
              <div className="flex flex-wrap gap-1">
                {affixes.map((affix) => (
                  <span
                    key={affix}
                    className="rounded border border-stone-700/40 bg-stone-900/60 px-1.5 py-0.5 text-[10px] text-[#c9a84c]/85"
                  >
                    {affix}
                  </span>
                ))}
              </div>
              {eq.specialEffect && (
                <p className="mt-1 text-[10px] italic text-[#9a9ab8]">
                  ◈ {eq.specialEffect}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
