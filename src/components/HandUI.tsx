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

/** 重疊適中：卡名必露；完整效果靠 hover／點選放大閱讀 */
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
  const [hovered, setHovered] = useState(false);
  const [hoverBox, setHoverBox] = useState<{
    left: number;
    bottom: number;
    w: number;
    h: number;
  } | null>(null);
  const [dragBox, setDragBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const fineHoverRef = useRef(false);

  useEffect(() => {
    fineHoverRef.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
  }, []);

  const syncHoverBox = useCallback(() => {
    const el = slotRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setHoverBox({
      left: r.left + r.width / 2,
      bottom: window.innerHeight - r.bottom,
      w: r.width,
      h: r.height,
    });
  }, []);

  useEffect(() => {
    if (!hovered || dragging) {
      setHoverBox(null);
      return;
    }
    syncHoverBox();
    const onReposition = () => syncHoverBox();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [hovered, dragging, syncHoverBox]);

  const template = getCardTemplate(card) ?? CARD_TEMPLATES[card.id as CardTemplateId];
  const effectiveCost = getEffectiveCost(card);
  const canAfford = energy >= effectiveCost;
  const typeStyle =
    CARD_TYPE_COLORS[template?.type ?? ""] ??
    "ink-card-type-basic bg-[#1a1814]";
  const typeAccent =
    CARD_TYPE_ACCENT[template?.type ?? ""] ?? "text-[#c9a84c]";

  const angle = fanAngle(index, total);
  const baseLift = fanLift(index, total);
  const marginLeft = index === 0 ? 0 : -overlapPx(total);
  const preview = !dragging && (hovered || selected);

  /* hover 改用 body portal 放大，避免被戰場／HUD 裁切；點選仍略抬高 */
  const restTransform =
    selected && !dragging && !hovered
      ? `translateY(${baseLift - 16}px) scale(1.06) rotate(0deg)`
      : `translateY(${baseLift}px) scale(1) rotate(${hovered && !dragging ? 0 : angle}deg)`;

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

  const renderCardFace = (opts: {
    showSelectHint: boolean;
    showReady: boolean;
    enlarged?: boolean;
  }) => (
    <div className="relative z-[2] flex h-full w-full min-h-0 flex-col p-1.5">
      <div className="flex items-start justify-between gap-1">
        <span
          className={`min-w-0 flex-1 text-left font-bold leading-tight tracking-wide text-[#f0e6d3] ${
            opts.enlarged ? "text-[13px]" : "text-[12px]"
          }`}
        >
          {card.name}
        </span>
        <span
          className={`flex h-[1.25rem] w-[1.25rem] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
            canAfford
              ? "bg-[#7aab9a]/90 text-stone-950"
              : "bg-[#a85555]/85 text-stone-100"
          }`}
        >
              {effectiveCost}
        </span>
      </div>

      <p
        className={`mt-1.5 min-h-0 flex-1 overflow-y-auto break-words text-left leading-[1.4] text-stone-300 ${
          opts.enlarged ? "text-[11px]" : "text-[10px] leading-[1.35]"
        }`}
      >
        {description}
      </p>

      <div className="mt-1 shrink-0">
        <p className={`text-[8px] font-semibold ${typeAccent}`}>
          {template?.type}
        </p>
        {card.pulledByKarma && (
          <p className="text-[8px] font-semibold tracking-[0.18em] text-[#9ec9b8]">
            牽引
          </p>
        )}
        {card.isExhaust && (
          <p className="text-[8px] text-amber-500/70">消耗</p>
        )}
        {opts.showSelectHint && (
          <p className="mt-0.5 text-[8px] text-stone-500">上拖出牌</p>
        )}
        {opts.showReady && (
          <p className="mt-0.5 text-[9px] font-bold text-[#7aab9a]">
            松手出牌
          </p>
        )}
      </div>
    </div>
  );

  /* 拖曳幽靈掛到 body：避開 dock / shell 的 filter、overflow 把 fixed 座標搞歪 */
  const dragPortal =
    dragging &&
    dragBox &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className={`ink-card ink-card-drag-portal pointer-events-none select-none ${typeStyle} ${
          card.pulledByKarma ? "ink-card-pulled" : ""
        } ${readyHint ? "ring-2 ring-[#7aab9a]/75" : ""}`}
        style={{
          position: "fixed",
          left: dragBox.x,
          top: dragBox.y,
          width: dragBox.w,
          height: dragBox.h,
          zIndex: 100000,
          margin: 0,
          transform: "none",
          transition: "none",
        }}
        aria-hidden
      >
        {renderCardFace({ showSelectHint: false, showReady: readyHint })}
      </div>,
      document.body
    );

  /* hover 放大預覽掛 body，不被戰場／玩家條裁切 */
  const hoverPortal =
    hovered &&
    !dragging &&
    hoverBox &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className={`ink-card ink-card-hover-portal pointer-events-none select-none ${typeStyle} ${
          card.pulledByKarma ? "ink-card-pulled" : ""
        } ink-card-selected`}
        style={{
          position: "fixed",
          left: hoverBox.left,
          bottom: hoverBox.bottom,
          width: hoverBox.w,
          height: hoverBox.h,
          zIndex: 100000,
          margin: 0,
          transform: "translateX(-50%) scale(1.55)",
          transformOrigin: "bottom center",
        }}
        aria-hidden
      >
        {renderCardFace({
          showSelectHint: false,
          showReady: false,
          enlarged: true,
        })}
      </div>,
      document.body
    );

  return (
    <div
      ref={slotRef}
      className="hand-card-slot relative shrink-0"
      style={{
        zIndex: dragging ? 90 : hovered ? 88 : selected ? 80 : 10 + index,
        marginLeft: index === 0 ? undefined : marginLeft,
      }}
      onMouseEnter={() => {
        if (fineHoverRef.current && !dragging) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 向上延伸熱區，滑鼠移到放大預覽上時不中斷 hover */}
      {hovered && !dragging && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: 0,
            width: "170%",
            height: "calc(100% + 11rem)",
          }}
          aria-hidden
        />
      )}
      <div
        ref={ghostRef}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-disabled={locked || !canAfford}
        onPointerDown={(e) => {
          setHovered(false);
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
          dragging
            ? "ink-card-drag-source"
            : "transition-transform duration-200 ease-out"
        } ${preview && !hovered ? "ink-card-selected" : ""} ${
          card.pulledByKarma ? "ink-card-pulled" : ""
        } ${hovered && !dragging ? "opacity-30" : ""}`}
        style={{
          touchAction: "none",
          transform: restTransform,
          zIndex: preview ? 80 : undefined,
        }}
      >
        {!dragging &&
          renderCardFace({
            showSelectHint: selected && !readyHint && !hovered,
            showReady: false,
            enlarged: false,
          })}
      </div>
      {dragPortal}
      {hoverPortal}
    </div>
  );
}
