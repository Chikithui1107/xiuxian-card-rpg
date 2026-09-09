"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CardFace, aspectClassName, aspectFromTemplateId } from "@/components/CardFace";
import {
  CARD_TEMPLATES,
  getCardTemplate,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { CardFacePreviewState } from "@/lib/card-face-display";
import type { Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";
import { CARD_TYPE_COLORS } from "@/types/game";

export type PileFlightKind = "draw" | "discard";

/** 建立動畫當下凍結的卡面快照，避免之後 state 更新把飛牌洗成空白 */
export interface FlyingCardFaceSnapshot {
  name: string;
  type: string;
  cost: number;
  description: string;
  icon: string | null;
  templateId: string;
  isExhaust: boolean;
  pulledByKarma: boolean;
}

export interface PileFlight {
  id: string;
  kind: PileFlightKind;
  handInstanceId?: string;
  /** 完整卡牌資料快照 */
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
  /** 棄牌進入 absorb 階段時回調（用來 pulse 棄牌堆） */
  onDiscardAbsorb?: (flightId: string) => void;
  facePreview?: CardFacePreviewState;
}

export function snapshotFlyingFace(card: Card): FlyingCardFaceSnapshot {
  const template =
    getCardTemplate(card) ?? CARD_TEMPLATES[card.id as CardTemplateId];
  return {
    name: card.name,
    type: template?.type ?? "",
    cost: getEffectiveCost(card),
    description: template?.description ?? "",
    icon: template?.icon ?? template?.art ?? null,
    templateId: card.id,
    isExhaust: Boolean(card.isExhaust ?? template?.isExhaust),
    pulledByKarma: Boolean(card.pulledByKarma),
  };
}

function flySize(
  kind: PileFlightKind,
  from: PileFlight["from"],
  to: PileFlight["to"]
) {
  if (kind === "draw") {
    return {
      width: Math.max(to.width || 0, 104),
      height: Math.max(to.height || 0, 164),
    };
  }
  return {
    width: Math.max(from.width || 0, 104),
    height: Math.max(from.height || 0, 164),
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

function FlyingPileCard({
  flight,
  onDone,
  onDiscardAbsorb,
  facePreview,
}: {
  flight: PileFlight;
  onDone: () => void;
  onDiscardAbsorb?: () => void;
  facePreview?: CardFacePreviewState;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const absorbRef = useRef(onDiscardAbsorb);
  absorbRef.current = onDiscardAbsorb;

  const size = flySize(flight.kind, flight.from, flight.to);
  const start = centerBox(flight.from, size.width, size.height);
  const end = centerBox(flight.to, size.width, size.height);
  const dx = end.left - start.left;
  const dy = end.top - start.top;
  const spin = flight.spinDeg ?? (flight.kind === "discard" ? 15 : 0);

  useEffect(() => {
    let absorbTimer: number | undefined;
    const doneTimer = window.setTimeout(() => {
      onDoneRef.current();
    }, flight.delayMs + flight.durationMs + 20);

    if (flight.kind === "discard") {
      // Lift ~19% + Fly ~53% → absorb 約在 72%
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
          width: size.width,
          height: size.height,
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
        <CardFace
          name={flight.face.name}
          type={flight.face.type}
          cost={flight.face.cost}
          description={flight.face.description}
          icon={flight.face.icon}
          templateId={flight.face.templateId}
          canAfford
          isExhaust={flight.face.isExhaust}
          pulledByKarma={flight.face.pulledByKarma}
          showSelectHint={false}
          showReady={false}
          preview={facePreview}
        />
      </div>
      {flight.kind === "discard" && (
        <span className="pile-fly-ink" aria-hidden />
      )}
    </div>
  );
}

export function CardAnimationLayer({
  flights,
  onFlightDone,
  onDiscardAbsorb,
  facePreview,
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
          facePreview={facePreview}
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
