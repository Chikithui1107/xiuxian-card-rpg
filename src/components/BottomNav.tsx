"use client";

import type { AppTab } from "@/types/game";

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  inCombat?: boolean;
  combatLocked?: boolean;
}

function IconMountain({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 18.5 L9.2 9.8 L12.1 13.6 L15.2 8.5 L20.5 18.5 Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 18.5 V15.2 H14.2 V18.5"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M11.2 15.2 V13.6 H12.8 V15.2"
        stroke="currentColor"
        strokeWidth="1.05"
      />
    </svg>
  );
}

function IconRealm({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="11"
        r="5.2"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <circle
        cx="12"
        cy="11"
        r="2.1"
        stroke="currentColor"
        strokeWidth="1.05"
      />
      <path
        d="M7.2 18.2 C8.8 15.6 10.2 14.4 12 14.4 C13.8 14.4 15.2 15.6 16.8 18.2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPouch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M8.2 9.2 C8.2 7.2 9.7 5.8 12 5.8 C14.3 5.8 15.8 7.2 15.8 9.2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M7 9.6 H17 C17.8 9.6 18.4 10.3 18.2 11.1 L16.9 17.2 C16.7 18.2 15.8 19 14.8 19 H9.2 C8.2 19 7.3 18.2 7.1 17.2 L5.8 11.1 C5.6 10.3 6.2 9.6 7 9.6 Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 12.2 H13.8"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS: {
  id: AppTab;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "lobby", label: "山門", Icon: IconMountain },
  { id: "combat", label: "秘境", Icon: IconRealm },
  { id: "inventory", label: "行囊", Icon: IconPouch },
];

export function BottomNav({
  activeTab,
  onTabChange,
  inCombat,
  combatLocked,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="主導航">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const locked = Boolean(combatLocked) && tab.id !== "combat";
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              disabled={locked}
              title={locked ? "戰鬥中無法離開秘境" : undefined}
              className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""} ${
                locked ? "opacity-35" : ""
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bottom-nav-glyph">
                <Icon className="bottom-nav-svg" />
                {tab.id === "combat" && inCombat && (
                  <span className="bottom-nav-dot" aria-hidden />
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
