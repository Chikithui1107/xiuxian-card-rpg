"use client";

import type { CSSProperties } from "react";
import type { PlayFxKind } from "@/lib/combat-fx";

export interface PlayBurst {
  key: string;
  kind: PlayFxKind;
  x: number;
  y: number;
}

export function PlayBurstFx({ bursts }: { bursts: PlayBurst[] }) {
  return (
    <>
      {bursts.map((burst) => (
        <div
          key={burst.key}
          className={`play-burst play-burst--${burst.kind}`}
          style={{ left: burst.x, top: burst.y }}
          aria-hidden
        >
          <span className="play-burst-ring" />
          <span className="play-burst-slash" />
          <span className="play-burst-slash play-burst-slash-b" />
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className="play-burst-spark"
              style={
                {
                  "--i": i,
                  "--dx": `${Math.cos((i / 7) * Math.PI * 2) * 48}px`,
                  "--dy": `${Math.sin((i / 7) * Math.PI * 2) * 48}px`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </>
  );
}
