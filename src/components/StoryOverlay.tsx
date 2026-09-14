"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  STORY_SPEAKER_NAMES,
  type StoryScene,
  type StorySpeaker,
} from "@/data/story";

interface StoryOverlayProps {
  scene: StoryScene;
  onComplete: () => void;
  onSkip: () => void;
}

function resolveSpeakerName(
  speaker: StorySpeaker | undefined,
  override?: string
): string | null {
  if (override) return override;
  if (!speaker || speaker === "narrator") return null;
  return STORY_SPEAKER_NAMES[speaker] ?? null;
}

function autoDelayMs(text: string): number {
  const chars = text.replace(/\s/g, "").length;
  if (chars < 30) return 2600;
  if (chars < 60) return 3200;
  return 3800;
}

export function StoryOverlay({ scene, onComplete, onSkip }: StoryOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lines = scene.lines;
  const safeIndex = Math.min(lineIndex, Math.max(0, lines.length - 1));
  const line = lines[safeIndex];
  const speakerName = line
    ? resolveSpeakerName(line.speaker, line.speakerName)
    : null;

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setLineIndex((i) => {
      if (i >= lines.length - 1) {
        queueMicrotask(() => onComplete());
        return i;
      }
      return i + 1;
    });
  }, [lines.length, onComplete]);

  useEffect(() => {
    setLineIndex(0);
    setAutoPlay(false);
    clearAutoTimer();
  }, [scene.id, clearAutoTimer]);

  useEffect(() => {
    clearAutoTimer();
    if (!autoPlay || !line) return;

    autoTimerRef.current = setTimeout(() => {
      autoTimerRef.current = null;
      advance();
    }, autoDelayMs(line.text));

    return clearAutoTimer;
  }, [autoPlay, lineIndex, scene.id, line, advance, clearAutoTimer]);

  useEffect(() => {
    return () => clearAutoTimer();
  }, [clearAutoTimer]);

  if (!line || lines.length === 0) {
    return null;
  }

  const handleSkip = (e: MouseEvent) => {
    e.stopPropagation();
    clearAutoTimer();
    setAutoPlay(false);
    onSkip();
  };

  const handleToggleAuto = (e: MouseEvent) => {
    e.stopPropagation();
    setAutoPlay((v) => !v);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/88 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-overlay-title"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-2">
          {scene.title && (
            <h2
              id="story-overlay-title"
              className="truncate text-[13px] font-semibold tracking-[0.22em] text-[#c9a84c]"
            >
              {scene.title}
            </h2>
          )}
          {scene.subtitle && (
            <p className="mt-0.5 text-[10px] tracking-[0.16em] text-stone-500">
              {scene.subtitle}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleAuto}
            className={`rounded border px-2.5 py-1 text-[10px] tracking-[0.14em] transition ${
              autoPlay
                ? "border-[#c9a84c]/55 bg-[#c9a84c]/15 text-[#c9a84c]"
                : "border-stone-700/50 bg-stone-950/60 text-stone-400 hover:border-[#8a7340]/50 hover:text-[#c9a84c]"
            }`}
          >
            {autoPlay ? "自動 · 開" : "自動"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded border border-stone-700/50 bg-stone-950/60 px-2.5 py-1 text-[10px] tracking-[0.14em] text-stone-400 transition hover:border-[#8a7340]/50 hover:text-[#c9a84c]"
          >
            跳過
          </button>
        </div>
      </div>

      <button
        type="button"
        className="flex min-h-0 flex-1 cursor-pointer flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-left"
        onClick={advance}
        aria-label="點擊繼續"
      >
        <div className="mx-auto mt-auto w-full max-w-md">
          <div className="glass-panel-gold px-4 py-4">
            {speakerName && (
              <p className="mb-2 text-[11px] tracking-[0.2em] text-[#c9a84c]/90">
                {speakerName}
              </p>
            )}
            <div className="flex min-h-[140px] max-h-[35vh] items-start">
              <p className="whitespace-pre-line text-[14.5px] leading-[1.75] tracking-wide text-[#e8e0d4]">
                {line.text}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[9px] text-stone-600">
                {safeIndex + 1} / {lines.length}
              </p>
              <p className="text-[9px] tracking-wide text-stone-500">
                {autoPlay ? "自動播放中" : "點擊任意位置繼續"}
              </p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
