"use client";

import { useCallback, useState } from "react";
import type { Hero, HeroStats } from "@/lib/stats";
import { formatNumber } from "@/lib/stats";
import type { PlayableCharacter } from "@/data/characters";
import BaiYeIdle from "@/components/BaiYeIdle/BaiYeIdle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  /** 已在大廳內二次確認後才呼叫 */
  onAbandonGame: () => void;
  onOpenGacha?: () => void;
  onDismissRunMessage?: () => void;
}

function GachaGlyph() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M16 3v5m0 16v5M3 16h5m16 0h5M16 10l6 6-6 6-6-6 6-6Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />
    </svg>
  );
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
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const closeConfirm = useCallback(() => setConfirmAbandon(false), []);
  const hpPercent = Math.min(100, Math.max(0, (playerHp / stats.maxHp) * 100));
  const art = character.lobbyArt;

  return (
    <div
      className={`lobby-home lobby-gate animate-fade-in relative min-h-0 flex-1 overflow-hidden${
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
        characterMaxWidth={art?.characterMaxWidth}
      />
      <div className="lobby-gate__veil" aria-hidden />

      <section className="lobby-gate__hud" aria-label="修士狀態">
        <div className="lobby-gate__identity">
          <p className="ui-eyebrow">天樞聖宗 · 山門</p>
          <h2 className="lobby-gate__name">{hero.name}</h2>
          <p className="lobby-gate__rank">
            {hero.title}
            <span aria-hidden> · </span>
            {hero.realm}
          </p>
          <div className="lobby-gate__vital">
            <div className="lobby-gate__vital-label">
              <span>氣血</span>
              <span className="ui-num">
                {formatNumber(playerHp)} / {formatNumber(stats.maxHp)}
              </span>
            </div>
            <div
              className="lobby-gate__hp-track"
              role="progressbar"
              aria-label="氣血"
              aria-valuemin={0}
              aria-valuemax={stats.maxHp}
              aria-valuenow={playerHp}
            >
              <span className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="lobby-gate__purse ui-panel">
          <span className="ui-stat__label">靈石</span>
          <strong className="ui-num">{formatNumber(spiritStones)}</strong>
        </div>
      </section>

      {onOpenGacha ? (
        <button
          type="button"
          onClick={onOpenGacha}
          className="lobby-gate__side-entry"
          aria-label="前往因緣閣"
        >
          <span className="lobby-gate__side-icon">
            <GachaGlyph />
          </span>
          <span className="lobby-gate__side-label">因緣閣</span>
        </button>
      ) : null}

      <div className="lobby-gate__dock">
        {hasActiveRun ? (
          <button
            type="button"
            onClick={onContinueGame}
            className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block"
            aria-label="繼續修行"
          >
            <span>繼續修行</span>
            <span className="ui-btn__sub">{runLabel ?? "返回本次秘境"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnterDungeon}
            className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block"
            aria-label="開始修行，前往秘境試煉"
          >
            <span>開始修行</span>
            <span className="ui-btn__sub">五境連闖 · 一世修行</span>
          </button>
        )}
        <div className="lobby-gate__ledger">
          <p className="ui-meta">
            牌組<b>{deckCount}</b>
            <span className="lobby-gate__ledger-sep" aria-hidden>
              ·
            </span>
            通關<b>{totalClears}</b>
          </p>
          {hasActiveRun ? (
            <button
              type="button"
              className="ui-link ui-link--danger"
              onClick={() => setConfirmAbandon(true)}
            >
              放棄本次修行
            </button>
          ) : null}
        </div>
      </div>

      {lastRunMessage && onDismissRunMessage && (
        <RunToast
          message={lastRunMessage}
          onDismiss={onDismissRunMessage}
          topClassName="lobby-gate__toast"
        />
      )}

      <ConfirmDialog
        open={confirmAbandon}
        eyebrow="請再確認"
        title="放棄本次修行"
        description="當前五境進度、法訣與金幣將全部失去，下次將從引氣入道重新開始。"
        cancelLabel="繼續修行"
        confirmLabel="確定放棄"
        onCancel={closeConfirm}
        onConfirm={() => {
          setConfirmAbandon(false);
          onAbandonGame();
        }}
      />
    </div>
  );
}
