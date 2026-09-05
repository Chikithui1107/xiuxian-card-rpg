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
      <img
        className={styles.background}
        src={publicAsset(backgroundSrc)}
        alt=""
        draggable={false}
        decoding="async"
      />

      {/* 遠處薄霧：極慢 */}
      <div className={`${styles.mist} ${styles.mistBack}`} />

      {/* 腳底柔影在人物之下 */}
      <div className={styles.groundShadow} aria-hidden />

      {/* 男主完全靜止；劍光用原圖自帶，不加 CSS 假光 */}
      <img
        className={styles.character}
        src={publicAsset(characterSrc)}
        alt={characterName}
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />

      {/* 少量環境粒子即可 */}
      <div className={styles.particles}>
        {Array.from({ length: 6 }).map((_, i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
