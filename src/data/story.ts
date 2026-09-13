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
      { speaker: "narrator", text: "上一世，我叫白夜。" },
      {
        speaker: "narrator",
        text: "我生來劍骨通明，自幼修行便遠勝同輩。",
      },
      {
        speaker: "narrator",
        text: "十六歲那年，我通過天樞聖宗的入門試煉，拜入這座號稱「天下正道之首」的仙門。",
      },
      { speaker: "narrator", text: "宗門鐘鳴九響。" },
      {
        speaker: "narrator",
        text: "天樞聖宗宗主親自現身，並在數千弟子面前將我收入親傳。",
      },
      {
        speaker: "narrator",
        text: "從那以後，我是天樞聖宗第九位親傳弟子。",
      },
      {
        speaker: "narrator",
        text: "也是師兄師姐口中的——「小九」。",
      },
      { speaker: "narrator", text: "大師兄教我御劍。" },
      { speaker: "narrator", text: "二師姐替我煉丹。" },
      {
        speaker: "narrator",
        text: "三師兄嘴上嫌我修煉太慢，卻總會在我閉關時替我守著洞府。",
      },
      {
        speaker: "narrator",
        text: "那時候我以為，仙途漫長，但只要他們還在，這條路便不會太孤單。",
      },
      { speaker: "narrator", text: "後來——" },
      { speaker: "narrator", text: "大師兄死在秘境。" },
      { speaker: "narrator", text: "二師姐突破失敗。" },
      { speaker: "narrator", text: "三師兄外出失蹤。" },
      { speaker: "narrator", text: "四師姐遭魔修伏擊。" },
      { speaker: "narrator", text: "一個又一個。" },
      {
        speaker: "narrator",
        text: "曾經熱鬧的親傳峰，漸漸安靜下來。",
      },
      {
        speaker: "master",
        text: "仙途本就是逆天而行。生死無常。若不想再失去身邊之人，便讓自己變得更強。",
      },
      { speaker: "narrator", text: "於是我繼續練劍。" },
      {
        speaker: "narrator",
        text: "直到有一天，我發現大師兄隕落之地，殘留著一道異常的靈力痕跡。",
      },
      {
        speaker: "narrator",
        text: "二師姐出事的洞府外也有。三師兄最後出現的地方……同樣存在。",
      },
      {
        speaker: "narrator",
        text: "而那道氣息，來自天樞聖宗內部。",
      },
      {
        speaker: "narrator",
        text: "我開始重新調查那些所謂的「意外」。最後所有線索，都指向宗門最深處的一座禁地。",
      },
      {
        speaker: "narrator",
        text: "只有一個人能進入那裡。——宗主。我的師尊。",
      },
      {
        speaker: "narrator",
        text: "我沒有得到答案。因為魔族戰爭先一步爆發。",
      },
      {
        speaker: "narrator",
        text: "天下萬宗聯合討伐魔族。而統領正道聯軍的人，正是師尊。",
      },
      {
        speaker: "narrator",
        text: "決戰那天，聯軍大陣失效。數位掌教遭到伏擊。",
      },
      {
        speaker: "narrator",
        text: "我在漫天魔氣中，看到了一個不應該站在那裡的人。師尊。他站在魔族一方。",
      },
      {
        speaker: "narrator",
        text: "我提劍衝向他。可那是我一生最快的一劍，也是最無力的一劍。",
      },
      {
        speaker: "narrator",
        text: "師尊只抬起手，我的劍便再也無法向前。",
      },
      { speaker: "master", text: "小九。你還是發現了。" },
      {
        speaker: "narrator",
        text: "那一天，正道聯軍敗了。我也死在了那場戰爭裡。",
      },
      {
        speaker: "narrator",
        text: "臨死之前，我只剩下一個念頭。如果我能早一點發現。如果我能救下大師兄。如果我能阻止二師姐那一次突破……",
      },
      { speaker: "narrator", text: "一切……會不會不同？" },
      { speaker: "senior3", text: "白夜？白夜！" },
      {
        speaker: "senior3",
        text: "今日可是拜師大典，你怎麼還在這裡發呆？",
      },
      {
        speaker: "narrator",
        text: "我猛地睜開眼。晨霧。山門。漢白玉長階。還有一雙年輕得陌生的手。沒有舊傷。沒有劍繭。",
      },
      {
        speaker: "narrator",
        text: "我抬起頭。大師兄還活著。二師姐還活著。三師兄正站在我面前。",
      },
      {
        speaker: "narrator",
        text: "遠處，天樞大殿緩緩開啟。那道熟悉的白衣身影走了出來。",
      },
      { speaker: "master", text: "白夜。過來。" },
      { speaker: "baiye", text: "弟子白夜……拜見師尊。" },
      {
        speaker: "narrator",
        text: "沒有人看見。袖袍之下，我的手已經緩緩握緊。",
      },
      {
        speaker: "narrator",
        text: "上一世，我用了數百年才看清這一切。這一世——我還有時間。",
      },
      {
        speaker: "narrator",
        text: "救下他們。查清真相。還有弄明白……",
      },
      { speaker: "baiye", text: "師尊。你究竟在謀劃什麼。" },
    ],
  },
  {
    id: "baiye_qi_entry",
    characterId: "baiye",
    once: true,
    title: "第一境 · 引氣入道",
    subtitle: "青嵐谷",
    lines: [
      { speaker: "narrator", text: "青嵐谷。" },
      {
        speaker: "narrator",
        text: "上一世，我第一次真正踏上修行之路的地方。",
      },
      {
        speaker: "narrator",
        text: "也是這一世，第一個本不該改變的地方。",
      },
      {
        speaker: "narrator",
        text: "山風穿過林間。白夜卻忽然停下腳步。",
      },
      { speaker: "baiye", text: "……" },
      {
        speaker: "narrator",
        text: "空氣裡，漂著一絲極淡的氣息。白夜不會認錯。那是——魔氣。",
      },
      { speaker: "baiye", text: "不對。" },
      {
        speaker: "narrator",
        text: "上一世的青嵐谷，絕對沒有這種東西。",
      },
      {
        speaker: "narrator",
        text: "白夜抬頭望向雲霧深處。",
      },
      { speaker: "baiye", text: "未來……已經改變了嗎？" },
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
