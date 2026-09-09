"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CombatPlayerBar } from "@/components/CombatPlayerBar";
import {
  CardAnimationLayer,
  END_TURN_ABSORB_MS,
  END_TURN_FLY_MS,
  END_TURN_GATHER_MS,
  snapshotFlyingFace,
  type PileFlight,
} from "@/components/CardAnimationLayer";
import {
  CARD_TEMPLATES,
  cardIsRetain,
  type CardTemplateId,
} from "@/lib/battle-deck";
import type { Card } from "@/types/battle";
import type { Hero, HeroStats } from "@/lib/stats";
import type { CombatBuffs } from "@/lib/battle-resolve";
import type {
  BattlePhase,
  CombatEnemy,
  CombatPhase,
  DamagePopup,
} from "@/types/game";
import { CARD_TYPE_COLORS } from "@/types/game";
import {
  getPlayFxKind,
  type PlayFxKind,
  isDamagePlayFx,
  shouldScreenFlash,
  playFxDurationMs,
} from "@/lib/combat-fx";
import {
  playDenySfx,
  playImpact,
  playWhoosh,
  preloadCombatSfx,
  unlockCombatAudio,
} from "@/lib/combat-audio";
import { PlayBurstFx, type PlayBurst } from "@/components/PlayBurstFx";
import { publicAsset } from "@/lib/paths";
import type { CardFacePreviewState } from "@/lib/card-face-display";

const COMBAT_BG = publicAsset("/backgrounds/combat-moon-path.jpg");

const DRAW_DURATION_MS = 280;
const DRAW_STAGGER_MS = 48;
const DISCARD_DURATION_MS = 470;
const DISCARD_STAGGER_MS = 42;

interface CombatViewProps {
  hero: Hero;
  heroStats: HeroStats;
  enemy: CombatEnemy;
  tierName?: string;
  locationName?: string;
  tierFloor?: number;
  totalFloors?: number;
  playerHp: number;
  energy: number;
  combatBuffs: CombatBuffs;
  phase: CombatPhase;
  battlePhase: BattlePhase;
  hand: Card[];
  drawPileCount: number;
  discardPileCount: number;
  exhaustPileCount: number;
  deckCount: number;
  damagePopups: DamagePopup[];
  isShaking: boolean;
  lastDamage: number | null;
  lastEnemyDamage: number | null;
  lastDodge?: boolean;
  lastPassiveHeal?: number | null;
  totalDamage: number;
  onPlayCard: (card: Card) => boolean;
  /** 棄牌＋敵方回合；回傳 true 表示之後還要抽牌 */
  onEndTurn: () => boolean;
  /** 棄牌動畫結束後抽新手牌 */
  onEndTurnDraw: () => void;
  karmaMarks?: number;
  block?: number;
  karmaMode?: boolean;
  externalFeelToast?: string | null;
  facePreview?: CardFacePreviewState;
}

interface Flight {
  key: string;
  name: string;
  type: string;
  cost: number;
  from: DOMRect;
  toX: number;
  toY: number;
  fx: PlayFxKind;
}

function rectFromEl(el: Element | null): DOMRect | null {
  if (!el) return null;
  return el.getBoundingClientRect();
}

function fallbackPileRect(side: "draw" | "discard"): DOMRect {
  const w = 44;
  const h = 62;
  const y = typeof window !== "undefined" ? window.innerHeight - 88 : 600;
  const x =
    side === "draw"
      ? 16
      : typeof window !== "undefined"
        ? window.innerWidth - 16 - w
        : 320;
  return new DOMRect(x, y, w, h);
}

export function CombatView({
  hero,
  heroStats,
  enemy,
  tierName,
  locationName,
  tierFloor,
  totalFloors,
  playerHp,
  energy,
  combatBuffs,
  phase,
  battlePhase,
  hand,
  drawPileCount,
  discardPileCount,
  exhaustPileCount,
  deckCount,
  damagePopups,
  isShaking,
  lastDamage,
  lastEnemyDamage,
  lastDodge,
  lastPassiveHeal,
  totalDamage: _totalDamage,
  onPlayCard,
  onEndTurn,
  onEndTurnDraw,
  karmaMarks = 0,
  block = 0,
  karmaMode = false,
  externalFeelToast = null,
  facePreview,
}: CombatViewProps) {
  const isPlaying = phase === "playing" && battlePhase === "IN_BATTLE";
  const placeLabel = locationName ?? tierName ?? "秘境";
  const progressFloor = Math.min(
    Math.max(1, tierFloor ?? 1),
    totalFloors ?? 3
  );
  const battleLabel =
    totalFloors != null
      ? `${placeLabel} · ${progressFloor} / ${totalFloors}`
      : placeLabel;

  const enemyTargetRef = useRef<HTMLDivElement>(null);
  const playerTargetRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const flightId = useId();
  const flightSeq = useRef(0);
  const pileSeq = useRef(0);
  const prevHandRef = useRef<Card[]>([]);
  const rectCacheRef = useRef<Map<string, DOMRect>>(new Map());
  const skipDiscardIdsRef = useRef<Set<string>>(new Set());
  /** 棄牌動畫播完後再抽牌 */
  const pendingEndTurnDrawRef = useRef(false);
  const endTurnDrawSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  /** 本輪抽牌批次：全部飛完再一次顯示，避免逐張 reveal 重繪扇形 */
  const drawBatchRef = useRef<{
    remaining: number;
    ids: string[];
  } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pileFlights, setPileFlights] = useState<PileFlight[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(
    () => new Set()
  );
  const [discardPilePulse, setDiscardPilePulse] = useState(false);
  const discardPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bursts, setBursts] = useState<PlayBurst[]>([]);
  const [screenFlash, setScreenFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [denyShake, setDenyShake] = useState(false);
  const [feelToast, setFeelToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (discardPulseTimer.current) clearTimeout(discardPulseTimer.current);
      if (endTurnDrawSafetyRef.current) {
        clearTimeout(endTurnDrawSafetyRef.current);
      }
    };
  }, []);

  useEffect(() => {
    preloadCombatSfx();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("combat-scroll-lock");
    body.classList.add("combat-scroll-lock");
    const y = window.scrollY;
    const lock = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    window.addEventListener("scroll", lock, { passive: true });
    return () => {
      html.classList.remove("combat-scroll-lock");
      body.classList.remove("combat-scroll-lock");
      window.removeEventListener("scroll", lock);
    };
  }, []);

  const flushEndTurnDraw = useCallback(() => {
    if (!pendingEndTurnDrawRef.current) return;
    pendingEndTurnDrawRef.current = false;
    if (endTurnDrawSafetyRef.current) {
      clearTimeout(endTurnDrawSafetyRef.current);
      endTurnDrawSafetyRef.current = null;
    }
    onEndTurnDraw();
  }, [onEndTurnDraw]);

  const showToast = useCallback((msg: string) => {
    setFeelToast(msg);
    setDenyShake(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setFeelToast(null);
      setDenyShake(false);
    }, 900);
  }, []);

  const handleDenyPlay = useCallback(
    (reason: "energy" | "locked") => {
      unlockCombatAudio();
      playDenySfx();
      if (reason === "energy") showToast("真元不足");
      else showToast("尚不可出牌");
    },
    [showToast]
  );

  const revealHandCard = useCallback((instanceId: string) => {
    setHiddenCardIds((prev) => {
      if (!prev.has(instanceId)) return prev;
      const next = new Set(prev);
      next.delete(instanceId);
      return next;
    });
  }, []);

  const revealHandCards = useCallback((instanceIds: string[]) => {
    if (instanceIds.length === 0) return;
    setHiddenCardIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of instanceIds) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const spawnEndTurnDiscardFlight = useCallback(
    (cards: Card[]) => {
      if (cards.length === 0) return;
      const pile =
        rectFromEl(discardPileRef.current) ?? fallbackPileRect("discard");
      const items = cards.map((card) => {
        const from =
          rectCacheRef.current.get(card.instanceId) ??
          rectFromEl(
            document.querySelector(
              `[data-hand-instance-id="${card.instanceId}"]`
            )
          ) ??
          new DOMRect(
            typeof window !== "undefined" ? window.innerWidth / 2 - 40 : 160,
            typeof window !== "undefined" ? window.innerHeight - 200 : 400,
            80,
            126
          );
        return {
          face: snapshotFlyingFace(card, facePreview),
          from: {
            left: from.left,
            top: from.top,
            width: from.width,
            height: from.height,
          },
        };
      });
      pileSeq.current += 1;
      const flight: PileFlight = {
        id: `endturn-${pileSeq.current}`,
        kind: "endTurnDiscard",
        items,
        to: {
          left: pile.left,
          top: pile.top,
          width: pile.width,
          height: pile.height,
        },
        gatherMs: END_TURN_GATHER_MS,
        flyMs: END_TURN_FLY_MS,
        absorbMs: END_TURN_ABSORB_MS,
      };
      setPileFlights((prev) => [...prev, flight]);
    },
    [facePreview]
  );

  const handleEndTurn = useCallback(() => {
    const toDiscard = hand.filter((c) => !cardIsRetain(c));
    for (const c of toDiscard) {
      skipDiscardIdsRef.current.add(c.instanceId);
    }

    if (toDiscard.length > 0) {
      spawnEndTurnDiscardFlight(toDiscard);
    }

    const shouldDraw = onEndTurn();
    if (!shouldDraw) return;

    if (toDiscard.length === 0) {
      // 無棄牌動畫時稍頓再抽，節奏仍可分辨
      window.setTimeout(() => onEndTurnDraw(), 80);
      return;
    }

    pendingEndTurnDrawRef.current = true;
    if (endTurnDrawSafetyRef.current) {
      clearTimeout(endTurnDrawSafetyRef.current);
    }
    const safetyMs =
      END_TURN_GATHER_MS + END_TURN_FLY_MS + END_TURN_ABSORB_MS + 120;
    endTurnDrawSafetyRef.current = setTimeout(() => {
      flushEndTurnDraw();
    }, safetyMs);
  }, [
    hand,
    onEndTurn,
    onEndTurnDraw,
    spawnEndTurnDiscardFlight,
    flushEndTurnDraw,
  ]);

  const spawnDiscardFlights = useCallback(
    (cards: { card: Card; from: DOMRect | null }[]) => {
      if (cards.length === 0) return;
      const pile =
        rectFromEl(discardPileRef.current) ?? fallbackPileRect("discard");
      const nextFlights: PileFlight[] = cards.map(({ card, from }, i) => {
        pileSeq.current += 1;
        const source =
          from ??
          rectFromEl(
            document.querySelector(
              `[data-hand-instance-id="${card.instanceId}"]`
            )
          ) ??
          new DOMRect(
            typeof window !== "undefined" ? window.innerWidth / 2 - 36 : 160,
            typeof window !== "undefined" ? window.innerHeight - 200 : 400,
            72,
            112
          );
        const stagger =
          cards.length <= 1
            ? 0
            : Math.min(
                DISCARD_STAGGER_MS,
                Math.max(35, Math.floor(220 / (cards.length - 1)))
              );
        return {
          id: `discard-${pileSeq.current}-${card.instanceId}`,
          kind: "discard" as const,
          handInstanceId: card.instanceId,
          card: { ...card },
          face: snapshotFlyingFace(card, facePreview),
          from: {
            left: source.left,
            top: source.top,
            width: source.width,
            height: source.height,
          },
          to: {
            left: pile.left,
            top: pile.top,
            width: pile.width,
            height: pile.height,
          },
          delayMs: i * stagger,
          durationMs: DISCARD_DURATION_MS,
          spinDeg: i % 2 === 0 ? 16 : -14,
        };
      });
      setPileFlights((prev) => [...prev, ...nextFlights]);
    },
    [facePreview]
  );

  const spawnDrawFlights = useCallback(
    (cards: Card[]) => {
      if (cards.length === 0) return;
      const pile =
        rectFromEl(drawPileRef.current) ?? fallbackPileRect("draw");
      const ids = cards.map((c) => c.instanceId);

      const nextFlights: PileFlight[] = cards.map((card, i) => {
        const slot = rectFromEl(
          document.querySelector(
            `[data-hand-instance-id="${card.instanceId}"]`
          )
        );
        const target =
          slot ??
          new DOMRect(
            typeof window !== "undefined" ? window.innerWidth / 2 - 40 : 160,
            typeof window !== "undefined" ? window.innerHeight - 220 : 380,
            80,
            126
          );
        pileSeq.current += 1;
        return {
          id: `draw-${pileSeq.current}-${card.instanceId}`,
          kind: "draw" as const,
          handInstanceId: card.instanceId,
          card: { ...card },
          face: snapshotFlyingFace(card, facePreview),
          from: {
            left: pile.left,
            top: pile.top,
            width: pile.width,
            height: pile.height,
          },
          to: {
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
          },
          delayMs: i * DRAW_STAGGER_MS,
          durationMs: DRAW_DURATION_MS,
        };
      });

      const prevBatch = drawBatchRef.current;
      drawBatchRef.current = {
        remaining: (prevBatch?.remaining ?? 0) + cards.length,
        ids: [...(prevBatch?.ids ?? []), ...ids],
      };

      setHiddenCardIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setPileFlights((prev) => [...prev, ...nextFlights]);
    },
    [facePreview]
  );

  useLayoutEffect(() => {
    const prev = prevHandRef.current;
    const prevIds = new Set(prev.map((c) => c.instanceId));
    const nextIds = new Set(hand.map((c) => c.instanceId));
    const added = hand.filter((c) => !prevIds.has(c.instanceId));
    const removed = prev.filter((c) => !nextIds.has(c.instanceId));

    const discardBatch = removed
      .filter((c) => !skipDiscardIdsRef.current.has(c.instanceId))
      .map((c) => ({
        card: c,
        from: rectCacheRef.current.get(c.instanceId) ?? null,
      }));
    skipDiscardIdsRef.current.clear();

    if (discardBatch.length > 0) {
      spawnDiscardFlights(discardBatch);
    }

    rectCacheRef.current.clear();
    for (const card of hand) {
      const el = document.querySelector(
        `[data-hand-instance-id="${card.instanceId}"]`
      );
      if (el) {
        rectCacheRef.current.set(card.instanceId, el.getBoundingClientRect());
      }
    }
    prevHandRef.current = hand;

    if (added.length > 0) {
      spawnDrawFlights(added);
    }
  }, [hand, spawnDiscardFlights, spawnDrawFlights]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      for (const card of hand) {
        if (hiddenCardIds.has(card.instanceId)) continue;
        const el = document.querySelector(
          `[data-hand-instance-id="${card.instanceId}"]`
        );
        if (el) {
          rectCacheRef.current.set(card.instanceId, el.getBoundingClientRect());
        }
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [hand, hiddenCardIds]);

  const handlePlayCard = useCallback(
    (card: Card, origin: DOMRect) => {
      unlockCombatAudio();

      skipDiscardIdsRef.current.add(card.instanceId);
      const played = onPlayCard(card);
      if (!played) {
        skipDiscardIdsRef.current.delete(card.instanceId);
        return;
      }

      const template = CARD_TEMPLATES[card.id as CardTemplateId];
      const fx = getPlayFxKind(template);
      playWhoosh(fx);

      const damage = isDamagePlayFx(fx);
      const target = damage
        ? enemyTargetRef.current
        : playerTargetRef.current;
      const targetRect = target?.getBoundingClientRect();

      const toX = targetRect
        ? targetRect.left + targetRect.width / 2 - origin.width / 2
        : origin.left;
      const toY = targetRect
        ? targetRect.top + targetRect.height * 0.35 - origin.height / 2
        : origin.top - 120;

      const impactX = targetRect
        ? targetRect.left + targetRect.width / 2
        : origin.left + origin.width / 2;
      const impactY = targetRect
        ? targetRect.top + targetRect.height * (damage ? 0.38 : 0.5)
        : origin.top - 80;

      flightSeq.current += 1;
      const key = `${flightId}-${flightSeq.current}`;

      setFlights((prev) => [
        ...prev,
        {
          key,
          name: card.name,
          type: template?.type ?? "",
          cost: card.cost,
          from: origin,
          toX: toX - origin.left,
          toY: toY - origin.top,
          fx,
        },
      ]);

      const impactDelayMs = 280;
      const sfxDelayMs =
        fx === "fuxue" ? Math.max(0, impactDelayMs - 200) : impactDelayMs;

      if (sfxDelayMs < impactDelayMs) {
        window.setTimeout(() => {
          playImpact(fx);
        }, sfxDelayMs);
      }

      window.setTimeout(() => {
        if (sfxDelayMs >= impactDelayMs) {
          playImpact(fx);
        }
        setBursts((prev) => [
          ...prev,
          { key, kind: fx, x: impactX, y: impactY },
        ]);
        if (shouldScreenFlash(fx)) {
          setScreenFlash(true);
          window.setTimeout(() => setScreenFlash(false), 480);
        }
        if (damage) {
          setHitFlash(true);
          window.setTimeout(
            () => setHitFlash(false),
            fx === "yijian" ? 320 : 220
          );
        }
        setFlights((prev) => prev.filter((f) => f.key !== key));
        window.setTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.key !== key));
        }, playFxDurationMs(fx));
      }, impactDelayMs);
    },
    [flightId, onPlayCard]
  );

  const onPileFlightDone = useCallback(
    (id: string) => {
      setPileFlights((prev) => {
        const flight = prev.find((f) => f.id === id);
        if (flight?.kind === "endTurnDiscard") {
          queueMicrotask(() => flushEndTurnDraw());
        } else if (flight?.kind === "draw") {
          const batch = drawBatchRef.current;
          if (batch) {
            batch.remaining -= 1;
            if (batch.remaining <= 0) {
              const ids = batch.ids;
              drawBatchRef.current = null;
              queueMicrotask(() => revealHandCards(ids));
            }
          } else if (flight.handInstanceId) {
            queueMicrotask(() => revealHandCard(flight.handInstanceId!));
          }
        }
        return prev.filter((f) => f.id !== id);
      });
    },
    [revealHandCard, revealHandCards, flushEndTurnDraw]
  );

  const onDiscardAbsorb = useCallback((_flightId: string) => {
    setDiscardPilePulse(true);
    if (discardPulseTimer.current) clearTimeout(discardPulseTimer.current);
    discardPulseTimer.current = setTimeout(() => {
      setDiscardPilePulse(false);
    }, 280);
  }, []);

  return (
    <div className="combat-shell" onPointerDown={unlockCombatAudio}>
      <div className="combat-shell-bg" aria-hidden>
        <img src={COMBAT_BG} alt="" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-[#0c1014]/78" />
      </div>

      <div className="combat-shell-top flex items-center justify-center px-3">
        <p className="truncate text-[10px] tracking-wide text-[#c5d8cc] drop-shadow">
          {battleLabel}
        </p>
      </div>

      <div ref={enemyTargetRef} className="combat-shell-stage">
        <EnemyPanel
          enemy={enemy}
          damagePopups={damagePopups}
          isShaking={isShaking}
          hitFlash={hitFlash}
          lastEnemyDamage={lastEnemyDamage}
          lastDodge={lastDodge}
          lastPassiveHeal={lastPassiveHeal}
          karmaMarks={karmaMarks}
        />
      </div>

      <div ref={playerTargetRef} className="combat-shell-dock">
        <CardHand
          hand={hand}
          energy={energy}
          drawPileCount={drawPileCount}
          discardPileCount={discardPileCount}
          exhaustPileCount={exhaustPileCount}
          deckCount={deckCount}
          onPlayCard={handlePlayCard}
          onDenyPlay={handleDenyPlay}
          onEndTurn={handleEndTurn}
          lastDamage={lastDamage}
          disabled={!isPlaying || enemy.currentHp <= 0}
          denyShake={denyShake}
          feelToast={externalFeelToast ?? feelToast}
          facePreview={facePreview}
          hiddenCardIds={hiddenCardIds}
          drawPileRef={drawPileRef}
          discardPileRef={discardPileRef}
          discardPilePulse={discardPilePulse}
          playerBar={
            <CombatPlayerBar
              hero={hero}
              stats={heroStats}
              currentHp={playerHp}
              energy={energy}
              combatBuffs={combatBuffs}
              block={block}
              karmaMode={karmaMode}
            />
          }
        />
      </div>

      {screenFlash && (
        <div
          className="play-screen-flash play-screen-flash--yijian"
          aria-hidden
        />
      )}
      <PlayBurstFx bursts={bursts} />
      <CardAnimationLayer
        flights={pileFlights}
        onFlightDone={onPileFlightDone}
        onDiscardAbsorb={onDiscardAbsorb}
      />
      {flights.map((flight) => {
        const typeStyle =
          CARD_TYPE_COLORS[flight.type] ?? "ink-card-type-basic bg-[#1a1814]";
        return (
          <div
            key={flight.key}
            className={`animate-card-fly play-fly-${flight.fx} ink-card pointer-events-none fixed z-[80] overflow-hidden p-1.5 shadow-xl ${typeStyle}`}
            style={
              {
                left: flight.from.left,
                top: flight.from.top,
                width: flight.from.width,
                height: flight.from.height,
                ["--fly-x" as string]: `${flight.toX}px`,
                ["--fly-y" as string]: `${flight.toY}px`,
              } as CSSProperties
            }
          >
            <p className="text-[10px] font-bold text-[#f0e6d3]">{flight.name}</p>
            <p className="mt-1 text-[9px] text-[#7aab9a]">真元 {flight.cost}</p>
          </div>
        );
      })}
    </div>
  );
}
