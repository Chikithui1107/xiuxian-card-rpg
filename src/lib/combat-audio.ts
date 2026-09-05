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
  start_cultivation: ["start-cultivation", "start_cultivation"],
};

const EXT = [".mp3", ".wav", ".ogg", ".m4a"] as const;

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
      const url = publicAsset(`/sfx/${name}${ext}`);
      try {
        const res = await fetch(url);
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

function playBuffer(buffer: AudioBuffer, peak = 1): void {
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === "suspended") {
    void audio.resume().then(() => playBuffer(buffer, peak));
    return;
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = peak;
  src.connect(gain);
  gain.connect(master);
  src.start();
}

async function playSample(logicalKey: string, peak = 1): Promise<boolean> {
  const buffer = await loadBuffer(logicalKey);
  if (!buffer) return false;
  playBuffer(buffer, peak);
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
  unlockCombatAudio();
  void playSample("start_cultivation", 0.95);
}

export function preloadCombatSfx(): void {
  void loadBuffer("fuxue_slash");
  void loadBuffer("tuxu_whoosh");
  void loadBuffer("start_cultivation");
}
