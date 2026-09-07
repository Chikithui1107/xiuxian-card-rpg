import type { KarmaAspect, KarmaCardTemplateId } from "@/lib/karma-deck";
import { getKarmaTemplate, isKarmaTemplateId } from "@/lib/karma-deck";

/** 卡面動態預覽用（只影響顯示，不參與真實結算） */
export interface CardFacePreviewState {
  karmaMarks: number;
  yinPlayedThisTurn: number;
  damageTakenThisTurn: number;
  lunzhuanArmed: boolean;
  lastPlayedAspect: KarmaAspect | null;
  yangExtraMarkThisTurn: boolean;
}

/** 語義 token：由 CardFace 統一上色，勿在資料裡拼 HTML */
export type FaceTokenKind = "normal" | "damage" | "shield" | "keyword";

export interface FaceToken {
  text: string;
  kind?: FaceTokenKind;
  /** 核心傷害數字略放大 */
  core?: boolean;
}

export interface CardFaceLine {
  tokens: FaceToken[];
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

export function previewYinianDamage(marks: number): number {
  let dmg = 20 + marks * 10;
  if (marks >= 5) dmg = Math.floor(dmg * 1.5);
  return dmg;
}

export function previewQiandhenDamage(hasDebuff: boolean): number {
  return hasDebuff ? Math.floor(10 * 1.5) : 10;
}

export function previewKuguoMarks(
  yinPlayedThisTurn: number,
  yangExtraMarkThisTurn: boolean
): number {
  let marks = 1;
  if (yinPlayedThisTurn >= 2) marks += 1;
  if (yangExtraMarkThisTurn) marks += 1;
  return marks;
}

const t = {
  n: (text: string): FaceToken => ({ text, kind: "normal" }),
  dmg: (text: string, core = false): FaceToken => ({
    text,
    kind: "damage",
    core,
  }),
  sh: (text: string, core = false): FaceToken => ({
    text,
    kind: "shield",
    core,
  }),
  kw: (text: string): FaceToken => ({ text, kind: "keyword" }),
};

function line(...tokens: FaceToken[]): CardFaceLine {
  return { tokens };
}

/**
 * 因果卡面：自然語言 + 語義 token。
 * 每張卡強調色盡量 ≤2 種；動態只替換數字。
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
        coreLines: [
          line(t.n("造成 "), t.dmg(`${dmg}點傷害`, true), t.n("。")),
          line(t.n("對負面目標造成更高傷害。")),
        ],
        detail: full,
      };
    }
    case "zhongyin":
      return {
        coreLines: [
          line(t.n("造成 "), t.dmg("15點傷害", true), t.n("。")),
          line(
            t.kw("牽引"),
            t.n("的"),
            t.kw("果牌"),
            t.n("本回合打出時，再造成 "),
            t.dmg("8點傷害"),
            t.n("。")
          ),
        ],
        detail: full,
      };
    case "sheyin":
      return {
        coreLines: [
          line(
            t.n("棄置 "),
            t.kw("1張因牌"),
            t.n("，抽取 "),
            t.kw("2張果牌"),
            t.n("。")
          ),
        ],
        detail: full,
      };
    case "suye":
      return {
        coreLines: [
          line(t.n("造成 "), t.dmg("25點傷害", true), t.n("。")),
          line(
            t.n("手中有1張"),
            t.kw("果牌"),
            t.n("時，附加 "),
            t.kw("1層因果印記"),
            t.n("；")
          ),
          line(t.n("有2張時，再造成 "), t.dmg("15點傷害"), t.n("。")),
        ],
        detail: full,
      };
    case "duanjue":
      return {
        coreLines: [
          line(t.n("下回合額外獲得 "), t.kw("3點真元"), t.n("。")),
          line(
            t.n("此牌"),
            t.kw("牽引"),
            t.n("出的"),
            t.kw("果牌"),
            t.n("將立即打出。")
          ),
        ],
        detail: full,
      };
    case "lunzhuan": {
      const converted = Math.floor(preview.damageTakenThisTurn * 0.3);
      if (converted > 0) {
        return {
          coreLines: [
            line(t.n("獲得 "), t.sh("10點護盾", true), t.n("。")),
            line(
              t.n("將本回合受傷的 "),
              t.sh("30%"),
              t.n("（目前 "),
              t.dmg(`${converted}點`),
              t.n("）轉為下次攻擊。")
            ),
          ],
          detail: full,
        };
      }
      return {
        coreLines: [
          line(t.n("獲得 "), t.sh("10點護盾", true), t.n("。")),
          line(
            t.n("將本回合受到傷害的 "),
            t.sh("30%"),
            t.n("，轉化為下次攻擊的額外傷害。")
          ),
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
        coreLines: [
          line(t.n("附加 "), t.kw(`${marks}層因果印記`), t.n("。")),
          line(
            t.n("本回合已打出至少2張"),
            t.kw("因牌"),
            t.n("時，改為附加 "),
            t.kw("2層"),
            t.n("。")
          ),
        ],
        detail: full,
      };
    }
    case "guosheng":
      return {
        coreLines: [
          line(
            t.n("棄置 "),
            t.kw("1張果牌"),
            t.n("，抽取 "),
            t.kw("2張因牌"),
            t.n("。")
          ),
        ],
        detail: full,
      };
    case "shanguo": {
      const last = preview.lastPlayedAspect;
      const yinActive = last === null || last === "yin" || last === "both";
      const yangActive = last === null || last === "yang";
      return {
        coreLines: [
          {
            tokens: [
              t.n("上一張為"),
              t.kw("因牌"),
              t.n("：下回合"),
              t.kw("因牌"),
              t.n("傷害 "),
              t.dmg("+75%"),
              t.n("。"),
            ],
            dimmed: last !== null && !yinActive,
          },
          {
            tokens: [
              t.n("上一張為"),
              t.kw("果牌"),
              t.n("：下回合"),
              t.kw("果牌"),
              t.n("會附加"),
              t.kw("因果印記"),
              t.n("。"),
            ],
            dimmed: last !== null && !yangActive,
          },
        ],
        detail: full,
      };
    }
    case "suyin":
      return {
        coreLines: [
          line(t.n("依序重新打出上回合使用過的所有卡牌。")),
          line(t.n("此牌除外。")),
        ],
        detail: full,
      };
    case "yinian": {
      const dmg = previewYinianDamage(preview.karmaMarks);
      return {
        coreLines: [
          line(t.n("造成 "), t.dmg(`${dmg}點傷害`, true), t.n("。")),
          line(
            t.n("每層"),
            t.kw("印記"),
            t.n("額外 "),
            t.dmg("+10"),
            t.n("；達5層時最終傷害提高 "),
            t.dmg("50%"),
            t.n("。")
          ),
          line(t.n("結算後清除"), t.kw("印記"), t.n("。")),
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
