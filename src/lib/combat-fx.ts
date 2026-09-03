import type { CardTemplate } from "@/lib/battle-deck";

export type PlayFxKind =
  | "slash"
  | "ultimate"
  | "dodge"
  | "draw"
  | "energy"
  | "intent";

export function getPlayFxKind(template?: CardTemplate): PlayFxKind {
  if (!template) return "slash";
  if (template.type === "絕技終結") return "ultimate";
  const kinds = new Set(template.effects.map((fx) => fx.kind));
  if (kinds.has("damage") || kinds.has("damage_consume_intent")) return "slash";
  if (kinds.has("gain_dodge")) return "dodge";
  if (kinds.has("gain_energy")) return "energy";
  if (kinds.has("draw")) return "draw";
  return "intent";
}
