"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CARD_TEMPLATES,
  cardIsRetain,
  getCardTemplate,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import { getEffectiveCost } from "@/types/battle";
import { CARD_TYPE_COLORS } from "@/types/game";
import { CardFace } from "@/components/CardFace";
import { CardDetailPanel } from "@/components/CardDetailPanel";
import {
  getKarmaCardFaceDisplay,
  type CardFacePreviewState,
} from "@/lib/card-face-display";

interface HandUIProps {
  hand: Card[];
  energy: number;
  disabled?: boolean;
  denyShake?: boolean;
  onPlayCard: (card: Card, origin: DOMRect) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
  facePreview?: CardFacePreviewState;
  /** 飛入動畫期間隱藏真實卡面，仍佔位以便量測目標座標 */
  hiddenCardIds?: ReadonlySet<string>;
  /** 出牌凍結：關閉 transform transition，避免佔位期間被帶動 */
  layoutFrozen?: boolean;
}

/** 上滑多少像素算出牌 */
const PLAY_SWIPE_Y = -52;
const TAP_SLOP = 8;
const SAFE_MARGIN_PX = 14;

interface HandLayoutMetrics {
  cardWidth: number;
  cardHeight: number;
  scale: number;
  step: number;
  spreadDeg: number;
  trackHeight: number;
}

interface CardFanPose {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

function readCssPx(varName: string, fallbackRem: number): number {
  if (typeof window === "undefined") return fallbackRem * 16;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    varName
  );
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallbackRem * 16;
  return raw.includes("rem") ? n * 16 : n;
}

function cardWidthFloor(): number {
  return readCssPx("--game-card-width", 8.15) * 0.7;
}

/**
 * 動態扇形：優先壓縮 spacing / 角度，卡牌 scale 只微調。
 * 保證首尾落在 availableWidth（已扣安全邊距）內。
 */
function computeHandMetrics(
  handCount: number,
  availableWidth: number
): HandLayoutMetrics {
  const cardWidth = readCssPx("--game-card-width", 8.15);
  const cardHeight = readCssPx("--game-card-height", 12.85);
  const n = Math.max(handCount, 0);
  // 防呆：avail 過小時仍給出最小可扇開寬度，避免 step=0 全疊中央
  const avail = Math.max(availableWidth, cardWidth * Math.min(n, 3) * 0.55);

  let scale = 1;
  if (n >= 8) scale = 0.89;
  else if (n >= 6) scale = 0.94;

  let scaledW = cardWidth * scale;
  // 若單張都比可用寬還寬，略再縮（仍不低于 ~0.88）
  if (scaledW > avail) {
    scale = Math.max(0.88, avail / cardWidth);
    scaledW = cardWidth * scale;
  }

  const maxStepRatio =
    n <= 1 ? 1 : n <= 3 ? 0.9 : n <= 5 ? 0.78 : n <= 7 ? 0.52 : 0.38;
  const maxStep = scaledW * maxStepRatio;
  const fitStep = n <= 1 ? 0 : (avail - scaledW) / (n - 1);
  const step = Math.max(0, Math.min(maxStep, fitStep));

  const spreadDeg =
    n <= 1
      ? 0
      : n <= 5
        ? Math.min(11, 2.6 * (n - 1))
        : n <= 7
          ? Math.min(7.5, 1.35 * (n - 1))
          : Math.min(4.5, 0.5 * (n - 1));

  const arcLift = n <= 5 ? 2.4 : n <= 7 ? 1.5 : 1;
  const maxArc = Math.abs((n - 1) / 2) * arcLift;
  // trackHeight 僅作參考；實際 DOM 高度由 --hand-zone-h 固定，不隨 n 改變
  const trackHeight = cardHeight * scale + maxArc + 14;

  return { cardWidth, cardHeight, scale, step, spreadDeg, trackHeight };
}

/** 扇形 Y：固定 baseline（slot bottom）+ 單張弧高；不准再加「整組手牌」位移 */
function poseForIndex(
  index: number,
  total: number,
  metrics: HandLayoutMetrics
): CardFanPose {
  if (total <= 0) return { x: 0, y: 0, rotation: 0, scale: 1 };
  const relativeIndex = index - (total - 1) / 2;
  const t = total <= 1 ? 0 : index / (total - 1) - 0.5;
  const arcLift = total <= 5 ? 2.4 : total <= 7 ? 1.5 : 1;
  return {
    x: relativeIndex * metrics.step,
    y: Math.abs(relativeIndex) * arcLift,
    rotation: t * 2 * metrics.spreadDeg,
    scale: metrics.scale,
  };
}

export function HandUI({
  hand,
  energy,
  disabled = false,
  denyShake = false,
  onPlayCard,
  onDenyPlay,
  facePreview,
  hiddenCardIds,
  layoutFrozen = false,
}: HandUIProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [availWidth, setAvailWidth] = useState(360);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverDetailId, setHoverDetailId] = useState<string | null>(null);

  // 手牌清空後 track 會卸載；必須在再次出現時重新掛 ResizeObserver。
  // 絕不能把 availWidth 寫成 0，否則 step=0、全牌疊在中央。
  useLayoutEffect(() => {
    if (hand.length === 0) return;
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w < 48) return;
      setAvailWidth(Math.max(cardWidthFloor(), w - SAFE_MARGIN_PX * 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hand.length]);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  const metrics = useMemo(
    () => computeHandMetrics(hand.length, availWidth),
    [hand.length, availWidth]
  );

  const detailCard =
    hand.find((c) => c.instanceId === (hoverDetailId ?? selectedId)) ?? null;
  const detailTemplate = detailCard ? getCardTemplate(detailCard) : null;
  const detailKarma = detailCard
    ? getKarmaCardFaceDisplay(detailCard.id, facePreview)
    : null;

  return (
    <div
      className={`hand-fan${denyShake ? " animate-deny-shake" : ""}`}
      data-hand-zone="true"
    >
      <CardDetailPanel
        open={Boolean(detailCard && detailTemplate)}
        name={detailCard?.name ?? ""}
        type={detailTemplate?.type ?? ""}
        cost={detailCard ? getEffectiveCost(detailCard) : 0}
        detail={detailKarma?.detail ?? detailTemplate?.description ?? ""}
      />
      {hand.length === 0 ? (
        <p className="flex h-full items-center justify-center text-xs text-stone-500">
          手牌已空
        </p>
      ) : (
        <div
          ref={trackRef}
          className="hand-fan-track mx-auto"
          data-hand-track="true"
        >
          {hand.map((card, index) => (
            <HandCard
              key={card.instanceId}
              card={card}
              index={index}
              total={hand.length}
              energy={energy}
              locked={disabled}
              selected={selectedId === card.instanceId}
              hovered={hoverDetailId === card.instanceId}
              pose={poseForIndex(index, hand.length, metrics)}
              cardWidth={metrics.cardWidth}
              cardHeight={metrics.cardHeight}
              facePreview={facePreview}
              visuallyHidden={hiddenCardIds?.has(card.instanceId) ?? false}
              layoutFrozen={layoutFrozen}
              onSelect={(id) =>
                setSelectedId((prev) => (prev === id ? null : id))
              }
              onHoverDetail={setHoverDetailId}
              onPlayCard={onPlayCard}
              onDenyPlay={onDenyPlay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HandCard({
  card,
  index,
  total,
  energy,
  locked,
  selected,
  hovered,
  pose,
  cardWidth,
  cardHeight,
  facePreview,
  visuallyHidden,
  layoutFrozen,
  onSelect,
  onHoverDetail,
  onPlayCard,
  onDenyPlay,
}: {
  card: Card;
  index: number;
  total: number;
  energy: number;
  locked: boolean;
  selected: boolean;
  hovered: boolean;
  pose: CardFanPose;
  cardWidth: number;
  cardHeight: number;
  facePreview?: CardFacePreviewState;
  visuallyHidden: boolean;
  layoutFrozen: boolean;
  onSelect: (id: string) => void;
  onHoverDetail: (id: string | null) => void;
  onPlayCard: (card: Card, origin: DOMRect) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    width: number;
    height: number;
    moved: boolean;
    active: boolean;
  } | null>(null);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const detachRef = useRef<(() => void) | null>(null);
  const rafRef = useRef(0);
  const dragPortalElRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [readyHint, setReadyHint] = useState(false);
  const [dragBox, setDragBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const fineHoverRef = useRef(false);

  const placeDragPortal = useCallback((x: number, y: number) => {
    const el = dragPortalElRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }, []);

  useEffect(() => {
    fineHoverRef.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
  }, []);

  const template = getCardTemplate(card) ?? CARD_TEMPLATES[card.id as CardTemplateId];
  const effectiveCost = getEffectiveCost(card);
  const canAfford = energy >= effectiveCost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";

  /* 點選／hover 略抬高並置頂；詳情用獨立面板，不改整排 reflow */
  const raised = (selected || hovered) && !dragging;
  const restTransform = raised
    ? `translateX(${pose.x}px) translateY(${pose.y - 10}px) scale(${Math.min(1.03, pose.scale + 0.04)}) rotate(0deg)`
    : `translateX(${pose.x}px) translateY(${pose.y}px) scale(${pose.scale}) rotate(${pose.rotation}deg)`;
  const stackZ = dragging ? 90 : raised ? 80 + index : 10 + index;

  const clearGhostStyles = useCallback(() => {
    setDragBox(null);
  }, []);

  const finishDrag = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    dragRef.current = null;
    setDragging(false);
    setReadyHint(false);
    clearGhostStyles();
  }, [clearGhostStyles]);

  useEffect(
    () => () => {
      detachRef.current?.();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  useEffect(() => {
    if (!dragging || !dragBox) return;
    placeDragPortal(dragBox.x, dragBox.y);
  }, [dragging, dragBox, placeDragPortal]);

  useEffect(() => {
    if (!dragging) return;
    const blockTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchmove", blockTouchMove);
    };
  }, [dragging]);

  const tryPlay = useCallback(
    (origin: DOMRect) => {
      if (locked) {
        onDenyPlay?.("locked");
        finishDrag();
        return;
      }
      if (!canAfford) {
        onDenyPlay?.("energy");
        finishDrag();
        return;
      }
      onPlayCard(card, origin);
      finishDrag();
    },
    [canAfford, card, finishDrag, locked, onDenyPlay, onPlayCard]
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const measureEl = slotRef.current ?? ghostRef.current;
    if (!measureEl) return;
    const rect = measureEl.getBoundingClientRect();
    const ghost = ghostRef.current;
    if (!ghost) return;

    try {
      ghost.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      active: false,
    };

    const onWinMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== ev.pointerId) return;
      ev.preventDefault();

      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      const x = ev.clientX - drag.grabX;
      const y = ev.clientY - drag.grabY;

      if (!drag.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
        drag.moved = true;
        drag.active = true;
        dragPosRef.current = { x, y };
        setDragging(true);
        setDragBox({ x, y, w: drag.width, h: drag.height });
        requestAnimationFrame(() => placeDragPortal(x, y));
      }

      if (!drag.active) return;

      dragPosRef.current = { x, y };
      placeDragPortal(x, y);

      const upEnough = dy <= PLAY_SWIPE_Y;
      setReadyHint((prev) => (prev === upEnough ? prev : upEnough));
    };

    const onWinUp = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== ev.pointerId) return;

      detachRef.current?.();
      detachRef.current = null;
      try {
        ghost.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }

      const dy = ev.clientY - drag.startY;
      const origin = new DOMRect(
        dragPosRef.current.x,
        dragPosRef.current.y,
        drag.width,
        drag.height
      );
      const wasActive = drag.active;
      const moved = drag.moved;

      if (wasActive && dy <= PLAY_SWIPE_Y) {
        tryPlay(origin);
        return;
      }

      if (!moved) {
        onSelect(card.instanceId);
      }
      finishDrag();
    };

    detachRef.current?.();
    window.addEventListener("pointermove", onWinMove, { passive: false });
    window.addEventListener("pointerup", onWinUp);
    window.addEventListener("pointercancel", onWinUp);
    detachRef.current = () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", onWinUp);
      window.removeEventListener("pointercancel", onWinUp);
    };
  };

  const onPointerCancel = () => {
    finishDrag();
  };

  const description = template?.description ?? "";

  const renderCardFace = (opts: {
    showSelectHint: boolean;
    showReady: boolean;
  }) => (
    <CardFace
      name={card.name}
      type={template?.type ?? ""}
      cost={effectiveCost}
      description={description}
      icon={template?.icon ?? template?.art}
      templateId={card.id}
      canAfford={canAfford}
      isExhaust={card.isExhaust}
      pulledByKarma={card.pulledByKarma}
      isRetain={cardIsRetain(card)}
      showSelectHint={opts.showSelectHint}
      showReady={opts.showReady}
      preview={facePreview}
    />
  );

  const dragPortal =
    dragging &&
    dragBox &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={dragPortalElRef}
        className="select-none"
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: dragBox.w,
          height: dragBox.h,
          zIndex: 2147483646,
          margin: 0,
          padding: 0,
          pointerEvents: "none",
          opacity: 1,
          visibility: "visible",
          transform: `translate3d(${Math.round(dragBox.x)}px, ${Math.round(dragBox.y)}px, 0)`,
          willChange: "transform",
          background: "#161410",
          border: readyHint
            ? "2px solid rgba(122, 171, 154, 0.85)"
            : "1px solid rgba(201, 168, 76, 0.55)",
          borderRadius: "0.35rem",
          overflow: "hidden",
          boxShadow: "0 16px 40px rgba(0,0,0,0.75)",
        }}
      >
        <div className={`h-full w-full ${typeStyle}`}>
          {renderCardFace({
            showSelectHint: false,
            showReady: readyHint,
          })}
        </div>
      </div>,
      document.body
    );

  return (
    <div
      ref={slotRef}
      className="hand-card-slot"
      data-hand-instance-id={card.instanceId}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 0,
        width: cardWidth,
        height: cardHeight,
        marginLeft: -cardWidth / 2,
        zIndex: stackZ,
        transform: restTransform,
        transformOrigin: "bottom center",
        transition:
          dragging || visuallyHidden || layoutFrozen
            ? undefined
            : "transform 200ms ease-out",
        /* 佔位期間不要做 layout transition，避免隱藏牌還帶動視覺 */
        visibility: visuallyHidden ? "hidden" : undefined,
        pointerEvents: visuallyHidden ? "none" : undefined,
      }}
      onMouseEnter={() => {
        if (fineHoverRef.current && !dragging && !visuallyHidden) {
          onHoverDetail(card.instanceId);
        }
      }}
      onMouseLeave={() => onHoverDetail(null)}
    >
      <div
        ref={ghostRef}
        role="button"
        tabIndex={visuallyHidden ? -1 : 0}
        aria-pressed={selected}
        aria-disabled={locked || !canAfford || visuallyHidden}
        aria-label={`${card.name}（${index + 1}/${total}）`}
        onPointerDown={(e) => {
          if (visuallyHidden) return;
          onHoverDetail(null);
          onPointerDown(e);
        }}
        onPointerCancel={onPointerCancel}
        onKeyDown={(e) => {
          if (visuallyHidden) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(card.instanceId);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const origin =
              ghostRef.current?.getBoundingClientRect() ??
              slotRef.current?.getBoundingClientRect();
            if (origin) tryPlay(origin);
          }
        }}
        className={`ink-card absolute inset-0 origin-bottom select-none ${
          locked
            ? "cursor-not-allowed opacity-40"
            : !canAfford
              ? "cursor-grab opacity-55"
              : "cursor-grab active:cursor-grabbing"
        } ${typeStyle} ${raised ? "ink-card-selected" : ""} ${
          card.pulledByKarma && !dragging ? "ink-card-pulled" : ""
        }`}
        style={{
          touchAction: "none",
          opacity: dragging ? 0.28 : undefined,
        }}
      >
        {renderCardFace({
          showSelectHint: selected && !readyHint && !dragging,
          showReady: false,
        })}
      </div>
      {dragPortal}
    </div>
  );
}
