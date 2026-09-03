"use client";

import type { CSSProperties } from "react";
import type { PlayFxKind } from "@/lib/combat-fx";

export interface PlayBurst {
  key: string;
  kind: PlayFxKind;
  x: number;
  y: number;
}

function Sparks({
  count,
  radius,
  className = "fx-spark",
}: {
  count: number;
  radius: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={className}
          style={
            {
              "--i": i,
              "--dx": `${Math.cos((i / count) * Math.PI * 2) * radius}px`,
              "--dy": `${Math.sin((i / count) * Math.PI * 2) * radius}px`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

function FuxueBurst() {
  return (
    <>
      <span className="fx-qi-arc" />
      <span className="fx-qi-arc fx-qi-arc-b" />
      <span className="fx-sword-beam" />
      <span className="fx-sword-beam fx-sword-beam-b" />
      <span className="fx-core-glow fx-core-fuxue" />
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="fx-snow"
          style={
            {
              "--i": i,
              "--sx": `${(i % 5) * 18 - 36}px`,
              "--sy": `${Math.floor(i / 5) * -22 - 8}px`,
              "--drift": `${(i % 2 === 0 ? 1 : -1) * (22 + i * 4)}px`,
            } as CSSProperties
          }
        />
      ))}
      <Sparks count={8} radius={54} className="fx-spark fx-spark-fuxue" />
    </>
  );
}

function TuxuBurst() {
  return (
    <>
      <span className="fx-ghost fx-ghost-a" />
      <span className="fx-ghost fx-ghost-b" />
      <span className="fx-ghost fx-ghost-c" />
      <span className="fx-ring fx-ring-tuxu" />
      <span className="fx-ring fx-ring-tuxu-b" />
      <Sparks count={6} radius={40} className="fx-spark fx-spark-tuxu" />
    </>
  );
}

function LingtaiBurst() {
  return (
    <>
      <span className="fx-eye" />
      <span className="fx-ring fx-ring-lingtai" />
      <span className="fx-ring fx-ring-lingtai-b" />
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="fx-glyph"
          style={
            {
              "--i": i,
              "--rot": `${i * 60}deg`,
            } as CSSProperties
          }
        />
      ))}
      <Sparks count={7} radius={46} className="fx-spark fx-spark-lingtai" />
    </>
  );
}

function CangfengBurst() {
  return (
    <>
      <span className="fx-core-glow fx-core-cangfeng" />
      <span className="fx-bolt" />
      <span className="fx-bolt fx-bolt-b" />
      <span className="fx-ring fx-ring-cangfeng" />
      <Sparks count={9} radius={50} className="fx-spark fx-spark-cangfeng" />
    </>
  );
}

function NingshuangBurst() {
  return (
    <>
      <span className="fx-frost-mist" />
      <span className="fx-ring fx-ring-ningshuang" />
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="fx-crystal"
          style={
            {
              "--i": i,
              "--cx": `${Math.cos((i / 7) * Math.PI * 2) * 34}px`,
              "--cy": `${Math.sin((i / 7) * Math.PI * 2) * 34}px`,
            } as CSSProperties
          }
        />
      ))}
      <Sparks count={6} radius={42} className="fx-spark fx-spark-ningshuang" />
    </>
  );
}

function YijianBurst() {
  return (
    <>
      <span className="fx-frost-blade" />
      <span className="fx-sword-beam fx-sword-beam-ultimate" />
      <span className="fx-sword-beam fx-sword-beam-ultimate-b" />
      <span className="fx-core-glow fx-core-yijian" />
      <span className="fx-ring fx-ring-yijian" />
      <span className="fx-ring fx-ring-yijian-b" />
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="fx-snow fx-snow-heavy"
          style={
            {
              "--i": i,
              "--sx": `${(i % 6) * 20 - 50}px`,
              "--sy": `${Math.floor(i / 6) * -28 - 10}px`,
              "--drift": `${(i % 2 === 0 ? 1 : -1) * (28 + i * 3)}px`,
            } as CSSProperties
          }
        />
      ))}
      <Sparks count={10} radius={62} className="fx-spark fx-spark-yijian" />
    </>
  );
}

function BurstBody({ kind }: { kind: PlayFxKind }) {
  switch (kind) {
    case "fuxue":
      return <FuxueBurst />;
    case "tuxu":
      return <TuxuBurst />;
    case "lingtai":
      return <LingtaiBurst />;
    case "cangfeng":
      return <CangfengBurst />;
    case "ningshuang":
      return <NingshuangBurst />;
    case "yijian":
      return <YijianBurst />;
  }
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
          <BurstBody kind={burst.kind} />
        </div>
      ))}
    </>
  );
}
