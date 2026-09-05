import { publicAsset } from "@/lib/paths";

const BGM_URL = publicAsset("/music/bgm.m4a");
const BGM_VOLUME = 0.35;

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let muted = false;
/** 非戰鬥階段才允許播放 */
let allowed = true;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = muted ? 0 : BGM_VOLUME;
  }
  return audio;
}

function syncPlayback(): void {
  const el = getAudio();
  if (!el) return;
  el.volume = muted ? 0 : BGM_VOLUME;

  if (!unlocked || muted || !allowed) {
    if (!el.paused) el.pause();
    return;
  }

  if (el.paused) {
    void el.play().catch(() => undefined);
  }
}

/** 首次點擊後解鎖（繞過瀏覽器自動播放限制） */
export function unlockBgm(): void {
  unlocked = true;
  syncPlayback();
}

export function setBgmAllowed(next: boolean): void {
  allowed = next;
  syncPlayback();
}

export function setBgmMuted(next: boolean): void {
  muted = next;
  syncPlayback();
}

export function toggleBgmMuted(): boolean {
  setBgmMuted(!muted);
  return muted;
}

export function isBgmMuted(): boolean {
  return muted;
}

/** @deprecated 用 unlockBgm + setBgmAllowed */
export function startBgm(): void {
  unlockBgm();
}

export function unlockAndStartBgm(): void {
  unlockBgm();
}
