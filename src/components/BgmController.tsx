"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBgmMuted,
  setBgmAllowed,
  toggleBgmMuted,
  unlockAndStartBgm,
} from "@/lib/bgm";

interface BgmControllerProps {
  /** 非戰鬥階段為 true，進入戰鬥為 false */
  enabled: boolean;
}

export function BgmController({ enabled }: BgmControllerProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isBgmMuted());
    const onFirst = () => {
      unlockAndStartBgm();
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  useEffect(() => {
    setBgmAllowed(enabled);
  }, [enabled]);

  const onToggle = useCallback(() => {
    unlockAndStartBgm();
    setMuted(toggleBgmMuted());
  }, []);

  return (
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
  );
}
