export type EventEffect =
  | { kind: "heal_percent"; percent: number }
  | { kind: "spirit_stones"; amount: number }
  | { kind: "lose_hp_percent"; percent: number }
  | { kind: "nothing" };

export interface EventChoice {
  id: string;
  label: string;
  /** 選完後顯示的短結果 */
  resultText: string;
  effects: EventEffect[];
}

export interface StoryEvent {
  id: string;
  title: string;
  body: string;
  /** 若地圖節點標題包含此字串，優先匹配 */
  matchTitle?: string;
  choices: EventChoice[];
}

export const STORY_EVENTS: StoryEvent[] = [
  {
    id: "stone_tablet",
    title: "神祕石碑",
    matchTitle: "神祕石碑",
    body: "荒徑旁立着一塊斑駁石碑，表面滲出暗紅符文。你伸手靠近時，識海微微一震——隱約聽見有人低語：「血焰歸宗……」",
    choices: [
      {
        id: "touch",
        label: "伸手觸摸",
        resultText: "符文烙入識海，氣血微損，卻悟得一縷劍意。",
        effects: [
          { kind: "lose_hp_percent", percent: 0.08 },
          { kind: "spirit_stones", amount: 40 },
        ],
      },
      {
        id: "leave",
        label: "繞道而行",
        resultText: "你按下好奇心，繼續趕路，倒也平安。",
        effects: [{ kind: "nothing" }],
      },
    ],
  },
  {
    id: "senior_remains",
    title: "神祕前輩的遺骸",
    matchTitle: "神祕前輩的遺骸",
    body: "洞口枯坐一具道袍殘骸，懷中猶握半卷殘簡。風過之處，似有嘆息：「莫要……重蹈吾轍。」",
    choices: [
      {
        id: "take_scroll",
        label: "取走殘簡",
        resultText: "殘簡化作靈光散入儲物袋，你得了些許靈石。",
        effects: [{ kind: "spirit_stones", amount: 70 }],
      },
      {
        id: "bury",
        label: "收埋前輩",
        resultText: "你掘土掩埋，心神一靜，氣血稍復。",
        effects: [{ kind: "heal_percent", percent: 0.2 }],
      },
    ],
  },
  {
    id: "qi_baptism",
    title: "靈氣灌頂奇遇",
    matchTitle: "靈氣灌頂奇遇",
    body: "林間突現一縷青霞，如瀑傾落。你站在瀑下，靈氣爭相鑽入毛孔——太猛則傷身，太怯則無獲。",
    choices: [
      {
        id: "embrace",
        label: "張開雙臂承接",
        resultText: "靈氣沖刷經脈，氣血大漲，亦有餘潤化為靈石。",
        effects: [
          { kind: "heal_percent", percent: 0.25 },
          { kind: "spirit_stones", amount: 30 },
        ],
      },
      {
        id: "partial",
        label: "只取一縷",
        resultText: "你收斂心神，只留穩妥的一縷靈息。",
        effects: [{ kind: "heal_percent", percent: 0.12 }],
      },
    ],
  },
  {
    id: "wandering_trader",
    title: "路遇散修",
    body: "一名灰袍散修坐於枯木下，見你走近，拱手道：「道友可願換些盤纏？或聽我講一樁舊事。」",
    choices: [
      {
        id: "listen",
        label: "坐下聽舊事",
        resultText: "散修饋贈薄禮，你收下靈石致謝。",
        effects: [{ kind: "spirit_stones", amount: 50 }],
      },
      {
        id: "meditate",
        label: "借地打坐片刻",
        resultText: "青石清涼，你調息片刻，氣血回升。",
        effects: [{ kind: "heal_percent", percent: 0.15 }],
      },
    ],
  },
];
