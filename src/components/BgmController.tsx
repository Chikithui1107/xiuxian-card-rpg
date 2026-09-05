"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBgmMuted,
  startBgm,
  toggleBgmMuted,
  unlockAndStartBgm,
} from "@/lib/bgm";

export function BgmController() {
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

  const onToggle = useCallback(() => {
    startBgm();
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
