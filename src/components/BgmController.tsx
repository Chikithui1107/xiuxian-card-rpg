"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBgmMuted,
  setBgmAllowed,
  toggleBgmMuted,
  unlockBgm,
} from "@/lib/bgm";

interface BgmControllerProps {
  /** 非戰鬥階段為 true，戰鬥中為 false */
  enabled?: boolean;
}

export function BgmController({ enabled = true }: BgmControllerProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isBgmMuted());
    const onFirst = () => {
      unlockBgm();
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
    unlockBgm();
    setMuted(toggleBgmMuted());
  }, []);

  return (
    <button
      type="button"
      className="bgm-toggle-btn"
      onClick={onToggle}
      aria-label={muted ? "開啟背景音樂" : "關閉背景音樂"}
      title={muted ? "開音樂" : "關音樂"}
    >
      {muted ? "音" : "樂"}
    </button>
  );
}
