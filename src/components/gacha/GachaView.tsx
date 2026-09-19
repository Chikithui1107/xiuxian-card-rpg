"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { publicAsset } from "@/lib/paths";
import { formatNumber } from "@/lib/stats";
import {
  GACHA_COST,
  GACHA_RARITY_META,
  getCollectionProgress,
  getLegendaryPity,
  loadGachaSave,
  performGachaDraw,
  persistGachaSave,
} from "@/lib/gacha";
import {
  BAIYE_GACHA_CARDS,
  NICHANG_BANNER,
  WUDAO_BANNER,
  getBaiyeCardDisplay,
} from "@/data/gacha-pools";
import {
  COSMETIC_ENTRIES,
  COSMETIC_TYPE_LABEL,
} from "@/data/cosmetics";
import { GachaPoolTabs } from "@/components/gacha/GachaPoolTabs";
import { GachaBanner } from "@/components/gacha/GachaBanner";
import { GachaResult } from "@/components/gacha/GachaResult";
import type {
  GachaDrawLine,
  GachaDrawSummary,
  GachaPoolId,
  GachaSaveV1,
} from "@/types/gacha";

type Panel = "banner" | "result" | "collection" | "history";

interface GachaViewProps {
  spiritStones: number;
  onSpendSpirit: (amount: number) => boolean;
  onClose: () => void;
}

export function GachaView({
  spiritStones,
  onSpendSpirit,
  onClose,
}: GachaViewProps) {
  const [poolId, setPoolId] = useState<GachaPoolId>("wudao");
  const [panel, setPanel] = useState<Panel>("banner");
  const [save, setSave] = useState<GachaSaveV1>(() => loadGachaSave());
  const [drawError, setDrawError] = useState<string | null>(null);
  const [resultLines, setResultLines] = useState<GachaDrawLine[]>([]);
  const [resultSummary, setResultSummary] = useState<GachaDrawSummary | null>(
    null
  );

  useEffect(() => {
    setSave(loadGachaSave());
  }, []);

  const banner = poolId === "wudao" ? WUDAO_BANNER : NICHANG_BANNER;
  const collection = getCollectionProgress(save, poolId);
  const pity = getLegendaryPity(save, poolId);

  const history = useMemo(
    () =>
      poolId === "wudao" ? save.cardDrawHistory : save.cosmeticDrawHistory,
    [poolId, save]
  );

  const handlePoolChange = useCallback((next: GachaPoolId) => {
    setPoolId(next);
    setDrawError(null);
    setPanel("banner");
  }, []);

  const runDraw = useCallback(
    (count: 1 | 10) => {
      setDrawError(null);
      const cost = count === 1 ? GACHA_COST.single : GACHA_COST.multi;
      if (spiritStones < cost) {
        setDrawError("靈石不足");
        return;
      }
      if (!onSpendSpirit(cost)) {
        setDrawError("靈石不足");
        return;
      }
      const outcome = performGachaDraw({
        poolId,
        count,
        spiritStones,
        save,
      });
      if (!outcome.ok) {
        setDrawError(outcome.message);
        return;
      }
      setSave(outcome.save);
      persistGachaSave(outcome.save);
      setResultLines(outcome.lines);
      setResultSummary(outcome.summary);
      setPanel("result");
    },
    [onSpendSpirit, poolId, save, spiritStones]
  );

  return (
    <div className="gacha-page animate-fade-in">
      <header className="gacha-page__header">
        <div>
          <p className="gacha-page__eyebrow">局外因緣</p>
          <h2 className="gacha-page__title">因緣閣</h2>
        </div>
        <button type="button" className="gacha-page__close" onClick={onClose}>
          返回山門
        </button>
      </header>

      <GachaPoolTabs active={poolId} onChange={handlePoolChange} />

      <div className="gacha-page__body">
        {panel === "banner" ? (
          <GachaBanner
            poolId={poolId}
            title={banner.title}
            subtitle={banner.subtitle}
            portrait={banner.portrait}
            background={banner.background}
            collectionOwned={collection.owned}
            collectionTotal={collection.total}
            pityCurrent={pity.current}
            pityMax={pity.max}
            spiritStones={spiritStones}
            remnantScrolls={save.remnantScrolls}
            silkDust={save.silkDust}
            drawError={drawError}
            onSingle={() => runDraw(1)}
            onMulti={() => runDraw(10)}
            onCollection={() => setPanel("collection")}
            onHistory={() => setPanel("history")}
          />
        ) : null}

        {panel === "result" && resultSummary ? (
          <GachaResult
            poolId={poolId}
            lines={resultLines}
            summary={resultSummary}
            canAffordMulti={spiritStones >= GACHA_COST.multi}
            onAgainMulti={() => runDraw(10)}
            onBack={() => {
              setPanel("banner");
              setDrawError(null);
            }}
          />
        ) : null}

        {panel === "collection" ? (
          <div className="gacha-panel">
            <div className="gacha-panel__bar">
              <h3 className="gacha-panel__title">
                {poolId === "wudao" ? "白夜卡牌收藏" : "外觀收藏"}
              </h3>
              <button
                type="button"
                className="gacha-link"
                onClick={() => setPanel("banner")}
              >
                返回
              </button>
            </div>
            <p className="gacha-panel__meta">
              {collection.owned} / {collection.total}
              {poolId === "wudao"
                ? ` · 殘卷 ${formatNumber(save.remnantScrolls)}`
                : ` · 綺塵 ${formatNumber(save.silkDust)}`}
            </p>
            <ul className="gacha-collection">
              {poolId === "wudao"
                ? BAIYE_GACHA_CARDS.map((card) => {
                    const owned = save.ownedCards.baiye.includes(card.id);
                    const display = getBaiyeCardDisplay(card.id);
                    return (
                      <li
                        key={card.id}
                        className={`gacha-collection__item${
                          owned ? "" : " is-locked"
                        }`}
                      >
                        {display?.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={publicAsset(display.icon)}
                            alt=""
                            className="gacha-collection__icon"
                          />
                        ) : (
                          <div className="gacha-collection__icon-fallback" />
                        )}
                        <div>
                          <p className="gacha-collection__name">
                            {display?.name ?? card.id}
                          </p>
                          <p className="gacha-collection__sub">
                            {GACHA_RARITY_META[card.rarity].label}
                            {card.buildTag ? ` · ${card.buildTag}` : ""}
                          </p>
                          {owned && display ? (
                            <p className="gacha-collection__desc">
                              {display.description}
                            </p>
                          ) : (
                            <p className="gacha-collection__desc">尚未結緣</p>
                          )}
                        </div>
                      </li>
                    );
                  })
                : COSMETIC_ENTRIES.map((c) => {
                    const owned = save.ownedCosmetics.includes(c.id);
                    return (
                      <li
                        key={c.id}
                        className={`gacha-collection__item${
                          owned ? "" : " is-locked"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicAsset(c.icon)}
                          alt=""
                          className="gacha-collection__icon"
                        />
                        <div>
                          <p className="gacha-collection__name">{c.name}</p>
                          <p className="gacha-collection__sub">
                            {GACHA_RARITY_META[c.rarity].label} ·{" "}
                            {COSMETIC_TYPE_LABEL[c.type]}
                          </p>
                          <p className="gacha-collection__desc">
                            {owned ? c.description : "尚未結緣"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
            </ul>
          </div>
        ) : null}

        {panel === "history" ? (
          <div className="gacha-panel">
            <div className="gacha-panel__bar">
              <h3 className="gacha-panel__title">抽取紀錄</h3>
              <button
                type="button"
                className="gacha-link"
                onClick={() => setPanel("banner")}
              >
                返回
              </button>
            </div>
            <p className="gacha-panel__meta">最近 {history.length} 次（最多 50）</p>
            {history.length === 0 ? (
              <p className="gacha-empty">尚無紀錄</p>
            ) : (
              <ul className="gacha-history">
                {history.map((h, i) => {
                  const label =
                    h.kind === "card"
                      ? getBaiyeCardDisplay(h.itemId)?.name ?? h.itemId
                      : COSMETIC_ENTRIES.find((c) => c.id === h.itemId)?.name ??
                        h.itemId;
                  return (
                    <li key={`${h.at}-${i}`} className="gacha-history__row">
                      <span className="gacha-history__name">{label}</span>
                      <span className="gacha-history__meta">
                        {GACHA_RARITY_META[h.rarity].label}
                        {h.isNew
                          ? " · NEW"
                          : ` · +${h.convertAmount}${
                              h.convertCurrency === "silk" ? "綺塵" : "殘卷"
                            }`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
