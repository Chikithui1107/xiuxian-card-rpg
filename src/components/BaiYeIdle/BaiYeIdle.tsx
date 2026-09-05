"use client";

import type { CSSProperties } from "react";
import { publicAsset } from "@/lib/paths";
import styles from "./BaiYeIdle.module.css";

type BaiYeIdleProps = {
  characterSrc?: string;
  backgroundSrc?: string;
  characterName?: string;
  className?: string;
};

export default function BaiYeIdle({
  characterSrc = "/images/baiye/baiye-character.png",
  backgroundSrc = "/images/baiye/baiye-bg.png",
  characterName = "白夜",
  className,
}: BaiYeIdleProps) {
  return (
    <div className={[styles.scene, className].filter(Boolean).join(" ")}>
      {/* 層 1：高清背景全螢幕 cover — 位置固定，無 pointer 視差 */}
      <img
        className={styles.background}
        src={publicAsset(backgroundSrc)}
        alt=""
        draggable={false}
        decoding="async"
      />

      {/* 只壓背景：暗角／冷調／減反光；在人物之下，不碰男主 PNG */}
      <div className={styles.bgGrade} aria-hidden />

      <div className={`${styles.mist} ${styles.mistBack}`} />

      {/* 層 2：透明男主 — 完全靜止 */}
      <img
        className={styles.character}
        src={publicAsset(characterSrc)}
        alt={characterName}
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />

      <div className={styles.swordGlow} />

      <div className={`${styles.frost} ${styles.frostOne}`} />
      <div className={`${styles.frost} ${styles.frostTwo}`} />

      <div className={`${styles.mist} ${styles.mistFront}`} />

      <div className={styles.particles}>
        {Array.from({ length: 10 }).map((_, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>

      <div className={styles.coldLight} />
    </div>
  );
}
