import type { PlayFxKind } from "@/lib/combat-fx";
import { publicAsset } from "@/lib/paths";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/**
 * 只播放 public/sfx/ 裡你提供的樣本。
 * 沒有對應檔案時保持安靜，不再合成額外出牌音。
 */
const SAMPLE_CANDIDATES: Record<string, string[]> = {
  fuxue_slash: ["fuxue-slash", "fuxue_slash"],
  tuxu_whoosh: ["tuxu-whoosh", "tuxu_whoosh"],
  // 新檔名避開舊 start-cultivation.mp3 的瀏覽器快取
  start_cultivation: ["horror-hit", "start-cultivation"],
  card_draw: ["card-draw", "card_draw"],
  reward_click: ["reward-click", "reward_click"],
};

const EXT = [".mp3", ".wav", ".ogg", ".m4a"] as const;

/** 換樣本時遞增，強制繞過 HTTP 快取 */
const SFX_CACHE_BUST = "v5";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const bufferCache = new Map<string, AudioBuffer | null>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockCombatAudio(): void {
  const audio = getCtx();
  if (audio?.state === "suspended") void audio.resume();
}

async function loadBuffer(logicalKey: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(logicalKey)) return bufferCache.get(logicalKey)!;
  const audio = getCtx();
  if (!audio) return null;

  const names = SAMPLE_CANDIDATES[logicalKey] ?? [logicalKey];
  for (const name of names) {
    for (const ext of EXT) {
      const url = `${publicAsset(`/sfx/${name}${ext}`)}?${SFX_CACHE_BUST}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const raw = await res.arrayBuffer();
        if (raw.byteLength < 256) continue;
        const buffer = await audio.decodeAudioData(raw.slice(0));
        bufferCache.set(logicalKey, buffer);
        return buffer;
      } catch {
        /* try next */
      }
    }
  }

  bufferCache.set(logicalKey, null);
  return null;
}

function playBuffer(buffer: AudioBuffer, peak = 1, offsetSec = 0): void {
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === "suspended") {
    void audio.resume().then(() => playBuffer(buffer, peak, offsetSec));
    return;
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = peak;
  src.connect(gain);
  gain.connect(master);
  const offset = Math.max(0, Math.min(offsetSec, Math.max(0, buffer.duration - 0.05)));
  src.start(0, offset);
}

async function playSample(
  logicalKey: string,
  peak = 1,
  offsetSec = 0
): Promise<boolean> {
  const buffer = await loadBuffer(logicalKey);
  if (!buffer) return false;
  playBuffer(buffer, peak, offsetSec);
  return true;
}

function whooshKey(kind?: PlayFxKind): string | null {
  switch (kind) {
    case "tuxu":
      return "tuxu_whoosh";
    default:
      return null;
  }
}

function impactKey(kind: PlayFxKind): string | null {
  switch (kind) {
    case "fuxue":
      return "fuxue_slash";
    default:
      return null;
  }
}

export function playDenySfx(): void {
  // 尚未提供專用檔時保持安靜
}

export function playWhoosh(kind?: PlayFxKind): void {
  const key = whooshKey(kind);
  if (!key) return;
  void playSample(key, 0.9);
}

export function playImpact(kind: PlayFxKind): void {
  const key = impactKey(kind);
  if (!key) return;
  void playSample(key, 1);
}

/** 開始 / 繼續修行時的過渡音 */
export function playStartCultivationSfx(): void {
  // 換樣本後清掉舊 buffer，避免同 session 仍播舊音
  bufferCache.delete("start_cultivation");
  unlockCombatAudio();
  void playSample("start_cultivation", 1);
}

/** 戰鬥抽牌：多張時錯開播放，更像逐張入手 */
export function playCardDrawSfx(count = 1): void {
  unlockCombatAudio();
  const n = Math.max(1, Math.min(count, 6));
  for (let i = 0; i < n; i++) {
    window.setTimeout(() => {
      void playSample("card_draw", 0.85);
    }, i * 70);
  }
}

/** 勝利擇劍訣時的點選音（跳過片頭 0.2s，讓可聽點更早） */
export function playRewardClickSfx(): void {
  unlockCombatAudio();
  void playSample("reward_click", 0.95, 0.2);
}

export function preloadCombatSfx(): void {
  void loadBuffer("fuxue_slash");
  void loadBuffer("tuxu_whoosh");
  void loadBuffer("start_cultivation");
  void loadBuffer("card_draw");
  void loadBuffer("reward_click");
}
