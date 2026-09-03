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

/** 上滑多少像素算出牌（相對起點） */
const PLAY_SWIPE_Y = -64;
const TAP_SLOP = 12;

function getOverlapClass(total: number) {
  if (total <= 4) return "-space-x-3";
  if (total === 5) return "-space-x-7";
  return "-space-x-11";
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

  if (hand.length === 0) {
    return (
      <p className="flex min-h-[11rem] items-center justify-center text-xs text-stone-500">
        手牌已空
      </p>
    );
  }

  return (
    <div
      className={`relative overflow-visible px-1 pb-1 pt-20 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
    >
      <div className="flex justify-center overflow-visible">
        <div
          className={`flex items-end justify-center overflow-visible ${getOverlapClass(hand.length)}`}
        >
          {hand.map((card, index) => (
            <HandCard
              key={card.instanceId}
              card={card}
              index={index}
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
    </div>
  );
}

function HandCard({
  card,
  index,
  energy,
  locked,
  selected,
  onSelect,
  onPlayCard,
  onDenyPlay,
}: {
  card: Card;
  index: number;
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
    ghost.style.pointerEvents = "";
    ghost.style.transition = "";
  }, []);

  const finishDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    setReadyHint(false);
    clearGhostStyles();
  }, [clearGhostStyles]);

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
    const ghost = ghostRef.current;
    if (!ghost) return;
    const rect = ghost.getBoundingClientRect();
    ghost.setPointerCapture(e.pointerId);

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
    ghost.style.zIndex = "300";
    ghost.style.margin = "0";
    ghost.style.pointerEvents = "auto";
    ghost.style.transform = "scale(1.05)";
    ghost.style.transition = "none";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const ghost = ghostRef.current;
    if (!drag || !ghost || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
      drag.moved = true;
      promoteToFreeDrag(e);
    }

    if (!drag.active) return;

    ghost.style.left = `${e.clientX - drag.grabX}px`;
    ghost.style.top = `${e.clientY - drag.grabY}px`;

    const upEnough = e.clientY - drag.startY <= PLAY_SWIPE_Y;
    setReadyHint(upEnough);
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
  const z = dragging ? 1 : inspecting ? 60 : index;

  return (
    <div
      ref={slotRef}
      className="relative h-[10.5rem] w-[6.25rem] shrink-0 overflow-visible sm:h-[11.5rem] sm:w-[7rem]"
      style={{ zIndex: z }}
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
        className={`ink-card absolute inset-0 origin-bottom touch-none select-none will-change-transform ${
          locked
            ? "cursor-not-allowed opacity-40"
            : !canAfford
              ? "cursor-grab opacity-55"
              : "cursor-grab active:cursor-grabbing"
        } ${typeStyle} ${
          dragging
            ? ""
            : "transition-transform duration-200 ease-out"
        } ${inspecting ? "ink-card-selected" : ""}`}
        style={{
          ...(dragging
            ? {}
            : {
                transform: inspecting
                  ? "translateY(-22px) scale(1.18)"
                  : "translateY(0) scale(1)",
                zIndex: inspecting ? 60 : undefined,
              }),
        }}
      >
        <div className="relative z-[2] flex h-full w-full flex-col p-2 sm:p-2.5">
          <div className="flex items-start justify-between gap-1">
            <span
              className={`text-left font-bold leading-tight text-[#f0e6d3] ${
                inspecting
                  ? "text-[12px] sm:text-[13px]"
                  : "line-clamp-2 text-[10px] sm:text-[11px]"
              }`}
            >
              {card.name}
            </span>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold sm:h-6 sm:w-6 sm:text-[11px] ${
                canAfford
                  ? "bg-[#7aab9a] text-stone-950"
                  : "bg-[#a85555] text-stone-100"
              }`}
            >
              {card.cost}
            </span>
          </div>
          <p
            className={`mt-1.5 flex-1 text-left leading-snug ${
              inspecting
                ? "overflow-y-auto text-[10px] text-stone-300 sm:text-[11px]"
                : "line-clamp-5 overflow-hidden text-[8px] text-stone-400 sm:text-[9px]"
            }`}
          >
            {template?.description}
          </p>
          <div className="mt-1 shrink-0">
            <p
              className={`font-semibold ${typeAccent} ${
                inspecting ? "text-[9px] sm:text-[10px]" : "text-[8px] sm:text-[9px]"
              }`}
            >
              {template?.type}
            </p>
            {card.isExhaust && (
              <p className="text-[8px] text-amber-500/80 sm:text-[9px]">消耗</p>
            )}
            {inspecting && !readyHint && (
              <p className="mt-1 text-[8px] text-stone-500">
                {selected ? "上拖出牌 · 再點取消" : "點選鎖定 · 上拖出牌"}
              </p>
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
