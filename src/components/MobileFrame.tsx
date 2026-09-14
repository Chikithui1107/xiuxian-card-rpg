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
  /** 戰鬥：壓扁 Header，把空間留給敵人 */
  compactHeader?: boolean;
  /** 主線劇情：隱藏 Header / 選單 / 音訊鈕 / 底欄 */
  storyMode?: boolean;
}

export function MobileFrame({
  children,
  bottomNav,
  title,
  subtitle,
  inGameMenu,
  bgmScene = "lobby",
  immersive = false,
  compactHeader = false,
  storyMode = false,
}: MobileFrameProps) {
  const showHeader = !storyMode && Boolean(title || subtitle);
  const showMenu = !storyMode && inGameMenu;
  const showNav = !storyMode && bottomNav;

  return (
    <div className="mobile-shell">
      <div className="mobile-shell-mist pointer-events-none" aria-hidden />
      <div className={`mobile-frame${immersive && !storyMode ? " mobile-frame-immersive" : ""}`}>
        <BgmController scene={bgmScene} hideToggle={storyMode} />
        {showMenu}
        {showHeader && (
          <header
            className={[
              "mobile-header",
              "mobile-header-overlay",
              immersive ? "mobile-header-immersive" : "",
              compactHeader ? "mobile-header-compact" : "",
              showMenu ? "has-in-game-menu" : "has-bgm-toggle",
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
            compactHeader && !storyMode ? "has-compact-header" : "",
            immersive && !storyMode ? "is-immersive" : "",
            showNav ? "has-bottom-nav" : "combat-lock-scroll",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
        {showNav}
      </div>
    </div>
  );
}
