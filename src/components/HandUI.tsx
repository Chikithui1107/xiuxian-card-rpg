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

/** 上滑超過此距離算出牌 */
const PLAY_SWIPE_Y = -48;
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
  if (total <= 3) return Math.round(w * 0.34);
  if (total === 4) return Math.round(w * 0.42);
  if (total === 5) return Math.round(w * 0.48);
  return Math.round(w * 0.5);
}

function fanSpreadX(index: number, focusIndex: number | null) {
  if (focusIndex == null || index === focusIndex) return 0;
  const dir = index < focusIndex ? -1 : 1;
  const dist = Math.abs(index - focusIndex);
  const byDist = [0, 40, 24, 14, 9, 6];
  return dir * (byDist[dist] ?? Math.max(4, 44 - dist * 7));
}

function setDropReady(on: boolean) {
  const shell = document.querySelector(".combat-shell");
  if (!shell) return;
  shell.classList.toggle("combat-drop-ready", on);
}

function getDragPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    (document.querySelector(".combat-shell") as HTMLElement | null) ??
    (document.querySelector(".mobile-frame") as HTMLElement | null) ??
    document.body
  );
}

interface DragGhost {
  card: Card;
  x: number;
  y: number;
  width: number;
  height: number;
  ready: boolean;
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);

  const focusId = draggingId ?? selectedId ?? hoveredId;
  const focusIndex =
    focusId != null
      ? hand.findIndex((c) => c.instanceId === focusId)
      : null;
  const resolvedFocus =
    focusIndex != null && focusIndex >= 0 ? focusIndex : null;

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(getDragPortalRoot());
  }, []);

  useEffect(() => {
    if (selectedId && !hand.some((c) => c.instanceId === selectedId)) {
      setSelectedId(null);
    }
  }, [hand, selectedId]);

  const resetDrag = useCallback(() => {
    setDraggingId(null);
    setGhost(null);
    setDropReady(false);
    document.querySelector(".combat-shell")?.classList.remove("is-dragging-card");
  }, []);

  const playCard = useCallback(
    (card: Card, origin: DOMRect) => {
      setSelectedId(null);
      setHoveredId(null);
      resetDrag();
      onPlayCard(card, origin);
    },
    [onPlayCard, resetDrag]
  );

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
          <div className="relative flex items-end justify-center overflow-visible">
            {hand.map((card, index) => (
              <HandCard
                key={card.instanceId}
                card={card}
                index={index}
                total={hand.length}
                locked={disabled}
                selected={selectedId === card.instanceId}
                isDragging={draggingId === card.instanceId}
                focusIndex={resolvedFocus}
                canAfford={energy >= card.cost}
                onHoverChange={(id, on) => {
                  if (draggingId) return;
                  setHoveredId((prev) => {
                    if (on) return id;
                    return prev === id ? null : prev;
                  });
                }}
                onSelect={(id) => {
                  setHoveredId(null);
                  setSelectedId(id);
                }}
                onDragStart={(payload) => {
                  setHoveredId(null);
                  setSelectedId(payload.card.instanceId);
                  setDraggingId(payload.card.instanceId);
                  document
                    .querySelector(".combat-shell")
                    ?.classList.add("is-dragging-card");
                  setGhost({
                    card: payload.card,
                    x: payload.x,
                    y: payload.y,
                    width: payload.width,
                    height: payload.height,
                    ready: false,
                  });
                }}
                onDragMove={(x, y, ready) => {
                  setGhost((prev) =>
                    prev ? { ...prev, x, y, ready } : prev
                  );
                  setDropReady(ready);
                }}
                onDragEnd={(result) => {
                  if (result.kind === "play") {
                    playCard(result.card, result.origin);
                    return;
                  }
                  if (result.kind === "select") {
                    setSelectedId(result.cardId);
                    resetDrag();
                    return;
                  }
                  resetDrag();
                }}
                onDenyPlay={onDenyPlay}
              />
            ))}
          </div>
        </div>
      )}

      {ghost &&
        portalRoot &&
        createPortal(
          <DragOverlay ghost={ghost} energy={energy} />,
          portalRoot
        )}
    </div>
  );
}

function DragOverlay({
  ghost,
  energy,
}: {
  ghost: DragGhost;
  energy: number;
}) {
  const template = CARD_TEMPLATES[ghost.card.id as CardTemplateId];
  const canAfford = energy >= ghost.card.cost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const root = getDragPortalRoot();
  const rootRect = root?.getBoundingClientRect();
  const left = rootRect ? ghost.x - rootRect.left : ghost.x;
  const top = rootRect ? ghost.y - rootRect.top : ghost.y;

  return (
    <div
      className={`ink-card ink-card-drag-ghost pointer-events-none absolute z-[9999] origin-center select-none ${typeStyle} ${
        ghost.ready ? "ring-2 ring-[#7aab9a]/70" : ""
      }`}
      style={{
        left,
        top,
        width: ghost.width,
        height: ghost.height,
        opacity: 1,
        transform: ghost.ready ? "scale(1.04)" : "scale(1)",
        transition: "transform 0.12s ease-out",
      }}
      aria-hidden
    >
      <CardFace
        name={ghost.card.name}
        cost={ghost.card.cost}
        canAfford={canAfford}
        description={template?.description ?? ""}
        typeLabel={template?.type}
        typeAccent={typeAccent}
        isExhaust={ghost.card.isExhaust}
        full
        footer={
          ghost.ready ? (
            <p className="mt-0.5 text-[10px] font-bold text-[#7aab9a]">
              松手出牌
            </p>
          ) : null
        }
      />
    </div>
  );
}

function CardFace({
  name,
  cost,
  canAfford,
  description,
  typeLabel,
  typeAccent,
  isExhaust,
  full,
  coreLine,
  footer,
}: {
  name: string;
  cost: number;
  canAfford: boolean;
  description: string;
  typeLabel?: string;
  typeAccent: string;
  isExhaust?: boolean;
  full?: boolean;
  coreLine?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-2">
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-left text-[13px] font-bold leading-tight tracking-wide text-[#f0e6d3]">
          {name}
        </span>
        <span
          className={`flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
            canAfford
              ? "bg-[#7aab9a]/90 text-stone-950"
              : "bg-[#a85555]/85 text-stone-100"
          }`}
        >
          {cost}
        </span>
      </div>
      {full ? (
        <p className="mt-2 min-h-0 flex-1 overflow-y-auto text-left text-[11px] leading-snug text-stone-300">
          {description}
        </p>
      ) : (
        <p className="mt-2 line-clamp-3 min-h-0 flex-1 overflow-hidden text-left text-[11px] leading-snug text-stone-400">
          {coreLine}
        </p>
      )}
      <div className="mt-1.5 shrink-0">
        <p className={`text-[9px] font-semibold ${typeAccent}`}>{typeLabel}</p>
        {isExhaust && <p className="text-[9px] text-amber-500/70">消耗</p>}
        {footer}
      </div>
    </div>
  );
}

type DragEndResult =
  | { kind: "play"; card: Card; origin: DOMRect }
  | { kind: "select"; cardId: string }
  | { kind: "cancel" };

function HandCard({
  card,
  index,
  total,
  locked,
  selected,
  isDragging,
  focusIndex,
  onHoverChange,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDenyPlay,
  canAfford,
}: {
  card: Card;
  index: number;
  total: number;
  locked: boolean;
  selected: boolean;
  isDragging: boolean;
  focusIndex: number | null;
  onHoverChange: (id: string, on: boolean) => void;
  onSelect: (id: string) => void;
  onDragStart: (payload: {
    card: Card;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onDragMove: (x: number, y: number, ready: boolean) => void;
  onDragEnd: (result: DragEndResult) => void;
  onDenyPlay?: (reason: "energy" | "locked") => void;
  canAfford: boolean;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
  const detachRef = useRef<(() => void) | null>(null);

  const cbRef = useRef({
    onDragStart,
    onDragMove,
    onDragEnd,
    onDenyPlay,
    onSelect,
    locked,
    canAfford,
    selected,
    card,
  });
  cbRef.current = {
    onDragStart,
    onDragMove,
    onDragEnd,
    onDenyPlay,
    onSelect,
    locked,
    canAfford,
    selected,
    card,
  };

  const template = CARD_TEMPLATES[card.id as CardTemplateId];
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const angle = fanAngle(index, total);
  const baseLift = fanLift(index, total);
  const shiftX = fanSpreadX(index, focusIndex);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);
  const isFocus = !isDragging && focusIndex === index;
  const inspecting = isFocus;

  const detachWindow = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
  }, []);

  useEffect(() => () => detachWindow(), [detachWindow]);

  useEffect(() => {
    if (!isDragging) return;
    const blockTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchmove", blockTouchMove);
    };
  }, [isDragging]);

  const finishPlayOrDeny = useCallback((origin: DOMRect) => {
    const cur = cbRef.current;
    if (cur.locked) {
      cur.onDenyPlay?.("locked");
      cur.onDragEnd({ kind: "cancel" });
      return;
    }
    if (!cur.canAfford) {
      cur.onDenyPlay?.("energy");
      cur.onDragEnd({ kind: "cancel" });
      return;
    }
    cur.onDragEnd({ kind: "play", card: cur.card, origin });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    try {
      el.setPointerCapture(e.pointerId);
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

      if (
        !drag.moved &&
        (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)
      ) {
        drag.moved = true;
        drag.active = true;
        cbRef.current.onDragStart({
          card: cbRef.current.card,
          x: ev.clientX - drag.grabX,
          y: ev.clientY - drag.grabY,
          width: drag.width,
          height: drag.height,
        });
      }

      if (!drag.active) return;

      cbRef.current.onDragMove(
        ev.clientX - drag.grabX,
        ev.clientY - drag.grabY,
        dy <= PLAY_SWIPE_Y
      );
    };

    const onWinUp = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== ev.pointerId) return;

      detachWindow();
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }

      const dy = ev.clientY - drag.startY;
      const origin = new DOMRect(
        ev.clientX - drag.grabX,
        ev.clientY - drag.grabY,
        drag.width,
        drag.height
      );
      const wasActive = drag.active;
      dragRef.current = null;

      if (wasActive) {
        if (dy <= PLAY_SWIPE_Y) finishPlayOrDeny(origin);
        else cbRef.current.onDragEnd({ kind: "cancel" });
        return;
      }

      if (cbRef.current.selected) {
        finishPlayOrDeny(
          cardRef.current?.getBoundingClientRect() ??
            slotRef.current?.getBoundingClientRect() ??
            origin
        );
        return;
      }

      cbRef.current.onDragEnd({
        kind: "select",
        cardId: cbRef.current.card.instanceId,
      });
    };

    detachWindow();
    window.addEventListener("pointermove", onWinMove, { passive: false });
    window.addEventListener("pointerup", onWinUp);
    window.addEventListener("pointercancel", onWinUp);
    detachRef.current = () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", onWinUp);
      window.removeEventListener("pointercancel", onWinUp);
    };
  };

  const z = isDragging ? 1 : isFocus ? 80 : 10 + index;
  const restTransform = inspecting
    ? `translateX(${shiftX}px) translateY(-74px) scale(1.1) rotate(0deg)`
    : `translateX(${shiftX}px) translateY(${baseLift}px) scale(1) rotate(${angle}deg)`;
  const coreLine = (template?.description ?? "")
    .split(/[。；;\n]/)[0]
    ?.slice(0, 22);

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0 overflow-visible"
      style={{
        zIndex: z,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
      onMouseEnter={() => {
        if (!isDragging) onHoverChange(card.instanceId, true);
      }}
      onMouseLeave={() => {
        if (!isDragging) onHoverChange(card.instanceId, false);
      }}
    >
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-disabled={locked || !canAfford}
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (selected) {
              const origin =
                cardRef.current?.getBoundingClientRect() ??
                slotRef.current?.getBoundingClientRect();
              if (origin) finishPlayOrDeny(origin);
            } else {
              onSelect(card.instanceId);
            }
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const origin =
              cardRef.current?.getBoundingClientRect() ??
              slotRef.current?.getBoundingClientRect();
            if (origin) finishPlayOrDeny(origin);
          }
        }}
        className={`ink-card absolute inset-0 origin-bottom select-none ${
          isDragging ? "invisible" : ""
        } ${
          locked
            ? "cursor-not-allowed opacity-40"
            : !canAfford
              ? "cursor-grab opacity-55"
              : "cursor-grab active:cursor-grabbing"
        } ${typeStyle} ${
          isDragging ? "" : "transition-transform duration-200 ease-out"
        } ${inspecting ? "ink-card-selected" : ""}`}
        style={{
          touchAction: "none",
          transform: isDragging ? "none" : restTransform,
          zIndex: isFocus ? 80 : undefined,
        }}
      >
        {!isDragging && (
          <CardFace
            name={card.name}
            cost={card.cost}
            canAfford={canAfford}
            description={template?.description ?? ""}
            typeLabel={template?.type}
            typeAccent={typeAccent}
            isExhaust={card.isExhaust}
            full={inspecting}
            coreLine={coreLine}
            footer={
              selected ? (
                <p className="mt-0.5 text-[8px] text-stone-500">
                  再點出牌 · 上拖亦可
                </p>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
