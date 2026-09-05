"use client";

import { BgmController } from "@/components/BgmController";

interface MobileFrameProps {
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  title?: string;
  subtitle?: string;
  inGameMenu?: React.ReactNode;
  /** 非戰鬥階段播放 BGM */
  bgmEnabled?: boolean;
}

export function MobileFrame({
  children,
  bottomNav,
  title,
  subtitle,
  inGameMenu,
  bgmEnabled = true,
}: MobileFrameProps) {
  return (
    <div className="mobile-shell">
      <div className="mobile-shell-mist pointer-events-none" aria-hidden />
      <div className="mobile-frame">
        <BgmController enabled={bgmEnabled} />
        {inGameMenu}
        {(title || subtitle) && (
          <header
            className={`mobile-header shrink-0${
              inGameMenu ? " has-in-game-menu" : " has-bgm-toggle"
            }`}
          >
            {title && (
              <h1 className="title-ink text-lg font-bold">{title}</h1>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[10px] tracking-widest text-stone-500">
                {subtitle}
              </p>
            )}
          </header>
        )}
        <div className="mobile-content has-bottom-nav flex min-h-0 flex-1 flex-col">
          {children}
        </div>
        {bottomNav}
      </div>
    </div>
  );
}
