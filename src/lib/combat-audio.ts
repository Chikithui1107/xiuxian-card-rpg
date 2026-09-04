import type { PlayFxKind } from "@/lib/combat-fx";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function dest(): AudioNode {
  return master ?? getCtx()!.destination;
}

export function unlockCombatAudio(): void {
  getCtx();
}

/** 粉紅噪聲：比白噪更像風切，不像靜電 */
function noiseBuffer(audio: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    data[i] = (b0 + b1 + b2 + white * 0.18) * 0.35;
  }
  return buffer;
}

function playNoise(options: {
  audio: AudioContext;
  duration: number;
  peak: number;
  startHz: number;
  endHz: number;
  q?: number;
  attack?: number;
  filterType?: BiquadFilterType;
  delay?: number;
}): void {
  const {
    audio,
    duration,
    peak,
    startHz,
    endHz,
    q = 0.55,
    attack = 0.01,
    filterType = "bandpass",
    delay = 0,
  } = options;
  const now = audio.currentTime + delay;
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, duration + 0.04);

  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(Math.max(40, startHz), now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(40, endHz),
    now + duration
  );

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest());
  src.start(now);
  src.stop(now + duration + 0.05);
}

/** 只允許很低的「轟」感，絕不發叮叮 */
function playThud(audio: AudioContext, peak: number, heavy: boolean): void {
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(heavy ? 78 : 95, now);
  osc.frequency.exponentialRampToValueAtTime(heavy ? 38 : 52, now + 0.14);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (heavy ? 0.18 : 0.12));

  osc.connect(gain);
  gain.connect(dest());
  osc.start(now);
  osc.stop(now + 0.22);
}

/**
 * 揮劍：雙層氣流噪聲掃過。
 * 刻意不用 >150Hz 的音調振盪器，避免「叮 / 秀」。
 */
function playSwordWhoosh(audio: AudioContext, heavy = false): void {
  // 主刀風
  playNoise({
    audio,
    duration: heavy ? 0.24 : 0.17,
    peak: heavy ? 0.34 : 0.26,
    startHz: heavy ? 2800 : 3400,
    endHz: heavy ? 280 : 420,
    q: 0.45,
    attack: 0.008,
  });
  // 寬帶空氣尾
  playNoise({
    audio,
    duration: heavy ? 0.2 : 0.14,
    peak: heavy ? 0.16 : 0.11,
    startHz: 1800,
    endHz: 160,
    q: 0.35,
    attack: 0.012,
    filterType: "lowpass",
    delay: 0.02,
  });
  if (heavy) playThud(audio, 0.1, true);
}

/**
 * 命中：短促氣爆 + 低沉撞擊，不要金屬叮。
 */
function playSwordImpact(audio: AudioContext, heavy = false): void {
  playNoise({
    audio,
    duration: heavy ? 0.09 : 0.06,
    peak: heavy ? 0.32 : 0.22,
    startHz: 2200,
    endHz: 350,
    q: 0.5,
    attack: 0.002,
  });
  playNoise({
    audio,
    duration: heavy ? 0.14 : 0.09,
    peak: heavy ? 0.18 : 0.12,
    startHz: 900,
    endHz: 90,
    q: 0.4,
    attack: 0.004,
    filterType: "lowpass",
  });
  playThud(audio, heavy ? 0.14 : 0.07, heavy);
}

export function playDenySfx(): void {
  const audio = getCtx();
  if (!audio) return;
  // 悶響拒絕，不用鈴鐺
  playNoise({
    audio,
    duration: 0.1,
    peak: 0.14,
    startHz: 400,
    endHz: 80,
    q: 0.5,
    attack: 0.004,
    filterType: "lowpass",
  });
  playThud(audio, 0.06, false);
}

/** 出牌飛出／揮劍起手 */
export function playWhoosh(kind?: PlayFxKind): void {
  const audio = getCtx();
  if (!audio) return;

  switch (kind) {
    case "fuxue":
      playSwordWhoosh(audio, false);
      return;
    case "yijian":
      playSwordWhoosh(audio, true);
      return;
    case "tuxu":
      // 身法：輕快掠過，仍是風聲
      playNoise({
        audio,
        duration: 0.13,
        peak: 0.18,
        startHz: 2600,
        endHz: 700,
        q: 0.4,
      });
      return;
    case "lingtai":
      // 悟性：柔和氣流，不要鐘聲
      playNoise({
        audio,
        duration: 0.16,
        peak: 0.12,
        startHz: 1400,
        endHz: 500,
        q: 0.35,
        filterType: "lowpass",
      });
      return;
    case "cangfeng":
      playNoise({
        audio,
        duration: 0.15,
        peak: 0.16,
        startHz: 600,
        endHz: 100,
        q: 0.4,
        filterType: "lowpass",
      });
      playThud(audio, 0.05, false);
      return;
    case "ningshuang":
      playNoise({
        audio,
        duration: 0.16,
        peak: 0.14,
        startHz: 1800,
        endHz: 400,
        q: 0.4,
      });
      return;
    default:
      playSwordWhoosh(audio, false);
  }
}

/** 命中／生效 */
export function playImpact(kind: PlayFxKind): void {
  const audio = getCtx();
  if (!audio) return;

  switch (kind) {
    case "fuxue":
      playSwordImpact(audio, false);
      return;
    case "yijian":
      playSwordImpact(audio, true);
      return;
    case "tuxu":
      playNoise({
        audio,
        duration: 0.08,
        peak: 0.14,
        startHz: 2000,
        endHz: 500,
        q: 0.45,
      });
      return;
    case "lingtai":
      playNoise({
        audio,
        duration: 0.12,
        peak: 0.1,
        startHz: 1100,
        endHz: 300,
        q: 0.35,
        filterType: "lowpass",
      });
      return;
    case "cangfeng":
      playNoise({
        audio,
        duration: 0.12,
        peak: 0.18,
        startHz: 700,
        endHz: 90,
        q: 0.4,
        filterType: "lowpass",
      });
      playThud(audio, 0.08, false);
      return;
    case "ningshuang":
      playNoise({
        audio,
        duration: 0.14,
        peak: 0.12,
        startHz: 1600,
        endHz: 250,
        q: 0.4,
      });
      return;
  }
}
