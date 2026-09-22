"use client";

import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { PlayableCharacter } from "@/data/characters";
import BaiYeIdle from "@/components/BaiYeIdle/BaiYeIdle";
import { RunToast } from "@/components/RunToast";

interface LobbyViewProps {
  hero: Hero;
  character: PlayableCharacter;
  stats: HeroStats;
  playerHp: number;
  spiritStones: number;
  totalClears: number;
  achievementCount: number;
  deckCount: number;
  lastRunMessage: string | null;
  hasActiveRun: boolean;
  runLabel?: string | null;
  onEnterDungeon: () => void;
  onContinueGame: () => void;
  onAbandonGame: () => void;
  onOpenGacha?: () => void;
  onDismissRunMessage?: () => void;
}

export function LobbyView({
  hero,
  character,
  stats,
  playerHp,
  spiritStones,
  totalClears,
  deckCount,
  lastRunMessage,
  hasActiveRun,
  runLabel,
  onEnterDungeon,
  onContinueGame,
  onAbandonGame,
  onOpenGacha,
  onDismissRunMessage,
}: LobbyViewProps) {
  const hpPercent = Math.max(0, (playerHp / stats.maxHp) * 100);
  const art = character.lobbyArt;

  return (
    <div
      className={`lobby-home lobby-v2 relative min-h-0 flex-1 overflow-hidden${
        character.lobbyTheme === "ink" ? " lobby-home-ink" : ""
      }`}
    >
      <BaiYeIdle
        className="absolute inset-0"
        composition="gate"
        characterSrc={
          character.lobbyPortrait ??
          hero.lobbyPortrait ??
          "/images/baiye/baiye-character.png"
        }
        backgroundSrc={
          character.lobbyBackground ??
          hero.lobbyBackground ??
          "/images/baiye/baiye-bg.png"
        }
        characterName={character.name}
        theme={character.lobbyTheme}
        backgroundPosition={art?.backgroundPosition}
        backgroundFilter={art?.backgroundFilter}
        characterBottom={art?.characterBottom}
        characterHeight={art?.characterHeight}
        characterMaxWidth={art?.characterMaxWidth}
      />
      <div className="lobby-v2__veil" aria-hidden />

      <section className="lobby-v2__hud" aria-label="當前修士狀態">
        <div className="lobby-v2__identity">
          <h2>{hero.name}</h2>
          <p>{hero.title}<span aria-hidden> · </span>{hero.realm}</p>
          <div className="lobby-v2__vital">
            <div className="lobby-v2__hp-label">
              <span>氣血</span>
              <span>{formatNumber(playerHp)}<span className="lobby-v2__hp-max"> / {formatNumber(stats.maxHp)}</span></span>
            </div>
            <div
              className="lobby-v2__hp-track"
              role="progressbar"
              aria-label="氣血"
              aria-valuemin={0}
              aria-valuemax={stats.maxHp}
              aria-valuenow={playerHp}
            >
              <span style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="lobby-v2__currency" aria-label={`靈石 ${formatNumber(spiritStones)}`}>
          <span>靈石</span>
          <strong>{formatNumber(spiritStones)}</strong>
        </div>
      </section>

      {onOpenGacha ? (
        <button
          type="button"
          onClick={onOpenGacha}
          className="lobby-v2__gacha"
          aria-label="前往因緣閣"
        >
          <svg viewBox="0 0 32 32" fill="none" aria-hidden>
            <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1" />
            <path d="M16 2v6m0 16v6M2 16h6m16 0h6M16 10l6 6-6 6-6-6 6-6Z" stroke="currentColor" strokeWidth="1" />
            <circle cx="16" cy="16" r="2" fill="currentColor" />
          </svg>
          <span>因緣閣</span>
          <small>悟道 · 霓裳</small>
        </button>
      ) : null}

      <div className="lobby-v2__departure">
        {hasActiveRun ? (
          <button
            type="button"
            onClick={onContinueGame}
            className="lobby-v2__primary"
            aria-label="繼續修行"
          >
            <span className="lobby-v2__action-title">繼續修行<span aria-hidden>↗</span></span>
            <span className="lobby-v2__run-label">{runLabel ?? "返回本次秘境"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnterDungeon}
            className="lobby-v2__primary"
            aria-label="開始修行，前往秘境試煉"
          >
            <span className="lobby-v2__action-title">開始修行<span aria-hidden>↗</span></span>
            <span className="lobby-v2__run-label">五境連闖 · 一世修行</span>
          </button>
        )}
        <div className="lobby-v2__ledger">
          <p><span>牌組 <b>{deckCount}</b></span><span>通關 <b>{totalClears}</b></span></p>
          {hasActiveRun ? (
            <button type="button" className="lobby-v2__abandon" onClick={onAbandonGame} aria-label="放棄本次修行">放棄本次修行</button>
          ) : null}
        </div>
      </div>

      {lastRunMessage && onDismissRunMessage && (
        <RunToast
          message={lastRunMessage}
          onDismiss={onDismissRunMessage}
          topClassName="lobby-v2__toast"
        />
      )}
    </div>
  );
}
