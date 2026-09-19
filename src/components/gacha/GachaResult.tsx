"use client";

import { publicAsset } from "@/lib/paths";
import { GACHA_COST } from "@/lib/gacha";
import type { GachaDrawLine, GachaDrawSummary, GachaPoolId } from "@/types/gacha";

interface GachaResultProps {
  poolId: GachaPoolId;
  lines: GachaDrawLine[];
  summary: GachaDrawSummary;
  canAffordMulti: boolean;
  onAgainMulti: () => void;
  onBack: () => void;
}

function rarityClass(rarity: string): string {
  return `gacha-result-card--${rarity}`;
}

export function GachaResult({
  poolId,
  lines,
  summary,
  canAffordMulti,
  onAgainMulti,
  onBack,
}: GachaResultProps) {
  const isMulti = lines.length > 1;

  return (
    <div className="gacha-result">
      <header className="gacha-result__header">
        <p className="gacha-result__eyebrow">引緣結果</p>
        <h3 className="gacha-result__title">
          {isMulti ? "十次引緣" : "單次引緣"}
        </h3>
      </header>

      <div
        className={`gacha-result__grid${isMulti ? " is-multi" : " is-single"}`}
      >
        {lines.map((line, idx) => (
          <article
            key={`${line.itemId}-${idx}`}
            className={`gacha-result-card ${rarityClass(line.rarity)}`}
          >
            <div className="gacha-result-card__media">
              {line.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicAsset(line.icon)}
                  alt=""
                  className="gacha-result-card__icon"
                  draggable={false}
                />
              ) : (
                <div className="gacha-result-card__icon-fallback" />
              )}
              {line.isNew ? (
                <span className="gacha-badge gacha-badge--new">NEW</span>
              ) : (
                <span className="gacha-badge gacha-badge--dup">重複</span>
              )}
            </div>
            <div className="gacha-result-card__body">
              <p className="gacha-result-card__rarity">{line.rarityLabel}</p>
              <h4 className="gacha-result-card__name">{line.name}</h4>
              {line.buildTag ? (
                <p className="gacha-result-card__tag">{line.buildTag}</p>
              ) : null}
              <p className="gacha-result-card__desc">{line.description}</p>
              {!line.isNew && line.convertAmount > 0 ? (
                <p className="gacha-result-card__convert">
                  +{line.convertAmount}{" "}
                  {line.convertCurrency === "silk" ? "綺塵" : "殘卷"}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {isMulti ? (
        <div className="gacha-result__summary">
          <p>新增收藏 {summary.newCount}</p>
          {poolId === "wudao" ? (
            <p>獲得殘卷 {summary.remnantGained}</p>
          ) : (
            <p>獲得綺塵 {summary.silkGained}</p>
          )}
          <p>
            距絕品 {summary.legendaryPity} / {summary.legendaryPityMax}
          </p>
        </div>
      ) : (
        <div className="gacha-result__summary">
          <p>
            距絕品 {summary.legendaryPity} / {summary.legendaryPityMax}
          </p>
        </div>
      )}

      <div className="gacha-result__actions">
        <button
          type="button"
          className="gacha-btn gacha-btn--multi"
          disabled={!canAffordMulti}
          onClick={onAgainMulti}
        >
          <span>再次十引</span>
          <span className="gacha-btn__cost">{GACHA_COST.multi}</span>
        </button>
        <button type="button" className="gacha-btn gacha-btn--ghost" onClick={onBack}>
          返回因緣閣
        </button>
      </div>
    </div>
  );
}
