/**
 * 主線劇情（與隨機奇遇 Event 分離）
 */

export type StorySpeaker =
  | "narrator"
  | "baiye"
  | "master"
  | "senior1"
  | "senior2"
  | "senior3"
  | "moyi";

export interface StoryLine {
  speaker?: StorySpeaker;
  /** 覆寫顯示名；未設則用預設 speaker 名 */
  speakerName?: string;
  text: string;
}

export interface StoryScene {
  id: string;
  /** 僅該角色觸發；省略則通用 */
  characterId?: string;
  title?: string;
  subtitle?: string;
  /** true：看完或跳過後永久不再自動播放 */
  once?: boolean;
  lines: StoryLine[];
}

export const STORY_SPEAKER_NAMES: Record<StorySpeaker, string | null> = {
  narrator: null,
  baiye: "白夜",
  master: "師尊",
  senior1: "大師兄",
  senior2: "二師姐",
  senior3: "三師兄",
  moyi: "墨弈",
};

export const STORY_SCENES: StoryScene[] = [
  {
    id: "baiye_prologue_rebirth",
    characterId: "baiye",
    once: true,
    title: "序章 · 重來一世",
    lines: [
      {
        speaker: "narrator",
        text: "上一世，我叫白夜。\n\n十六歲那年，\n我拜入天下正道之首——天樞聖宗。\n\n宗主親自收我為第九位親傳。",
      },
      {
        speaker: "narrator",
        text: "師兄師姐都叫我——\n\n「小九。」\n\n大師兄教我御劍，\n二師姐替我煉丹。",
      },
      {
        speaker: "narrator",
        text: "三師兄嘴上嫌我修煉太慢，\n卻總會替我守著洞府。\n\n那時我以為，\n\n只要他們還在，\n仙途再長，也不會孤單。",
      },
      {
        speaker: "narrator",
        text: "可後來……\n\n大師兄死在秘境。\n\n二師姐突破失敗。\n\n三師兄失蹤。",
      },
      {
        speaker: "narrator",
        text: "四師姐遭魔修伏擊。\n\n一個又一個。\n\n曾經熱鬧的親傳峰，\n漸漸安靜了下來。",
      },
      {
        speaker: "narrator",
        text: "直到很多年後，\n\n我才發現那些所謂的「意外」，\n竟留下了相同的靈力痕跡。\n\n而那道氣息……\n\n來自天樞聖宗內部。",
      },
      {
        speaker: "narrator",
        text: "我一路追查。\n\n最後所有線索，\n都指向宗門最深處的一座禁地。\n\n只有一個人能進入那裡。\n\n——宗主。",
      },
      {
        speaker: "narrator",
        text: "可我還沒來得及查清真相，\n\n魔族便大舉入侵。\n\n天下萬宗組成聯軍。\n\n而統領聯軍的人——\n\n正是我的師尊。",
      },
      {
        speaker: "narrator",
        text: "決戰那天，\n\n我卻在魔族大軍之中看見了他。\n\n我提劍衝了過去。\n\n那是我一生最快的一劍。",
      },
      {
        speaker: "narrator",
        text: "也是最無力的一劍。\n\n他只抬起手，\n\n我的劍便再也無法向前。\n\n師尊看著我。\n\n「小九。」\n\n「你還是發現了。」",
      },
      {
        speaker: "narrator",
        text: "那一天，\n\n聯軍敗了。\n\n我也死了。\n\n臨死之前，\n我只剩下一個念頭。\n\n如果我能早一點發現……\n\n一切，會不會不同？",
      },
      {
        speaker: "senior3",
        text: "「白夜？」\n\n「今日可是拜師大典，\n你還在發什麼呆？」",
      },
      {
        speaker: "narrator",
        text: "我猛地睜開眼。\n\n山門。\n晨霧。\n熟悉的長階。\n\n還有——\n\n本該早已死去的師兄師姐。",
      },
      {
        speaker: "narrator",
        text: "遠處，\n\n師尊正站在天樞大殿前，\n看著我微笑。\n\n「弟子白夜。」\n\n「拜見師尊。」\n\n上一世，我明白得太晚。\n\n這一世——\n\n我不會再讓一切重演。",
      },
    ],
  },
  {
    id: "baiye_qi_entry",
    characterId: "baiye",
    once: true,
    title: "第一境 · 引氣入道",
    subtitle: "青嵐谷",
    lines: [
      {
        speaker: "narrator",
        text: "青嵐谷。\n\n上一世，\n\n我第一次真正踏上修行之路的地方。\n\n一切看起來，\n都和記憶中一樣。",
      },
      {
        speaker: "narrator",
        text: "山風吹過林間。\n\n白夜忽然停下腳步。\n\n空氣中，\n\n漂著一絲極淡的氣息。\n\n魔氣。",
      },
      {
        speaker: "narrator",
        text: "「不對。」\n\n上一世的青嵐谷，\n\n絕對沒有這種東西。\n\n白夜望向雲霧深處。\n\n未來……\n\n已經改變了。",
      },
    ],
  },
];

const STORY_BY_ID = Object.fromEntries(
  STORY_SCENES.map((s) => [s.id, s])
) as Record<string, StoryScene>;

export function getStoryScene(id: string): StoryScene | undefined {
  return STORY_BY_ID[id];
}

/**
 * 白夜開始修行時應播放的劇情（依已讀過濾）。
 * 序章未看 → 序章 + 入場；僅入場未看 → 入場；都看過 → 空。
 */
export function getBaiyeStartStoryScenes(
  seenIds: ReadonlySet<string> | string[]
): StoryScene[] {
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds);
  const queue: StoryScene[] = [];
  const prologue = getStoryScene("baiye_prologue_rebirth");
  const entry = getStoryScene("baiye_qi_entry");
  if (prologue && !(prologue.once && seen.has(prologue.id))) {
    queue.push(prologue);
  }
  if (entry && !(entry.once && seen.has(entry.id))) {
    queue.push(entry);
  }
  return queue;
}

/** 依角色取得開局劇情隊列（以後可擴墨弈等） */
export function getStartStoryScenesForCharacter(
  characterId: string,
  seenIds: ReadonlySet<string> | string[]
): StoryScene[] {
  if (characterId === "baiye") {
    return getBaiyeStartStoryScenes(seenIds);
  }
  return [];
}
