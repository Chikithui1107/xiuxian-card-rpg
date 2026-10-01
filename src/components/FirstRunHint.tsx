"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { rememberHint, shouldShowHint, recordJourneyEvent, type JourneyHintId } from "@/lib/journey-events";

export function FirstRunHint({ id, children }: { id: JourneyHintId; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!shouldShowHint(id)) return;
    rememberHint(id);
    setVisible(true);
    recordJourneyEvent("hint_shown", { hint: id });
  }, [id]);
  if (!visible) return null;
  return (
    <aside aria-label="修行提示" className="mx-auto my-3 w-full max-w-md rounded-lg border border-[#7aab9a]/40 bg-[#152424] px-3 py-2 text-left text-xs leading-relaxed text-stone-200">
      <p>{children}</p>
      <div className="mt-2 flex justify-end gap-4 text-[#a9d4c4]">
        <button type="button" className="min-h-8" onClick={() => {
          rememberHint("disabled");
          recordJourneyEvent("hints_disabled", { hint: id });
          setVisible(false);
        }}>關閉後續提示</button>
        <button type="button" className="min-h-8" onClick={() => setVisible(false)}>知道了</button>
      </div>
    </aside>
  );
}
