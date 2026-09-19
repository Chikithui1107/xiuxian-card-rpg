"use client";

import { publicAsset } from "@/lib/paths";
import { formatNumber } from "@/lib/stats";
import { GACHA_COST } from "@/lib/gacha";
import type { GachaPoolId } from "@/types/gacha";

interface GachaBannerProps {
  poolId: GachaPoolId;
  title: string;
  subtitle: string;
  portrait: string;
  background: string;
  collectionOwned: number;
  collectionTotal: number;
  pityCurrent: number;
  pityMax: number;
  spiritStones: number;
  remnantScrolls: number;
  silkDust: number;
  drawError: string | null;
  onSingle: () => void;
  onMulti: () => void;
  onCollection: () => void;
  onHistory: () => void;
}

export function GachaBanner({
  poolId,
  title,
  subtitle,
  portrait,
  background,
  collectionOwned,
  collectionTotal,
  pityCurrent,
  pityMax,
  spiritStones,
  remnantScrolls,
  silkDust,
  drawError,
  onSingle,
  onMulti,
  onCollection,
  onHistory,
}: GachaBannerProps) {
  const canSingle = spiritStones >= GACHA_COST.single;
  const canMulti = spiritStones >= GACHA_COST.multi;

  return (
    <div className="gacha-banner">
      <div className="gacha-banner__art" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAsset(background)}
          alt=""
          className="gacha-banner__bg"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAsset(portrait)}
          alt=""
          className="gacha-banner__portrait"
          draggable={false}
        />
        <div className="gacha-banner__veil" />
      </div>

      <div className="gacha-banner__body">
        <p className="gacha-banner__eyebrow">
          {poolId === "wudao" ? "功法卡池" : "外觀卡池"}
        </p>
        <h3 className="gacha-banner__title">{title}</h3>
        <p className="gacha-banner__subtitle">{subtitle}</p>

        <div className="gacha-banner__stats">
          <div className="gacha-stat">
            <span className="gacha-stat__label">收藏</span>
            <span className="gacha-stat__value">
              {collectionOwned} / {collectionTotal}
            </span>
          </div>
          <div className="gacha-stat">
            <span className="gacha-stat__label">絕品保底</span>
            <span className="gacha-stat__value gacha-stat__value--pity">
              {pityCurrent} / {pityMax}
            </span>
          </div>
          <div className="gacha-stat">
            <span className="gacha-stat__label">靈石</span>
            <span className="gacha-stat__value">
              {formatNumber(spiritStones)}
            </span>
          </div>
          {poolId === "wudao" ? (
            <div className="gacha-stat">
              <span className="gacha-stat__label">殘卷</span>
              <span className="gacha-stat__value">
                {formatNumber(remnantScrolls)}
              </span>
            </div>
          ) : (
            <div className="gacha-stat">
              <span className="gacha-stat__label">綺塵</span>
              <span className="gacha-stat__value">
                {formatNumber(silkDust)}
              </span>
            </div>
          )}
        </div>

        {drawError ? (
          <p className="gacha-banner__error" role="alert">
            {drawError}
          </p>
        ) : null}

        <div className="gacha-banner__actions">
          <button
            type="button"
            className="gacha-btn gacha-btn--single"
            disabled={!canSingle}
            onClick={onSingle}
          >
            <span>引緣一次</span>
            <span className="gacha-btn__cost">{GACHA_COST.single}</span>
          </button>
          <button
            type="button"
            className="gacha-btn gacha-btn--multi"
            disabled={!canMulti}
            onClick={onMulti}
          >
            <span>十次引緣</span>
            <span className="gacha-btn__cost">{GACHA_COST.multi}</span>
          </button>
        </div>

        <div className="gacha-banner__links">
          <button type="button" className="gacha-link" onClick={onCollection}>
            查看詳情
          </button>
          <button type="button" className="gacha-link" onClick={onHistory}>
            抽取紀錄
          </button>
        </div>
      </div>
    </div>
  );
}
