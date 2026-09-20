import type { PlayFxKind } from "@/lib/combat-fx";
import { playDefeatMusic, stopDefeatMusic } from "@/lib/bgm";
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
  yijian_slash: ["yijian-slash", "yijian_slash"],
  tuxu_whoosh: ["tuxu-whoosh", "tuxu_whoosh"],
  // 新檔名避開舊 start-cultivation.mp3 的瀏覽器快取
  start_cultivation: ["horror-hit", "start-cultivation"],
  /** 敵人打中玩家（通用） */
  player_hit: ["horror-hit", "fuxue-slash", "fuxue_slash"],
  /** 妖狼攻擊：低吼 + 利爪同時播 */
  wolf_growl: ["wolf-growl", "wolf_growl"],
  wolf_claw: ["wolf-claw", "wolf_claw"],
  /** 護盾受擊（沿用較輕的 whoosh） */
  shield_hit: ["tuxu-whoosh", "tuxu_whoosh"],
  card_draw: ["card-draw", "card_draw"],
  reward_click: ["reward-click", "reward_click"],
  battle_win: ["battle-win", "battle_win", "level-up"],
};

const EXT = [".mp3", ".wav", ".ogg", ".m4a"] as const;

/** 換樣本時遞增，強制繞過 HTTP 快取 */
const SFX_CACHE_BUST = "v12";

/** 妖狼利爪加速；原長 ~3.02s → 約 1.68s */
export const WOLF_CLAW_PLAYBACK_RATE = 1.8;
/** 低吼原長 */
const WOLF_GROWL_DURATION_SEC = 1.92;
const WOLF_CLAW_DURATION_SEC = 3.024;
/** 疊加後有效音效時長（對齊突進動畫） */
export const WOLF_ATTACK_SFX_MS = Math.round(
  Math.max(WOLF_GROWL_DURATION_SEC, WOLF_CLAW_DURATION_SEC / WOLF_CLAW_PLAYBACK_RATE) *
    1000
);
/** 突進開始後多久結算命中（約動作前段） */
export const WOLF_ATTACK_IMPACT_AT_MS = 360;
/** 命中後繼續前傾至音效結束 */
export const WOLF_ATTACK_HOLD_AFTER_IMPACT_MS = Math.max(
  0,
  WOLF_ATTACK_SFX_MS - WOLF_ATTACK_IMPACT_AT_MS
);

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

function playBuffer(
  buffer: AudioBuffer,
  peak = 1,
  offsetSec = 0,
  playbackRate = 1
): void {
  const audio = getCtx();
  if (!audio || !master) return;
  if (audio.state === "suspended") {
    void audio
      .resume()
      .then(() => playBuffer(buffer, peak, offsetSec, playbackRate));
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
  src.start(0, offset);
}

async function playSample(
  logicalKey: string,
  peak = 1,
  offsetSec = 0,
  playbackRate = 1
): Promise<boolean> {
  const buffer = await loadBuffer(logicalKey);
  if (!buffer) return false;
  playBuffer(buffer, peak, offsetSec, playbackRate);
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

/** 同步播放已預載 buffer；未命中快取時再 async 載入（避免命中幀被 await 拖慢） */
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
  void playSample(logicalKey, peak, offsetSec, playbackRate);
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
  if (isWolfEnemy(enemy)) {
    // 妖狼在突進開始時已播，命中幀不再重播
    return;
  }
  playSampleSync("player_hit", 0.95);
}

/** 打在護盾上 */
export function playShieldHitSfx(
  enemy?: { id?: string; monsterSprite?: string } | null
): void {
  if (isWolfEnemy(enemy)) {
    return;
  }
  playSampleSync("shield_hit", 0.7);
}

/** 妖狼攻擊：低吼 + 加速利爪，與突進動畫同步起播 */
export function playWolfAttackSfx(onShield = false): void {
  playSampleSync("wolf_growl", onShield ? 0.9 : 1);
  playSampleSync(
    "wolf_claw",
    onShield ? 0.85 : 0.95,
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

/** 開始 / 繼續修行時的過渡音 */
export function playStartCultivationSfx(): void {
  // 若仍在播失敗曲，先停掉再開修行
  stopDefeatMusic();
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

/** 每場戰鬥獲勝時播放（延遲 1s，對齊勝利演出節奏） */
export function playBattleWinSfx(): void {
  unlockCombatAudio();
  window.setTimeout(() => {
    void playSample("battle_win", 1);
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
  void loadBuffer("shield_hit");
  void loadBuffer("card_draw");
  void loadBuffer("reward_click");
  void loadBuffer("battle_win");
}
