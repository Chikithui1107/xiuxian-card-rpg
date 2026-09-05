import { STORY_EVENTS, type EventChoice, type EventEffect, type StoryEvent } from "@/data/events";

export type { EventChoice, EventEffect, StoryEvent };

export function pickStoryEvent(nodeTitle: string): StoryEvent {
  const matched = STORY_EVENTS.find(
    (event) => event.matchTitle && nodeTitle.includes(event.matchTitle)
  );
  if (matched) return matched;

  const pool = STORY_EVENTS.filter((event) => !event.matchTitle);
  if (pool.length === 0) return STORY_EVENTS[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface EventResolveContext {
  maxHp: number;
  currentHp: number;
}

export interface EventResolveResult {
  nextHp: number;
  spiritDelta: number;
  summary: string;
}

export function applyEventChoice(
  choice: EventChoice,
  ctx: EventResolveContext
): EventResolveResult {
  let nextHp = ctx.currentHp;
  let spiritDelta = 0;
  const bits: string[] = [];

  for (const effect of choice.effects) {
    switch (effect.kind) {
      case "heal_percent": {
        const heal = Math.max(1, Math.floor(ctx.maxHp * effect.percent));
        const before = nextHp;
        nextHp = Math.min(ctx.maxHp, nextHp + heal);
        const gained = nextHp - before;
        if (gained > 0) bits.push(`氣血 +${gained}`);
        break;
      }
      case "lose_hp_percent": {
        const loss = Math.max(1, Math.floor(ctx.maxHp * effect.percent));
        const before = nextHp;
        nextHp = Math.max(1, nextHp - loss);
        const lost = before - nextHp;
        if (lost > 0) bits.push(`氣血 -${lost}`);
        break;
      }
      case "spirit_stones": {
        spiritDelta += effect.amount;
        bits.push(`靈石 +${effect.amount}`);
        break;
      }
      case "nothing":
        break;
    }
  }

  const summary =
    bits.length > 0
      ? `${choice.resultText}（${bits.join("，")}）`
      : choice.resultText;

  return { nextHp, spiritDelta, summary };
}
