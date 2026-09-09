"use client";

import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  CARD_TEMPLATES,
  getCardTemplate,
  resolveCardIcon,
  type CardTemplateId,
} from "@/lib/battle-deck";
import {
  getKarmaCardFaceDisplay,
  type CardFacePreviewState,
} from "@/lib/card-face-display";
import { publicAsset } from "@/lib/paths";
import type { Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";
import { aspectClassName, aspectFromTemplateId } from "@/components/CardFace";

export type PileFlightKind = "draw" | "discard";

/** 建立動畫當下凍結的卡面快照，避免之後 state 更新把飛牌洗成空白 */
export interface FlyingCardFaceSnapshot {
  name: string;
  type: string;
  cost: number;
  description: string;
  /** 預先拼好的短效果行，飛牌用輕量 DOM 顯示 */
  blurbLines: string[];
  icon: string | null;
  templateId: string;
  isExhaust: boolean;
  pulledByKarma: boolean;
}

export interface PileFlight {
  id: string;
  kind: PileFlightKind;
  handInstanceId?: string;
  card: Card;
  face: FlyingCardFaceSnapshot;
  from: { left: number; top: number; width: number; height: number };
  to: { left: number; top: number; width: number; height: number };
  delayMs: number;
  durationMs: number;
  spinDeg?: number;
}

interface CardAnimationLayerProps {
  flights: PileFlight[];
  onFlightDone: (id: string) => void;
  onDiscardAbsorb?: (flightId: string) => void;
  facePreview?: CardFacePreviewState;
}

/** 飛牌固定尺寸：比整張手牌小，動畫更跟手、較少重繪 */
const DRAW_FLY_W = 92;
const DRAW_FLY_H = 144;
const DISCARD_FLY_W = 100;
const DISCARD_FLY_H = 156;

export function snapshotFlyingFace(
  card: Card,
  preview?: CardFacePreviewState
): FlyingCardFaceSnapshot {
  const template =
    getCardTemplate(card) ?? CARD_TEMPLATES[card.id as CardTemplateId];
  const karma = getKarmaCardFaceDisplay(card.id, preview);
  const blurbLines = karma
    ? karma.coreLines
        .slice(0, 3)
        .map((line) => line.tokens.map((t) => t.text).join(""))
    : template?.description
      ? [template.description]
      : [];

  return {
    name: card.name,
    type: template?.type ?? "",
    cost: getEffectiveCost(card),
    description: template?.description ?? "",
    blurbLines,
    icon: template?.icon ?? template?.art ?? null,
    templateId: card.id,
    isExhaust: Boolean(card.isExhaust ?? template?.isExhaust),
    pulledByKarma: Boolean(card.pulledByKarma),
  };
}

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

/** 純視覺飛牌：無 drag／hover／token 狀態，避免動畫途中卡頓 */
const FlyingCardVisual = memo(function FlyingCardVisual({
  face,
}: {
  face: FlyingCardFaceSnapshot;
}) {
  const [iconBroken, setIconBroken] = useState(false);
  const iconPath = !iconBroken ? resolveCardIcon(face.icon) : null;
  const typeAccent = CARD_TYPE_ACCENT[face.type] ?? "text-[#c9a84c]";

  return (
    <div className="pile-fly-face">
      <header className="pile-fly-face__header">
        <span className="pile-fly-face__name">{face.name}</span>
        <span className="pile-fly-face__cost">{face.cost}</span>
      </header>
      <div
        className={`pile-fly-face__icon${
          iconPath ? "" : " pile-fly-face__icon--empty"
        }`}
        aria-hidden
      >
        {iconPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAsset(iconPath)}
            alt=""
            draggable={false}
            decoding="async"
            onError={() => setIconBroken(true)}
          />
        ) : null}
      </div>
      <div className="pile-fly-face__desc">
        {face.blurbLines.slice(0, 3).map((line, i) => (
          <p key={i} className="pile-fly-face__line">
            {line}
          </p>
        ))}
      </div>
      <footer className={`pile-fly-face__type ${typeAccent}`}>{face.type}</footer>
    </div>
  );
});

const FlyingPileCard = memo(function FlyingPileCard({
  flight,
  onDone,
  onDiscardAbsorb,
}: {
  flight: PileFlight;
  onDone: () => void;
  onDiscardAbsorb?: () => void;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const absorbRef = useRef(onDiscardAbsorb);
  absorbRef.current = onDiscardAbsorb;

  const w = flight.kind === "draw" ? DRAW_FLY_W : DISCARD_FLY_W;
  const h = flight.kind === "draw" ? DRAW_FLY_H : DISCARD_FLY_H;
  const start = centerBox(flight.from, w, h);
  const end = centerBox(flight.to, w, h);
  const dx = end.left - start.left;
  const dy = end.top - start.top;
  const spin = flight.spinDeg ?? (flight.kind === "discard" ? 15 : 0);

  useEffect(() => {
    let absorbTimer: number | undefined;
    const doneTimer = window.setTimeout(() => {
      onDoneRef.current();
    }, flight.delayMs + flight.durationMs + 12);

    if (flight.kind === "discard") {
      absorbTimer = window.setTimeout(() => {
        absorbRef.current?.();
      }, flight.delayMs + flight.durationMs * 0.72);
    }

    return () => {
      window.clearTimeout(doneTimer);
      if (absorbTimer) window.clearTimeout(absorbTimer);
    };
  }, [flight.delayMs, flight.durationMs, flight.kind, flight.id]);

  const typeStyle =
    CARD_TYPE_COLORS[flight.face.type] ?? "ink-card-type-basic bg-[#1a1814]";
  const aspect = aspectClassName(aspectFromTemplateId(flight.face.templateId));
  const animClass =
    flight.kind === "draw" ? "pile-fly-draw" : "pile-fly-discard";

  return (
    <div
      className={`pile-fly-card ${animClass} pointer-events-none`}
      style={
        {
          left: start.left,
          top: start.top,
          width: w,
          height: h,
          ["--pile-dx" as string]: `${dx}px`,
          ["--pile-dy" as string]: `${dy}px`,
          ["--pile-spin" as string]: `${spin}deg`,
          animationDuration: `${flight.durationMs}ms`,
          animationDelay: `${flight.delayMs}ms`,
        } as CSSProperties
      }
    >
      <div
        className={`pile-fly-card__visual ink-card h-full w-full overflow-hidden ${typeStyle} ${aspect}`}
      >
        <FlyingCardVisual face={flight.face} />
      </div>
      {flight.kind === "discard" && (
        <span className="pile-fly-ink" aria-hidden />
      )}
    </div>
  );
});

export function CardAnimationLayer({
  flights,
  onFlightDone,
  onDiscardAbsorb,
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
          onDiscardAbsorb={
            flight.kind === "discard"
              ? () => onDiscardAbsorb?.(flight.id)
              : undefined
          }
        />
      ))}
    </div>,
    document.body
  );
}
