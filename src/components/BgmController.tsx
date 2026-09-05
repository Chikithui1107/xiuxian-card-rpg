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
        {muted ? "音" : "樂"}
      </button>
      {needsTap && !muted && (
        <p className="bgm-tap-hint" role="status">
          輕觸畫面開啟音樂
        </p>
      )}
    </>
  );
}
