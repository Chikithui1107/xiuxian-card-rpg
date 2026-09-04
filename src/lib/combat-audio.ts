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
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function out(): AudioNode {
  if (!master) getCtx();
  return master ?? ctx!.destination;
}

export function unlockCombatAudio(): void {
  const audio = getCtx();
  if (audio?.state === "suspended") void audio.resume();
}

function withAudio(play: (audio: AudioContext) => void): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume().then(() => {
      if (ctx && ctx.state === "running") play(ctx);
    });
    return;
  }
  play(audio);
}

function whiteNoise(audio: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playNoiseLayer(options: {
  audio: AudioContext;
  duration: number;
  peak: number;
  startHz: number;
  endHz: number;
  q?: number;
  attack?: number;
  type?: BiquadFilterType;
  delay?: number;
}): void {
  const {
    audio,
    duration,
    peak,
    startHz,
    endHz,
    q = 0.7,
    attack = 0.01,
    type = "bandpass",
    delay = 0,
  } = options;

  const t0 = audio.currentTime + delay;
  const src = audio.createBufferSource();
  src.buffer = whiteNoise(audio, duration + 0.05);

  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(Math.max(80, startHz), t0);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(80, endHz),
    t0 + duration
  );

  const gain = audio.createGain();
  // linear ramps are more reliable / louder than exponential near silence
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.linearRampToValueAtTime(0, t0 + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out());
  src.start(t0);
  src.stop(t0 + duration + 0.06);
}

function playBodyThump(audio: AudioContext, heavy: boolean): void {
  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(heavy ? 70 : 90, t0);
  osc.frequency.exponentialRampToValueAtTime(heavy ? 35 : 48, t0 + 0.12);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(heavy ? 0.35 : 0.18, t0 + 0.01);
  gain.gain.linearRampToValueAtTime(0, t0 + (heavy ? 0.16 : 0.1));

  osc.connect(gain);
  gain.connect(out());
  osc.start(t0);
  osc.stop(t0 + 0.2);
}

/** 揮劍破空：可聽清的氣流聲，無叮叮 */
function playSwordWhoosh(audio: AudioContext, heavy = false): void {
  playNoiseLayer({
    audio,
    duration: heavy ? 0.26 : 0.18,
    peak: heavy ? 0.85 : 0.7,
    startHz: heavy ? 3200 : 4000,
    endHz: heavy ? 350 : 550,
    q: 0.8,
    attack: 0.012,
  });
  playNoiseLayer({
    audio,
    duration: heavy ? 0.22 : 0.15,
    peak: heavy ? 0.45 : 0.35,
    startHz: 2000,
    endHz: 200,
    q: 0.5,
    attack: 0.02,
    type: "lowpass",
    delay: 0.015,
  });
  if (heavy) playBodyThump(audio, true);
}

/** 命中：短促氣爆 + 低沉撞擊 */
function playSwordImpact(audio: AudioContext, heavy = false): void {
  playNoiseLayer({
    audio,
    duration: heavy ? 0.1 : 0.07,
    peak: heavy ? 0.9 : 0.75,
    startHz: 2500,
    endHz: 400,
    q: 0.9,
    attack: 0.004,
  });
  playNoiseLayer({
    audio,
    duration: heavy ? 0.14 : 0.09,
    peak: heavy ? 0.5 : 0.35,
    startHz: 800,
    endHz: 120,
    q: 0.5,
    attack: 0.006,
    type: "lowpass",
  });
  playBodyThump(audio, heavy);
}

export function playDenySfx(): void {
  withAudio((audio) => {
    playNoiseLayer({
      audio,
      duration: 0.1,
      peak: 0.45,
      startHz: 500,
      endHz: 120,
      q: 0.6,
      attack: 0.005,
      type: "lowpass",
    });
    playBodyThump(audio, false);
  });
}

export function playWhoosh(kind?: PlayFxKind): void {
  withAudio((audio) => {
    switch (kind) {
      case "fuxue":
        playSwordWhoosh(audio, false);
        return;
      case "yijian":
        playSwordWhoosh(audio, true);
        return;
      case "tuxu":
        playNoiseLayer({
          audio,
          duration: 0.14,
          peak: 0.55,
          startHz: 3000,
          endHz: 700,
          q: 0.7,
        });
        return;
      case "lingtai":
        playNoiseLayer({
          audio,
          duration: 0.16,
          peak: 0.4,
          startHz: 1600,
          endHz: 450,
          q: 0.5,
          type: "lowpass",
        });
        return;
      case "cangfeng":
        playNoiseLayer({
          audio,
          duration: 0.15,
          peak: 0.5,
          startHz: 700,
          endHz: 120,
          q: 0.5,
          type: "lowpass",
        });
        playBodyThump(audio, false);
        return;
      case "ningshuang":
        playNoiseLayer({
          audio,
          duration: 0.16,
          peak: 0.45,
          startHz: 2000,
          endHz: 400,
          q: 0.6,
        });
        return;
      default:
        playSwordWhoosh(audio, false);
    }
  });
}

export function playImpact(kind: PlayFxKind): void {
  withAudio((audio) => {
    switch (kind) {
      case "fuxue":
        playSwordImpact(audio, false);
        return;
      case "yijian":
        playSwordImpact(audio, true);
        return;
      case "tuxu":
        playNoiseLayer({
          audio,
          duration: 0.08,
          peak: 0.5,
          startHz: 2200,
          endHz: 500,
          q: 0.7,
        });
        return;
      case "lingtai":
        playNoiseLayer({
          audio,
          duration: 0.12,
          peak: 0.35,
          startHz: 1200,
          endHz: 300,
          q: 0.5,
          type: "lowpass",
        });
        return;
      case "cangfeng":
        playNoiseLayer({
          audio,
          duration: 0.12,
          peak: 0.55,
          startHz: 700,
          endHz: 100,
          q: 0.5,
          type: "lowpass",
        });
        playBodyThump(audio, false);
        return;
      case "ningshuang":
        playNoiseLayer({
          audio,
          duration: 0.12,
          peak: 0.4,
          startHz: 1800,
          endHz: 280,
          q: 0.6,
        });
        return;
    }
  });
}
