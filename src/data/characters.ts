import type { CardTemplateId } from "@/lib/battle-deck";
import type { Hero } from "@/lib/stats";
import { MOYI_STARTING_DECK } from "@/lib/karma-deck";

/** 山門立繪構圖微調（可選） */
export interface LobbyArtTuning {
  backgroundPosition?: string;
  backgroundFilter?: string;
  characterBottom?: string;
  characterHeight?: string;
  characterMaxWidth?: string;
}

export type CombatPathId = "sword" | "karma";

/**
 * 可遊玩角色（資料層）。
 * 山門／秘境／戰鬥皆透過 activeCharacterId → getCharacter 取用。
 */
export interface PlayableCharacter extends Hero {
  /** 角色簡介（選角預覽） */
  description: string;
  lobbyBackground: string;
  startingDeck: CardTemplateId[];
  skillLabels: string[];
  combatPath: CombatPathId;
  lobbyTheme: "jade" | "ink";
  lobbyArt?: LobbyArtTuning;
  /** 被動識別（顯示／路由用，不改數值邏輯） */
  passiveId: string;
  /** 戰鬥機制識別：sword / karma 等 */
  mechanicId: CombatPathId;
  /** 是否可選用；未解鎖僅預覽 */
  unlocked: boolean;
}

const BAIYE_DECK: CardTemplateId[] = [
  "fuxue",
  "fuxue",
  "tuxu",
  "lingtai",
];

export const PLAYABLE_CHARACTERS: PlayableCharacter[] = [
  {
    id: "baiye",
    name: "白夜",
    title: "劍修",
    realm: "築基中期",
    description:
      "以劍意為核，擅長閃避、蓄勢與爆發。戰鬥採用劍修牌組與劍意機制。",
    baseAttack: 120,
    critRate: 0.15,
    critMultiplier: 2.0,
    maxHp: 60,
    spiritStones: 1280,
    avatar: "/heroes/baiye-avatar.png",
    portrait: "/heroes/baiye.png",
    lobbyPortrait: "/images/baiye/baiye-character.png",
    lobbyBackground: "/images/baiye/baiye-bg.png",
    startingDeck: [...BAIYE_DECK],
    skillLabels: ["拂雪流光", "踏虛掠影", "靈台觀劍"],
    combatPath: "sword",
    passiveId: "sword_intent",
    mechanicId: "sword",
    unlocked: true,
    lobbyTheme: "jade",
  },
  {
    id: "moyi",
    name: "墨弈",
    title: "因果修",
    realm: "築基初期",
    description:
      "以因生果、以果報因。戰鬥採用因／果牌組，含因果相生、印記與牽引。",
    baseAttack: 120,
    critRate: 0.15,
    critMultiplier: 2.0,
    maxHp: 60,
    spiritStones: 1280,
    avatar: "/images/moyi/moyi-character.png",
    portrait: "/images/moyi/moyi-character.png",
    lobbyPortrait: "/images/moyi/moyi-character.png",
    lobbyBackground: "/images/moyi/moyi-bg.png",
    startingDeck: [...MOYI_STARTING_DECK],
    skillLabels: ["因果相生", "因牌", "果牌", "因果印記"],
    combatPath: "karma",
    passiveId: "karma_cycle",
    mechanicId: "karma",
    unlocked: true,
    lobbyTheme: "ink",
    lobbyArt: {
      backgroundPosition: "center 42%",
      backgroundFilter: "none",
      characterBottom: "3%",
      characterHeight: "80%",
    },
  },
];

export const DEFAULT_CHARACTER_ID = "baiye";

export function listPlayableCharacters(): PlayableCharacter[] {
  return PLAYABLE_CHARACTERS;
}

export function getCharacter(id: string): PlayableCharacter {
  return (
    PLAYABLE_CHARACTERS.find((c) => c.id === id) ?? PLAYABLE_CHARACTERS[0]
  );
}

export function isPlayableCharacterId(id: string): boolean {
  return PLAYABLE_CHARACTERS.some((c) => c.id === id);
}
