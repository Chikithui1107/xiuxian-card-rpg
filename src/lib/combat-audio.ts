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
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + attack + release);
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

export function playWhoosh(): void {
  const audio = getCtx();
  if (!audio) return;
  noiseBurst(audio, audio.destination, 0.18, 0.11, 900);
  tone(audio, audio.destination, 520, "triangle", 0.07, 0.01, 0.14, 180);
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

function playSlashImpact(heavy: boolean): void {
  const audio = getCtx();
  if (!audio) return;
  noiseBurst(audio, audio.destination, heavy ? 0.2 : 0.12, heavy ? 0.16 : 0.11, 700);
  tone(
    audio,
    audio.destination,
    heavy ? 720 : 980,
    "sawtooth",
    heavy ? 0.12 : 0.09,
    0.004,
    heavy ? 0.18 : 0.1,
    heavy ? 90 : 160
  );
  tone(audio, audio.destination, heavy ? 1480 : 2100, "sine", 0.05, 0.002, 0.07);
  if (heavy) {
    tone(audio, audio.destination, 72, "sine", 0.14, 0.01, 0.24);
    tone(audio, audio.destination, 523, "triangle", 0.07, 0.01, 0.3);
    tone(audio, audio.destination, 784, "sine", 0.045, 0.02, 0.34);
  }
}

export function playImpact(kind: PlayFxKind): void {
  const audio = getCtx();
  if (!audio) return;

  switch (kind) {
    case "slash":
      playSlashImpact(false);
      return;
    case "ultimate":
      playSlashImpact(true);
      return;
    case "dodge":
      noiseBurst(audio, audio.destination, 0.15, 0.09, 1600);
      tone(audio, audio.destination, 1320, "sine", 0.07, 0.008, 0.16, 880);
      return;
    case "draw":
      tone(audio, audio.destination, 659, "triangle", 0.07, 0.01, 0.14);
      window.setTimeout(() => {
        const later = getCtx();
        if (!later) return;
        tone(later, later.destination, 880, "triangle", 0.06, 0.01, 0.16);
      }, 70);
      return;
    case "energy":
      tone(audio, audio.destination, 523, "sine", 0.08, 0.012, 0.2);
      tone(audio, audio.destination, 784, "triangle", 0.055, 0.02, 0.24);
      return;
    case "intent":
      tone(audio, audio.destination, 220, "sawtooth", 0.07, 0.02, 0.18, 520);
      tone(audio, audio.destination, 440, "sine", 0.055, 0.03, 0.22);
      return;
  }
}
