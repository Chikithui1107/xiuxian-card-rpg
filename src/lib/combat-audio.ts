import type { PlayFxKind } from "@/lib/combat-fx";
import { publicAsset } from "@/lib/paths";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/**
 * 把你的音效放到 public/sfx/ 后即可生效，例如：
 *   public/sfx/sword_whoosh.mp3
 *   public/sfx/sword_impact.mp3
 *   public/sfx/fuxue-slash.mp3   （拂雪流光專用）
 *   public/sfx/tuxu-whoosh.mp3   （踏虛掠影專用）
 *   public/sfx/yijian_whoosh.mp3 （可選）
 *
 * 支援 .mp3 / .wav / .ogg
 */
const SAMPLE_CANDIDATES: Record<string, string[]> = {
  sword_whoosh: ["sword_whoosh", "whoosh", "slash", "tuxu-whoosh"],
  sword_impact: ["sword_impact", "impact", "hit", "fuxue-slash"],
  fuxue_slash: ["fuxue-slash", "fuxue_slash", "sword_impact"],
  tuxu_whoosh: ["tuxu-whoosh", "tuxu_whoosh", "soft_whoosh"],
  yijian_whoosh: ["yijian_whoosh", "heavy_whoosh", "sword_whoosh", "tuxu-whoosh"],
  yijian_impact: ["yijian_impact", "heavy_impact", "sword_impact", "fuxue-slash"],
  soft_whoosh: ["soft_whoosh", "whoosh", "tuxu-whoosh", "sword_whoosh"],
  soft_impact: ["soft_impact", "impact", "tuxu-whoosh", "sword_impact"],
  deny: ["deny", "error", "tuxu-whoosh"],
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

function envAt(
  audio: AudioContext,
  dest: AudioNode,
  peak: number,
  attack: number,
  release: number,
  startAt = audio.currentTime
): GainNode {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + attack + release);
  gain.connect(dest);
  return gain;
}

/**
 * 仙俠卡牌落下 UI 音：
 * L1 輕木牌劃過 · L2 劍氣金屬嗡鳴 + 冰晶共鳴 · L3 低沉靈力著地
 * 快起短收，乾淨有手感
 */
export function playCardPlaceSfx(
  intensity: "soft" | "full" | "heavy" = "full"
): void {
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === "suspended") {
    void audio.resume().then(() => playCardPlaceSfx(intensity));
    return;
  }

  const now = audio.currentTime;
  const dest = master;
  const peakScale = intensity === "heavy" ? 1.15 : intensity === "soft" ? 0.78 : 1;

  // ── Layer 1: wooden card swoosh（空氣噪聲 + 帶通快速下掃）──
  {
    const dur = intensity === "heavy" ? 0.16 : 0.12;
    const length = Math.max(1, Math.floor(audio.sampleRate * dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // 輕木質感：略帶粉紅噪聲形狀
      const n = Math.random() * 2 - 1;
      data[i] = n * (1 - t * 0.55) * (0.55 + 0.45 * Math.sin(t * Math.PI));
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.8;
    band.frequency.setValueAtTime(intensity === "heavy" ? 2800 : 3200, now);
    band.frequency.exponentialRampToValueAtTime(780, now + dur * 0.85);
    const air = envAt(audio, dest, 0.1 * peakScale, 0.004, dur * 0.92, now);
    src.connect(band);
    band.connect(air);
    src.start(now);
  }

  // ── Layer 2a: metallic sword hum（刃音下掃）──
  {
    const blade = audio.createOscillator();
    blade.type = "triangle";
    blade.frequency.setValueAtTime(intensity === "heavy" ? 1680 : 1980, now);
    blade.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    const bladeGain = envAt(audio, dest, 0.055 * peakScale, 0.003, 0.1, now);
    // 輕微高通，保持清脆
    const hp = audio.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;
    blade.connect(hp);
    hp.connect(bladeGain);
    blade.start(now);
    blade.stop(now + 0.14);
  }

  // ── Layer 2b: icy crystal resonance（冰晶泛音）──
  {
    const crystal = audio.createOscillator();
    crystal.type = "sine";
    crystal.frequency.setValueAtTime(2650, now + 0.008);
    crystal.frequency.exponentialRampToValueAtTime(1480, now + 0.14);
    const cGain = envAt(audio, dest, 0.032 * peakScale, 0.006, 0.14, now + 0.008);
    crystal.connect(cGain);
    crystal.start(now + 0.008);
    crystal.stop(now + 0.18);

    const shimmer = audio.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(3970, now + 0.012);
    shimmer.frequency.exponentialRampToValueAtTime(2100, now + 0.11);
    const sGain = envAt(audio, dest, 0.018 * peakScale, 0.004, 0.1, now + 0.012);
    shimmer.connect(sGain);
    shimmer.start(now + 0.012);
    shimmer.stop(now + 0.15);
  }

  // ── Layer 3: ethereal bass thud（靈力著地）──
  {
    const thud = audio.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(intensity === "heavy" ? 95 : 110, now + 0.02);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    const tGain = envAt(audio, dest, 0.09 * peakScale, 0.005, 0.11, now + 0.02);
    thud.connect(tGain);
    thud.start(now + 0.02);
    thud.stop(now + 0.16);

    // 極短低頻噪聲墊一層「紙板落地」
    const padDur = 0.05;
    const padLen = Math.max(1, Math.floor(audio.sampleRate * padDur));
    const padBuf = audio.createBuffer(1, padLen, audio.sampleRate);
    const padData = padBuf.getChannelData(0);
    for (let i = 0; i < padLen; i++) {
      padData[i] = (Math.random() * 2 - 1) * (1 - i / padLen);
    }
    const padSrc = audio.createBufferSource();
    padSrc.buffer = padBuf;
    const lp = audio.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    const pGain = envAt(audio, dest, 0.06 * peakScale, 0.002, 0.045, now + 0.018);
    padSrc.connect(lp);
    lp.connect(pGain);
    padSrc.start(now + 0.018);
  }
}

function whooshKey(kind?: PlayFxKind): string | null {
  switch (kind) {
    case "fuxue":
      // 拂雪流光只在命中時播專用斬擊，避免與起手重疊
      return null;
    case "tuxu":
      return "tuxu_whoosh";
    case "yijian":
      return "yijian_whoosh";
    default:
      // 其餘牌用合成「卡牌落下」UI 音，不依賴外部檔
      return null;
  }
}

function impactKey(kind: PlayFxKind): string | null {
  switch (kind) {
    case "fuxue":
      return "fuxue_slash";
    case "tuxu":
      // 踏虛掠影起手已播 whoosh，命中不再疊加
      return null;
    case "yijian":
      return "yijian_impact";
    case "lingtai":
    case "ningshuang":
    case "cangfeng":
      return "soft_impact";
    default:
      return "sword_impact";
  }
}

function cardPlaceIntensity(kind?: PlayFxKind): "soft" | "full" | "heavy" {
  if (kind === "yijian") return "heavy";
  if (
    kind === "tuxu" ||
    kind === "lingtai" ||
    kind === "ningshuang" ||
    kind === "cangfeng"
  ) {
    return "soft";
  }
  return "full";
}

export function playDenySfx(): void {
  void playSample("deny", 0.8).then((ok) => {
    if (ok) return;
    const audio = getCtx();
    if (!audio || !master) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, now);
    const g = envAt(audio, master, 0.07, 0.004, 0.08, now);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.1);
  });
}

export function playWhoosh(kind?: PlayFxKind): void {
  const key = whooshKey(kind);
  if (!key) {
    // 拂雪：先落牌 UI 音，命中再播專用斬擊 MP3
    playCardPlaceSfx(kind === "fuxue" ? "soft" : cardPlaceIntensity(kind));
    return;
  }
  void playSample(key, kind === "yijian" ? 1 : 0.9).then((ok) => {
    if (!ok) playCardPlaceSfx(cardPlaceIntensity(kind));
  });
}

export function playImpact(kind: PlayFxKind): void {
  const key = impactKey(kind);
  if (!key) return;
  void playSample(key, kind === "fuxue" || kind === "yijian" ? 1 : 0.95).then(
    (ok) => {
      if (ok) return;
      // 無命中樣本時，用略重的卡牌落下收束手感
      if (kind !== "fuxue") playCardPlaceSfx(kind === "yijian" ? "heavy" : "soft");
    }
  );
}

/** 預載常用劍音，減少第一次出牌延遲 */
export function preloadCombatSfx(): void {
  void loadBuffer("fuxue_slash");
  void loadBuffer("tuxu_whoosh");
  void loadBuffer("sword_whoosh");
  void loadBuffer("sword_impact");
  void loadBuffer("yijian_whoosh");
  void loadBuffer("yijian_impact");
}
