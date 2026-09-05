import { publicAsset } from "@/lib/paths";

const BGM_URL = publicAsset("/music/bgm.m4a");
const BGM_VOLUME = 0.35;

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let muted = false;
/** 是否允許播放（非戰鬥階段為 true） */
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

  const shouldPlay = unlocked && allowed && !muted;
  if (shouldPlay) {
    if (el.paused) {
      void el.play().catch(() => undefined);
    }
  } else if (!el.paused) {
    el.pause();
  }
}

/** 進遊戲就嘗試自動播放；成功則標記已解鎖 */
export async function tryAutoPlayBgm(): Promise<boolean> {
  if (muted || !allowed) return false;
  const el = getAudio();
  if (!el) return false;
  try {
    await el.play();
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

/** 首次互動解鎖音訊（瀏覽器自動播放限制） */
export function unlockBgm(): void {
  unlocked = true;
  syncPlayback();
}

/** 非戰鬥：允許 BGM；進入戰鬥：暫停 */
export function setBgmAllowed(next: boolean): void {
  allowed = next;
  if (next && unlocked && !muted) {
    syncPlayback();
  } else if (!next) {
    syncPlayback();
  } else if (next && !unlocked) {
    // 剛進非戰鬥、尚未解鎖：再試一次自動播放
    void tryAutoPlayBgm();
  }
}

export function setBgmMuted(next: boolean): void {
  muted = next;
  if (!next) unlocked = true;
  syncPlayback();
}

export function toggleBgmMuted(): boolean {
  setBgmMuted(!muted);
  return muted;
}

export function isBgmMuted(): boolean {
  return muted;
}

export function isBgmUnlocked(): boolean {
  return unlocked;
}

export function unlockAndStartBgm(): void {
  unlockBgm();
}
