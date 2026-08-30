"use client";

import type { AppTab } from "@/types/game";

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  inCombat?: boolean;
}

const TABS: { id: AppTab; icon: string; label: string }[] = [
  { id: "lobby", icon: "山", label: "山門" },
  { id: "combat", icon: "境", label: "祕境" },
  { id: "inventory", icon: "囊", label: "行囊" },
];

export function BottomNav({ activeTab, onTabChange, inCombat }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主導航">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-stone-700/50 bg-stone-900/60 text-sm font-bold leading-none">
                {tab.icon}
                {tab.id === "combat" && inCombat && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-stone-900 bg-[#8b3a3a]" />
                )}
              </span>
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
