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
  /** public path, e.g. /monsters/demon_wolf.png */
  artSrc?: string | null;
  /** CSS object-position for art crop focus */
  artPosition?: string;
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
  artSrc,
  artPosition = "center 22%",
  selected = false,
  onSelect,
}: RouteOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`mystic-route-card ${TONE_CLASS[tone]}${
        selected ? " is-selected" : ""
      }`}
      aria-pressed={selected}
    >
      <div className="mystic-route-card__art" aria-hidden>
        {artSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAsset(artSrc)}
            alt=""
            className="mystic-route-card__img"
            style={{ objectPosition: artPosition }}
            draggable={false}
          />
        ) : (
          <div className="mystic-route-card__art-fallback" />
        )}
        <div className="mystic-route-card__art-veil" />
        <span className="mystic-route-card__tag">{tag}</span>
      </div>

      <div className="mystic-route-card__body">
        <h3 className="mystic-route-card__title">{title}</h3>
        {description ? (
          <p className="mystic-route-card__desc">{description}</p>
        ) : (
          <p className="mystic-route-card__desc mystic-route-card__desc--spacer">
            {"\u00a0"}
          </p>
        )}
        <span className="mystic-route-card__action">{actionText}</span>
      </div>
    </button>
  );
}
