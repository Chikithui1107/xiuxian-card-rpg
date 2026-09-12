"use client";

interface StageClearOverlayProps {
  title: string;
  subtitle?: string;
  description?: string;
  buttonLabel: string;
  onContinue: () => void;
}

export function StageClearOverlay({
  title,
  subtitle,
  description,
  buttonLabel,
  onContinue,
}: StageClearOverlayProps) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4 backdrop-blur-md">
      <p className="zone-label text-[#7aab9a]">破境</p>
      <h1 className="victory-title mt-2 text-2xl font-extrabold tracking-[0.3em]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-sm tracking-wide text-stone-400">{subtitle}</p>
      )}
      {description && (
        <p className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-stone-500">
          {description}
        </p>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="btn-start-game mt-8 !px-10"
      >
        <span className="relative block text-base font-bold tracking-[0.28em]">
          {buttonLabel}
        </span>
      </button>
    </div>
  );
}
