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
    master.gain.value = 0.55;
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

function noiseBuffer(audio: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  // Slightly brown-ish noise: smoother air, less harsh static
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

function playNoiseSweep(options: {
  audio: AudioContext;
  duration: number;
  peak: number;
  startHz: number;
  endHz: number;
  q?: number;
  attack?: number;
  filterType?: BiquadFilterType;
}): void {
  const {
    audio,
    duration,
    peak,
    startHz,
    endHz,
    q = 0.85,
    attack = 0.008,
    filterType = "bandpass",
  } = options;
  const now = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, duration);

  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(startHz, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(60, endHz),
    now + duration
  );

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest());
  src.start(now);
  src.stop(now + duration + 0.02);
}

function playTone(options: {
  audio: AudioContext;
  freq: number;
  type?: OscillatorType;
  peak: number;
  attack?: number;
  release: number;
  slideTo?: number;
  delay?: number;
}): void {
  const {
    audio,
    freq,
    type = "sine",
    peak,
    attack = 0.004,
    release,
    slideTo,
    delay = 0,
  } = options;
  const now = audio.currentTime + delay;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      now + attack + release
    );
  }

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

  osc.connect(gain);
  gain.connect(dest());
  osc.start(now);
  osc.stop(now + attack + release + 0.03);
}

/** 揮劍破空：氣切聲，不要電子「秀～」 */
function playSwordWhoosh(audio: AudioContext, heavy = false): void {
  playNoiseSweep({
    audio,
    duration: heavy ? 0.22 : 0.16,
    peak: heavy ? 0.22 : 0.16,
    startHz: heavy ? 4200 : 5200,
    endHz: heavy ? 480 : 780,
    q: 0.7,
    attack: 0.006,
  });
  // 低頻刀身帶過
  playTone({
    audio,
    freq: heavy ? 220 : 280,
    type: "sine",
    peak: heavy ? 0.05 : 0.032,
    attack: 0.01,
    release: heavy ? 0.16 : 0.11,
    slideTo: heavy ? 70 : 110,
  });
}

/** 劍刃命中：短促金屬閃，不要長鳴 */
function playSwordImpact(audio: AudioContext, heavy = false): void {
  playNoiseSweep({
    audio,
    duration: heavy ? 0.1 : 0.07,
    peak: heavy ? 0.2 : 0.14,
    startHz: 6500,
    endHz: 1400,
    q: 1.1,
    attack: 0.002,
    filterType: "bandpass",
  });
  // 金屬微閃（極短）
  playTone({
    audio,
    freq: heavy ? 2100 : 2600,
    type: "triangle",
    peak: heavy ? 0.045 : 0.03,
    attack: 0.001,
    release: heavy ? 0.07 : 0.045,
    slideTo: heavy ? 900 : 1200,
  });
  if (heavy) {
    playTone({
      audio,
      freq: 85,
      type: "sine",
      peak: 0.12,
      attack: 0.008,
      release: 0.2,
      slideTo: 45,
    });
    playNoiseSweep({
      audio,
      duration: 0.18,
      peak: 0.1,
      startHz: 900,
      endHz: 120,
      q: 0.55,
      attack: 0.01,
    });
  }
}

function playSoftChime(audio: AudioContext, a: number, b: number): void {
  playTone({
    audio,
    freq: a,
    type: "sine",
    peak: 0.045,
    attack: 0.012,
    release: 0.18,
  });
  playTone({
    audio,
    freq: b,
    type: "triangle",
    peak: 0.028,
    attack: 0.02,
    release: 0.22,
    delay: 0.04,
  });
}

export function playDenySfx(): void {
  const audio = getCtx();
  if (!audio) return;
  playTone({
    audio,
    freq: 196,
    type: "triangle",
    peak: 0.06,
    attack: 0.004,
    release: 0.09,
  });
  playTone({
    audio,
    freq: 147,
    type: "sine",
    peak: 0.05,
    attack: 0.004,
    release: 0.12,
    delay: 0.08,
  });
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
      playNoiseSweep({
        audio,
        duration: 0.12,
        peak: 0.1,
        startHz: 3800,
        endHz: 1100,
        q: 0.6,
      });
      return;
    case "lingtai":
      playSoftChime(audio, 660, 990);
      return;
    case "cangfeng":
      playNoiseSweep({
        audio,
        duration: 0.14,
        peak: 0.1,
        startHz: 700,
        endHz: 180,
        q: 0.5,
      });
      playTone({
        audio,
        freq: 140,
        type: "sine",
        peak: 0.05,
        attack: 0.02,
        release: 0.16,
        slideTo: 320,
      });
      return;
    case "ningshuang":
      playSoftChime(audio, 523, 784);
      playNoiseSweep({
        audio,
        duration: 0.14,
        peak: 0.06,
        startHz: 2400,
        endHz: 900,
        q: 0.8,
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
      playNoiseSweep({
        audio,
        duration: 0.1,
        peak: 0.09,
        startHz: 4200,
        endHz: 1600,
        q: 0.7,
      });
      playTone({
        audio,
        freq: 1180,
        type: "sine",
        peak: 0.03,
        attack: 0.006,
        release: 0.1,
        slideTo: 720,
      });
      return;
    case "lingtai":
      playSoftChime(audio, 784, 1175);
      return;
    case "cangfeng":
      playNoiseSweep({
        audio,
        duration: 0.12,
        peak: 0.12,
        startHz: 900,
        endHz: 200,
        q: 0.55,
      });
      playTone({
        audio,
        freq: 180,
        type: "sine",
        peak: 0.07,
        attack: 0.008,
        release: 0.14,
        slideTo: 420,
      });
      return;
    case "ningshuang":
      playSoftChime(audio, 392, 587);
      playNoiseSweep({
        audio,
        duration: 0.15,
        peak: 0.07,
        startHz: 2000,
        endHz: 600,
        q: 0.7,
      });
      return;
  }
}
