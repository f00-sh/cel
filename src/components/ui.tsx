import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Info } from "lucide-react";
import type { PrefillTrace } from "@/lib/x-import";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="poster-bg poster-grain relative min-h-dvh">
      <div className="mx-auto max-w-lg px-4 py-8 sm:max-w-xl sm:px-6 sm:py-12 lg:max-w-2xl">
        {children}
      </div>
    </div>
  );
}

export function MethodLink({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/methodology"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-fg hover:underline ${className}`}
    >
      <BookOpen className="size-3.5" aria-hidden />
      Algorithm & methodology
    </Link>
  );
}

export function Progress({ stepIndex, total }: { stepIndex: number; total: number }) {
  const pct = Math.round((stepIndex / Math.max(1, total - 1)) * 100);
  return (
    <div className="mb-6">
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full bg-fg/80 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[0.65rem] tracking-widest text-faint uppercase">
        step {stepIndex + 1} / {total}
      </p>
    </div>
  );
}

export function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-10 flex flex-wrap gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:border-border-strong"
        >
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-fg px-6 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40 sm:flex-none sm:min-w-[10rem]"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function PrefillBadge({ trace }: { trace?: PrefillTrace }) {
  if (!trace) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[0.65rem] text-muted"
      title={`${trace.mapping}\n${trace.signals}`}
    >
      <Info className="size-3" aria-hidden />
      Pre-filled from X · {trace.modelSymbol}={trace.value.toFixed(2)}
    </span>
  );
}

export function Slider({
  label,
  hint,
  value,
  onChange,
  left,
  right,
  prefill,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  prefill?: PrefillTrace;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="grid gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-medium text-fg sm:text-lg">{label}</p>
          <PrefillBadge trace={prefill} />
        </div>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
        {prefill ? (
          <p className="mt-1.5 text-xs leading-relaxed text-faint">
            Source: {prefill.signals}. Override freely — scoring uses your final slider values.
          </p>
        ) : null}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full"
      />
      <div className="flex justify-between font-mono text-xs text-faint">
        <span>{left}</span>
        <span className="text-muted">{pct}%</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export function PathCards({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; title: string; desc: string }[];
}) {
  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-xl border px-4 py-4 text-left transition-colors ${
              on
                ? "border-border-strong bg-surface"
                : "border-border bg-surface/40 hover:border-border-strong"
            }`}
          >
            <p className="font-medium text-fg">{o.title}</p>
            <p className="mt-1 text-sm text-muted">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
