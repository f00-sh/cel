import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, Info } from "lucide-react";
import type { PrefillTrace } from "@/lib/x-import";

export function Shell({
  children,
  topRight,
}: {
  children: ReactNode;
  topRight?: ReactNode;
}) {
  return (
    <div className="poster-bg poster-grain relative min-h-dvh">
      <div className="shell-inner mx-auto max-w-lg px-4 pb-10 pt-5 sm:max-w-xl sm:px-6 sm:pb-14 sm:pt-8 lg:max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="group inline-flex items-baseline gap-1.5 rounded-md font-mono text-[0.7rem] tracking-[0.22em] text-faint uppercase transition-colors hover:text-muted"
          >
            <span className="text-fg/90 group-hover:text-fg">cel</span>
            <span className="text-faint">index</span>
          </Link>
          <div className="flex items-center gap-3">{topRight}</div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function MethodLink({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/methodology"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-surface hover:text-fg ${className}`}
    >
      <BookOpen className="size-3.5 opacity-80" aria-hidden />
      Methodology
    </Link>
  );
}

const STEP_LABELS = [
  "Start",
  "X",
  "Path",
  "Desire",
  "Control",
  "Online",
  "Self",
  "Affect",
  "Result",
];

export function Progress({
  stepIndex,
  total,
  labels = STEP_LABELS,
}: {
  stepIndex: number;
  total: number;
  labels?: string[];
}) {
  const pct = Math.round((stepIndex / Math.max(1, total - 1)) * 100);
  const label = labels[stepIndex] ?? `Step ${stepIndex + 1}`;
  return (
    <div className="mb-7">
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="font-mono text-[0.65rem] tracking-[0.18em] text-faint uppercase">
          {label}
        </p>
        <p className="font-mono text-[0.65rem] tabular-nums text-faint">
          {stepIndex + 1}
          <span className="text-faint/70"> / {total}</span>
        </p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${stepIndex + 1} of ${total}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-fg/70 to-fg transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2.5 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? "bg-fg/55" : "bg-surface-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  sticky = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "sticky-actions" : "mt-10"}>
      <div className="flex gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 min-w-[5.5rem] items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-fg px-6 text-sm font-semibold text-bg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-[opacity,transform] hover:opacity-92 active:scale-[0.99] disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

export function PrefillBadge({ trace }: { trace?: PrefillTrace }) {
  if (!trace) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/80 px-2 py-0.5 font-mono text-[0.65rem] text-muted"
      title={`${trace.mapping}\n${trace.signals}`}
    >
      <Info className="size-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">
        X · {trace.modelSymbol}={trace.value.toFixed(2)}
      </span>
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
    <div className="panel grid gap-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium leading-snug text-fg sm:text-[1.05rem]">
              {label}
            </p>
            <PrefillBadge trace={prefill} />
          </div>
          {hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
          {prefill ? (
            <p className="mt-1.5 text-xs leading-relaxed text-faint">
              Source: {prefill.signals}. Override freely — scoring uses your final values.
            </p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-lg border border-border bg-bg/40 px-2.5 py-1.5 text-right">
          <p className="font-mono text-lg font-semibold tabular-nums tracking-tight text-fg">
            {pct}
            <span className="text-sm font-medium text-faint">%</span>
          </p>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="range"
        style={{ ["--pct" as string]: `${pct}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      />
      <div className="flex justify-between gap-3 font-mono text-[0.7rem] text-faint">
        <span className="max-w-[40%] leading-snug">{left}</span>
        <span className="max-w-[40%] text-right leading-snug">{right}</span>
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
    <div className="grid gap-2.5" role="radiogroup" aria-label="Label path">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`group flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-[border-color,background,transform] active:scale-[0.995] ${
              on
                ? "border-fg/35 bg-surface shadow-[inset_0_0_0_1px_rgba(244,244,245,0.06)]"
                : "border-border bg-surface/30 hover:border-border-strong hover:bg-surface/60"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                on ? "border-fg bg-fg text-bg" : "border-border-strong text-transparent"
              }`}
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-fg">{o.title}</span>
              <span className="mt-1 block text-sm text-muted">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StepPanel({ children, stepKey }: { children: ReactNode; stepKey: string }) {
  return (
    <div key={stepKey} className="step-panel">
      {children}
    </div>
  );
}
