import { ENEMY_ATTACK_WINDUP_MS, ENEMY_LUNGE_MS } from "@/lib/combat-feedback";
import type { PlayFxKind } from "@/lib/combat-fx";
import { playDefeatMusic, stopDefeatMusic } from "@/lib/bgm";
import { publicAsset } from "@/lib/paths";
import { isSnakeEnemy, type SnakeHissClip, type SnakeMove } from "@/lib/snake-sfx";

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/**
 * 只播放 public/sfx/ 裡你提供的樣本。
 * 沒有對應檔案時保持安靜，不再合成額外出牌音。
 */
const SAMPLE_CANDIDATES: Record<string, string[]> = {
  fuxue_slash: ["fuxue-slash", "fuxue_slash"],
  yijian_slash: ["yijian-slash", "yijian_slash"],
  tuxu_whoosh: ["tuxu-whoosh", "tuxu_whoosh"],
  // 新檔名避開舊 start-cultivation.mp3 的瀏覽器快取
  start_cultivation: ["horror-hit", "start-cultivation"],
  /** 敵人打中玩家（通用） */
  player_hit: ["horror-hit", "fuxue-slash", "fuxue_slash"],
  /** 妖狼攻擊：利爪先播，低吼在命中點 */
  wolf_growl: ["wolf-growl", "wolf_growl"],
  wolf_claw: ["wolf-claw", "wolf_claw"],
  /** 劫修橫斬：刃切 + 喝聲同時播 */
  bandit_slash: ["bandit-slash", "bandit_slash"],
  bandit_he: ["bandit-he", "bandit_he"],
  /** 青鱗靈蛇：雙噬／毒牙／亂噬共用，各自截片段 */
  snake_hiss: ["/audio/sfx/snake_hiss.wav"],
  /** 靈蛇咬擊：尚無素材，放入 public/audio/sfx/snake_bite.wav 後在此填路徑即可 */
  snake_bite: [],
  /** 護盾受擊（沿用較輕的 whoosh） */
  shield_hit: ["tuxu-whoosh", "tuxu_whoosh"],
  card_draw: ["card-draw", "card_draw"],
  reward_click: ["reward-click", "reward_click"],
  battle_win: ["battle-win", "battle_win", "level-up"],
};

const EXT = [".mp3", ".wav", ".ogg", ".m4a"] as const;

/** 換樣本時遞增，強制繞過 HTTP 快取 */
const SFX_CACHE_BUST = "v15";

/** 妖狼利爪加速；原長 ~3.02s → 約 1.68s */
export const WOLF_CLAW_PLAYBACK_RATE = 1.8;
/** 最多提前 200ms，不早於突進起手；隨實際前搖時長一起調整。 */
export const WOLF_CLAW_LEAD_MS = Math.min(200, ENEMY_ATTACK_WINDUP_MS + ENEMY_LUNGE_MS);
/** 利爪比突進起手再早 100ms（每一擊，含連爪） */
export const WOLF_CLAW_BEFORE_LUNGE_MS = 100;
/** 嘶吼比突進起手早 200ms */
export const WOLF_GROWL_EXTRA_LEAD_MS = 200;
/** 劫修喝聲比刃切早 200ms */
export const BANDIT_HE_LEAD_MS = 200;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const bufferCache = new Map<string, AudioBuffer | null>();
const pendingBuffers = new Map<string, Promise<AudioBuffer | null>>();
const activeSources = new Set<AudioBufferSourceNode>();
const delayedSounds = new Set<ReturnType<typeof setTimeout>>();
let audioGeneration = 0;

/** A scene change must silence old attacks and prevent decoded samples replaying late. */
export function cancelCombatAudio(stopPlaying = true): void {
  audioGeneration += 1;
  for (const timer of delayedSounds) clearTimeout(timer);
  delayedSounds.clear();
  if (stopPlaying) {
    for (const source of activeSources) {
      try { source.stop(); } catch { /* already ended */ }
    }
    activeSources.clear();
  }
}

function scheduleSound(callback: () => void, ms: number): void {
  const generation = audioGeneration;
  const timer = setTimeout(() => {
    delayedSounds.delete(timer);
    if (generation === audioGeneration) callback();
  }, ms);
  delayedSounds.add(timer);
}

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
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

export function unlockCombatAudio(): void {
  const audio = getCtx();
  if (audio?.state === "suspended") void audio.resume().catch(() => {});
}

function loadBuffer(logicalKey: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(logicalKey)) return Promise.resolve(bufferCache.get(logicalKey)!);
  const pending = pendingBuffers.get(logicalKey);
  if (pending) return pending;
  const request = fetchBuffer(logicalKey).finally(() => pendingBuffers.delete(logicalKey));
  pendingBuffers.set(logicalKey, request);
  return request;
}

async function fetchBuffer(logicalKey: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(logicalKey)) return bufferCache.get(logicalKey)!;
  const audio = getCtx();
  if (!audio) return null;

  const names = SAMPLE_CANDIDATES[logicalKey] ?? [logicalKey];
  for (const name of names) {
    // 以 / 開頭的是完整路徑（含副檔名），其餘在 /sfx/ 下嘗試各副檔名
    const paths = name.startsWith("/")
      ? [name]
      : EXT.map((ext) => `/sfx/${name}${ext}`);
    for (const path of paths) {
      const url = `${publicAsset(path)}?${SFX_CACHE_BUST}`;
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

function playBuffer(
  buffer: AudioBuffer,
  peak = 1,
  offsetSec = 0,
  playbackRate = 1,
  generation = audioGeneration,
  deadline = performance.now() + 80
): void {
  if (generation !== audioGeneration || performance.now() > deadline) return;
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === "suspended") {
    void audio
      .resume()
      .then(() => playBuffer(buffer, peak, offsetSec, playbackRate, generation, deadline))
      .catch(() => {});
    return;
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.max(0.25, playbackRate);
  const gain = audio.createGain();
  gain.gain.value = peak;
  src.connect(gain);
  gain.connect(master);
  const offset = Math.max(
    0,
    Math.min(offsetSec, Math.max(0, buffer.duration - 0.05))
  );
  activeSources.add(src);
  src.onended = () => { activeSources.delete(src); src.disconnect(); gain.disconnect(); };
  src.start(0, offset);
}

async function playSample(
  logicalKey: string,
  peak = 1,
  offsetSec = 0,
  playbackRate = 1
): Promise<boolean> {
  const generation = audioGeneration;
  const deadline = performance.now() + 80;
  const buffer = await loadBuffer(logicalKey);
  if (!buffer || generation !== audioGeneration || performance.now() > deadline) return false;
  playBuffer(buffer, peak, offsetSec, playbackRate, generation, deadline);
  return true;
}

function whooshKey(kind?: PlayFxKind): string | null {
  switch (kind) {
    case "jiangang":
    case "yangjian":
    case "baojian":
      return "tuxu_whoosh";
    default:
      return null;
  }
}

function impactKey(kind: PlayFxKind): string | null {
  switch (kind) {
    case "fuxue":
    case "shuangren":
    case "poshizhan":
      return "fuxue_slash";
    case "yijian":
      return "yijian_slash";
    default:
      return null;
  }
}

export function playDenySfx(): void {
  // 尚未提供專用檔時保持安靜
}

/** 命中只播已解碼樣本；冷啟動只預載，絕不在下載後補播過期攻擊。 */
function playSampleSync(
  logicalKey: string,
  peak = 1,
  offsetSec = 0,
  playbackRate = 1
): void {
  const cached = bufferCache.get(logicalKey);
  if (cached) {
    playBuffer(cached, peak, offsetSec, playbackRate);
    return;
  }
  if (bufferCache.has(logicalKey) && cached === null) return;
  void loadBuffer(logicalKey);
}

/** 出牌離手：輕「唰」，不是命中 */
export function playCardCommitWhoosh(kind?: PlayFxKind): void {
  const key = whooshKey(kind) ?? "tuxu_whoosh";
  const heavy =
    kind === "jiangang" || kind === "yangjian" || kind === "baojian";
  playSampleSync(key, heavy ? 0.85 : 0.32);
}

export function playWhoosh(kind?: PlayFxKind): void {
  playCardCommitWhoosh(kind);
}

/** 命中：重「斬／鏘」，必須在 impact 幀呼叫 */
export function playImpact(kind: PlayFxKind): void {
  const key = impactKey(kind);
  if (!key) return;
  // 一劍霜寒專用樣本偏輕，抬到 150%
  playSampleSync(key, kind === "yijian" ? 1.5 : 1);
}

/** 敵人打中玩家（HP） */
export function playPlayerHitSfx(
  enemy?: { id?: string; monsterSprite?: string } | null
): void {
  if (isWolfEnemy(enemy) || isBanditHorizontalSlash(enemy) || isSnakeEnemy(enemy)) {
    return;
  }
  playSampleSync("player_hit", 0.95);
}

/** 打在護盾上 */
export function playShieldHitSfx(
  enemy?: { id?: string; monsterSprite?: string } | null
): void {
  if (isWolfEnemy(enemy) || isBanditHorizontalSlash(enemy) || isSnakeEnemy(enemy)) {
    return;
  }
  playSampleSync("shield_hit", 0.7);
}

/** 妖狼低吼。連擊只在第一擊呼叫；volumeScale 提高音量，extendSec 放慢播放以拉長時長 */
export function playWolfGrowlSfx(
  onShield = false,
  volumeScale = 1,
  extendSec = 0
): void {
  const base = onShield ? 0.9 : 1;
  const cached = bufferCache.get("wolf_growl");
  const rate =
    extendSec > 0 && cached && cached.duration > 0.05
      ? cached.duration / (cached.duration + extendSec)
      : 1;
  playSampleSync("wolf_growl", base * volumeScale, 0, rate);
}

/** 妖狼利爪（比突進早 WOLF_CLAW_BEFORE_LUNGE_MS；音量 150%、1.8× 速） */
export function playWolfClawSfx(onShield = false): void {
  playSampleSync(
    "wolf_claw",
    onShield ? 0.85 * 1.5 : 0.95 * 1.5,
    0,
    WOLF_CLAW_PLAYBACK_RATE
  );
}

export function isWolfEnemy(
  enemy?: { id?: string; monsterSprite?: string } | null
): boolean {
  return (
    enemy?.id === "enemy_wolf" || enemy?.monsterSprite === "demon_wolf"
  );
}

/** 劫修「橫斬」喝聲，比刃切早 BANDIT_HE_LEAD_MS */
export function playBanditHeSfx(): void {
  playSampleSync("bandit_he", 1);
}

/** 劫修「橫斬」金屬刃切，與突進同時 */
export function playBanditSlashSfx(): void {
  playSampleSync("bandit_slash", 1);
}

export function isBanditHorizontalSlash(
  enemy?: {
    id?: string;
    monsterSprite?: string;
    pendingIntent?: { label?: string } | null;
  } | null,
  label?: string
): boolean {
  const isBandit =
    enemy?.id === "enemy_bandit" || enemy?.monsterSprite === "bandit";
  const move = label ?? enemy?.pendingIntent?.label;
  return isBandit && move === "橫斬";
}

const SNAKE_HISS_FADE_IN_SEC = 0.004;
const SNAKE_HISS_FADE_OUT_SEC = 0.025;
const SNAKE_HISS_CUT_SEC = 0.015;
let snakeHissVoice: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

/** 同一時間只留一段嘶聲：新的一段起播前，把上一段 15ms 內淡掉 */
function cutSnakeHiss(audio: AudioContext): void {
  const voice = snakeHissVoice;
  snakeHissVoice = null;
  if (!voice) return;
  try {
    const now = audio.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + SNAKE_HISS_CUT_SEC);
    voice.src.stop(now + SNAKE_HISS_CUT_SEC + 0.005);
  } catch {
    /* already stopped */
  }
}

/**
 * 靈蛇嘶聲：從 snake_hiss.wav 截一段，結尾淡出。
 * 素材尚未解碼時不補播（只預載），失敗一律安靜。
 */
export function playSnakeHiss(clip: SnakeHissClip): void {
  try {
    const buffer = bufferCache.get("snake_hiss");
    if (!buffer) {
      if (!bufferCache.has("snake_hiss")) void loadBuffer("snake_hiss");
      return;
    }
    const audio = getCtx();
    if (!audio || !master || audio.state !== "running") {
      if (audio?.state === "suspended") void audio.resume().catch(() => {});
      return;
    }
    cutSnakeHiss(audio);

    const rate = Math.max(0.5, clip.playbackRate);
    const offset = Math.max(0, Math.min(clip.offsetSec, buffer.duration - 0.05));
    const audible = Math.max(
      SNAKE_HISS_FADE_IN_SEC + SNAKE_HISS_FADE_OUT_SEC,
      Math.min(clip.durationSec, (buffer.duration - offset) / rate)
    );

    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = audio.createGain();
    const t0 = audio.currentTime;
    const fadeOutAt = t0 + audible - SNAKE_HISS_FADE_OUT_SEC;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(clip.peak, t0 + SNAKE_HISS_FADE_IN_SEC);
    gain.gain.setValueAtTime(clip.peak, fadeOutAt);
    gain.gain.linearRampToValueAtTime(0, t0 + audible);

    let tail: AudioNode = src;
    let filter: BiquadFilterNode | null = null;
    if (clip.highpassHz) {
      filter = audio.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = clip.highpassHz;
      filter.Q.value = 0.7;
      src.connect(filter);
      tail = filter;
    }
    tail.connect(gain);
    gain.connect(master);

    const voice = { src, gain };
    snakeHissVoice = voice;
    activeSources.add(src);
    src.onended = () => {
      activeSources.delete(src);
      if (snakeHissVoice === voice) snakeHissVoice = null;
      src.disconnect();
      filter?.disconnect();
      gain.disconnect();
    };
    src.start(t0, offset, audible * rate + 0.01);
    src.stop(t0 + audible + 0.01);
  } catch {
    /* 音效失敗不影響戰鬥 */
  }
}

/**
 * 靈蛇每一咬的命中音介面（每段只呼叫一次，於命中幀）。
 * 有 snake_bite 素材時播它；沒有時沿用原本的通用受擊聲，
 * 毒牙不帶護盾聲。
 */
export function playSnakeBiteSfx(opts: {
  move: SnakeMove;
  hitIndex: number;
  onShield: boolean;
}): void {
  try {
    const bite = bufferCache.get("snake_bite");
    if (bite) {
      playSnakeBiteVoice(bite, opts.onShield ? 0.8 : 0.95);
      return;
    }
    if (bufferCache.get("snake_bite") === undefined) void loadBuffer("snake_bite");
    if (opts.onShield && opts.move === "毒牙") return;
    const key = opts.onShield ? "shield_hit" : "player_hit";
    const fallback = bufferCache.get(key);
    if (fallback) playSnakeBiteVoice(fallback, opts.onShield ? 0.7 : 0.95);
    else if (!bufferCache.has(key)) void loadBuffer(key);
  } catch {
    /* 音效失敗不影響戰鬥 */
  }
}

let snakeBiteVoice: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

/** 連咬間隔短：下一咬起播時把上一咬的尾音淡掉，避免疊爆、每一咬都聽得清 */
function playSnakeBiteVoice(buffer: AudioBuffer, peak: number): void {
  const audio = getCtx();
  if (!audio || !master || audio.state !== "running") return;
  const prev = snakeBiteVoice;
  snakeBiteVoice = null;
  const now = audio.currentTime;
  if (prev) {
    try {
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + SNAKE_HISS_CUT_SEC);
      prev.src.stop(now + SNAKE_HISS_CUT_SEC + 0.005);
    } catch {
      /* already stopped */
    }
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = peak;
  src.connect(gain);
  gain.connect(master);
  const voice = { src, gain };
  snakeBiteVoice = voice;
  activeSources.add(src);
  src.onended = () => {
    activeSources.delete(src);
    if (snakeBiteVoice === voice) snakeBiteVoice = null;
    src.disconnect();
    gain.disconnect();
  };
  src.start(now);
}

/** 開始 / 繼續修行時的過渡音 */
export function playStartCultivationSfx(): void {
  // 若仍在播失敗曲，先停掉再開修行
  stopDefeatMusic();
  unlockCombatAudio();
  void playSample("start_cultivation", 1);
}

/** 戰鬥抽牌：多張時錯開播放，更像逐張入手 */
export function playCardDrawSfx(count = 1): void {
  unlockCombatAudio();
  const n = Math.max(1, Math.min(count, 6));
  for (let i = 0; i < n; i++) {
    scheduleSound(() => {
      playSampleSync("card_draw", 0.85);
    }, i * 70);
  }
}

/** 勝利擇劍訣時的點選音（跳過片頭 0.2s，讓可聽點更早） */
export function playRewardClickSfx(): void {
  unlockCombatAudio();
  void playSample("reward_click", 0.95, 0.2);
}

/** 每場戰鬥獲勝時播放（延遲 1s，對齊勝利演出節奏） */
export function playBattleWinSfx(): void {
  unlockCombatAudio();
  scheduleSound(() => {
    playSampleSync("battle_win", 1);
  }, 1000);
}

/**
 * 退出秘境或戰鬥失敗：單獨播放《Shattered Jade》（與 BGM 同通道，不並行）。
 * @param lockAfter 失敗結算畫面用：曲終後仍不恢復其他音樂，直到 stopDefeatMusic
 */
export function playGameOverSfx(lockAfter = false): void {
  unlockCombatAudio();
  playDefeatMusic({ lockAfter });
}

export function preloadCombatSfx(): void {
  void loadBuffer("fuxue_slash");
  void loadBuffer("yijian_slash");
  void loadBuffer("tuxu_whoosh");
  void loadBuffer("start_cultivation");
  void loadBuffer("player_hit");
  void loadBuffer("wolf_growl");
  void loadBuffer("wolf_claw");
  void loadBuffer("bandit_slash");
  void loadBuffer("bandit_he");
  void loadBuffer("snake_hiss");
  void loadBuffer("snake_bite");
  void loadBuffer("shield_hit");
  void loadBuffer("card_draw");
  void loadBuffer("reward_click");
  void loadBuffer("battle_win");
}
