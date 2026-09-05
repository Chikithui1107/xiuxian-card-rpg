"use client";

import type { PlayableCharacter } from "@/data/characters";
import { publicAsset } from "@/lib/paths";

interface CharacterSelectModalProps {
  open: boolean;
  characters: PlayableCharacter[];
  activeId: string;
  locked?: boolean;
  lockReason?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function CharacterSelectModal({
  open,
  characters,
  activeId,
  locked = false,
  lockReason,
  onSelect,
  onClose,
}: CharacterSelectModalProps) {
  if (!open) return null;

  return (
    <div
      className="character-select-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="選擇角色"
      onClick={onClose}
    >
      <div
        className="character-select-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="character-select-header">
          <p className="character-select-kicker">仙途</p>
          <h3 className="character-select-title">選擇角色</h3>
          <p className="character-select-hint">
            {locked
              ? lockReason ?? "修行途中無法切換"
              : "每位修士有獨立山門與進度"}
          </p>
        </header>

        <ul className="character-select-list">
          {characters.map((c) => {
            const selected = c.id === activeId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`character-select-row${
                    selected ? " is-active" : ""
                  }`}
                  disabled={locked || selected}
                  onClick={() => onSelect(c.id)}
                  aria-current={selected ? "true" : undefined}
                >
                  <span className="character-select-thumb" aria-hidden>
                    <img
                      src={publicAsset(
                        c.lobbyPortrait ?? c.avatar ?? c.portrait ?? ""
                      )}
                      alt=""
                      draggable={false}
                    />
                  </span>
                  <span className="character-select-meta">
                    <span className="character-select-name">{c.name}</span>
                    <span className="character-select-sub">
                      {c.title} · {c.realm}
                    </span>
                  </span>
                  <span className="character-select-state">
                    {selected ? "當前" : locked ? "—" : "入駐"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="character-select-close"
          onClick={onClose}
        >
          關閉
        </button>
      </div>
    </div>
  );
}
