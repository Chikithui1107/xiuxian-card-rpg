"use client";

import { publicAsset } from "@/lib/paths";

interface DefeatOverlayProps {
  onRestart: () => void;
  onReturnMenu: () => void;
}

export function DefeatOverlay({ onRestart, onReturnMenu }: DefeatOverlayProps) {
  return (
    <div className="defeat-overlay" role="dialog" aria-label="渡劫失敗">
      <div className="defeat-overlay-veil" aria-hidden />

      <div className="defeat-overlay-content">
        <img
          className="defeat-overlay-art"
          src={publicAsset("/ui/defeat-dujie.jpg")}
          alt="渡劫失敗"
          draggable={false}
        />

        <div className="defeat-overlay-actions">
          <button
            type="button"
            className="defeat-btn defeat-btn-restart"
            onClick={onRestart}
          >
            重新開始
          </button>
          <button
            type="button"
            className="defeat-btn defeat-btn-menu"
            onClick={onReturnMenu}
          >
            返回選單
          </button>
        </div>
      </div>
    </div>
  );
}
