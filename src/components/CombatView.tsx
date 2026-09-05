"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { EnemyPanel } from "@/components/EnemyPanel";
import { CardHand } from "@/components/CardHand";
import { CombatPlayerBar } from "@/components/CombatPlayerBar";
import {
  CARD_TEMPLATES,
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
import { getPlayFxKind, type PlayFxKind, isDamagePlayFx, shouldScreenFlash, playFxDurationMs } from "@/lib/combat-fx";
import {
  playDenySfx,
  playImpact,
  playWhoosh,
  preloadCombatSfx,
  unlockCombatAudio,
} from "@/lib/combat-audio";
import { PlayBurstFx, type PlayBurst } from "@/components/PlayBurstFx";
import { publicAsset } from "@/lib/paths";

const COMBAT_BG = publicAsset("/backgrounds/combat-moon-path.jpg");

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
  onEndTurn: () => void;
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
  const flightId = useId();
  const flightSeq = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bursts, setBursts] = useState<PlayBurst[]>([]);
  const [screenFlash, setScreenFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [denyShake, setDenyShake] = useState(false);
  const [feelToast, setFeelToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    preloadCombatSfx();
  }, []);

  // 進戰鬥即鎖死頁面滾動，避免拖牌/出牌把畫面頂上去
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
    (reason: "energy" | "locked") => {
      unlockCombatAudio();
      playDenySfx();
      if (reason === "energy") showToast("真元不足");
      else showToast("尚不可出牌");
    },
    [showToast]
  );

  const handlePlayCard = useCallback(
    (card: Card, origin: DOMRect) => {
      unlockCombatAudio();

      const played = onPlayCard(card);
      if (!played) return;

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
      // 拂雪命中音比畫面命中點提前 0.2s，對齊刀光節奏
      const sfxDelayMs = fx === "fuxue" ? Math.max(0, impactDelayMs - 200) : impactDelayMs;

      if (sfxDelayMs < impactDelayMs) {
        window.setTimeout(() => {
          playImpact(fx);
        }, sfxDelayMs);
      }

      window.setTimeout(() => {
        if (sfxDelayMs >= impactDelayMs) {
          playImpact(fx);
        }
        setBursts((prev) => [...prev, { key, kind: fx, x: impactX, y: impactY }]);
        if (shouldScreenFlash(fx)) {
          setScreenFlash(true);
          window.setTimeout(() => setScreenFlash(false), 480);
        }
        if (damage) {
          setHitFlash(true);
          window.setTimeout(() => setHitFlash(false), fx === "yijian" ? 320 : 220);
        }
        setFlights((prev) => prev.filter((f) => f.key !== key));
        window.setTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.key !== key));
        }, playFxDurationMs(fx));
      }, impactDelayMs);
    },
    [flightId, onPlayCard]
  );

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
          onEndTurn={onEndTurn}
          lastDamage={lastDamage}
          disabled={!isPlaying || enemy.currentHp <= 0}
          denyShake={denyShake}
          feelToast={feelToast}
          playerBar={
            <CombatPlayerBar
              hero={hero}
              stats={heroStats}
              currentHp={playerHp}
              energy={energy}
              combatBuffs={combatBuffs}
              drawPileCount={drawPileCount}
              discardPileCount={discardPileCount}
            />
          }
        />
      </div>

      {screenFlash && (
        <div className="play-screen-flash play-screen-flash--yijian" aria-hidden />
      )}
      <PlayBurstFx bursts={bursts} />
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
