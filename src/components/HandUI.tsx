"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
const PLAY_SWIPE_Y = -56;
const TAP_SLOP = 10;

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

  return (
    <div
      className={`relative overflow-visible px-1 pb-1 pt-14 ${
        denyShake ? "animate-deny-shake" : ""
      }`}
      style={{ minHeight: "calc(3.5rem + var(--game-card-height))" }}
    >
      {hand.length === 0 ? (
        <p className="flex min-h-[var(--game-card-height)] items-center justify-center text-xs text-stone-500">
          手牌已空
        </p>
      ) : (
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
      )}
    </div>
  );
}

function CardFace({
  card,
  template,
  canAfford,
  typeAccent,
  inspecting,
  readyHint,
  selected,
}: {
  card: Card;
  template: (typeof CARD_TEMPLATES)[CardTemplateId] | undefined;
  canAfford: boolean;
  typeAccent: string;
  inspecting: boolean;
  readyHint: boolean;
  selected: boolean;
}) {
  return (
    <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-2">
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-left text-[10px] font-bold leading-tight text-[#f0e6d3]">
          {card.name}
        </span>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
            canAfford
              ? "bg-[#7aab9a] text-stone-950"
              : "bg-[#a85555] text-stone-100"
          }`}
        >
          {card.cost}
        </span>
      </div>
      <p
        className={`mt-1.5 min-h-0 flex-1 text-left text-[8px] leading-snug ${
          inspecting
            ? "overflow-y-auto text-stone-300"
            : "line-clamp-5 overflow-hidden text-stone-400"
        }`}
      >
        {template?.description}
      </p>
      <div className="mt-1 shrink-0">
        <p className={`text-[8px] font-semibold ${typeAccent}`}>
          {template?.type}
        </p>
        {card.isExhaust && (
          <p className="text-[8px] text-amber-500/80">消耗</p>
        )}
        {inspecting && !readyHint && (
          <p className="mt-1 text-[8px] text-stone-500">
            {selected ? "上拖出牌 · 再點取消" : "點選鎖定 · 上拖出牌"}
          </p>
        )}
        {readyHint && (
          <p className="mt-0.5 text-[9px] font-bold text-[#7aab9a]">松手出牌</p>
        )}
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
  const [dragPos, setDragPos] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const template = CARD_TEMPLATES[card.id as CardTemplateId];
  const canAfford = energy >= card.cost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const finishDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    setReadyHint(false);
    setDragPos(null);
  }, []);

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

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
      drag.moved = true;
      drag.active = true;
      setDragging(true);
      setHovered(false);
      setDragPos({
        left: e.clientX - drag.grabX,
        top: e.clientY - drag.grabY,
        width: drag.width,
        height: drag.height,
      });
    }

    if (!drag.active) return;

    setDragPos({
      left: e.clientX - drag.grabX,
      top: e.clientY - drag.grabY,
      width: drag.width,
      height: drag.height,
    });
    setReadyHint(dy <= PLAY_SWIPE_Y);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const dy = e.clientY - drag.startY;
    const origin = drag.active
      ? new DOMRect(
          e.clientX - drag.grabX,
          e.clientY - drag.grabY,
          drag.width,
          drag.height
        )
      : ghostRef.current?.getBoundingClientRect() ??
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

  const face = (
    <CardFace
      card={card}
      template={template}
      canAfford={canAfford}
      typeAccent={typeAccent}
      inspecting={inspecting || readyHint}
      readyHint={readyHint}
      selected={selected}
    />
  );

  let portal: ReactNode = null;
  if (portalReady && dragging && dragPos) {
    portal = createPortal(
      <div
        className={`ink-card pointer-events-none fixed z-[9999] shadow-2xl ${typeStyle} ${
          readyHint ? "ring-2 ring-[#7aab9a]/80" : ""
        }`}
        style={{
          left: dragPos.left,
          top: dragPos.top,
          width: dragPos.width,
          height: dragPos.height,
        }}
      >
        {face}
      </div>,
      document.body
    );
  }

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0 overflow-visible"
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
        className={`ink-card absolute inset-0 origin-bottom touch-none select-none ${
          locked
            ? "cursor-not-allowed opacity-40"
            : !canAfford
              ? "cursor-grab opacity-55"
              : "cursor-grab active:cursor-grabbing"
        } ${typeStyle} ${
          dragging ? "opacity-25" : "transition-transform duration-200 ease-out"
        } ${inspecting ? "ink-card-selected" : ""}`}
        style={
          dragging
            ? undefined
            : {
                transform: inspecting ? "translateY(-18px)" : "translateY(0)",
                zIndex: inspecting ? 60 : undefined,
              }
        }
      >
        {face}
      </div>
      {portal}
    </div>
  );
}
