"use client";

import { publicAsset } from "@/lib/paths";

export type RouteCardTone =
  | "combat"
  | "elite"
  | "event"
  | "rest"
  | "shop"
  | "boss";

export interface RouteOptionCardProps {
  id: string;
  tag: string;
  title: string;
  description?: string;
  actionText?: string;
  tone: RouteCardTone;
  /** 怪物透明立繪 public path */
  monsterSrc?: string | null;
  /** 場景背景 public path */
  sceneSrc?: string | null;
  routeScale?: number;
  routeOffsetX?: number;
  routeOffsetY?: number;
  selected?: boolean;
  onSelect: (id: string) => void;
}

const TONE_CLASS: Record<RouteCardTone, string> = {
  combat: "mystic-route-card--combat",
  elite: "mystic-route-card--elite",
  event: "mystic-route-card--event",
  rest: "mystic-route-card--rest",
  shop: "mystic-route-card--shop",
  boss: "mystic-route-card--boss",
};

export function RouteOptionCard({
  id,
  tag,
  title,
  description,
  actionText = "踏入此途 →",
  tone,
  monsterSrc,
  sceneSrc,
  routeScale = 0.9,
  routeOffsetX = 0,
  routeOffsetY = 0,
  selected = false,
  onSelect,
}: RouteOptionCardProps) {
  const monsterTransform = `translateX(calc(-50% + ${routeOffsetX}px)) translateY(${routeOffsetY}px) scale(${routeScale})`;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`mystic-route-card ${TONE_CLASS[tone]}${
        selected ? " is-selected" : ""
      }`}
      aria-pressed={selected}
    >
      <div className="mystic-route-card__art route-art" aria-hidden>
        {sceneSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAsset(sceneSrc)}
            alt=""
            className="route-scene-bg"
            draggable={false}
          />
        ) : (
          <div className="route-scene-fallback" />
        )}
        {monsterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAsset(monsterSrc)}
            alt=""
            className="route-monster"
            style={{ transform: monsterTransform }}
            draggable={false}
          />
        ) : null}
        <div className="mystic-route-card__art-veil" />
        <span className="mystic-route-card__tag">{tag}</span>
      </div>

      <div className="mystic-route-card__body">
        <div className="mystic-route-card__copy">
          <h3 className="mystic-route-card__title">{title}</h3>
          {description ? (
            <p className="mystic-route-card__desc">{description}</p>
          ) : (
            <p className="mystic-route-card__desc mystic-route-card__desc--spacer">
              {"\u00a0"}
            </p>
          )}
        </div>
        <span className="mystic-route-card__action">{actionText}</span>
      </div>
    </button>
  );
}
