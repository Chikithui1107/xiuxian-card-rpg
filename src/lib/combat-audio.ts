import type { PlayFxKind } from "@/lib/combat-fx";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockCombatAudio(): void {
  getCtx();
}

function envGain(
  audio: AudioContext,
  dest: AudioNode,
  peak: number,
  attack: number,
  release: number
): GainNode {
  const gain = audio.createGain();
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
  gain.connect(dest);
  return gain;
}

function tone(
  audio: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  peak: number,
  attack: number,
  release: number,
  slideTo?: number
): void {
  const osc = audio.createOscillator();
  osc.type = type;
  const now = audio.currentTime;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      now + attack + release
    );
  }
  osc.connect(envGain(audio, dest, peak, attack, release));
  osc.start(now);
  osc.stop(now + attack + release + 0.02);
}

function noiseBurst(
  audio: AudioContext,
  dest: AudioNode,
  duration: number,
  peak: number,
  highpass: number
): void {
  const length = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  src.connect(filter);
  filter.connect(envGain(audio, dest, peak, 0.004, duration * 0.9));
  src.start();
}

export function playDenySfx(): void {
  const audio = getCtx();
  if (!audio) return;
  tone(audio, audio.destination, 180, "square", 0.08, 0.005, 0.08);
  window.setTimeout(() => {
    const later = getCtx();
    if (!later) return;
    tone(later, later.destination, 140, "square", 0.07, 0.005, 0.1);
  }, 90);
}

/** 出牌飛出：依牌型不同起手音 */
export function playWhoosh(kind?: PlayFxKind): void {
  const audio = getCtx();
  if (!audio) return;

  switch (kind) {
    case "fuxue":
      noiseBurst(audio, audio.destination, 0.2, 0.1, 1200);
      tone(audio, audio.destination, 880, "triangle", 0.06, 0.008, 0.16, 240);
      tone(audio, audio.destination, 1480, "sine", 0.03, 0.01, 0.18);
      return;
    case "tuxu":
      noiseBurst(audio, audio.destination, 0.14, 0.07, 2200);
      tone(audio, audio.destination, 1260, "sine", 0.05, 0.01, 0.14, 720);
      return;
    case "lingtai":
      tone(audio, audio.destination, 740, "triangle", 0.05, 0.015, 0.16);
      tone(audio, audio.destination, 988, "sine", 0.035, 0.02, 0.2);
      return;
    case "cangfeng":
      tone(audio, audio.destination, 180, "sawtooth", 0.05, 0.02, 0.16, 420);
      noiseBurst(audio, audio.destination, 0.1, 0.06, 800);
      return;
    case "ningshuang":
      tone(audio, audio.destination, 560, "sine", 0.05, 0.02, 0.22);
      tone(audio, audio.destination, 840, "triangle", 0.035, 0.03, 0.24);
      return;
    case "yijian":
      noiseBurst(audio, audio.destination, 0.22, 0.12, 700);
      tone(audio, audio.destination, 420, "sawtooth", 0.08, 0.01, 0.2, 90);
      tone(audio, audio.destination, 980, "triangle", 0.05, 0.015, 0.22);
      return;
    default:
      noiseBurst(audio, audio.destination, 0.16, 0.09, 900);
      tone(audio, audio.destination, 520, "triangle", 0.06, 0.01, 0.14, 180);
  }
}

export function playImpact(kind: PlayFxKind): void {
  const audio = getCtx();
  if (!audio) return;

  switch (kind) {
    case "fuxue":
      // 劍氣揮斬：清脆刃音 + 氣流
      noiseBurst(audio, audio.destination, 0.14, 0.12, 900);
      tone(audio, audio.destination, 1180, "sawtooth", 0.09, 0.003, 0.1, 180);
      tone(audio, audio.destination, 2100, "sine", 0.045, 0.002, 0.08);
      tone(audio, audio.destination, 660, "triangle", 0.04, 0.01, 0.16);
      return;
    case "tuxu":
      noiseBurst(audio, audio.destination, 0.12, 0.07, 2400);
      tone(audio, audio.destination, 1480, "sine", 0.06, 0.008, 0.14, 920);
      tone(audio, audio.destination, 990, "triangle", 0.035, 0.02, 0.18);
      return;
    case "lingtai":
      tone(audio, audio.destination, 659, "triangle", 0.07, 0.01, 0.14);
      window.setTimeout(() => {
        const later = getCtx();
        if (!later) return;
        tone(later, later.destination, 880, "triangle", 0.06, 0.01, 0.15);
        tone(later, later.destination, 1175, "sine", 0.03, 0.015, 0.18);
      }, 70);
      return;
    case "cangfeng":
      noiseBurst(audio, audio.destination, 0.12, 0.1, 600);
      tone(audio, audio.destination, 160, "sawtooth", 0.08, 0.008, 0.14, 520);
      tone(audio, audio.destination, 980, "square", 0.04, 0.004, 0.08);
      tone(audio, audio.destination, 1310, "sine", 0.035, 0.01, 0.16);
      return;
    case "ningshuang":
      tone(audio, audio.destination, 392, "sine", 0.07, 0.02, 0.24);
      tone(audio, audio.destination, 587, "triangle", 0.05, 0.025, 0.28);
      tone(audio, audio.destination, 880, "sine", 0.03, 0.04, 0.3);
      noiseBurst(audio, audio.destination, 0.16, 0.05, 1800);
      return;
    case "yijian":
      noiseBurst(audio, audio.destination, 0.24, 0.16, 500);
      tone(audio, audio.destination, 680, "sawtooth", 0.13, 0.004, 0.2, 70);
      tone(audio, audio.destination, 1480, "sine", 0.06, 0.002, 0.1);
      tone(audio, audio.destination, 72, "sine", 0.14, 0.012, 0.28);
      tone(audio, audio.destination, 523, "triangle", 0.07, 0.015, 0.32);
      tone(audio, audio.destination, 784, "sine", 0.04, 0.03, 0.36);
      return;
  }
}
