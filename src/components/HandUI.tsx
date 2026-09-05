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
};

function fanAngle(index: number, total: number) {
  const preset = FAN_ANGLES[Math.min(Math.max(total, 1), 5)];
  if (total <= 5 && preset) return preset[index] ?? 0;
  const spread = 14;
  const start = -spread / 2;
  return start + (spread / (total - 1)) * index;
}

/** 中央略高、兩側略低，形成手牌弧線（translateY 正值向下） */
function fanLift(index: number, total: number) {
  if (total <= 1) return 0;
  const mid = (total - 1) / 2;
  const dist = Math.abs(index - mid);
  return dist * 6;
}

/** 重疊約 30–40%：略降重疊，放大後仍落在 viewport */
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

function neighborShift(index: number, selectedIndex: number | null) {
  if (selectedIndex == null || index === selectedIndex) return 0;
  return index < selectedIndex ? -14 : 14;
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
  const fanRowRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  useEffect(() => {
    const row = fanRowRef.current;
    const parent = row?.parentElement;
    if (!row || !parent) return;

    const measure = () => {
      const avail = parent.clientWidth;
      const need = row.scrollWidth;
      if (need <= 0 || avail <= 0) return;
      setFitScale(Math.min(1, avail / need));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [hand.length]);

  return (
    <div
      className={`hand-fan relative overflow-x-clip px-0.5 pb-2 pt-8 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(1.75rem + var(--game-card-height))" }}
    >
      {hand.length === 0 ? (
        <p className="flex min-h-[var(--game-card-height)] items-center justify-center text-xs text-stone-500">
          手牌已空
        </p>
      ) : (
        <div className="flex max-w-full justify-center">
          <div
            ref={fanRowRef}
            className="relative flex items-end justify-center"
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
                selectedIndex={
                  selectedId
                    ? hand.findIndex((c) => c.instanceId === selectedId)
                    : null
                }
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
  selectedIndex,
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
  selectedIndex: number | null;
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
  const [hovered, setHovered] = useState(false);
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
  const shiftX = neighborShift(index, selectedIndex);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);

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
    setHovered(false);

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
      onSelect(card.instanceId);
    }
    finishDrag();
  };

  const onPointerCancel = () => {
    finishDrag();
  };

  const inspecting = !dragging && (selected || hovered);
  const z = dragging ? 90 : inspecting ? 60 : index;

  const restTransform = inspecting
    ? `translateX(${shiftX}px) translateY(-50px) scale(1.1) rotate(0deg)`
    : `translateX(${shiftX}px) translateY(${baseLift}px) scale(1) rotate(${angle}deg)`;

  // 核心效果：描述首句或前 ~22 字
  const coreLine = (template?.description ?? "")
    .split(/[。；;\n]/)[0]
    ?.slice(0, 22);

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0"
      style={{
        zIndex: z,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
      onMouseEnter={() => {
        if (!dragging) setHovered(true);
      }}
      onMouseLeave={() => {
        if (!dragging) setHovered(false);
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
                zIndex: inspecting ? 60 : undefined,
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
              <p className="mt-0.5 text-[8px] text-stone-500">再點取消</p>
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
