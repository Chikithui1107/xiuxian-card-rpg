"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  /** 危險操作（放棄等）：確認鍵為危險樣式，取消鍵為主要樣式 */
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 遊戲內二次確認（取代 window.confirm） */
export function ConfirmDialog({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ui-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
    >
      <button
        type="button"
        className="ui-modal__backdrop"
        onClick={onCancel}
        aria-label={cancelLabel}
      />
      <div className="ui-modal__panel ui-panel ui-panel--accent">
        <div className="ui-modal__head">
          {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
          <h2 id="confirm-dialog-title" className="ui-title ui-modal__title">
            {title}
          </h2>
          {description && (
            <p id="confirm-dialog-desc" className="ui-modal__desc">
              {description}
            </p>
          )}
        </div>
        <div className="ui-modal__actions">
          <button
            ref={cancelRef}
            type="button"
            className="ui-btn ui-btn--primary ui-btn--block"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--danger ui-btn--block"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
