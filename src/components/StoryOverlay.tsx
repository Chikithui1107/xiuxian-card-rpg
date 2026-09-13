"use client";

import { useEffect, useState } from "react";
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

export function StoryOverlay({ scene, onComplete, onSkip }: StoryOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const lines = scene.lines;
  const safeIndex = Math.min(lineIndex, Math.max(0, lines.length - 1));
  const line = lines[safeIndex];
  const isLast = safeIndex >= lines.length - 1;
  const speakerName = line
    ? resolveSpeakerName(line.speaker, line.speakerName)
    : null;

  useEffect(() => {
    setLineIndex(0);
  }, [scene.id]);

  if (!line || lines.length === 0) {
    return null;
  }

  const advance = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setLineIndex((i) => i + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/88 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-overlay-title"
    >
      <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
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
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded border border-stone-700/50 bg-stone-950/60 px-2.5 py-1 text-[10px] tracking-[0.14em] text-stone-400 transition hover:border-[#8a7340]/50 hover:text-[#c9a84c]"
        >
          跳過
        </button>
      </div>

      <button
        type="button"
        className="min-h-0 flex-1 cursor-pointer"
        onClick={advance}
        aria-label="繼續下一段"
      />

      <div className="shrink-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="glass-panel-gold mx-auto w-full max-w-md px-4 py-4">
          {speakerName && (
            <p className="mb-2 text-[11px] tracking-[0.2em] text-[#c9a84c]/90">
              {speakerName}
            </p>
          )}
          <p className="min-h-[4.5rem] text-[14px] leading-relaxed tracking-wide text-[#e8e0d4]">
            {line.text}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[9px] text-stone-600">
              {safeIndex + 1} / {lines.length}
            </p>
            <button
              type="button"
              onClick={advance}
              className="rounded border border-[#8a7340]/45 bg-stone-950/70 px-4 py-1.5 text-[11px] tracking-[0.2em] text-[#e8e0d4] transition hover:border-[#c9a84c]/55"
            >
              繼續
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
