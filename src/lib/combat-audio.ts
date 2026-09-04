import type { PlayFxKind } from "@/lib/combat-fx";
import { publicAsset } from "@/lib/paths";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/**
 * 把你的音效放到 public/sfx/ 后即可生效，例如：
 *   public/sfx/sword_whoosh.mp3
 *   public/sfx/sword_impact.mp3
 *   public/sfx/yijian_whoosh.mp3  （可選，沒有則回退到 sword_whoosh）
 *
 * 支援 .mp3 / .wav / .ogg
 */
const SAMPLE_CANDIDATES: Record<string, string[]> = {
  sword_whoosh: ["sword_whoosh", "whoosh", "slash"],
  sword_impact: ["sword_impact", "impact", "hit"],
  yijian_whoosh: ["yijian_whoosh", "heavy_whoosh", "sword_whoosh"],
  yijian_impact: ["yijian_impact", "heavy_impact", "sword_impact"],
  soft_whoosh: ["soft_whoosh", "whoosh", "sword_whoosh"],
  soft_impact: ["soft_impact", "impact", "sword_impact"],
  deny: ["deny", "error", "sword_impact"],
};

const EXT = [".mp3", ".wav", ".ogg"] as const;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const bufferCache = new Map<string, AudioBuffer | null>();
const resolveCache = new Map<string, string | null>();

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
        // skip tiny/non-audio responses (e.g. HTML 404 pages mis-served)
        if (raw.byteLength < 256) continue;
        const buffer = await audio.decodeAudioData(raw.slice(0));
        bufferCache.set(logicalKey, buffer);
        resolveCache.set(logicalKey, url);
        return buffer;
      } catch {
        /* try next candidate */
      }
    }
  }

  bufferCache.set(logicalKey, null);
  resolveCache.set(logicalKey, null);
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

function whooshKey(kind?: PlayFxKind): string {
  switch (kind) {
    case "yijian":
      return "yijian_whoosh";
    case "tuxu":
    case "lingtai":
    case "ningshuang":
    case "cangfeng":
      return "soft_whoosh";
    default:
      return "sword_whoosh";
  }
}

function impactKey(kind: PlayFxKind): string {
  switch (kind) {
    case "yijian":
      return "yijian_impact";
    case "tuxu":
    case "lingtai":
    case "ningshuang":
    case "cangfeng":
      return "soft_impact";
    default:
      return "sword_impact";
  }
}

export function playDenySfx(): void {
  void playSample("deny", 0.8);
}

export function playWhoosh(kind?: PlayFxKind): void {
  void playSample(whooshKey(kind), kind === "yijian" ? 1 : 0.9);
}

export function playImpact(kind: PlayFxKind): void {
  void playSample(impactKey(kind), kind === "yijian" ? 1 : 0.95);
}

/** 預載常用劍音，減少第一次出牌延遲 */
export function preloadCombatSfx(): void {
  void loadBuffer("sword_whoosh");
  void loadBuffer("sword_impact");
  void loadBuffer("yijian_whoosh");
  void loadBuffer("yijian_impact");
}
