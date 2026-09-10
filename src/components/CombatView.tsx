"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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
  END_TURN_BEAT_MS,
  END_TURN_FLY_MS,
  END_TURN_GATHER_MS,
  delayMs,
  snapshotFlyingFace,
  FlyingCardVisual,
  type PileFlight,
  type SinglePileFlight,
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
import { aspectClassName, aspectFromTemplateId } from "@/components/CardFace";
import { createPortal } from "react-dom";

const COMBAT_BG = publicAsset("/backgrounds/combat-moon-path.jpg");

const DRAW_DURATION_MS = 280;
const DRAW_STAGGER_MS = 48;
const DISCARD_DURATION_MS = 470;
const DISCARD_STAGGER_MS = 42;
/** 出牌飛行動畫期間凍結扇形；結束後才真正依新手牌重排（略長於 card-fly 0.34s） */
const PLAY_LAYOUT_HOLD_MS = 360;

function logHandLayerRects(label: string) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("handDebug") !== "1") return;
  const pick = (el: Element | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top * 10) / 10,
      bottom: Math.round(r.bottom * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      position: cs.position,
      transform: cs.transform,
    };
  };
  // eslint-disable-next-line no-console
  console.log(`[handDebug:${label}]`, {
    handZone: pick(document.querySelector("[data-hand-zone]")),
    handTrack: pick(document.querySelector("[data-hand-track]")),
    dockHand: pick(document.querySelector(".combat-dock-hand")),
    dockStack: pick(document.querySelector(".combat-dock-stack")),
    dock: pick(document.querySelector(".combat-shell-dock")),
    shell: pick(document.querySelector(".combat-shell")),
  });
}

/**
 * 出牌動畫期間嚴格凍結扇形：只用出牌前快照（含 ghost 佔位）。
 * 不可把相生／抽牌新進手牌併進來——張數一變，scale／弧高會整排上跳。
 * 新牌等 ghost 結束後再進 displayHand，並延後抽牌飛入動畫。
 */
function mergeHandForPlayLayout(
  hold: Card[] | null,
  live: Card[],
  ghosts: ReadonlySet<string>
): Card[] {
  if (!hold || ghosts.size === 0) return live;
  return hold;
}

/** 【因果斷絕】牽引自動打出時序（合計約 0.8s，不含出牌後起始延遲） */
const AUTO_PULL_START_DELAY_MS = 300;
const AUTO_PULL_TO_CENTER_MS = 260;
const AUTO_PULL_HOLD_MS = 150;
const AUTO_PULL_TO_PLAY_MS = 180;
const AUTO_PULL_RESOLVE_BEAT_MS = 50;
const AUTO_PULL_TO_DISCARD_MS = 200;
const AUTO_PULL_FLY_W = 100;
const AUTO_PULL_FLY_H = 156;

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
  /** 棄牌動畫結束後抽新手牌（勿在棄牌期間呼叫） */
  onEndTurnDraw: () => void;
  /** 抽牌動畫全部完成後解鎖 */
  onEndTurnSequenceDone: () => void;
  karmaMarks?: number;
  block?: number;
  karmaMode?: boolean;
  yinPullUsed?: boolean;
  yangPullUsed?: boolean;
  /** 【因果斷絕】牽引待自動打出的果牌 */
  karmaAutoPlayCard?: Card | null;
  onKarmaAutoPlayResolve?: () => void;
  onKarmaAutoPlayFinished?: () => void;
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

/** 抽牌終點是否彼此分開（避免全飛向同一中央） */
function targetsAreSpread(rects: (DOMRect | null)[]): boolean {
  const valid = rects.filter((r): r is DOMRect => Boolean(r));
  if (valid.length <= 1) return valid.length === 1;
  let minL = Infinity;
  let maxL = -Infinity;
  for (const r of valid) {
    const cx = r.left + r.width / 2;
    minL = Math.min(minL, cx);
    maxL = Math.max(maxL, cx);
  }
  // 多張牌中心距至少應有明顯間距
  return maxL - minL >= Math.max(24, (valid.length - 1) * 18);
}

/** DOM 量測失敗或疊在一起時，依最終手牌數推扇形終點 */
function fallbackFanTargetRect(
  index: number,
  total: number,
  trackRect: DOMRect | undefined,
  pile: DOMRect
): DOMRect {
  const cardW = 104;
  const cardH = 164;
  const centerX = trackRect
    ? trackRect.left + trackRect.width / 2
    : typeof window !== "undefined"
      ? window.innerWidth / 2
      : pile.left + 160;
  const bottom = trackRect
    ? trackRect.bottom - 8
    : typeof window !== "undefined"
      ? window.innerHeight - 120
      : pile.top - 40;
  const avail = trackRect
    ? Math.max(cardW * 0.7, trackRect.width - 28)
    : 320;
  const maxStepRatio =
    total <= 1 ? 1 : total <= 3 ? 0.9 : total <= 5 ? 0.78 : total <= 7 ? 0.52 : 0.38;
  const maxStep = cardW * maxStepRatio;
  const fitStep = total <= 1 ? 0 : (avail - cardW) / (total - 1);
  const step = Math.max(0, Math.min(maxStep, fitStep));
  const relativeIndex = index - (total - 1) / 2;
  const x = centerX + relativeIndex * step - cardW / 2;
  const y = bottom - cardH;
  return new DOMRect(x, y, cardW, cardH);
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
  onEndTurnSequenceDone,
  karmaMarks = 0,
  block = 0,
  karmaMode = false,
  yinPullUsed = false,
  yangPullUsed = false,
  karmaAutoPlayCard = null,
  onKarmaAutoPlayResolve,
  onKarmaAutoPlayFinished,
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
  const combatShellRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const flightId = useId();
  const flightSeq = useRef(0);
  const pileSeq = useRef(0);
  const prevHandRef = useRef<Card[]>([]);
  const rectCacheRef = useRef<Map<string, DOMRect>>(new Map());
  const skipDiscardIdsRef = useRef<Set<string>>(new Set());
  /** endTurnDiscard flight id → Promise resolve */
  const endTurnDiscardWaitersRef = useRef<Map<string, () => void>>(new Map());
  /** 單張 pile flight（斷絕牽引等）→ Promise resolve */
  const singleFlightWaitersRef = useRef<Map<string, () => void>>(new Map());
  /** 等待下一輪抽牌批次飛完 */
  const drawBatchWaiterRef = useRef<{
    resolve: () => void;
    armed: boolean;
  } | null>(null);
  const turnSeqBusyRef = useRef(false);
  const autoPlayBusyRef = useRef(false);
  /** 本輪抽牌批次：全部飛完再一次顯示，避免逐張 reveal 重繪扇形 */
  const drawBatchRef = useRef<{
    remaining: number;
    ids: string[];
  } | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pileFlights, setPileFlights] = useState<PileFlight[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(
    () => new Set()
  );
  /** 出牌動畫期間凍結的手牌快照（含被打出牌佔位） */
  const [playLayoutHold, setPlayLayoutHold] = useState<Card[] | null>(null);
  const [playGhostIds, setPlayGhostIds] = useState<Set<string>>(
    () => new Set()
  );
  const playLayoutHoldRef = useRef<Card[] | null>(null);
  const playGhostIdsRef = useRef<Set<string>>(playGhostIds);
  playGhostIdsRef.current = playGhostIds;
  /** 出牌凍結期間到手的新牌，等扇形解凍再飛入，避免張數突變 */
  const pendingDrawsRef = useRef<Card[]>([]);
  const [discardPilePulse, setDiscardPilePulse] = useState(false);
  const [drawPilePulse, setDrawPilePulse] = useState(false);
  /** 斷絕牽引：中央短暫亮相（兩段飛行之間） */
  const [autoPlaySpotlight, setAutoPlaySpotlight] = useState<{
    face: ReturnType<typeof snapshotFlyingFace>;
    box: { left: number; top: number; width: number; height: number };
  } | null>(null);
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
    (reason: "energy" | "locked" | "requirement", detail?: string) => {
      unlockCombatAudio();
      playDenySfx();
      if (reason === "energy") showToast("真元不足");
      else if (reason === "requirement") showToast(detail ?? "條件不足");
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

  const resolveDrawBatchWaiter = useCallback(() => {
    const waiter = drawBatchWaiterRef.current;
    if (!waiter) return;
    drawBatchWaiterRef.current = null;
    waiter.armed = false;
    waiter.resolve();
  }, []);

  const waitForNextDrawBatch = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      drawBatchWaiterRef.current = { resolve, armed: true };
      // 若兩幀內沒有抽牌飛出（手牌已滿等），直接結束等待
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const w = drawBatchWaiterRef.current;
          if (w?.armed && !drawBatchRef.current) {
            resolveDrawBatchWaiter();
          }
        });
      });
    });
  }, [resolveDrawBatchWaiter]);

  /** 回傳 Promise：整疊進棄牌堆後才 resolve */
  const playEndTurnDiscardAnimation = useCallback(
    (cards: Card[]): Promise<void> => {
      if (cards.length === 0) return Promise.resolve();
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
      const id = `endturn-${pileSeq.current}`;
      const flight: PileFlight = {
        id,
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

      return new Promise<void>((resolve) => {
        endTurnDiscardWaitersRef.current.set(id, resolve);
        setPileFlights((prev) => [...prev, flight]);
      });
    },
    [facePreview]
  );

  const playSinglePileFlight = useCallback(
    (
      partial: Omit<SinglePileFlight, "id"> & { id?: string }
    ): Promise<void> => {
      pileSeq.current += 1;
      const id = partial.id ?? `pile-${pileSeq.current}`;
      const flight: SinglePileFlight = { ...partial, id };
      return new Promise<void>((resolve) => {
        singleFlightWaitersRef.current.set(id, resolve);
        setPileFlights((prev) => [...prev, flight]);
      });
    },
    []
  );

  const finishTurnSequence = useCallback(() => {
    setInputLocked(false);
    turnSeqBusyRef.current = false;
    onEndTurnSequenceDone();
  }, [onEndTurnSequenceDone]);

  const handleEndTurn = useCallback(() => {
    if (turnSeqBusyRef.current || inputLocked) return;
    turnSeqBusyRef.current = true;
    setInputLocked(true);
    playLayoutHoldRef.current = null;
    setPlayLayoutHold(null);
    setPlayGhostIds(new Set());
    pendingDrawsRef.current = [];

    void (async () => {
      try {
        const toDiscard = hand.filter((c) => !cardIsRetain(c));
        for (const c of toDiscard) {
          skipDiscardIdsRef.current.add(c.instanceId);
        }

        // 動畫期間先隱藏舊牌，但暫不改 deck；避免新牌提前出現
        if (toDiscard.length > 0) {
          setHiddenCardIds((prev) => {
            const next = new Set(prev);
            toDiscard.forEach((c) => next.add(c.instanceId));
            return next;
          });
          await playEndTurnDiscardAnimation(toDiscard);
        }

        // 棄牌動畫完整結束後，才結算棄牌／敵方回合 → 手牌清空
        const shouldDraw = onEndTurn();
        setHiddenCardIds((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set(prev);
          toDiscard.forEach((c) => next.delete(c.instanceId));
          return next;
        });

        if (!shouldDraw) {
          finishTurnSequence();
          return;
        }

        // 短暫停頓，讓玩家感知「上回合結束了」再抽牌
        await delayMs(END_TURN_BEAT_MS);

        // 再開新回合抽牌；等抽牌飛完才解鎖
        const drawWait = waitForNextDrawBatch();
        onEndTurnDraw();
        await drawWait;
        finishTurnSequence();
      } catch {
        finishTurnSequence();
      }
    })();
  }, [
    hand,
    inputLocked,
    onEndTurn,
    onEndTurnDraw,
    playEndTurnDiscardAnimation,
    waitForNextDrawBatch,
    finishTurnSequence,
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
      const ids = cards.map((c) => c.instanceId);

      // 1) 先佔位隱藏：參與最終扇形 layout，但先不顯示
      setHiddenCardIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      const prevBatch = drawBatchRef.current;
      drawBatchRef.current = {
        remaining: (prevBatch?.remaining ?? 0) + cards.length,
        ids: [...(prevBatch?.ids ?? []), ...ids],
      };
      if (drawBatchWaiterRef.current) {
        drawBatchWaiterRef.current.armed = false;
      }

      // 2) 等 React layout + 隱藏樣式生效後，再讀每張卡自己的 slot rect
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const pile =
            rectFromEl(drawPileRef.current) ?? fallbackPileRect("draw");
          const track = document.querySelector(".hand-fan-track");
          const trackRect = track?.getBoundingClientRect();

          const measured = cards.map((card) => {
            const el = document.querySelector(
              `[data-hand-instance-id="${card.instanceId}"]`
            );
            return el ? el.getBoundingClientRect() : null;
          });

          // 若量到的終點幾乎重疊（常見於 availWidth=0 殘留），用扇形公式重算
          const spreadOk = targetsAreSpread(measured);
          const nextFlights: PileFlight[] = cards.map((card, i) => {
            let target = measured[i];
            if (!spreadOk || !target) {
              target = fallbackFanTargetRect(
                i,
                cards.length,
                trackRect,
                pile
              );
            }
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

          setPileFlights((prev) => [...prev, ...nextFlights]);
        });
      });
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

    if (added.length === 0) return;

    // 出牌扇形凍結中：先佇列新牌，解凍後再飛入（否則 ghost+新牌張數突變會整排跳）
    if (playGhostIdsRef.current.size > 0) {
      const pendingIds = new Set(
        pendingDrawsRef.current.map((c) => c.instanceId)
      );
      for (const card of added) {
        if (!pendingIds.has(card.instanceId)) {
          pendingDrawsRef.current.push(card);
          pendingIds.add(card.instanceId);
        }
      }
      return;
    }

    spawnDrawFlights(added);
  }, [hand, spawnDiscardFlights, spawnDrawFlights]);

  // 出牌凍結結束：把期間抽到的牌一次飛入
  useLayoutEffect(() => {
    if (playGhostIds.size > 0) return;
    if (pendingDrawsRef.current.length === 0) return;
    const pending = pendingDrawsRef.current;
    pendingDrawsRef.current = [];
    const liveIds = new Set(hand.map((c) => c.instanceId));
    const stillInHand = pending.filter((c) => liveIds.has(c.instanceId));
    if (stillInHand.length > 0) {
      spawnDrawFlights(stillInHand);
    }
  }, [playGhostIds, hand, spawnDrawFlights]);

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
      logHandLayerRects("before-play");

      // 凍結出牌前扇形：被打出牌改隱藏佔位，clone 飛出；動畫結束後才重排
      if (!playLayoutHoldRef.current) {
        playLayoutHoldRef.current = hand;
      }
      setPlayLayoutHold(playLayoutHoldRef.current);
      setPlayGhostIds((prev) => {
        const next = new Set(prev);
        next.add(card.instanceId);
        return next;
      });

      skipDiscardIdsRef.current.add(card.instanceId);
      const played = onPlayCard(card);
      if (!played) {
        skipDiscardIdsRef.current.delete(card.instanceId);
        setPlayGhostIds((prev) => {
          const next = new Set(prev);
          next.delete(card.instanceId);
          if (next.size === 0) {
            playLayoutHoldRef.current = null;
            setPlayLayoutHold(null);
          }
          return next;
        });
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

      window.setTimeout(() => {
        logHandLayerRects("during-play-flight");
      }, 40);

      window.setTimeout(() => {
        setPlayGhostIds((prev) => {
          const next = new Set(prev);
          next.delete(card.instanceId);
          if (next.size === 0) {
            playLayoutHoldRef.current = null;
            setPlayLayoutHold(null);
          }
          return next;
        });
        queueMicrotask(() => logHandLayerRects("after-hold-clear"));
      }, PLAY_LAYOUT_HOLD_MS);
    },
    [flightId, onPlayCard, hand]
  );

  const displayHand = useMemo(
    () => mergeHandForPlayLayout(playLayoutHold, hand, playGhostIds),
    [playLayoutHold, hand, playGhostIds]
  );

  const handHiddenIds = useMemo(() => {
    if (playGhostIds.size === 0) return hiddenCardIds;
    const merged = new Set(hiddenCardIds);
    for (const id of playGhostIds) merged.add(id);
    return merged;
  }, [hiddenCardIds, playGhostIds]);

  const onPileFlightDone = useCallback(
    (id: string) => {
      setPileFlights((prev) => {
        const flight = prev.find((f) => f.id === id);
        if (flight?.kind === "endTurnDiscard") {
          const resolve = endTurnDiscardWaitersRef.current.get(id);
          endTurnDiscardWaitersRef.current.delete(id);
          queueMicrotask(() => resolve?.());
        } else if (flight?.kind === "draw" || flight?.kind === "discard") {
          const resolve = singleFlightWaitersRef.current.get(id);
          if (resolve) {
            singleFlightWaitersRef.current.delete(id);
            queueMicrotask(() => resolve());
          }
          if (flight.kind === "draw") {
            const batch = drawBatchRef.current;
            if (batch) {
              batch.remaining -= 1;
              if (batch.remaining <= 0) {
                const ids = batch.ids;
                drawBatchRef.current = null;
                queueMicrotask(() => {
                  revealHandCards(ids);
                  resolveDrawBatchWaiter();
                });
              }
            } else if (flight.handInstanceId) {
              queueMicrotask(() => revealHandCard(flight.handInstanceId!));
            }
          }
        }
        return prev.filter((f) => f.id !== id);
      });
    },
    [revealHandCard, revealHandCards, resolveDrawBatchWaiter]
  );

  const onDiscardAbsorb = useCallback((_flightId: string) => {
    setDiscardPilePulse(true);
    if (discardPulseTimer.current) clearTimeout(discardPulseTimer.current);
    discardPulseTimer.current = setTimeout(() => {
      setDiscardPilePulse(false);
    }, 280);
  }, []);

  /** 【因果斷絕】：牌庫 → 中央亮相 → 出牌區 → 結算 → 棄牌堆 */
  useEffect(() => {
    if (!karmaAutoPlayCard || autoPlayBusyRef.current) return;
    if (!onKarmaAutoPlayResolve || !onKarmaAutoPlayFinished) return;

    autoPlayBusyRef.current = true;
    setInputLocked(true);
    let cancelled = false;
    const card = karmaAutoPlayCard;
    const previewSnap = facePreview;
    const resolveCb = onKarmaAutoPlayResolve;
    const finishedCb = onKarmaAutoPlayFinished;

    void (async () => {
      try {
        await delayMs(AUTO_PULL_START_DELAY_MS);
        if (cancelled) return;

        setDrawPilePulse(true);
        window.setTimeout(() => setDrawPilePulse(false), 220);

        const face = snapshotFlyingFace(card, previewSnap);
        const drawRect =
          rectFromEl(drawPileRef.current) ?? fallbackPileRect("draw");
        const discardRect =
          rectFromEl(discardPileRef.current) ?? fallbackPileRect("discard");

        const shellRect =
          combatShellRef.current?.getBoundingClientRect() ??
          ({
            left: 0,
            top: 0,
            width: typeof window !== "undefined" ? window.innerWidth : 390,
            height: typeof window !== "undefined" ? window.innerHeight : 700,
          } as DOMRect);
        const centerBox = {
          left: shellRect.left + shellRect.width / 2 - AUTO_PULL_FLY_W / 2,
          top: shellRect.top + shellRect.height * 0.34 - AUTO_PULL_FLY_H / 2,
          width: AUTO_PULL_FLY_W,
          height: AUTO_PULL_FLY_H,
        };

        const template = CARD_TEMPLATES[card.id as CardTemplateId];
        const fx = getPlayFxKind(template);
        const damageFx = isDamagePlayFx(fx);
        const playTarget = damageFx
          ? enemyTargetRef.current
          : playerTargetRef.current;
        const playRect = playTarget?.getBoundingClientRect();
        const playBox = playRect
          ? {
              left:
                playRect.left +
                playRect.width / 2 -
                AUTO_PULL_FLY_W / 2,
              top:
                playRect.top +
                playRect.height * (damageFx ? 0.32 : 0.45) -
                AUTO_PULL_FLY_H / 2,
              width: AUTO_PULL_FLY_W,
              height: AUTO_PULL_FLY_H,
            }
          : centerBox;

        const fromDraw = {
          left: drawRect.left,
          top: drawRect.top,
          width: drawRect.width,
          height: drawRect.height,
        };

        playWhoosh(fx);

        await playSinglePileFlight({
          kind: "draw",
          card,
          face,
          from: fromDraw,
          to: centerBox,
          delayMs: 0,
          durationMs: AUTO_PULL_TO_CENTER_MS,
          spinDeg: -8,
        });
        if (cancelled) return;

        setAutoPlaySpotlight({ face, box: centerBox });
        await delayMs(AUTO_PULL_HOLD_MS);
        setAutoPlaySpotlight(null);
        if (cancelled) return;

        await playSinglePileFlight({
          kind: "draw",
          card,
          face,
          from: centerBox,
          to: playBox,
          delayMs: 0,
          durationMs: AUTO_PULL_TO_PLAY_MS,
          spinDeg: 6,
        });
        if (cancelled) return;

        playImpact(fx);
        if (damageFx) {
          setHitFlash(true);
          window.setTimeout(() => setHitFlash(false), 220);
        }
        resolveCb();
        await delayMs(AUTO_PULL_RESOLVE_BEAT_MS);
        if (cancelled) return;

        await playSinglePileFlight({
          kind: "discard",
          card,
          face,
          from: playBox,
          to: {
            left: discardRect.left,
            top: discardRect.top,
            width: discardRect.width,
            height: discardRect.height,
          },
          delayMs: 0,
          durationMs: AUTO_PULL_TO_DISCARD_MS,
          spinDeg: 12,
        });
      } finally {
        setAutoPlaySpotlight(null);
        autoPlayBusyRef.current = false;
        if (!cancelled) {
          finishedCb();
          setInputLocked(false);
        } else {
          setInputLocked(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // 僅在待打出牌變更時啟動；結算中途 preview／callback 更新不可中斷動畫
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [karmaAutoPlayCard]);

  return (
    <div
      ref={combatShellRef}
      className="combat-shell"
      onPointerDown={unlockCombatAudio}
    >
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
          hand={displayHand}
          energy={energy}
          drawPileCount={drawPileCount}
          discardPileCount={discardPileCount}
          exhaustPileCount={exhaustPileCount}
          deckCount={deckCount}
          onPlayCard={handlePlayCard}
          onDenyPlay={handleDenyPlay}
          onEndTurn={handleEndTurn}
          lastDamage={lastDamage}
          disabled={!isPlaying || enemy.currentHp <= 0 || inputLocked}
          denyShake={denyShake}
          feelToast={externalFeelToast ?? feelToast}
          facePreview={facePreview}
          hiddenCardIds={handHiddenIds}
          layoutFrozen={playGhostIds.size > 0}
          drawPileRef={drawPileRef}
          discardPileRef={discardPileRef}
          discardPilePulse={discardPilePulse}
          drawPilePulse={drawPilePulse}
          playerBar={
            <CombatPlayerBar
              hero={hero}
              stats={heroStats}
              currentHp={playerHp}
              energy={energy}
              combatBuffs={combatBuffs}
              block={block}
              karmaMode={karmaMode}
              yinPullUsed={yinPullUsed}
              yangPullUsed={yangPullUsed}
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
      {autoPlaySpotlight &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[85]"
            style={{
              left: autoPlaySpotlight.box.left,
              top: autoPlaySpotlight.box.top,
              width: autoPlaySpotlight.box.width,
              height: autoPlaySpotlight.box.height,
            }}
            aria-hidden
          >
            <div
              className={`pile-fly-card__visual ink-card h-full w-full overflow-hidden shadow-xl ${
                CARD_TYPE_COLORS[autoPlaySpotlight.face.type] ??
                "ink-card-type-basic bg-[#1a1814]"
              } ${aspectClassName(
                aspectFromTemplateId(autoPlaySpotlight.face.templateId)
              )}`}
            >
              <FlyingCardVisual face={autoPlaySpotlight.face} />
            </div>
          </div>,
          document.body
        )}
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
