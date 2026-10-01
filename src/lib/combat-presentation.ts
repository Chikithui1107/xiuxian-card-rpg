import { playImpact, playPlayerHitSfx, playShieldHitSfx } from "@/lib/combat-audio";
import type { CombatImpactFeedback, PlayerImpactFeedback } from "@/lib/combat-feedback";
import type { PlayFxKind } from "@/lib/combat-fx";

/** Tutorial and live battles present the same resolved hit at the same animation cue. */
export function presentCardImpact(fx: PlayFxKind, feedback: CombatImpactFeedback): CombatImpactFeedback {
  playImpact(fx);
  return feedback;
}

export function presentPlayerImpact(
  feedback: PlayerImpactFeedback,
  enemy: { id?: string; monsterSprite?: string }
): PlayerImpactFeedback {
  if (feedback.kind === "hp") playPlayerHitSfx(enemy);
  else if (feedback.kind === "shield" || feedback.kind === "shieldBreak") playShieldHitSfx(enemy);
  return feedback;
}
