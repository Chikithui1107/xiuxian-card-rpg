"use client";

import { useEffect, useRef, type CSSProperties } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      root.style.setProperty("--mx", `${x}`);
      root.style.setProperty("--my", `${y}`);
    };

    const reset = () => {
      root.style.setProperty("--mx", "0");
      root.style.setProperty("--my", "0");
    };

    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerleave", reset);

    return () => {
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={[styles.scene, className].filter(Boolean).join(" ")}
    >
      {/* 層 1：高清背景全螢幕 cover */}
      <img
        className={styles.background}
        src={publicAsset(backgroundSrc)}
        alt=""
        draggable={false}
        decoding="async"
      />

      <div className={`${styles.mist} ${styles.mistBack}`} />

      {/* 層 2：透明男主 — 完全靜止，不拉伸、不加 blur */}
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
