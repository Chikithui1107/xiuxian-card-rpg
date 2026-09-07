"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CARD_TEMPLATES,
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
}

/** 上滑多少像素算出牌 */
const PLAY_SWIPE_Y = -52;
const TAP_SLOP = 8;

/** 靜止時扇形角度；hover／選取時歸零方便閱讀 */
function fanAngle(index: number, total: number) {
  if (total <= 1) return 0;
  const spread = Math.min(10, 3 * (total - 1));
  const start = -spread / 2;
  return start + (spread / (total - 1)) * index;
}

function fanLift(index: number, total: number) {
  if (total <= 1) return 0;
  const mid = (total - 1) / 2;
  return Math.abs(index - mid) * 2.5;
}

/** 重疊適中：卡名必露；詳情用獨立面板，不放大手牌 */
function overlapPx(total: number) {
  const raw =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue(
          "--game-card-width"
        )
      : "7.35rem";
  const w = raw.includes("rem")
    ? (parseFloat(raw) || 7.35) * 16
    : parseFloat(raw) || 118;
  if (total <= 3) return Math.round(w * 0.18);
  if (total === 4) return Math.round(w * 0.22);
  if (total === 5) return Math.round(w * 0.26);
  return Math.round(w * 0.3);
}

export function HandUI({
  hand,
  energy,
  disabled = false,
  denyShake = false,
  onPlayCard,
  onDenyPlay,
  facePreview,
}: HandUIProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverDetailId, setHoverDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  const detailCard =
    hand.find((c) => c.instanceId === (hoverDetailId ?? selectedId)) ?? null;
  const detailTemplate = detailCard ? getCardTemplate(detailCard) : null;
  const detailKarma = detailCard
    ? getKarmaCardFaceDisplay(detailCard.id, facePreview)
    : null;

  return (
    <div
      className={`hand-fan relative w-full overflow-visible px-0.5 pb-1 pt-1 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(0.5rem + var(--game-card-height))" }}
    >
      <CardDetailPanel
        open={Boolean(detailCard && detailTemplate)}
        name={detailCard?.name ?? ""}
        type={detailTemplate?.type ?? ""}
        cost={detailCard ? getEffectiveCost(detailCard) : 0}
        detail={detailKarma?.detail ?? detailTemplate?.description ?? ""}
      />
      {hand.length === 0 ? (
        <p className="flex min-h-[var(--game-card-height)] items-center justify-center text-xs text-stone-500">
          手牌已空
        </p>
      ) : (
        <div className="flex max-w-full justify-center overflow-visible">
          <div className="relative flex items-end justify-center">
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
                facePreview={facePreview}
                onSelect={(id) =>
                  setSelectedId((prev) => (prev === id ? null : id))
                }
                onHoverDetail={setHoverDetailId}
                onPlayCard={onPlayCard}
                onDenyPlay={onDenyPlay}
              />
            ))}
          </div>
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
  facePreview,
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
  facePreview?: CardFacePreviewState;
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

  const angle = fanAngle(index, total);
  const baseLift = fanLift(index, total);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);

  /* 點選／hover 略抬高並置頂；詳情用獨立面板，不放大整張手牌、不改 hand 尺寸 */
  const raised = (selected || hovered) && !dragging;
  const restTransform = raised
    ? `translateY(${baseLift - 10}px) scale(1.03) rotate(0deg)`
    : `translateY(${baseLift}px) scale(1) rotate(${angle}deg)`;
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
    // 用槽位量尺寸，避免扇形 rotate／hover 影響抓取點
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
        // 下一幀強制寫座標，避免 React commit 前幽靈還在錯誤位置
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
      showSelectHint={opts.showSelectHint}
      showReady={opts.showReady}
      preview={facePreview}
    />
  );

  /* 拖曳幽靈：不用 ink-card（避免被 CSS 藏掉），純 fixed + translate3d 跟手 */
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
        <div className={`h-full w-full ${typeStyle}`}>{renderCardFace({
          showSelectHint: false,
          showReady: readyHint,
        })}</div>
      </div>,
      document.body
    );

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0"
      style={{
        zIndex: stackZ,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
      onMouseEnter={() => {
        if (fineHoverRef.current && !dragging) {
          onHoverDetail(card.instanceId);
        }
      }}
      onMouseLeave={() => onHoverDetail(null)}
    >
      <div
        ref={ghostRef}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-disabled={locked || !canAfford}
        onPointerDown={(e) => {
          onHoverDetail(null);
          onPointerDown(e);
        }}
        onPointerCancel={onPointerCancel}
        onKeyDown={(e) => {
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
        } ${typeStyle} ${
          dragging ? "" : "transition-transform duration-200 ease-out"
        } ${raised ? "ink-card-selected" : ""} ${
          card.pulledByKarma && !dragging ? "ink-card-pulled" : ""
        }`}
        style={{
          touchAction: "none",
          transform: restTransform,
          zIndex: raised ? 80 + index : undefined,
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
