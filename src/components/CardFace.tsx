"use client";

import { useState } from "react";
import {
  resolveCardIcon,
  type CardTemplate,
} from "@/lib/battle-deck";
import {
  getKarmaCardFaceDisplay,
  type CardFacePreviewState,
  type FaceToken,
} from "@/lib/card-face-display";
import { getKarmaTemplate, type KarmaAspect } from "@/lib/karma-deck";
import { publicAsset } from "@/lib/paths";
import { CARD_TYPE_ACCENT } from "@/types/game";

export interface CardFaceProps {
  name: string;
  type: string;
  cost: number;
  description: string;
  art?: string | null;
  icon?: string | null;
  templateId?: string;
  canAfford?: boolean;
  isExhaust?: boolean;
  pulledByKarma?: boolean;
  showSelectHint?: boolean;
  showReady?: boolean;
  compact?: boolean;
  preview?: CardFacePreviewState;
}

export function aspectClassName(aspect: KarmaAspect | null): string {
  if (aspect === "yin") return "ink-card-aspect-yin";
  if (aspect === "yang") return "ink-card-aspect-yang";
  if (aspect === "both") return "ink-card-aspect-both";
  return "";
}

export function aspectFromTemplateId(templateId?: string): KarmaAspect | null {
  if (!templateId) return null;
  return getKarmaTemplate(templateId)?.aspect ?? null;
}

function AspectMark({ type }: { type: string }) {
  if (type === "因牌") return <span aria-hidden>因</span>;
  if (type === "果牌") return <span aria-hidden>果</span>;
  if (type === "因／果牌") return <span aria-hidden>因／果</span>;
  return null;
}

function tokenClassName(token: FaceToken): string {
  const kind = token.kind ?? "normal";
  const core = token.core ? " ink-face-token--core" : "";
  if (kind === "damage") return `ink-face-token ink-face-token--damage${core}`;
  if (kind === "shield") return `ink-face-token ink-face-token--shield${core}`;
  if (kind === "keyword") return `ink-face-token ink-face-token--keyword${core}`;
  return "ink-face-token ink-face-token--normal";
}

function FaceLineTokens({ tokens }: { tokens: FaceToken[] }) {
  return (
    <>
      {tokens.map((token, i) => (
        <span key={`${token.text}-${i}`} className={tokenClassName(token)}>
          {token.text}
        </span>
      ))}
    </>
  );
}

export function CardFace({
  name,
  type,
  cost,
  description,
  icon,
  templateId,
  canAfford = true,
  isExhaust = false,
  pulledByKarma = false,
  showSelectHint = false,
  showReady = false,
  compact = false,
  preview,
}: CardFaceProps) {
  const [iconBroken, setIconBroken] = useState(false);
  const typeAccent = CARD_TYPE_ACCENT[type] ?? "text-[#c9a84c]";
  const iconPath = !iconBroken ? resolveCardIcon(icon) : null;
  const karmaDisplay = templateId
    ? getKarmaCardFaceDisplay(templateId, preview)
    : null;

  if (compact) {
    return (
      <div className="relative z-[2] flex w-full items-center gap-2 p-1.5">
        {iconPath && (
          <div className="ink-card-icon ink-card-icon--compact shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicAsset(iconPath)}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
              onError={() => setIconBroken(true)}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="ink-card-face__name truncate text-[12px]">
              {name}
            </span>
            <span className="text-[10px] tabular-nums text-[#7aab9a]">
              {cost}
            </span>
          </div>
          <p className={`text-[8px] font-semibold ${typeAccent}`}>{type}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ink-card-face relative z-[2]">
      <header className="ink-card-face__header">
        <span className="ink-card-face__name">{name}</span>
        <span
          className={`ink-card-face__cost ${
            canAfford ? "ink-card-face__cost--ok" : "ink-card-face__cost--deny"
          }`}
        >
          {cost}
        </span>
      </header>

      <div className="ink-card-face__icon">
        {iconPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAsset(iconPath)}
            alt=""
            draggable={false}
            className="max-h-full max-w-[88%] object-contain"
            onError={() => setIconBroken(true)}
          />
        ) : null}
      </div>

      <div className="ink-card-face__desc">
        {karmaDisplay ? (
          karmaDisplay.coreLines.map((line, i) => (
            <p
              key={i}
              className={`ink-card-face__line ${
                line.dimmed ? "ink-card-face__line--dimmed" : ""
              }`}
            >
              <FaceLineTokens tokens={line.tokens} />
            </p>
          ))
        ) : (
          <p className="ink-card-face__line">{description}</p>
        )}
      </div>

      <footer className="ink-card-face__type">
        <p className={`ink-card-face__type-label ${typeAccent}`}>
          <AspectMark type={type} />
          <span>{type}</span>
        </p>
        {pulledByKarma && (
          <p className="ink-card-face__meta ink-card-face__meta--pull">牽引</p>
        )}
        {isExhaust && (
          <p className="ink-card-face__meta ink-card-face__meta--exhaust">
            消耗
          </p>
        )}
        {showSelectHint && (
          <p className="ink-card-face__meta">上拖出牌</p>
        )}
        {showReady && (
          <p className="ink-card-face__meta ink-card-face__meta--ready">
            松手出牌
          </p>
        )}
      </footer>
    </div>
  );
}

export function cardFaceFromTemplate(
  template: CardTemplate,
  extras: Partial<CardFaceProps> = {}
): CardFaceProps {
  return {
    name: template.name,
    type: template.type,
    cost: template.cost,
    description: template.description,
    icon: template.icon ?? template.art,
    templateId: template.id,
    isExhaust: template.isExhaust,
    ...extras,
  };
}
