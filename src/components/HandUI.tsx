"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CARD_TEMPLATES,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import { CARD_TYPE_ACCENT, CARD_TYPE_COLORS } from "@/types/game";

interface HandUIProps {
  hand: Card[];
  energy: number;
  disabled?: boolean;
  denyShake?: boolean;
  onPlayCard: (card: Card, origin: DOMRect) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
}

/** 上滑多少像素算出牌 */
const PLAY_SWIPE_Y = -52;
const TAP_SLOP = 8;

/** 固定扇形角度（不隨 hover 改變） */
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

/** 重疊適中：卡名必露；完整效果靠點選提到最前閱讀 */
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
}: HandUIProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  return (
    <div
      className={`hand-fan relative w-full overflow-visible px-0.5 pb-1 pt-1 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(0.5rem + var(--game-card-height))" }}
    >
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
                onSelect={(id) =>
                  setSelectedId((prev) => (prev === id ? null : id))
                }
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
  onSelect,
  onPlayCard,
  onDenyPlay,
}: {
  card: Card;
  index: number;
  total: number;
  energy: number;
  locked: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
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
  const [dragging, setDragging] = useState(false);
  const [readyHint, setReadyHint] = useState(false);
  const [dragBox, setDragBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const template = CARD_TEMPLATES[card.id as CardTemplateId];
  const canAfford = energy >= card.cost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const angle = fanAngle(index, total);
  const baseLift = fanLift(index, total);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);

  /* 點選：提到最前並略抬高，方便讀完整內容；不做鄰牌讓位 */
  const restTransform = selected
    ? `translateY(${baseLift - 16}px) scale(1.06) rotate(0deg)`
    : `translateY(${baseLift}px) scale(1) rotate(${angle}deg)`;

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
    const ghost = ghostRef.current;
    if (!ghost) return;
    const rect = ghost.getBoundingClientRect();

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
      }

      if (!drag.active) return;

      dragPosRef.current = { x, y };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const d = dragRef.current;
          if (!d?.active) return;
          const p = dragPosRef.current;
          setDragBox({ x: p.x, y: p.y, w: d.width, h: d.height });
        });
      }

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

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0"
      style={{
        zIndex: dragging ? 90 : selected ? 80 : 10 + index,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
    >
      <div
        ref={ghostRef}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-disabled={locked || !canAfford}
        onPointerDown={onPointerDown}
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
        className={`ink-card origin-bottom select-none ${
          dragging ? "ink-card-dragging" : "absolute inset-0"
        } ${
          locked
            ? "cursor-not-allowed opacity-40"
            : !canAfford
              ? "cursor-grab opacity-55"
              : "cursor-grab active:cursor-grabbing"
        } ${typeStyle} ${
          dragging ? "" : "transition-transform duration-150 ease-out"
        } ${selected && !dragging ? "ink-card-selected" : ""} ${
          readyHint ? "ring-2 ring-[#7aab9a]/75" : ""
        }`}
        style={{
          touchAction: "none",
          ...(dragging && dragBox
            ? {
                position: "fixed",
                left: dragBox.x,
                top: dragBox.y,
                width: dragBox.w,
                height: dragBox.h,
                zIndex: 9999,
                margin: 0,
                transform: "none",
                transition: "none",
              }
            : {
                transform: restTransform,
                zIndex: selected ? 80 : undefined,
              }),
        }}
      >
        <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-1.5">
          <div className="flex items-start justify-between gap-1">
            <span className="min-w-0 flex-1 text-left text-[12px] font-bold leading-tight tracking-wide text-[#f0e6d3]">
              {card.name}
            </span>
            <span
              className={`flex h-[1.25rem] w-[1.25rem] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                canAfford
                  ? "bg-[#7aab9a]/90 text-stone-950"
                  : "bg-[#a85555]/85 text-stone-100"
              }`}
            >
              {card.cost}
            </span>
          </div>

          {/* 完整效果文字；CJK 自然換行，不截斷 */}
          <p className="mt-1.5 min-h-0 flex-1 overflow-y-auto break-words text-left text-[10px] leading-[1.35] text-stone-300">
            {description}
          </p>

          <div className="mt-1 shrink-0">
            <p className={`text-[8px] font-semibold ${typeAccent}`}>
              {template?.type}
            </p>
            {card.isExhaust && (
              <p className="text-[8px] text-amber-500/70">消耗</p>
            )}
            {selected && !readyHint && (
              <p className="mt-0.5 text-[8px] text-stone-500">上拖出牌</p>
            )}
            {readyHint && (
              <p className="mt-0.5 text-[9px] font-bold text-[#7aab9a]">
                松手出牌
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
