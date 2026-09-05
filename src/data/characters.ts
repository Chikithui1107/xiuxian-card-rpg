import type { CardTemplateId } from "@/lib/battle-deck";
import type { Hero } from "@/lib/stats";

/** 山門立繪構圖微調（可選） */
export interface LobbyArtTuning {
  /** CSS object-position for background */
  backgroundPosition?: string;
  /** CSS filter on background; empty string = none */
  backgroundFilter?: string;
  /** character bottom offset, e.g. "4%" */
  characterBottom?: string;
  /** character height, e.g. "78%" */
  characterHeight?: string;
}

export interface PlayableCharacter extends Hero {
  /** 山門全螢幕背景 */
  lobbyBackground: string;
  /** 開局卡組（暫與白夜相同，不改戰鬥平衡） */
  startingDeck: CardTemplateId[];
  /** 角色技能顯示名（資料預留；暫不改戰鬥） */
  skillLabels: string[];
  /** 山門氛圍：jade=白夜冷青；ink=陰陽水墨 */
  lobbyTheme: "jade" | "ink";
  lobbyArt?: LobbyArtTuning;
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
    lobbyTheme: "jade",
  },
  {
    id: "moyi",
    name: "墨弈",
    title: "因果修",
    realm: "築基初期",
    baseAttack: 120,
    critRate: 0.15,
    critMultiplier: 2.0,
    maxHp: 60,
    spiritStones: 1280,
    avatar: "/images/moyi/moyi-character.png",
    portrait: "/images/moyi/moyi-character.png",
    lobbyPortrait: "/images/moyi/moyi-character.png",
    lobbyBackground: "/images/moyi/moyi-bg.jpg",
    startingDeck: [...BAIYE_DECK],
    skillLabels: ["陰陽鎖", "因果子", "一子定局"],
    lobbyTheme: "ink",
    lobbyArt: {
      /* 圓形道場偏下，保留山寺與天際陰陽 */
      backgroundPosition: "center 42%",
      backgroundFilter: "brightness(0.92) contrast(1.02)",
      characterBottom: "3%",
      characterHeight: "80%",
    },
  },
];

export const DEFAULT_CHARACTER_ID = PLAYABLE_CHARACTERS[0].id;

export function listPlayableCharacters(): PlayableCharacter[] {
  return PLAYABLE_CHARACTERS;
}

export function getCharacter(id: string): PlayableCharacter {
  return (
    PLAYABLE_CHARACTERS.find((c) => c.id === id) ?? PLAYABLE_CHARACTERS[0]
  );
}
