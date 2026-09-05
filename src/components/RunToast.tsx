"use client";

import { useEffect } from "react";

type RunToastProps = {
  message: string;
  onDismiss: () => void;
  /** 沉浸標題下：略避開「仙途」Logo */
  topClassName?: string;
};

export function RunToast({
  message,
  onDismiss,
  topClassName = "top-[3.7rem]",
}: RunToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 2300);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      className={`run-toast pointer-events-none absolute left-1/2 z-[45] -translate-x-1/2 ${topClassName}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
