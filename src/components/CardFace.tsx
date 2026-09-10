"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  isRetain?: boolean;
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

/** 真元印：依因／果／雙屬換外觀 */
export function qiSealClassName(opts: {
  aspect: KarmaAspect | null;
  canAfford?: boolean;
  reduced?: boolean;
}): string {
  const { aspect, canAfford = true, reduced = false } = opts;
  const parts = ["ink-qi-seal"];
  if (aspect === "yin") parts.push("ink-qi-seal--yin");
  else if (aspect === "yang") parts.push("ink-qi-seal--yang");
  else if (aspect === "both") parts.push("ink-qi-seal--both");
  else parts.push("ink-qi-seal--neutral");
  if (!canAfford) parts.push("ink-qi-seal--deny");
  if (reduced) parts.push("ink-qi-seal--reduced");
  return parts.join(" ");
}

export function QiCostSeal({
  cost,
  aspect,
  canAfford = true,
  reduced = false,
  className = "",
}: {
  cost: number;
  aspect: KarmaAspect | null;
  canAfford?: boolean;
  reduced?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${qiSealClassName({ aspect, canAfford, reduced })}${
        className ? ` ${className}` : ""
      }`}
      aria-label={`真元 ${cost}${reduced ? "（降費）" : ""}`}
      title={`真元 ${cost}`}
    >
      <span className="ink-qi-seal__num">{cost}</span>
      {reduced ? (
        <span className="ink-qi-seal__drop" aria-hidden>
          ↓
        </span>
      ) : null}
    </span>
  );
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
  isRetain = false,
  showSelectHint = false,
  showReady = false,
  compact = false,
  preview,
}: CardFaceProps) {
  const [iconBroken, setIconBroken] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const typeAccent = CARD_TYPE_ACCENT[type] ?? "text-[#c9a84c]";
  const iconPath = !iconBroken ? resolveCardIcon(icon) : null;
  const karmaDisplay = templateId
    ? getKarmaCardFaceDisplay(templateId, preview)
    : null;
  const aspect = aspectFromTemplateId(templateId);

  // 長文略縮字級，最低約 0.82；短文不垂直置中
  useLayoutEffect(() => {
    if (compact) return;
    const el = descRef.current;
    if (!el) return;
    let scale = 1;
    el.style.setProperty("--face-desc-scale", "1");
    // 最多縮幾步，避免無限縮小
    for (let i = 0; i < 6; i++) {
      if (el.scrollHeight <= el.clientHeight + 1) break;
      scale = Math.max(0.82, scale - 0.035);
      el.style.setProperty("--face-desc-scale", String(scale));
      if (scale <= 0.82) break;
    }
  }, [
    compact,
    description,
    templateId,
    preview,
    karmaDisplay?.coreLines?.length,
  ]);

  if (compact) {
    return (
      <div className="relative z-[2] flex w-full items-center gap-2 p-1.5">
        <div
          className={`ink-card-icon ink-card-icon--compact ink-card-face__icon-slot shrink-0 ${
            iconPath ? "" : "ink-card-face__icon-slot--empty"
          }`}
          aria-hidden
        >
          {iconPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicAsset(iconPath)}
              alt=""
              draggable={false}
              onError={() => setIconBroken(true)}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <QiCostSeal
              cost={cost}
              aspect={aspect}
              canAfford={canAfford}
              reduced={pulledByKarma}
            />
            <span className="ink-card-face__name truncate">{name}</span>
          </div>
          <p className={`text-[8px] font-semibold ${typeAccent}`}>{type}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ink-card-face relative z-[2]">
      <header className="ink-card-face__header">
        <QiCostSeal
          cost={cost}
          aspect={aspect}
          canAfford={canAfford}
          reduced={pulledByKarma}
        />
        <span className="ink-card-face__name">{name}</span>
      </header>

      <div className="ink-card-face__icon">
        <div
          className={`ink-card-face__icon-slot ${
            iconPath ? "" : "ink-card-face__icon-slot--empty"
          }`}
          aria-hidden
        >
          {iconPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicAsset(iconPath)}
              alt=""
              draggable={false}
              onError={() => setIconBroken(true)}
            />
          ) : null}
        </div>
      </div>

      <div className="ink-card-face__desc" ref={descRef}>
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
          <span>{type}</span>
        </p>
        {pulledByKarma && (
          <p className="ink-card-face__meta ink-card-face__meta--pull">牽引</p>
        )}
        {isRetain && (
          <p className="ink-card-face__meta ink-card-face__meta--retain">保留</p>
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
    isRetain: template.isRetain,
    ...extras,
  };
}
