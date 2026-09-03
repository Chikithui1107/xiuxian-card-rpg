"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

const PLAY_SWIPE_Y = -72;
const TAP_SLOP = 10;

function getOverlapClass(total: number) {
  if (total <= 4) return "-space-x-2";
  if (total === 5) return "-space-x-6";
  return "-space-x-10";
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
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  const selected = hand.find((c) => c.instanceId === selectedId) ?? null;
  const selectedTemplate = selected
    ? CARD_TEMPLATES[selected.id as CardTemplateId]
    : undefined;

  if (hand.length === 0) {
    return (
      <p className="flex min-h-[8.5rem] items-center justify-center text-xs text-stone-500">
        手牌已空
      </p>
    );
  }

  return (
    <div
      className={`relative px-1 pb-1 pt-2 ${denyShake ? "animate-deny-shake" : ""}`}
    >
      {selected && selectedTemplate && draggingId === null && (
        <div className="mb-2 rounded-lg border border-[#8a7340]/45 bg-stone-950/95 px-3 py-2 shadow-lg shadow-black/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f0e6d3]">{selected.name}</p>
              <p
                className={`mt-0.5 text-[10px] font-semibold ${
                  CARD_TYPE_ACCENT[selectedTemplate.type] ?? "text-[#c9a84c]"
                }`}
              >
                {selectedTemplate.type}
                {selected.isExhaust ? " · 消耗" : ""}
              </p>
            </div>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                energy >= selected.cost
                  ? "bg-[#7aab9a] text-stone-950"
                  : "bg-[#a85555] text-stone-100"
              }`}
            >
              {selected.cost}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-300">
            {selectedTemplate.description}
          </p>
          <p className="mt-2 text-center text-[9px] text-stone-500">
            上滑出牌 · 再點取消選中
          </p>
        </div>
      )}

      <div
        className={`flex justify-center ${denyShake ? "" : ""}`}
      >
        <div
          className={`flex items-end justify-center ${getOverlapClass(hand.length)} transition-all duration-300`}
        >
          {hand.map((card, index) => (
            <HandCard
              key={card.instanceId}
              card={card}
              index={index}
              energy={energy}
              locked={disabled}
              selected={selectedId === card.instanceId}
              isDragging={draggingId === card.instanceId}
              onDraggingChange={(id) => setDraggingId(id)}
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
  isDragging,
  onDraggingChange,
  onSelect,
  onPlayCard,
  onDenyPlay,
}: {
  card: Card;
  index: number;
  energy: number;
  locked: boolean;
  selected: boolean;
  isDragging: boolean;
  onDraggingChange: (id: string | null) => void;
  onSelect: (id: string) => void;
  onPlayCard: (card: Card, origin: DOMRect) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const template = CARD_TEMPLATES[card.id as CardTemplateId];
  const canAfford = energy >= card.cost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "border-[#8a7340] bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const resetDrag = useCallback(() => {
    dragRef.current = null;
    onDraggingChange(null);
    setOffset({ x: 0, y: 0 });
  }, [onDraggingChange]);

  const tryPlay = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const origin = el.getBoundingClientRect();
    if (locked) {
      onDenyPlay?.("locked");
      resetDrag();
      return;
    }
    if (!canAfford) {
      onDenyPlay?.("energy");
      resetDrag();
      return;
    }
    onPlayCard(card, origin);
    resetDrag();
  }, [card, canAfford, locked, onDenyPlay, onPlayCard, resetDrag]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    onDraggingChange(card.instanceId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
      drag.moved = true;
    }
    // Prefer upward swipe; dampen horizontal
    const nextY = Math.min(12, Math.max(-140, dy));
    const nextX = Math.max(-36, Math.min(36, dx * 0.35));
    setOffset({ x: nextX, y: nextY });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const dy = e.clientY - drag.startY;
    if (drag.moved && dy <= PLAY_SWIPE_Y) {
      tryPlay();
      return;
    }

    if (!drag.moved) {
      onSelect(card.instanceId);
    }
    resetDrag();
  };

  const onPointerCancel = () => {
    resetDrag();
  };

  const lift =
    isDragging || selected || hovered
      ? selected || isDragging
        ? -28
        : -20
      : 0;
  const scale = isDragging ? 1.12 : selected || hovered ? 1.14 : 1;
  const z = isDragging ? 50 : selected || hovered ? 40 : index;

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-disabled={locked || !canAfford}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        if (!isDragging) setHovered(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(card.instanceId);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          tryPlay();
        }
      }}
      className={`ink-card relative origin-bottom touch-none select-none ${
        locked
          ? "cursor-not-allowed opacity-40"
          : !canAfford
            ? "cursor-grab opacity-55"
            : "cursor-grab active:cursor-grabbing"
      } ${typeStyle} ${isDragging ? "transition-none" : "transition-transform duration-200"}`}
      style={{
        zIndex: z,
        transform: `translate(${offset.x}px, ${offset.y + lift}px) scale(${scale})`,
      }}
    >
      <div
        className={`flex flex-col rounded-lg border-2 p-1.5 shadow-lg shadow-black/40 sm:p-2 ${
          selected || hovered || isDragging
            ? "h-[10.5rem] w-[6.25rem] sm:h-[11.5rem] sm:w-[7rem]"
            : "h-[8.75rem] w-[5.25rem] sm:h-[9.5rem] sm:w-24"
        }`}
      >
        <div className="flex items-start justify-between gap-0.5">
          <span className="line-clamp-2 text-left text-[9px] font-bold leading-tight text-[#f0e6d3] sm:text-[10px]">
            {card.name}
          </span>
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold sm:h-5 sm:w-5 sm:text-[10px] ${
              canAfford
                ? "bg-[#7aab9a] text-stone-950"
                : "bg-[#a85555] text-stone-100"
            }`}
          >
            {card.cost}
          </span>
        </div>
        <p
          className={`mt-1 flex-1 overflow-hidden text-left leading-snug text-stone-400 ${
            selected || hovered || isDragging
              ? "text-[8px] sm:text-[9px]"
              : "line-clamp-4 text-[7px] sm:text-[8px]"
          }`}
        >
          {template?.description}
        </p>
        <div className="mt-1 shrink-0">
          <p className={`text-[7px] font-semibold sm:text-[8px] ${typeAccent}`}>
            {template?.type}
          </p>
          {card.isExhaust && (
            <p className="text-[7px] text-amber-500/80 sm:text-[8px]">消耗</p>
          )}
          {isDragging && offset.y <= PLAY_SWIPE_Y * 0.55 && (
            <p className="mt-0.5 text-[8px] font-bold text-[#7aab9a]">松手出牌</p>
          )}
        </div>
      </div>
    </div>
  );
}
