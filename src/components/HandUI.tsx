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

const FAN_ANGLES: Record<number, number[]> = {
  1: [0],
  2: [-5, 5],
  3: [-7, 0, 7],
  4: [-7, -3, 3, 7],
  5: [-7, -3.5, 0, 3.5, 7],
  6: [-8, -5, -2, 2, 5, 8],
  7: [-8, -5, -3, 0, 3, 5, 8],
};

function fanAngle(index: number, total: number) {
  const preset = FAN_ANGLES[Math.min(Math.max(total, 1), 7)];
  if (total <= 7 && preset) return preset[index] ?? 0;
  const spread = 16;
  const start = -spread / 2;
  return start + (spread / (total - 1)) * index;
}

/** 中央略高、兩側略低（translateY 正值向下） */
function fanLift(index: number, total: number) {
  if (total <= 1) return 0;
  const mid = (total - 1) / 2;
  return Math.abs(index - mid) * 6;
}

function overlapPx(total: number) {
  const raw =
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue(
          "--game-card-width"
        )
      : "8.05rem";
  const w = raw.includes("rem")
    ? (parseFloat(raw) || 8.05) * 16
    : parseFloat(raw) || 128;
  if (total <= 3) return Math.round(w * 0.3);
  if (total === 4) return Math.round(w * 0.36);
  if (total === 5) return Math.round(w * 0.4);
  return Math.round(w * 0.42);
}

/**
 * 選中／hover 時鄰牌讓路：越近位移越大，越遠越小。
 * 選中牌本身不橫移。
 */
function fanSpreadX(index: number, focusIndex: number | null) {
  if (focusIndex == null || index === focusIndex) return 0;
  const dir = index < focusIndex ? -1 : 1;
  const dist = Math.abs(index - focusIndex);
  const byDist = [0, 44, 28, 16, 10, 7, 5];
  const amount = byDist[dist] ?? Math.max(4, 48 - dist * 8);
  return dir * amount;
}

function setDropReady(on: boolean, el: HTMLElement | null) {
  const shell = el?.closest(".combat-shell");
  if (!shell) return;
  shell.classList.toggle("combat-drop-ready", on);
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const fanRowRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const focusId = hoveredId ?? selectedId;
  const focusIndex =
    focusId != null
      ? hand.findIndex((c) => c.instanceId === focusId)
      : null;
  const resolvedFocus = focusIndex != null && focusIndex >= 0 ? focusIndex : null;

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
    if (hoveredId && !hand.some((c) => c.instanceId === hoveredId)) {
      setHoveredId(null);
    }
  }, [hand, selectedId, hoveredId]);

  useEffect(() => {
    const row = fanRowRef.current;
    const parent = row?.parentElement;
    if (!row || !parent) return;

    const measure = () => {
      const avail = parent.clientWidth;
      /* 展開讓路時預留額外寬度，避免貼邊 */
      const spreadPad = resolvedFocus != null ? 56 : 0;
      const need = row.scrollWidth + spreadPad;
      if (need <= 0 || avail <= 0) return;
      setFitScale(Math.min(1, avail / need));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [hand.length, resolvedFocus]);

  return (
    <div
      className={`hand-fan relative overflow-visible px-0.5 pb-2 pt-14 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(3.25rem + var(--game-card-height))" }}
    >
      {hand.length === 0 ? (
        <p className="flex min-h-[var(--game-card-height)] items-center justify-center text-xs text-stone-500">
          手牌已空
        </p>
      ) : (
        <div className="flex max-w-full justify-center overflow-visible">
          <div
            ref={fanRowRef}
            className="relative flex items-end justify-center overflow-visible transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${fitScale})`,
              transformOrigin: "bottom center",
            }}
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
                focusIndex={resolvedFocus}
                onHoverChange={(id, on) => {
                  setHoveredId((prev) => {
                    if (on) return id;
                    return prev === id ? null : prev;
                  });
                }}
                onSelect={(id) => setSelectedId(id)}
                onClearSelect={() => setSelectedId(null)}
                onPlayCard={(c, origin) => {
                  setSelectedId(null);
                  setHoveredId(null);
                  onPlayCard(c, origin);
                }}
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
  focusIndex,
  onHoverChange,
  onSelect,
  onClearSelect,
  onPlayCard,
  onDenyPlay,
}: {
  card: Card;
  index: number;
  total: number;
  energy: number;
  locked: boolean;
  selected: boolean;
  focusIndex: number | null;
  onHoverChange: (id: string, on: boolean) => void;
  onSelect: (id: string) => void;
  onClearSelect: () => void;
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
  const shiftX = fanSpreadX(index, focusIndex);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);
  const isFocus = focusIndex === index;
  const inspecting = !dragging && isFocus;

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
    setDropReady(false, slotRef.current);
    clearGhostStyles();
  }, [clearGhostStyles]);

  useEffect(() => {
    if (!dragging) return;
    const blockTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    const y = window.scrollY;
    const lockScroll = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    document.addEventListener("touchmove", blockTouchMove, { passive: false });
    window.addEventListener("scroll", lockScroll, { passive: true });
    return () => {
      document.removeEventListener("touchmove", blockTouchMove);
      window.removeEventListener("scroll", lockScroll);
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
    onHoverChange(card.instanceId, false);

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
    setDropReady(upEnough, slotRef.current);
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
      /* 第一次 tap = 選中展開；第二次 tap 同一張 = 出牌 */
      if (selected) {
        if (origin) tryPlay(origin);
        else finishDrag();
        return;
      }
      onSelect(card.instanceId);
    }
    finishDrag();
  };

  const onPointerCancel = () => {
    finishDrag();
  };

  const z = dragging ? 90 : isFocus ? 80 : 10 + index;

  /* 選中上浮多一點，放大維持現有比例不再加大 */
  const restTransform = inspecting
    ? `translateX(${shiftX}px) translateY(-74px) scale(1.1) rotate(0deg)`
    : `translateX(${shiftX}px) translateY(${baseLift}px) scale(1) rotate(${angle}deg)`;

  const coreLine = (template?.description ?? "")
    .split(/[。；;\n]/)[0]
    ?.slice(0, 22);

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0 overflow-visible transition-[z-index] duration-200"
      style={{
        zIndex: z,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
      onMouseEnter={() => {
        if (!dragging) onHoverChange(card.instanceId, true);
      }}
      onMouseLeave={() => {
        if (!dragging) onHoverChange(card.instanceId, false);
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
            if (selected) {
              const origin =
                ghostRef.current?.getBoundingClientRect() ??
                slotRef.current?.getBoundingClientRect();
              if (origin) tryPlay(origin);
            } else {
              onSelect(card.instanceId);
            }
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClearSelect();
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
        } ${inspecting ? "ink-card-selected" : ""} ${
          readyHint ? "ring-1 ring-[#7aab9a]/55" : ""
        }`}
        style={{
          touchAction: "none",
          ...(dragging
            ? {}
            : {
                transform: restTransform,
                zIndex: isFocus ? 80 : undefined,
              }),
        }}
      >
        <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-2">
          <div className="flex items-start justify-between gap-1">
            <span className="line-clamp-2 text-left text-[13px] font-bold leading-tight tracking-wide text-[#f0e6d3]">
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

          {inspecting ? (
            <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-left text-[11px] leading-snug text-stone-300">
              {template?.description}
            </p>
          ) : (
            <p className="mt-2 line-clamp-3 min-h-0 flex-1 overflow-hidden text-left text-[11px] leading-snug text-stone-400">
              {coreLine}
            </p>
          )}

          <div className="mt-1.5 shrink-0">
            <p className={`text-[9px] font-semibold ${typeAccent}`}>
              {template?.type}
            </p>
            {card.isExhaust && (
              <p className="text-[9px] text-amber-500/70">消耗</p>
            )}
            {selected && !readyHint && (
              <p className="mt-0.5 text-[8px] text-stone-500">
                再點出牌 · 上拖亦可
              </p>
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
