"use client";

import { forwardRef } from "react";

interface DeckPileProps {
  label: string;
  count: number;
  variant: "draw" | "discard";
}

export const DeckPile = forwardRef<HTMLDivElement, DeckPileProps>(
  function DeckPile({ label, count, variant }, ref) {
    return (
      <div
        ref={ref}
        className={`deck-pile deck-pile--${variant}`}
        aria-label={`${label} ${count} 張`}
      >
        <div className="deck-pile__stack" aria-hidden>
          <span className="deck-pile__sheet deck-pile__sheet--3" />
          <span className="deck-pile__sheet deck-pile__sheet--2" />
          <span className="deck-pile__sheet deck-pile__sheet--1" />
        </div>
        <div className="deck-pile__meta">
          <span className="deck-pile__label">{label}</span>
          <span className="deck-pile__count tabular-nums">{count}</span>
        </div>
      </div>
    );
  }
);
