"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CARD_TYPE_COLORS } from "@/types/game";

export type PileFlightKind = "draw" | "discard";

export interface PileFlight {
  id: string;
  kind: PileFlightKind;
  /** 對應真實手牌 instanceId（抽牌結束後顯示） */
  handInstanceId?: string;
  name: string;
  cost: number;
  type: string;
  from: { left: number; top: number; width: number; height: number };
  to: { left: number; top: number; width: number; height: number };
  delayMs: number;
  durationMs: number;
  /** 棄牌輕微旋轉，約 ±8～15 */
  spinDeg?: number;
}

interface CardAnimationLayerProps {
  flights: PileFlight[];
  onFlightDone: (id: string) => void;
}

const FLY_W = 72;
const FLY_H = 112;

function centerBox(
  box: { left: number; top: number; width: number; height: number },
  w: number,
  h: number
) {
  return {
    left: box.left + box.width / 2 - w / 2,
    top: box.top + box.height / 2 - h / 2,
  };
}

function FlyingPileCard({
  flight,
  onDone,
}: {
  flight: PileFlight;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [faceUp, setFaceUp] = useState(flight.kind !== "draw");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const start = centerBox(flight.from, FLY_W, FLY_H);
  const end = centerBox(flight.to, FLY_W, FLY_H);
  const dx = end.left - start.left;
  const dy = end.top - start.top;
  const spin = flight.spinDeg ?? (flight.kind === "discard" ? 12 : 0);

  useEffect(() => {
    let flipTimer: number | undefined;
    let doneTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      setVisible(true);
      if (flight.kind === "draw") {
        flipTimer = window.setTimeout(() => {
          setFaceUp(true);
        }, flight.durationMs * 0.52);
      }
      doneTimer = window.setTimeout(() => {
        onDoneRef.current();
      }, flight.durationMs + 16);
    }, flight.delayMs);

    return () => {
      window.clearTimeout(startTimer);
      if (flipTimer) window.clearTimeout(flipTimer);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [flight.delayMs, flight.durationMs, flight.kind, flight.id]);

  if (!visible) return null;

  const typeStyle =
    CARD_TYPE_COLORS[flight.type] ?? "ink-card-type-basic bg-[#1a1814]";
  const animClass =
    flight.kind === "draw" ? "pile-fly-draw" : "pile-fly-discard";

  return (
    <div
      className={`pile-fly-card ${animClass} pointer-events-none`}
      style={
        {
          left: start.left,
          top: start.top,
          width: FLY_W,
          height: FLY_H,
          ["--pile-dx" as string]: `${dx}px`,
          ["--pile-dy" as string]: `${dy}px`,
          ["--pile-spin" as string]: `${spin}deg`,
          animationDuration: `${flight.durationMs}ms`,
        } as CSSProperties
      }
    >
      {faceUp ? (
        <div className={`pile-fly-card__face ink-card h-full w-full ${typeStyle}`}>
          <p className="truncate text-[10px] font-semibold tracking-wide text-[#f0e6d3]">
            {flight.name}
          </p>
          <p className="mt-1 text-[9px] text-[#9ab8aa]">真元 {flight.cost}</p>
        </div>
      ) : (
        <div className="pile-fly-card__back">
          <span className="pile-fly-card__back-mark">仙</span>
        </div>
      )}
    </div>
  );
}

export function CardAnimationLayer({
  flights,
  onFlightDone,
}: CardAnimationLayerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="card-anim-layer" aria-hidden>
      {flights.map((flight) => (
        <FlyingPileCard
          key={flight.id}
          flight={flight}
          onDone={() => onFlightDone(flight.id)}
        />
      ))}
    </div>,
    document.body
  );
}
