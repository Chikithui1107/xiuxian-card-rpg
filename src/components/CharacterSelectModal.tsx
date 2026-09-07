"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayableCharacter } from "@/data/characters";
import { publicAsset } from "@/lib/paths";

interface CharacterSelectModalProps {
  open: boolean;
  characters: PlayableCharacter[];
  activeId: string;
  /** 修行途中：不可確認切換 */
  locked?: boolean;
  lockReason?: string;
  /** 確認使用（寫入 activeCharacterId） */
  onConfirm: (id: string) => void;
  onClose: () => void;
}

export function CharacterSelectModal({
  open,
  characters,
  activeId,
  locked = false,
  lockReason,
  onConfirm,
  onClose,
}: CharacterSelectModalProps) {
  const [previewId, setPreviewId] = useState(activeId);

  useEffect(() => {
    if (open) setPreviewId(activeId);
  }, [open, activeId]);

  const preview = useMemo(
    () => characters.find((c) => c.id === previewId) ?? characters[0],
    [characters, previewId]
  );

  if (!open || !preview) return null;

  const isActive = preview.id === activeId;
  const canUse = preview.unlocked && !locked && !isActive;

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
          <h3 className="character-select-title">角色</h3>
          <p className="character-select-hint">
            {locked
              ? lockReason ?? "修行途中無法切換角色"
              : "點選預覽；確認後才會更換山門與戰鬥資料"}
          </p>
        </header>

        <ul className="character-select-list">
          {characters.map((c) => {
            const isPreview = c.id === preview.id;
            const isCurrent = c.id === activeId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`character-select-row${
                    isPreview ? " is-preview" : ""
                  }${isCurrent ? " is-active" : ""}`}
                  onClick={() => setPreviewId(c.id)}
                  aria-pressed={isPreview}
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
                    {!c.unlocked
                      ? "尚待參悟"
                      : isCurrent
                        ? "使用中"
                        : isPreview
                          ? "預覽"
                          : "查看"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="character-select-preview" aria-live="polite">
          <div className="character-select-preview-art" aria-hidden>
            <img
              src={publicAsset(
                preview.lobbyPortrait ??
                  preview.portrait ??
                  preview.avatar ??
                  ""
              )}
              alt=""
              draggable={false}
            />
          </div>
          <div className="character-select-preview-body">
            <p className="character-select-preview-name">{preview.name}</p>
            <p className="character-select-preview-sub">
              {preview.title} · {preview.realm} · 體魄 {preview.maxHp}
            </p>
            <p className="character-select-preview-desc">
              {preview.description}
            </p>
            <p className="character-select-preview-skills">
              {preview.skillLabels.join(" · ")}
            </p>
          </div>
        </section>

        <div className="character-select-actions">
          <button
            type="button"
            className="character-select-confirm"
            disabled={!canUse}
            onClick={() => {
              if (!canUse) return;
              onConfirm(preview.id);
            }}
          >
            {!preview.unlocked
              ? "尚待參悟"
              : locked
                ? "修行中不可切換"
                : isActive
                  ? "目前使用此角色"
                  : "使用此角色"}
          </button>
          <button
            type="button"
            className="character-select-close"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
