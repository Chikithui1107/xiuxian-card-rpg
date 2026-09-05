"use client";

import { BgmController } from "@/components/BgmController";
import type { BgmScene } from "@/lib/bgm";

interface MobileFrameProps {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  title?: string;
  subtitle?: string;
  inGameMenu?: React.ReactNode;
  /** 山門 / 戰鬥 BGM 場景 */
  bgmScene?: BgmScene;
  /** 山門沉浸：背景頂到底，標題浮在天空上 */
  immersive?: boolean;
}

export function MobileFrame({
  children,
  bottomNav,
  title,
  subtitle,
  inGameMenu,
  bgmScene = "lobby",
  immersive = false,
}: MobileFrameProps) {
  const showHeader = Boolean(title || subtitle);

  return (
    <div className="mobile-shell">
      <div className="mobile-shell-mist pointer-events-none" aria-hidden />
      <div className={`mobile-frame${immersive ? " mobile-frame-immersive" : ""}`}>
        <BgmController scene={bgmScene} />
        {inGameMenu}
        {showHeader && (
          <header
            className={[
              "mobile-header",
              "mobile-header-overlay",
              immersive ? "mobile-header-immersive" : "",
              inGameMenu ? "has-in-game-menu" : "has-bgm-toggle",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {title && (
              <h1 className="mobile-header-title title-ink">{title}</h1>
            )}
            {subtitle && (
              <p className="mobile-header-subtitle">{subtitle}</p>
            )}
          </header>
        )}
        <div
          className={[
            "mobile-content flex min-h-0 flex-1 flex-col",
            showHeader ? "has-overlay-header" : "",
            immersive ? "is-immersive" : "",
            bottomNav ? "has-bottom-nav" : "combat-lock-scroll",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
        {bottomNav}
      </div>
    </div>
  );
}
