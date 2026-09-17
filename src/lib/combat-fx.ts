import {
  CARD_TEMPLATES,
  type CardTemplate,
  type CardTemplateId,
} from "@/lib/battle-deck";

/** 每張牌獨立特效身份 */
export type PlayFxKind = CardTemplateId;

export function getPlayFxKind(template?: CardTemplate): PlayFxKind {
  return template?.id ?? "fuxue";
}

function templateHasDamage(template?: CardTemplate): boolean {
  if (!template) return false;
  return template.effects.some(
    (fx) =>
      fx.kind === "damage" ||
      fx.kind === "multi_damage" ||
      fx.kind === "damage_yijian"
  );
}

export function isDamagePlayFx(kind: PlayFxKind): boolean {
  return templateHasDamage(CARD_TEMPLATES[kind]);
}

export function shouldScreenFlash(kind: PlayFxKind): boolean {
  return kind === "yijian";
}

export function playFxDurationMs(kind: PlayFxKind): number {
  switch (kind) {
    case "yijian":
      return 780;
    case "fuxue":
    case "shuangren":
    case "poshizhan":
      return 680;
    case "cangfeng":
    case "shuangjian":
    case "jianxin":
      return 640;
    default:
      return 560;
  }
}
