"use client";

import { InventoryPanel } from "@/components/InventoryPanel";
import type { InventoryState } from "@/types/game";

interface InventoryViewProps {
  inventory: InventoryState;
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
}

export function InventoryView({
  inventory,
  onEquip,
  onUnequip,
}: InventoryViewProps) {
  return (
    <div className="flex flex-col gap-4 px-3 pt-3">
      <div className="text-center">
        <p className="zone-label">行囊</p>
        <h2 className="title-ink mt-1 text-lg font-bold">法寶裝備</h2>
        <p className="mt-1 text-[10px] text-stone-500">
          披甲佩劍，以壯修為
        </p>
      </div>

      <InventoryPanel
        inventory={inventory}
        onEquip={onEquip}
        onUnequip={onUnequip}
      />
    </div>
  );
}
