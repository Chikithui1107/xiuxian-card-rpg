import type { KarmaAspect, KarmaCardTemplateId } from "@/lib/karma-deck";
import { getKarmaTemplate, isKarmaTemplateId } from "@/lib/karma-deck";

/** 卡面動態預覽用（只影響顯示，不參與真實結算） */
export interface CardFacePreviewState {
  karmaMarks: number;
  /** 本回合已打出的因牌數（含雙屬） */
  yinPlayedThisTurn: number;
  damageTakenThisTurn: number;
  lunzhuanArmed: boolean;
  /** 上一張已打出的面向；無則 null */
  lastPlayedAspect: KarmaAspect | null;
  yangExtraMarkThisTurn: boolean;
}

export interface CardFaceLine {
  text: string;
  /** 核心數字行 */
  emphasis?: boolean;
  /** 善果自報：未觸發的條件降低透明度 */
  dimmed?: boolean;
}

export interface CardFaceDisplay {
  coreLines: CardFaceLine[];
  detail: string;
}

const EMPTY_PREVIEW: CardFacePreviewState = {
  karmaMarks: 0,
  yinPlayedThisTurn: 0,
  damageTakenThisTurn: 0,
  lunzhuanArmed: false,
  lastPlayedAspect: null,
  yangExtraMarkThisTurn: false,
};

/** 與 karma-combat 一念因果公式一致 */
export function previewYinianDamage(marks: number): number {
  let dmg = 20 + marks * 10;
  if (marks >= 5) dmg = Math.floor(dmg * 1.5);
  return dmg;
}

/** 與 karma-combat 前塵種因一致：有印記視為負面 → ×1.5 */
export function previewQiandhenDamage(hasDebuff: boolean): number {
  return hasDebuff ? Math.floor(10 * 1.5) : 10;
}

/** 與 karma-combat 苦果自嘗一致 */
export function previewKuguoMarks(
  yinPlayedThisTurn: number,
  yangExtraMarkThisTurn: boolean
): number {
  let marks = 1;
  if (yinPlayedThisTurn >= 2) marks += 1;
  if (yangExtraMarkThisTurn) marks += 1;
  return marks;
}

function lines(...texts: string[]): CardFaceLine[] {
  return texts.map((text, i) => ({ text, emphasis: i === 0 }));
}

/**
 * 因果卡短文案＋動態預覽。
 * 種因得果追加顯示 8（與已實作結算一致，非文案草稿的 15）。
 */
export function getKarmaCardFaceDisplay(
  templateId: string,
  preview: CardFacePreviewState = EMPTY_PREVIEW
): CardFaceDisplay | null {
  if (!isKarmaTemplateId(templateId)) return null;
  const full = getKarmaTemplate(templateId)?.description ?? "";
  const id = templateId as KarmaCardTemplateId;

  switch (id) {
    case "qiandhen": {
      const hasDebuff = preview.karmaMarks > 0;
      const dmg = previewQiandhenDamage(hasDebuff);
      return {
        coreLines: [
          { text: `${dmg} 傷害`, emphasis: true },
          ...(hasDebuff
            ? []
            : [{ text: "負面目標 → 15 傷害" }]),
        ],
        detail: full,
      };
    }
    case "zhongyin":
      return {
        coreLines: [
          { text: "15 傷害", emphasis: true },
          { text: "牽引果打出 → 再造成 8" },
        ],
        detail: full,
      };
    case "sheyin":
      return {
        coreLines: [{ text: "棄 1 因 → 抽 2 果", emphasis: true }],
        detail: full,
      };
    case "suye":
      return {
        coreLines: [
          { text: "25 傷害", emphasis: true },
          { text: "≥1 果 → +1 印記" },
          { text: "≥2 果 → 再造成 15" },
        ],
        detail: full,
      };
    case "duanjue":
      return {
        coreLines: [
          { text: "下回合 +3 真元", emphasis: true },
          { text: "牽引果 → 立即打出" },
        ],
        detail: full,
      };
    case "lunzhuan": {
      const converted = Math.floor(preview.damageTakenThisTurn * 0.3);
      if (converted > 0) {
        return {
          coreLines: [
            { text: "10 護盾", emphasis: true },
            { text: `下次攻擊 +${converted}`, emphasis: true },
          ],
          detail: full,
        };
      }
      return {
        coreLines: [
          { text: "10 護盾", emphasis: true },
          { text: "本回合受傷 ×30% → 下次攻擊" },
        ],
        detail: full,
      };
    }
    case "kuguo": {
      const marks = previewKuguoMarks(
        preview.yinPlayedThisTurn,
        preview.yangExtraMarkThisTurn
      );
      return {
        coreLines: [{ text: `${marks} 印記`, emphasis: true }],
        detail: full,
      };
    }
    case "guosheng":
      return {
        coreLines: [{ text: "棄 1 果 → 抽 2 因", emphasis: true }],
        detail: full,
      };
    case "shanguo": {
      const last = preview.lastPlayedAspect;
      const yinActive = last === null || last === "yin" || last === "both";
      const yangActive = last === null || last === "yang";
      return {
        coreLines: [
          {
            text: "上張因 → 強化下回合因牌",
            emphasis: last === "yin" || last === "both",
            dimmed: last !== null && !yinActive,
          },
          {
            text: "上張果 → 下回合果牌附加印記",
            emphasis: last === "yang",
            dimmed: last !== null && !yangActive,
          },
        ],
        detail: full,
      };
    }
    case "suyin":
      return {
        coreLines: [
          { text: "重演上回合卡牌", emphasis: true },
          { text: "此牌除外" },
        ],
        detail: full,
      };
    case "yinian": {
      const marks = preview.karmaMarks;
      const dmg = previewYinianDamage(marks);
      return {
        coreLines: [
          { text: `${dmg} 傷害`, emphasis: true },
          { text: marks > 0 ? `消耗 ${marks} 印記` : "無印記" },
        ],
        detail: full,
      };
    }
    default:
      return null;
  }
}

export function buildCardFacePreviewFromKarma(state: {
  karmaMarks: number;
  cardsPlayedThisTurn: { aspect: KarmaAspect }[];
  damageTakenThisTurn: number;
  lunzhuanArmed: boolean;
  yangExtraMarkThisTurn: boolean;
}): CardFacePreviewState {
  const yinPlayedThisTurn = state.cardsPlayedThisTurn.filter(
    (p) => p.aspect === "yin" || p.aspect === "both"
  ).length;
  const last = state.cardsPlayedThisTurn[state.cardsPlayedThisTurn.length - 1];
  return {
    karmaMarks: state.karmaMarks,
    yinPlayedThisTurn,
    damageTakenThisTurn: state.damageTakenThisTurn,
    lunzhuanArmed: state.lunzhuanArmed,
    lastPlayedAspect: last?.aspect ?? null,
    yangExtraMarkThisTurn: state.yangExtraMarkThisTurn,
  };
}
