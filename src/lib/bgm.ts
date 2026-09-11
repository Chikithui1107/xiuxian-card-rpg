import { publicAsset } from "@/lib/paths";

export type BgmScene = "lobby" | "combat";

const TRACKS: Record<BgmScene, string> = {
  lobby: publicAsset("/music/bgm.m4a"),
  combat: publicAsset("/music/combat-bgm.m4a"),
};

const DEFEAT_URL = publicAsset("/music/shattered-jade.m4a");
const BGM_VOLUME = 0.35;
const DEFEAT_VOLUME = 0.45;

const players: Partial<Record<BgmScene, HTMLAudioElement>> = {};
let unlocked = false;
let muted = false;
/** 播放關鍵 SFX / 失敗曲時暫停所有常規 BGM */
let sfxHold = false;
let scene: BgmScene = "lobby";

/** 放棄／失敗專屬曲（單獨播放，不與山門／戰鬥 BGM 並行） */
let defeatAudio: HTMLAudioElement | null = null;
let defeatPlaying = false;

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

    const shouldPlay =
      unlocked && !muted && !sfxHold && !defeatPlaying && which === scene;
    if (shouldPlay) {
      if (el.paused) {
        void el.play().catch(() => undefined);
      }
    } else if (!el.paused) {
      el.pause();
    }
  });

  if (defeatAudio) {
    defeatAudio.volume = muted ? 0 : DEFEAT_VOLUME;
  }
}

/** 進遊戲就嘗試自動播放當前場景；成功則標記已解鎖 */
export async function tryAutoPlayBgm(): Promise<boolean> {
  if (muted || sfxHold || defeatPlaying) return false;
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
  if (sfxHold || defeatPlaying) {
    syncPlayback();
    return;
  }
  if (unlocked && !muted) {
    syncPlayback();
  } else if (!unlocked) {
    void tryAutoPlayBgm();
  } else {
    syncPlayback();
  }
}

/**
 * 關鍵 SFX 期間暫停全部 BGM；結束後依當前場景恢復。
 * 可重疊呼叫：以最晚結束時間為準，避免第二次失敗音把第一次 hold 提前鬆開。
 */
let sfxHoldUntil = 0;
let sfxHoldTimer: number | null = null;

export function holdBgmForSfx(durationMs: number): () => void {
  const until = Date.now() + Math.max(0, durationMs);
  sfxHoldUntil = Math.max(sfxHoldUntil, until);
  sfxHold = true;
  syncPlayback();

  if (sfxHoldTimer !== null) window.clearTimeout(sfxHoldTimer);
  const delay = Math.max(0, sfxHoldUntil - Date.now());
  sfxHoldTimer = window.setTimeout(() => {
    sfxHoldTimer = null;
    sfxHoldUntil = 0;
    sfxHold = false;
    syncPlayback();
  }, delay);

  return () => {
    if (sfxHoldTimer !== null) {
      window.clearTimeout(sfxHoldTimer);
      sfxHoldTimer = null;
    }
    sfxHoldUntil = 0;
    sfxHold = false;
    syncPlayback();
  };
}

/** 停止失敗曲並恢復常規 BGM（若仍允許） */
export function stopDefeatMusic(): void {
  if (defeatAudio) {
    defeatAudio.onended = null;
    defeatAudio.onerror = null;
    defeatAudio.pause();
    defeatAudio = null;
  }
  defeatPlaying = false;
  syncPlayback();
}

/**
 * 放棄／戰鬥失敗專屬曲《Shattered Jade》：
 * 單獨播放，期間暫停山門與戰鬥 BGM，曲終後再恢復。
 */
export function playDefeatMusic(): void {
  if (typeof window === "undefined") return;
  if (defeatPlaying && defeatAudio && !defeatAudio.paused) return;

  stopDefeatMusic();
  unlocked = true;
  defeatPlaying = true;
  syncPlayback();

  const el = new Audio(DEFEAT_URL);
  el.loop = false;
  el.preload = "auto";
  el.volume = muted ? 0 : DEFEAT_VOLUME;
  defeatAudio = el;

  const finish = () => {
    if (defeatAudio !== el) return;
    el.onended = null;
    el.onerror = null;
    defeatAudio = null;
    defeatPlaying = false;
    syncPlayback();
  };

  el.onended = finish;
  el.onerror = finish;
  void el.play().catch(finish);
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
