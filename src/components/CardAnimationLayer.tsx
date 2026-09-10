"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
import { aspectClassName, aspectFromTemplateId, QiCostSeal } from "@/components/CardFace";

export type PileFlightKind = "draw" | "discard" | "endTurnDiscard";

export interface FlyingCardFaceSnapshot {
  name: string;
  type: string;
  cost: number;
  description: string;
  blurbLines: string[];
  icon: string | null;
  templateId: string;
  isExhaust: boolean;
  isRetain: boolean;
  pulledByKarma: boolean;
}

export interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 單張抽／棄飛牌 */
export interface SinglePileFlight {
  id: string;
  kind: "draw" | "discard";
  handInstanceId?: string;
  card: Card;
  face: FlyingCardFaceSnapshot;
  from: RectBox;
  to: RectBox;
  delayMs: number;
  durationMs: number;
  spinDeg?: number;
}

/** 回合結束：收攏成疊 → 一次飛向棄牌堆 */
export interface EndTurnPileFlight {
  id: string;
  kind: "endTurnDiscard";
  items: { face: FlyingCardFaceSnapshot; from: RectBox }[];
  to: RectBox;
  gatherMs: number;
  flyMs: number;
  absorbMs: number;
}

export type PileFlight = SinglePileFlight | EndTurnPileFlight;

interface CardAnimationLayerProps {
  flights: PileFlight[];
  onFlightDone: (id: string) => void;
  onDiscardAbsorb?: (flightId: string) => void;
}

const DRAW_FLY_W = 92;
const DRAW_FLY_H = 144;
const DISCARD_FLY_W = 100;
const DISCARD_FLY_H = 156;
const STACK_W = 96;
const STACK_H = 150;

export const END_TURN_GATHER_MS = 120;
export const END_TURN_FLY_MS = 220;
export const END_TURN_ABSORB_MS = 80;
/** 棄牌結束 → 抽牌開始之間的呼吸停頓 */
export const END_TURN_BEAT_MS = 80;

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
    isRetain: Boolean(card.isRetain ?? template?.isRetain),
    pulledByKarma: Boolean(card.pulledByKarma),
  };
}

function centerBox(box: RectBox, w: number, h: number) {
  return {
    left: box.left + box.width / 2 - w / 2,
    top: box.top + box.height / 2 - h / 2,
  };
}

export const FlyingCardVisual = memo(function FlyingCardVisual({
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
        <QiCostSeal
          cost={face.cost}
          aspect={aspectFromTemplateId(face.templateId)}
          reduced={face.pulledByKarma}
          className="ink-qi-seal--fly"
        />
        <span className="pile-fly-face__name">{face.name}</span>
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
      <footer className={`pile-fly-face__type ${typeAccent}`}>
        {face.type}
        {face.isRetain ? " · 保留" : ""}
      </footer>
    </div>
  );
});

const FlyingPileCard = memo(function FlyingPileCard({
  flight,
  onDone,
  onDiscardAbsorb,
}: {
  flight: SinglePileFlight;
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

const EndTurnGatherFlight = memo(function EndTurnGatherFlight({
  flight,
  onDone,
  onDiscardAbsorb,
}: {
  flight: EndTurnPileFlight;
  onDone: () => void;
  onDiscardAbsorb?: () => void;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const absorbRef = useRef(onDiscardAbsorb);
  absorbRef.current = onDiscardAbsorb;
  const doneSentRef = useRef(false);
  const [phase, setPhase] = useState<"gather" | "fly">("gather");

  const n = flight.items.length;
  const centerX =
    n > 0
      ? flight.items.reduce(
          (s, it) => s + it.from.left + it.from.width / 2,
          0
        ) / n
      : flight.to.left;
  const centerY =
    n > 0
      ? flight.items.reduce(
          (s, it) => s + it.from.top + it.from.height / 2,
          0
        ) / n
      : flight.to.top;

  const gatherLeft = centerX - STACK_W / 2;
  const gatherTop = centerY - STACK_H / 2;
  const pile = centerBox(flight.to, STACK_W, STACK_H);
  const flyDx = pile.left - gatherLeft;
  const flyDy = pile.top - gatherTop;

  const topFace = flight.items[flight.items.length - 1]?.face;
  const typeStyle =
    CARD_TYPE_COLORS[topFace?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const aspect = aspectClassName(
    aspectFromTemplateId(topFace?.templateId)
  );

  const finish = useCallback(() => {
    if (doneSentRef.current) return;
    doneSentRef.current = true;
    absorbRef.current?.();
    onDoneRef.current();
  }, []);

  // 保險：動畫事件遺失時仍能結束 Promise（用本段實際 duration，非猜的 300）
  useEffect(() => {
    const fallback = window.setTimeout(
      () => finish(),
      flight.gatherMs + flight.flyMs + flight.absorbMs + 80
    );
    return () => window.clearTimeout(fallback);
  }, [flight.gatherMs, flight.flyMs, flight.absorbMs, flight.id, finish]);

  if (phase === "gather") {
    return (
      <>
        {flight.items.map((item, i) => {
          const start = centerBox(item.from, STACK_W, STACK_H);
          const dx = gatherLeft - start.left;
          const dy = gatherTop - start.top;
          const itemType =
            CARD_TYPE_COLORS[item.face.type] ??
            "ink-card-type-basic bg-[#1a1814]";
          const itemAspect = aspectClassName(
            aspectFromTemplateId(item.face.templateId)
          );
          const isLead = i === flight.items.length - 1;
          return (
            <div
              key={`${flight.id}-g-${i}`}
              className="pile-fly-card pile-fly-endturn-gather pointer-events-none"
              style={
                {
                  left: start.left,
                  top: start.top,
                  width: STACK_W,
                  height: STACK_H,
                  zIndex: 91 + i,
                  ["--pile-dx" as string]: `${dx}px`,
                  ["--pile-dy" as string]: `${dy}px`,
                  ["--pile-spin" as string]: `${(i % 2 === 0 ? -1 : 1) * (4 + (i % 3))}deg`,
                  animationDuration: `${flight.gatherMs}ms`,
                } as CSSProperties
              }
              onAnimationEnd={
                isLead
                  ? (e) => {
                      if (e.target !== e.currentTarget) return;
                      setPhase("fly");
                    }
                  : undefined
              }
            >
              <div
                className={`pile-fly-card__visual ink-card h-full w-full overflow-hidden ${itemType} ${itemAspect}`}
              >
                <FlyingCardVisual face={item.face} />
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div
      className="pile-fly-card pile-fly-endturn-stack pointer-events-none"
      style={
        {
          left: gatherLeft,
          top: gatherTop,
          width: STACK_W,
          height: STACK_H,
          ["--pile-dx" as string]: `${flyDx}px`,
          ["--pile-dy" as string]: `${flyDy}px`,
          animationDuration: `${flight.flyMs + flight.absorbMs}ms`,
        } as CSSProperties
      }
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        finish();
      }}
    >
      <div className="pile-fly-stack" aria-hidden>
        <span className="pile-fly-stack__sheet pile-fly-stack__sheet--3" />
        <span className="pile-fly-stack__sheet pile-fly-stack__sheet--2" />
        <div
          className={`pile-fly-stack__top ink-card overflow-hidden ${typeStyle} ${aspect}`}
        >
          {topFace ? <FlyingCardVisual face={topFace} /> : null}
        </div>
        {n > 1 && (
          <span className="pile-fly-stack__badge tabular-nums">{n}</span>
        )}
      </div>
      <span className="pile-fly-ink" aria-hidden />
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
      {flights.map((flight) =>
        flight.kind === "endTurnDiscard" ? (
          <EndTurnGatherFlight
            key={flight.id}
            flight={flight}
            onDone={() => onFlightDone(flight.id)}
            onDiscardAbsorb={() => onDiscardAbsorb?.(flight.id)}
          />
        ) : (
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
        )
      )}
    </div>,
    document.body
  );
}
