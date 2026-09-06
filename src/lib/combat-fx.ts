import type { CardTemplate, CardTemplateId } from "@/lib/battle-deck";

/** 每張牌獨立特效身份 */
export type PlayFxKind = CardTemplateId;

export function getPlayFxKind(template?: CardTemplate): PlayFxKind {
  return template?.id ?? "fuxue";
}

export function isDamagePlayFx(kind: PlayFxKind): boolean {
  return (
    kind === "fuxue" ||
    kind === "yijian" ||
    kind === "qiandhen" ||
    kind === "zhongyin" ||
    kind === "suye" ||
    kind === "yinian"
  );
}

export function shouldScreenFlash(kind: PlayFxKind): boolean {
  return kind === "yijian";
}

export function playFxDurationMs(kind: PlayFxKind): number {
  switch (kind) {
    case "yijian":
      return 780;
    case "fuxue":
      return 680;
    case "cangfeng":
      return 640;
    default:
      return 560;
  }
}
