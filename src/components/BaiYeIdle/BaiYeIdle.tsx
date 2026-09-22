"use client";

import type { CSSProperties } from "react";
import { publicAsset } from "@/lib/paths";
import styles from "./BaiYeIdle.module.css";

type BaiYeIdleProps = {
  characterSrc?: string;
  backgroundSrc?: string;
  characterName?: string;
  className?: string;
  /** 山門 V2 只調整展示構圖，不修改角色資料。 */
  composition?: "portrait" | "gate";
  /** jade | ink — 氛圍微調，不改版式 */
  theme?: "jade" | "ink";
  backgroundPosition?: string;
  backgroundFilter?: string;
  characterBottom?: string;
  characterHeight?: string;
  characterMaxWidth?: string;
};

export default function BaiYeIdle({
  characterSrc = "/images/baiye/baiye-character.png",
  backgroundSrc = "/images/baiye/baiye-bg.png",
  characterName = "白夜",
  className,
  composition = "portrait",
  theme = "jade",
  backgroundPosition,
  backgroundFilter,
  characterBottom,
  characterHeight,
  characterMaxWidth,
}: BaiYeIdleProps) {
  const bgStyle: CSSProperties = {
    ...(backgroundPosition ? { objectPosition: backgroundPosition } : null),
    ...(backgroundFilter !== undefined
      ? { filter: backgroundFilter || "none" }
      : null),
  };

  const charStyle: CSSProperties = {
    ...(characterBottom ? { bottom: characterBottom } : null),
    ...(characterHeight ? { height: characterHeight } : null),
    ...(characterMaxWidth ? { maxWidth: characterMaxWidth } : null),
    ...(composition === "gate"
      ? {
          bottom: "var(--gate-character-bottom, 18%)",
          height: "var(--gate-character-height, 68%)",
        }
      : null),
  };

  return (
    <div
      className={[styles.scene, className].filter(Boolean).join(" ")}
      data-lobby-theme={theme}
      data-composition={composition}
    >
      <img
        className={styles.background}
        src={publicAsset(backgroundSrc)}
        alt=""
        draggable={false}
        decoding="async"
        style={bgStyle}
      />

      <div className={`${styles.mist} ${styles.mistBack}`} />

      {/* 人物背後局部柔暗：只服務 ink 主題，不整張壓黑、不 blur */}
      <div className={styles.figureShade} aria-hidden />

      <div className={styles.groundShadow} aria-hidden />

      <img
        className={styles.character}
        src={publicAsset(characterSrc)}
        alt={characterName}
        draggable={false}
        decoding="async"
        fetchPriority="high"
        style={charStyle}
      />

      <div className={styles.particles}>
        {Array.from({ length: 6 }).map((_, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
