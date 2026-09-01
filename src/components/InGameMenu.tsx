"use client";

import { useCallback, useEffect, useState } from "react";

interface InGameMenuProps {
  onQuit: () => void;
}

export function InGameMenu({ onQuit }: InGameMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setConfirmQuit(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeMenu]);

  return (
    <>
      <button
        type="button"
        className="in-game-menu-btn"
        onClick={() => {
          setConfirmQuit(false);
          setOpen(true);
        }}
        aria-label="遊戲選單"
        aria-expanded={open}
      >
        <span className="in-game-menu-btn-bars" aria-hidden />
      </button>

      {open && (
        <div
          className="in-game-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="in-game-menu-title"
        >
          <button
            type="button"
            className="in-game-menu-backdrop"
            onClick={closeMenu}
            aria-label="關閉選單，繼續遊戲"
          />
          <div className="in-game-menu-panel glass-panel-gold">
            <p className="zone-label text-[#8a7340]">
              {confirmQuit ? "請再確認" : "祕境進行中"}
            </p>
            <h2
              id="in-game-menu-title"
              className="mt-1 text-lg font-bold tracking-[0.28em] text-[#c9a84c]"
            >
              {confirmQuit ? "退出遊戲" : "遊戲選單"}
            </h2>
            {confirmQuit ? (
              <>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                  確定退出本次修行？進度將無法恢復。
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmQuit(false)}
                    className="btn-start-game !py-3"
                  >
                    <span className="relative block text-base font-bold tracking-[0.32em]">
                      繼續遊戲
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onQuit}
                    className="btn-abandon"
                  >
                    確定退出
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={closeMenu}
                  className="btn-start-game !py-3"
                >
                  <span className="relative block text-base font-bold tracking-[0.32em]">
                    繼續遊戲
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmQuit(true)}
                  className="btn-abandon"
                >
                  退出遊戲
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
