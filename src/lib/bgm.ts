import { publicAsset } from "@/lib/paths";

const BGM_URL = publicAsset("/music/bgm.m4a");
const BGM_VOLUME = 0.35;

let audio: HTMLAudioElement | null = null;
let started = false;
let muted = false;

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

/** 首次點擊後開始循環播放（繞過瀏覽器自動播放限制） */
export function startBgm(): void {
  const el = getAudio();
  if (!el || started) return;
  started = true;
  el.volume = muted ? 0 : BGM_VOLUME;
  void el.play().catch(() => {
    // 若仍被阻擋，下次互動再試
    started = false;
  });
}

export function setBgmMuted(next: boolean): void {
  muted = next;
  const el = getAudio();
  if (!el) return;
  el.volume = muted ? 0 : BGM_VOLUME;
  if (!muted && started && el.paused) {
    void el.play().catch(() => undefined);
  }
}

export function toggleBgmMuted(): boolean {
  setBgmMuted(!muted);
  return muted;
}

export function isBgmMuted(): boolean {
  return muted;
}

export function unlockAndStartBgm(): void {
  startBgm();
}
