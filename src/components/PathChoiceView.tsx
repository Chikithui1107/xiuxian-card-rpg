"use client";

import { useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import {
  RouteOptionCard,
  type RouteCardTone,
} from "@/components/RouteOptionCard";
import { NODE_LABELS } from "@/lib/map";
import { ENEMY_SPRITE_ID, getMonsterConfig } from "@/data/monsters";
import { publicAsset } from "@/lib/paths";
import type { MapNode, NodeType } from "@/types/map";

interface PathChoiceViewProps {
  map: MapNode[][];
  choices: MapNode[];
  tierName: string;
  chapterLabel?: string;
  realmLabel?: string;
  runChapterIndex?: number;
  runChapterTotal?: number;
  playerHp: number;
  maxHp: number;
  runSpirit: number;
  completedCount: number;
  totalCount: number;
  mapMessage?: string | null;
  currentNodeId?: string | null;
  onSelectNode: (node: MapNode) => void;
}

const ROUTE_BLURB: Record<string, string> = {
  enemy_wolf: "妖狼盤踞霧林，擅長撲襲。",
  enemy_bandit: "散修惡徒攔路，劍招雖粗卻凶狠。",
  enemy_spirit_snake: "靈蛇藏於溪霧之間，出手迅疾。",
  enemy_traitor: "叛劍客立於斷崖，三連斬壓制對手。",
  enemy_stone_ape: "裂石猿皮堅如石，蓄力一擊極凶。",
  enemy_demonic_tiger: "虎王盤踞谷底，青焰噬靈，攻勢多變。",
};

const TYPE_BLURB: Record<NodeType, string> = {
  combat: "前方妖氣隱現，宜謹慎應對。",
  elite: "強敵據守要道，此戰不可輕敵。",
  rest: "此地可暫歇調息，恢復氣血。",
  shop: "雲遊散修擺攤於此，或可換取資糧。",
  event: "奇緣未定，踏入後方知吉凶。",
  boss: "通天塔主鎮守此境，破境在此一戰。",
};

function nodeTone(type: NodeType): RouteCardTone {
  if (type === "combat") return "combat";
  if (type === "elite") return "elite";
  if (type === "event") return "event";
  if (type === "rest") return "rest";
  if (type === "shop") return "shop";
  return "boss";
}

function routeArtSrc(node: MapNode): string | null {
  if (!node.enemyId) return null;
  const spriteId = ENEMY_SPRITE_ID[node.enemyId];
  if (!spriteId || !getMonsterConfig({ monsterSprite: spriteId })) return null;
  return `/monsters/${spriteId}.png`;
}

function routeDescription(node: MapNode): string {
  if (node.enemyId && ROUTE_BLURB[node.enemyId]) {
    return ROUTE_BLURB[node.enemyId];
  }
  return TYPE_BLURB[node.type];
}

export function PathChoiceView({
  map,
  choices,
  tierName,
  chapterLabel,
  realmLabel,
  runChapterIndex = 0,
  runChapterTotal = 5,
  playerHp,
  maxHp,
  runSpirit,
  completedCount,
  totalCount,
  mapMessage,
  currentNodeId,
  onSelectNode,
}: PathChoiceViewProps) {
  const [showMap, setShowMap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hpPercent = Math.max(0, (playerHp / maxHp) * 100);
  const progressPercent =
    totalCount > 0 ? Math.min(100, (completedCount / totalCount) * 100) : 0;
  const title =
    chapterLabel && realmLabel
      ? `${chapterLabel}・${realmLabel}`
      : tierName;

  const forkLabel = useMemo(() => {
    if (choices.length <= 1) return "前方唯餘一路";
    if (choices.length === 2) return "前方岔路・二選一";
    return `前方岔路・${choices.length}選一`;
  }, [choices.length]);

  const handleSelect = (node: MapNode) => {
    setSelectedId(node.id);
    onSelectNode(node);
  };

  return (
    <div className="mystic-route-page">
      <div
        className="mystic-route-page__bg"
        style={{
          backgroundImage: `url(${publicAsset("/backgrounds/realm-qinglan-valley.jpg")})`,
        }}
        aria-hidden
      />
      <div className="mystic-route-page__veil" aria-hidden />

      <div className="mystic-route-page__content">
        <header className="mystic-route-header">
          <div className="mystic-route-header__main">
            <p className="mystic-route-header__eyebrow">秘境前路</p>
            <h2 className="mystic-route-header__title">{title}</h2>
            <p className="mystic-route-header__run">
              本次修行 {runChapterIndex + 1} / {runChapterTotal}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="mystic-route-map-btn"
          >
            <span className="mystic-route-map-btn__icon" aria-hidden>
              ⌖
            </span>
            觀秘境全圖
          </button>
        </header>

        <section className="mystic-route-status" aria-label="當前狀態">
          <div className="mystic-route-status__seal" aria-hidden>
            ❋
          </div>
          <div className="mystic-route-status__rows">
            <div className="mystic-route-status__row">
              <span className="mystic-route-status__label mystic-route-status__label--hp">
                氣血
              </span>
              <div className="mystic-route-status__bar-wrap">
                <div className="mystic-route-status__bar">
                  <div
                    className="mystic-route-status__bar-fill mystic-route-status__bar-fill--hp"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
              <span className="mystic-route-status__value">
                {playerHp.toLocaleString()} / {maxHp.toLocaleString()}
              </span>
            </div>

            <div className="mystic-route-status__row mystic-route-status__row--spirit">
              <span className="mystic-route-status__label mystic-route-status__label--spirit">
                靈砂
              </span>
              <span className="mystic-route-status__spirit-mark" aria-hidden>
                ●
              </span>
              <span className="mystic-route-status__value mystic-route-status__value--spirit">
                {runSpirit.toLocaleString()}
              </span>
            </div>

            <div className="mystic-route-status__row">
              <span className="mystic-route-status__label">本境進度</span>
              <div className="mystic-route-status__bar-wrap">
                <div className="mystic-route-status__bar">
                  <div
                    className="mystic-route-status__bar-fill mystic-route-status__bar-fill--progress"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="mystic-route-status__value">
                {completedCount} / {totalCount}
              </span>
            </div>
          </div>
          <div className="mystic-route-status__side" aria-hidden>
            <span>修</span>
            <span>心</span>
            <span>問</span>
            <span>道</span>
          </div>
        </section>

        {mapMessage ? (
          <div className="mystic-route-toast" role="status">
            <p className="mystic-route-toast__label">探索結果</p>
            <p className="mystic-route-toast__text">{mapMessage}</p>
          </div>
        ) : null}

        <section className="mystic-route-fork" aria-label="路線選擇">
          <div className="mystic-route-fork__heading">
            <span className="mystic-route-fork__ornament" aria-hidden>
              ❖
            </span>
            <p className="mystic-route-fork__label">{forkLabel}</p>
            <span className="mystic-route-fork__ornament" aria-hidden>
              ❖
            </span>
          </div>

          <div
            className={`mystic-route-fork__grid${
              choices.length === 1 ? " is-single" : ""
            }${choices.length >= 3 ? " is-triple" : ""}`}
          >
            {choices.map((node) => (
              <RouteOptionCard
                key={node.id}
                id={node.id}
                tag={NODE_LABELS[node.type]}
                title={node.title}
                description={routeDescription(node)}
                tone={nodeTone(node.type)}
                artSrc={routeArtSrc(node)}
                selected={selectedId === node.id}
                onSelect={() => handleSelect(node)}
              />
            ))}
          </div>

          {choices.length === 0 ? (
            <p className="mystic-route-empty">
              此間無路可走，請從選單放棄本次修行。
            </p>
          ) : null}
        </section>

        <p className="mystic-route-footnote">
          右上選單可隨時退出・破境後將延續至下一境
        </p>
      </div>

      {showMap ? (
        <div className="mystic-route-map-overlay">
          <div className="mystic-route-map-overlay__bar">
            <p className="zone-label text-[#7aab9a]">秘境全圖・僅供觀覽</p>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="btn-cyber px-3 py-1 text-[11px]"
            >
              關閉
            </button>
          </div>
          <div className="mystic-route-map-overlay__body">
            <MapView
              map={map}
              tierName={tierName}
              playerHp={playerHp}
              maxHp={maxHp}
              currentNodeId={currentNodeId}
              readOnly
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
