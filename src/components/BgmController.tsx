"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBgmMuted,
  isBgmUnlocked,
  setBgmAllowed,
  toggleBgmMuted,
  tryAutoPlayBgm,
  unlockAndStartBgm,
} from "@/lib/bgm";

interface BgmControllerProps {
  /** 非戰鬥階段為 true，進入戰鬥為 false */
  enabled: boolean;
}

export function BgmController({ enabled }: BgmControllerProps) {
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
    setBgmAllowed(enabled);
    if (!enabled || muted) {
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
  }, [enabled, muted]);

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
        title={
          muted
            ? "開音樂"
            : enabled
              ? "關音樂"
              : "戰鬥中已暫停 · 點擊可靜音設定"
        }
      >
        {muted ? "音" : "樂"}
      </button>
      {needsTap && enabled && !muted && (
        <p className="bgm-tap-hint" role="status">
          輕觸畫面開啟音樂
        </p>
      )}
    </>
  );
}
