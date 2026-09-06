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

export interface PlayableCharacter extends Hero {
  lobbyBackground: string;
  startingDeck: CardTemplateId[];
  skillLabels: string[];
  combatPath: CombatPathId;
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
    combatPath: "sword",
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
    lobbyBackground: "/images/moyi/moyi-bg.png",
    startingDeck: [...MOYI_STARTING_DECK],
    skillLabels: ["因果相生", "因牌", "果牌"],
    combatPath: "karma",
    lobbyTheme: "ink",
    lobbyArt: {
      backgroundPosition: "center 42%",
      backgroundFilter: "none",
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
