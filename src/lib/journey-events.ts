/** Local QA journal only: no network requests, player identifiers or third-party analytics. */
export const JOURNEY_EVENTS_KEY = "xiuxian_journey_events_v1";
export const JOURNEY_HINTS_KEY = "xiuxian_journey_hints_v1";
export type JourneyEventName =
  | "tutorial_opened" | "tutorial_started" | "tutorial_step" | "tutorial_exit"
  | "tutorial_completed" | "tutorial_skipped" | "tutorial_retry"
  | "run_started" | "battle_started" | "battle_won" | "run_ended"
  | "reward_selected" | "reward_skipped" | "run_restarted" | "returned_to_lobby"
  | "hint_shown" | "hints_disabled";
type EventData = Record<string, string | number | boolean | null>;
export interface JourneyEvent { name: JourneyEventName; at: number; data: EventData }

export function readJourneyEvents(): JourneyEvent[] {
  try {
    const value = JSON.parse(localStorage.getItem(JOURNEY_EVENTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(e => e && typeof e.name === "string" && typeof e.at === "number" && e.data && typeof e.data === "object").slice(-200) : [];
  } catch { return []; }
}

export function recordJourneyEvent(name: JourneyEventName, data: EventData = {}): void {
  try {
    const events = [...readJourneyEvents(), { name, at: Date.now(), data }].slice(-200);
    localStorage.setItem(JOURNEY_EVENTS_KEY, JSON.stringify(events));
  } catch { /* Storage is optional; gameplay never depends on this journal. */ }
}

export type JourneyHintId = "path" | "reward" | "retry";
function readHints(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(JOURNEY_HINTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(v => typeof v === "string") : [];
  } catch { return []; }
}
export function shouldShowHint(id: JourneyHintId): boolean {
  const seen = readHints();
  return !seen.includes("disabled") && !seen.includes(id);
}
export function rememberHint(id: JourneyHintId | "disabled"): void {
  try { localStorage.setItem(JOURNEY_HINTS_KEY, JSON.stringify([...new Set([...readHints(), id])])); }
  catch { /* Optional guidance also works without storage. */ }
}
