"use client";

import { FirstRunHint } from "@/components/FirstRunHint";
import { publicAsset } from "@/lib/paths";

interface DefeatOverlayProps {
  reason?: "defeated" | "abandoned";
  onRestart: () => void;
  onReturnMenu: () => void;
}

export function DefeatOverlay({ reason = "defeated", onRestart, onReturnMenu }: DefeatOverlayProps) {
  return (
    <div className="defeat-overlay" role="dialog" aria-modal="true" aria-label="道途已斷">
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
          {reason === "abandoned" ? "已結束本次修行，可以重新出發。" : "本次修行止於此境。"}
        </p>

        <FirstRunHint id="retry">
          重新修行會恢復滿血，從起始牌組與 100 靈砂開始；本局獲得的法訣與靈砂不保留。
          永久靈石、收藏與已解鎖成就仍在。下一次先看敵人意圖，留出防守的真元。
        </FirstRunHint>

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
