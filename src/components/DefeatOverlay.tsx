"use client";

import { publicAsset } from "@/lib/paths";

interface DefeatOverlayProps {
  onRestart: () => void;
  onReturnMenu: () => void;
}

export function DefeatOverlay({ onRestart, onReturnMenu }: DefeatOverlayProps) {
  return (
    <div className="defeat-overlay" role="dialog" aria-label="道途已斷">
      <div className="defeat-overlay-veil" aria-hidden />

      <div className="defeat-overlay-content">
        <div className="defeat-overlay-frame">
          <div className="defeat-overlay-frame-inner">
            <img
              className="defeat-overlay-art"
              src={`${publicAsset("/ui/defeat-dujie.jpg")}?v=2`}
              alt="道途已斷"
              draggable={false}
            />
          </div>
        </div>

        <p className="mt-3 text-center text-sm tracking-[0.28em] text-[#c9a84c]">
          道途已斷
        </p>
        <p className="mt-1 text-center text-[11px] text-stone-500">
          本次修行止於此境。
        </p>

        <div className="defeat-overlay-actions">
          <button
            type="button"
            className="defeat-btn defeat-btn-restart"
            onClick={onRestart}
          >
            重新修行
          </button>
          <button
            type="button"
            className="defeat-btn defeat-btn-menu"
            onClick={onReturnMenu}
          >
            返回山門
          </button>
        </div>
      </div>
    </div>
  );
}
