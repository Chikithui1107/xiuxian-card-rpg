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
  /** 可用 **粗體** 標出重要數值 */
  text: string;
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

function L(...texts: string[]): CardFaceLine[] {
  return texts.map((text) => ({ text }));
}

/**
 * 因果卡面：簡短自然語言。動態只替換數字，不改技能結算。
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
      const dmg = previewQiandhenDamage(preview.karmaMarks > 0);
      return {
        coreLines: L(
          `造成 **${dmg}點傷害**。`,
          "對負面目標造成更高傷害。"
        ),
        detail: full,
      };
    }
    case "zhongyin":
      return {
        coreLines: L(
          "造成 **15點傷害**。",
          "牽引的果牌本回合打出時，再造成 **8點傷害**。"
        ),
        detail: full,
      };
    case "sheyin":
      return {
        coreLines: L("棄置 **1張因牌**，抽取 **2張果牌**。"),
        detail: full,
      };
    case "suye":
      return {
        coreLines: L(
          "造成 **25點傷害**。",
          "手中有1張果牌時，附加 **1層因果印記**；",
          "有2張時，再造成 **15點傷害**。"
        ),
        detail: full,
      };
    case "duanjue":
      return {
        coreLines: L(
          "下回合額外獲得 **3點真元**。",
          "此牌牽引出的果牌將立即打出。"
        ),
        detail: full,
      };
    case "lunzhuan": {
      const converted = Math.floor(preview.damageTakenThisTurn * 0.3);
      if (converted > 0) {
        return {
          coreLines: L(
            "獲得 **10點護盾**。",
            `將本回合受傷的 **30%**（目前 **${converted}點**）轉為下次攻擊。`
          ),
          detail: full,
        };
      }
      return {
        coreLines: L(
          "獲得 **10點護盾**。",
          "將本回合受到傷害的 **30%**，轉化為下次攻擊的額外傷害。"
        ),
        detail: full,
      };
    }
    case "kuguo": {
      const marks = previewKuguoMarks(
        preview.yinPlayedThisTurn,
        preview.yangExtraMarkThisTurn
      );
      return {
        coreLines: L(
          `附加 **${marks}層因果印記**。`,
          "本回合已打出至少2張因牌時，改為附加 **2層**。"
        ),
        detail: full,
      };
    }
    case "guosheng":
      return {
        coreLines: L("棄置 **1張果牌**，抽取 **2張因牌**。"),
        detail: full,
      };
    case "shanguo": {
      const last = preview.lastPlayedAspect;
      const yinActive = last === null || last === "yin" || last === "both";
      const yangActive = last === null || last === "yang";
      return {
        coreLines: [
          {
            text: "上一張為因牌：下回合因牌傷害 **+75%**。",
            dimmed: last !== null && !yinActive,
          },
          {
            text: "上一張為果牌：下回合果牌會附加因果印記。",
            dimmed: last !== null && !yangActive,
          },
        ],
        detail: full,
      };
    }
    case "suyin":
      return {
        coreLines: L(
          "依序重新打出上回合使用過的所有卡牌。",
          "此牌除外。"
        ),
        detail: full,
      };
    case "yinian": {
      const dmg = previewYinianDamage(preview.karmaMarks);
      return {
        coreLines: L(
          `造成 **${dmg}點傷害**。`,
          "每層印記額外 **+10**；達5層時最終傷害提高 **50%**。",
          "結算後清除印記。"
        ),
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
