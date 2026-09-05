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

/** 重疊保留足夠露出完整卡名 */
function overlapPx(total: number) {
  const raw =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue(
          "--game-card-width"
        )
      : "8.7rem";
  const w = raw.includes("rem")
    ? (parseFloat(raw) || 8.7) * 16
    : parseFloat(raw) || 140;
  if (total <= 3) return Math.round(w * 0.22);
  if (total === 4) return Math.round(w * 0.26);
  if (total === 5) return Math.round(w * 0.3);
  return Math.round(w * 0.34);
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
      className={`hand-fan relative overflow-visible px-0.5 pb-8 pt-3 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(1.5rem + var(--game-card-height))" }}
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
  const [dragging, setDragging] = useState(false);
  const [readyHint, setReadyHint] = useState(false);

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
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.style.position = "";
    ghost.style.left = "";
    ghost.style.top = "";
    ghost.style.width = "";
    ghost.style.height = "";
    ghost.style.zIndex = "";
    ghost.style.margin = "";
    ghost.style.transform = "";
    ghost.style.transition = "";
    ghost.style.pointerEvents = "";
  }, []);

  const finishDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    setReadyHint(false);
    clearGhostStyles();
  }, [clearGhostStyles]);

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
  };

  const promoteToFreeDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const ghost = ghostRef.current;
    if (!drag || !ghost || drag.active) return;

    drag.active = true;
    setDragging(true);

    ghost.style.position = "fixed";
    ghost.style.left = `${e.clientX - drag.grabX}px`;
    ghost.style.top = `${e.clientY - drag.grabY}px`;
    ghost.style.width = `${drag.width}px`;
    ghost.style.height = `${drag.height}px`;
    ghost.style.zIndex = "9999";
    ghost.style.margin = "0";
    ghost.style.transform = "none";
    ghost.style.transition = "none";
    ghost.style.pointerEvents = "auto";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const ghost = ghostRef.current;
    if (!drag || !ghost || drag.pointerId !== e.pointerId) return;

    e.preventDefault();

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
      drag.moved = true;
      promoteToFreeDrag(e);
    }

    if (!drag.active) return;

    ghost.style.left = `${e.clientX - drag.grabX}px`;
    ghost.style.top = `${e.clientY - drag.grabY}px`;

    const upEnough = dy <= PLAY_SWIPE_Y;
    setReadyHint((prev) => (prev === upEnough ? prev : upEnough));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const ghost = ghostRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const dy = e.clientY - drag.startY;
    const origin =
      ghost?.getBoundingClientRect() ??
      slotRef.current?.getBoundingClientRect();

    if (drag.moved && dy <= PLAY_SWIPE_Y && origin) {
      tryPlay(origin);
      return;
    }

    if (!drag.moved) {
      onSelect(card.instanceId);
    }
    finishDrag();
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
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
          dragging ? "" : "transition-transform duration-150 ease-out"
        } ${selected ? "ink-card-selected" : ""} ${
          readyHint ? "ring-2 ring-[#7aab9a]/75" : ""
        }`}
        style={{
          touchAction: "none",
          ...(dragging
            ? {}
            : {
                transform: restTransform,
                zIndex: selected ? 80 : undefined,
              }),
        }}
      >
        <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-2">
          <div className="flex items-start justify-between gap-1">
            <span className="text-left text-[13px] font-bold leading-tight tracking-wide text-[#f0e6d3]">
              {card.name}
            </span>
            <span
              className={`flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                canAfford
                  ? "bg-[#7aab9a]/90 text-stone-950"
                  : "bg-[#a85555]/85 text-stone-100"
              }`}
            >
              {card.cost}
            </span>
          </div>

          {/* 正常狀態即顯示完整核心效果，不裁切 */}
          <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-left text-[11px] leading-snug text-stone-300">
            {description}
          </p>

          <div className="mt-1.5 shrink-0">
            <p className={`text-[9px] font-semibold ${typeAccent}`}>
              {template?.type}
            </p>
            {card.isExhaust && (
              <p className="text-[9px] text-amber-500/70">消耗</p>
            )}
            {selected && !readyHint && (
              <p className="mt-0.5 text-[8px] text-stone-500">上拖出牌</p>
            )}
            {readyHint && (
              <p className="mt-0.5 text-[10px] font-bold text-[#7aab9a]">
                松手出牌
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
