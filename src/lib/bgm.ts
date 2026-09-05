import { publicAsset } from "@/lib/paths";

export type BgmScene = "lobby" | "combat";

const TRACKS: Record<BgmScene, string> = {
  lobby: publicAsset("/music/bgm.m4a"),
  combat: publicAsset("/music/combat-bgm.m4a"),
};

const BGM_VOLUME = 0.35;

const players: Partial<Record<BgmScene, HTMLAudioElement>> = {};
let unlocked = false;
let muted = false;
let scene: BgmScene = "lobby";

function getPlayer(which: BgmScene): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let el = players[which];
  if (!el) {
    el = new Audio(TRACKS[which]);
    el.loop = true;
    el.preload = "auto";
    el.volume = muted ? 0 : BGM_VOLUME;
    players[which] = el;
  }
  return el;
}

function syncPlayback(): void {
  (Object.keys(TRACKS) as BgmScene[]).forEach((which) => {
    const el = getPlayer(which);
    if (!el) return;
    el.volume = muted ? 0 : BGM_VOLUME;

    const shouldPlay = unlocked && !muted && which === scene;
    if (shouldPlay) {
      if (el.paused) {
        void el.play().catch(() => undefined);
      }
    } else if (!el.paused) {
      el.pause();
    }
  });
}

/** 進遊戲就嘗試自動播放當前場景；成功則標記已解鎖 */
export async function tryAutoPlayBgm(): Promise<boolean> {
  if (muted) return false;
  const el = getPlayer(scene);
  if (!el) return false;
  try {
    await el.play();
    unlocked = true;
    syncPlayback();
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

/** 山門 / 戰鬥切換曲目 */
export function setBgmScene(next: BgmScene): void {
  scene = next;
  // 預載另一軌，減少進戰切歌延遲
  void getPlayer(next === "lobby" ? "combat" : "lobby");
  if (unlocked && !muted) {
    syncPlayback();
  } else if (!unlocked) {
    void tryAutoPlayBgm();
  } else {
    syncPlayback();
  }
}

/** @deprecated 改用 setBgmScene；true=山門 false=戰鬥 */
export function setBgmAllowed(next: boolean): void {
  setBgmScene(next ? "lobby" : "combat");
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

export function getBgmScene(): BgmScene {
  return scene;
}

export function unlockAndStartBgm(): void {
  unlockBgm();
}
