"use client";

import type { GachaPoolId } from "@/types/gacha";

interface GachaPoolTabsProps {
  active: GachaPoolId;
  onChange: (pool: GachaPoolId) => void;
}

const TABS: { id: GachaPoolId; label: string }[] = [
  { id: "wudao", label: "悟道閣" },
  { id: "nichang", label: "霓裳閣" },
];

export function GachaPoolTabs({ active, onChange }: GachaPoolTabsProps) {
  return (
    <div className="gacha-tabs" role="tablist" aria-label="因緣閣卡池">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`gacha-tab${active === tab.id ? " is-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
