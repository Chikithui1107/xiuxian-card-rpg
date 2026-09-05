"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBgmMuted,
  isBgmUnlocked,
  setBgmScene,
  toggleBgmMuted,
  tryAutoPlayBgm,
  unlockAndStartBgm,
  type BgmScene,
} from "@/lib/bgm";

interface BgmControllerProps {
  /** 山門播輪回之脈；戰鬥播戰鼓催征 */
  scene?: BgmScene;
  /** @deprecated 改用 scene；true=lobby false=combat */
  enabled?: boolean;
}

export function BgmController({
  scene,
  enabled = true,
}: BgmControllerProps) {
  const activeScene: BgmScene = scene ?? (enabled ? "lobby" : "combat");
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    setMuted(isBgmMuted());

    const unlock = () => {
      unlockAndStartBgm();
      setNeedsTap(false);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };

    // 捕獲階段：山門任何點擊都會立刻開播，不必等進戰鬥
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    setBgmScene(activeScene);
    if (muted) {
      setNeedsTap(false);
      return;
    }
    let cancelled = false;
    void tryAutoPlayBgm().then((ok) => {
      if (cancelled) return;
      setNeedsTap(!ok && !isBgmUnlocked());
    });
    return () => {
      cancelled = true;
    };
  }, [activeScene, muted]);

  const onToggle = useCallback(() => {
    unlockAndStartBgm();
    setNeedsTap(false);
    setMuted(toggleBgmMuted());
  }, []);

  return (
    <>
      <button
        type="button"
        className="bgm-toggle-btn"
        onClick={onToggle}
        aria-label={muted ? "開啟背景音樂" : "關閉背景音樂"}
        title={muted ? "開音樂" : "關音樂"}
      >
        {muted ? (
          <svg
            className="bgm-toggle-icon"
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="m22 9-6 6" />
            <path d="m16 9 6 6" />
          </svg>
        ) : (
          <svg
            className="bgm-toggle-icon"
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        )}
      </button>
      {needsTap && !muted && (
        <p className="bgm-tap-hint" role="status">
          輕觸畫面開啟音樂
        </p>
      )}
    </>
  );
}
