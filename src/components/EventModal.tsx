"use client";

import type { EventChoice, StoryEvent } from "@/data/events";

interface EventModalProps {
  event: StoryEvent;
  onChoose: (choice: EventChoice) => void;
}

export function EventModal({ event, onChoose }: EventModalProps) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="glass-panel-gold w-full max-w-md p-4 sm:p-5">
        <p className="zone-label text-[#8a7340]">祕境奇遇</p>
        <h2 className="mt-1 text-lg font-bold tracking-[0.2em] text-[#c9a84c]">
          {event.title}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-stone-300">
          {event.body}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {event.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice)}
              className="rounded-lg border border-[#8a7340]/40 bg-stone-950/70 px-3 py-3 text-left transition hover:border-[#c9a84c]/55 hover:bg-stone-900/80 active:scale-[0.99]"
            >
              <span className="text-sm font-semibold tracking-wide text-[#e8e0d4]">
                {choice.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
