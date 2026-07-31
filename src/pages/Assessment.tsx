import { useMemo, useState } from "react";
import {
  ArrowRight,
  Copy,
  Download,
  LoaderCircle,
  RotateCcw,
  Share2,
  User,
} from "lucide-react";
import {
  DEFAULT_SURVEY,
  HYPER,
  SITE_URL,
  STEPS,
  type PathId,
  type StepId,
  type SurveyState,
  classify,
  displayScore,
  evaluate,
  factorExtremes,
  pathLabels,
  shareCaption,
  toModelInputs,
} from "@/lib/model";
import {
  copyImageToClipboard,
  downloadScorecard,
  scorecardBlob,
} from "@/lib/scorecard";
import {
  importXProfile,
  type PrefillField,
  type PrefillTrace,
  type XProfile,
} from "@/lib/x-import";
import {
  MethodLink,
  NavButtons,
  PathCards,
  Progress,
  Shell,
  Slider,
  StepPanel,
} from "@/components/ui";

export function AssessmentPage() {
  const [step, setStep] = useState<StepId>("landing");
  const [survey, setSurvey] = useState<SurveyState>(DEFAULT_SURVEY);
  const [handleInput, setHandleInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profile, setProfile] = useState<XProfile | null>(null);
  const [traces, setTraces] = useState<Partial<Record<PrefillField, PrefillTrace>>>({});
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const inputs = useMemo(() => toModelInputs(survey), [survey]);
  const breakdown = useMemo(() => evaluate(inputs), [inputs]);
  const score = displayScore(breakdown.F);
  const tier = classify(breakdown.F, HYPER.tau, survey.path);
  const labels = pathLabels(survey.path);
  const extremes = useMemo(
    () => factorExtremes(breakdown.factors),
    [breakdown.factors],
  );

  const stepIndex = STEPS.indexOf(step);

  function patch(p: Partial<SurveyState>) {
    setSurvey((s) => ({ ...s, ...p }));
  }

  function go(next: StepId) {
    setStep(next);
    if (next === "result") {
      setResultReady(false);
      window.setTimeout(() => setResultReady(true), 40);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) go(STEPS[i + 1]!);
  }

  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) go(STEPS[i - 1]!);
  }

  async function doImport() {
    setLooking(true);
    setLookupError(null);
    try {
      const res = await importXProfile(handleInput);
      if (!res.ok) {
        setLookupError(res.error);
        setProfile(null);
        setTraces({});
        return;
      }
      setProfile(res.profile);
      const map: Partial<Record<PrefillField, PrefillTrace>> = {};
      for (const t of res.profile.traces) map[t.field] = t;
      setTraces(map);
      patch({
        handle: res.profile.handle,
        onlineLife: res.profile.estimated.onlineLife ?? survey.onlineLife,
        identityContent:
          res.profile.estimated.identityContent ?? survey.identityContent,
        marketPressure: res.profile.estimated.marketPressure ?? survey.marketPressure,
        affectLoad: res.profile.estimated.affectLoad ?? survey.affectLoad,
      });
    } catch {
      setLookupError("Lookup failed. Continue without import.");
    } finally {
      setLooking(false);
    }
  }

  function caption() {
    return shareCaption({
      path: survey.path,
      handle: survey.handle,
      score,
      F: breakdown.F,
      tau: HYPER.tau,
      tierTitle: tier.title,
      highest: extremes.highest.label,
      lowest: extremes.lowest.label,
    });
  }

  function scorecardInput() {
    return {
      path: survey.path,
      handle: survey.handle,
      score,
      F: breakdown.F,
      tau: HYPER.tau,
      tierTitle: tier.title,
      highest: extremes.highest.label,
      lowest: extremes.lowest.label,
      breakdown,
    };
  }

  async function downloadPng() {
    setSharing(true);
    setShareNote(null);
    try {
      await downloadScorecard(scorecardInput());
      setShareNote("Score card saved.");
    } catch {
      setShareNote("Could not save the image.");
    } finally {
      setSharing(false);
    }
  }

  /** Share to X: no save dialog. Prefer OS share sheet with image; else clipboard + intent. */
  async function shareToX() {
    setSharing(true);
    setShareNote(null);
    try {
      const text = caption();
      const blob = await scorecardBlob(scorecardInput());
      const file = new File([blob], `cel-index-${score.toFixed(1)}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      // 1) Native share sheet with image + text (mobile / some desktops)
      const shareData: ShareData = {
        files: [file],
        text,
        title: labels.full,
        url: SITE_URL,
      };
      if (nav.share && nav.canShare?.(shareData)) {
        await nav.share(shareData);
        setShareNote("Opened system share — pick X.");
        return;
      }
      // Some browsers canShare files but not with url together
      if (nav.share && nav.canShare?.({ files: [file], text })) {
        await nav.share({ files: [file], text, title: labels.full });
        setShareNote("Opened system share — pick X.");
        return;
      }

      // 2) Copy image + text, open X compose with caption (includes site link)
      const imgOk = await copyImageToClipboard(blob);
      await navigator.clipboard.writeText(text).catch(() => undefined);
      // Re-write image after text if possible (clipboard is one payload; prefer image+text together)
      if (imgOk) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]);
        } catch {
          // image-only already attempted; text is in intent URL
        }
      }

      const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
      window.open(intent, "_blank", "noopener,noreferrer");

      if (imgOk) {
        setShareNote("Composer opened with caption + site link. Paste (Ctrl/Cmd+V) to drop the score card image.");
      } else {
        setShareNote(
          "Composer opened with caption + site link. Use Download PNG if you want the image file.",
        );
      }
    } catch {
      try {
        const text = caption();
        await navigator.clipboard.writeText(text);
        window.open(
          `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer",
        );
        setShareNote("Composer opened with caption + site link.");
      } catch {
        setShareNote("Could not open share. Copy caption and use Download PNG.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function copyCaptionOnly() {
    try {
      await navigator.clipboard.writeText(caption());
      setShareNote("Caption copied (includes cel.f00.sh).");
    } catch {
      setShareNote("Could not copy caption.");
    }
  }

  function reset() {
    setSurvey(DEFAULT_SURVEY);
    setProfile(null);
    setTraces({});
    setHandleInput("");
    setLookupError(null);
    setShareNote(null);
    setResultReady(false);
    go("landing");
  }

  const positive = breakdown.F > HYPER.tau;

  return (
    <Shell topRight={<MethodLink />}>
      {step !== "landing" ? (
        <Progress stepIndex={stepIndex} total={STEPS.length} />
      ) : null}

      <StepPanel stepKey={step}>
        {step === "landing" && (
          <section className="text-center">
            <p className="font-mono text-[0.7rem] font-medium tracking-[0.28em] text-muted uppercase">
              Self-assessment · Product model
            </p>
            <h1 className="mt-5 font-display text-[2.65rem] font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl">
              Cel Index
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg md:text-xl">
              Compute your Femcel or Incel Index from the formal product model. Optional X profile
              priors. Transparent factors. Shareable score card.
            </p>
            <div className="panel math-mono mx-auto mt-8 max-w-2xl px-5 py-6 text-sm leading-relaxed text-fg/90 sm:text-base md:text-lg">
              <p className="text-center text-[0.95rem] tracking-wide text-accent-soft sm:text-base md:text-lg">
                F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ · Ψ
              </p>
              <p className="mt-3 text-center font-sans text-xs text-faint sm:text-sm">
                positive classification when F &gt; τ
              </p>
            </div>
            <ul className="panel mx-auto mt-6 max-w-xl space-y-3 px-5 py-5 text-left text-sm text-muted sm:text-base">
              {[
                "Questions map 1:1 onto model variables",
                "Optional X import pre-fills I, C, M, R from public profile aggregates",
                "Result includes factor decomposition + PNG score card for X",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg/55" />
                  <span className="leading-snug">{t}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => go("x")}
              className="mt-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-[opacity,transform] hover:opacity-92 active:scale-[0.99] sm:w-auto sm:min-w-[15rem]"
            >
              Start assessment
              <ArrowRight className="size-4" aria-hidden />
            </button>
            <p className="mt-5 text-xs text-faint">
              Self-report tool. Not a clinical diagnosis or medical advice.
            </p>
          </section>
        )}

        {step === "x" && (
          <section>
            <p className="font-mono text-[0.65rem] tracking-[0.2em] text-faint uppercase">
              Optional
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              X profile import
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
              We read{" "}
              <strong className="font-medium text-fg/90">public profile aggregates</strong> and map
              them to priors for <span className="math-mono text-fg">I</span>,{" "}
              <span className="math-mono text-fg">C</span>,{" "}
              <span className="math-mono text-fg">M</span>, and{" "}
              <span className="math-mono text-fg">R</span>. Skip anytime.
            </p>
            <p className="panel-soft mt-3 px-3 py-2.5 text-xs leading-relaxed text-faint">
              No full post history, private likes graphs, or DMs. See methodology §6.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-muted">
                  @
                </span>
                <input
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void doImport()}
                  placeholder="handle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-h-12 w-full rounded-xl border border-border bg-surface py-3 pr-3 pl-8 text-base text-fg outline-none placeholder:text-faint focus:border-border-strong"
                />
              </div>
              <button
                type="button"
                disabled={looking || handleInput.trim().length < 1}
                onClick={() => void doImport()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-40"
              >
                {looking ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    Looking up
                  </>
                ) : (
                  "Import profile"
                )}
              </button>
            </div>
            {lookupError ? (
              <p
                className="panel-soft mt-3 px-3 py-2.5 text-sm leading-relaxed text-muted"
                role="alert"
              >
                {lookupError}
              </p>
            ) : null}
            {profile ? (
              <div className="panel mt-5 p-4">
                <div className="flex items-center gap-3">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt=""
                      className="size-12 rounded-full border border-border object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-full bg-surface-2">
                      <User className="size-5 text-muted" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">
                      {profile.name || profile.handle}
                    </p>
                    <p className="font-mono text-sm text-muted">@{profile.handle}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-faint">
                  {profile.traces.map((t) => (
                    <li key={t.field} className="panel-soft px-2.5 py-2">
                      <span className="font-mono text-fg">{t.modelSymbol}</span>
                      <span className="text-faint"> ← {t.signals}</span>
                      <p className="mt-0.5 text-faint/90">{t.mapping}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  Pre-fills show on later steps. D, S, B, L, P stay manual.
                </p>
              </div>
            ) : null}
            <NavButtons
              onBack={back}
              onNext={next}
              nextLabel={profile ? "Continue with pre-fill" : "Skip X import"}
            />
          </section>
        )}

        {step === "path" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Label path
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Selects Femcel / Incel / Cel naming only. The product{" "}
              <span className="math-mono text-fg">F</span> is path-invariant.
            </p>
            <div className="mt-6">
              <PathCards
                value={survey.path}
                onChange={(id) => patch({ path: id as PathId })}
                options={[
                  {
                    id: "woman",
                    title: "Woman / female-coded",
                    desc: "Output label: Femcel Index",
                  },
                  {
                    id: "man",
                    title: "Man / male-coded",
                    desc: "Output label: Incel Index",
                  },
                  {
                    id: "other",
                    title: "Non-binary / other",
                    desc: "Output label: Cel Index",
                  },
                ]}
              />
            </div>
            <NavButtons onBack={back} onNext={next} />
          </section>
        )}

        {step === "desire" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Desire vs outcomes
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Structural core: <span className="math-mono text-fg">(D − S)₊</span>. Report the last
              6–12 months.
            </p>
            <div className="mt-6 grid gap-3">
              <Slider
                label="How strongly do you want a romantic or sexual partnership?"
                hint="Model variable D"
                value={survey.desire}
                onChange={(v) => patch({ desire: v })}
                left="Not at all"
                right="Extremely"
              />
              <Slider
                label="How successful have your dating / relationship outcomes been?"
                hint="Model variable S — mutual interest, progression, pairing"
                value={survey.outcomes}
                onChange={(v) => patch({ outcomes: v })}
                left="None / stalled"
                right="Strong outcomes"
              />
            </div>
            <p className="panel-soft mt-4 px-3 py-2.5 font-mono text-xs text-muted">
              (D − S)₊ ={" "}
              <span className="text-fg">
                {Math.max(0, survey.desire - survey.outcomes).toFixed(2)}
              </span>
            </p>
            <NavButtons onBack={back} onNext={next} />
          </section>
        )}

        {step === "control" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Involuntary framing
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Model variable <span className="math-mono text-fg">B</span>. Voluntary abstinence
              differs from a gap experienced as outside control.
            </p>
            <div className="mt-6">
              <Slider
                label="How much of this gap feels involuntary — not a deliberate choice to stay single?"
                value={survey.involuntary}
                onChange={(v) => patch({ involuntary: v })}
                left="Mostly my choice"
                right="Fully involuntary"
              />
            </div>
            <NavButtons onBack={back} onNext={next} />
          </section>
        )}

        {step === "online" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Online life & identity content
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Variables <span className="math-mono text-fg">I</span> and{" "}
              <span className="math-mono text-fg">C</span>.
              {profile
                ? " Values below were pre-populated from your X profile aggregates — adjust if the prior is wrong."
                : null}
            </p>
            <div className="mt-6 grid gap-3">
              <Slider
                label="How much of your social life runs through the internet?"
                hint="Model variable I"
                value={survey.onlineLife}
                onChange={(v) => patch({ onlineLife: v })}
                left="Mostly offline"
                right="Almost entirely online"
                prefill={traces.onlineLife}
              />
              <Slider
                label="How often do you engage with content about dating failure, loneliness, looks, or market unfairness?"
                hint="Model variable C — feeds, forums, creators, chats"
                value={survey.identityContent}
                onChange={(v) => patch({ identityContent: v })}
                left="Rarely"
                right="Daily / defining"
                prefill={traces.identityContent}
              />
            </div>
            <NavButtons onBack={back} onNext={next} />
          </section>
        )}

        {step === "self" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Self-view & market
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Inputs to <span className="math-mono text-fg">ρ(L, P, M)</span>.
              {traces.marketPressure ? " M may be pre-filled from X graph asymmetry." : null}
            </p>
            <div className="mt-6 grid gap-3">
              <Slider
                label="How much do you feel held back by appearance?"
                hint="L"
                value={survey.looksDeficit}
                onChange={(v) => patch({ looksDeficit: v })}
                left="Not a factor"
                right="Primary barrier"
              />
              <Slider
                label="How much do you feel held back by personality, social skill, or charisma?"
                hint="P"
                value={survey.personalityDeficit}
                onChange={(v) => patch({ personalityDeficit: v })}
                left="Not a factor"
                right="Primary barrier"
              />
              <Slider
                label="How hostile or closed does the dating market feel for people like you?"
                hint="M"
                value={survey.marketPressure}
                onChange={(v) => patch({ marketPressure: v })}
                left="Open / fair"
                right="Closed / stacked"
                prefill={traces.marketPressure}
              />
            </div>
            <NavButtons onBack={back} onNext={next} />
          </section>
        )}

        {step === "affect" && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Affect load
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Variable <span className="math-mono text-fg">R</span> inside{" "}
              <span className="math-mono text-fg">Ψ(R) = 0.32 + 0.68R</span>.
            </p>
            <div className="mt-6">
              <Slider
                label="How emotionally charged is this topic for you day to day?"
                value={survey.affectLoad}
                onChange={(v) => patch({ affectLoad: v })}
                left="Neutral / resolved"
                right="Constantly charged"
                prefill={traces.affectLoad}
              />
            </div>
            <NavButtons onBack={back} onNext={next} nextLabel="Compute F" />
          </section>
        )}

        {step === "result" && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[0.7rem] tracking-[0.18em] text-muted uppercase">
                {labels.full}
                {survey.handle ? ` · @${survey.handle}` : ""}
              </p>
              <span
                className={`rounded-full border px-2.5 py-1 font-mono text-[0.65rem] tracking-wide uppercase ${
                  positive
                    ? "border-good/30 bg-good/10 text-good"
                    : "border-border bg-surface text-faint"
                }`}
              >
                {positive ? "F > τ" : "F ≤ τ"}
              </span>
            </div>

            <div
              className={`mt-5 transition-all duration-500 ease-out ${
                resultReady ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <div className="panel relative overflow-hidden p-5 sm:p-6">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
                  style={{
                    background: positive
                      ? "radial-gradient(500px 120px at 20% 0%, rgba(163,230,53,0.12), transparent)"
                      : "radial-gradient(500px 120px at 20% 0%, rgba(244,244,245,0.06), transparent)",
                  }}
                />
                <p className="relative font-mono text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
                  {score.toFixed(1)}
                  <span className="ml-1 text-2xl font-medium text-muted sm:text-3xl">/ 100</span>
                </p>
                <p className="relative mt-3 font-display text-2xl font-semibold text-fg sm:text-3xl">
                  {tier.title}
                </p>
                <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-base">
                  {tier.blurb}
                </p>
              </div>
            </div>

            <div className="panel mt-4 p-4 sm:p-5">
              <p className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">
                Product evaluation
              </p>
              <p className="mt-1.5 font-mono text-sm tabular-nums text-fg sm:text-base">
                F = {breakdown.F.toFixed(4)} · τ = {HYPER.tau.toFixed(2)}
              </p>
              <ul className="mt-4 grid gap-2.5">
                {breakdown.factors.map((f) => (
                  <li key={f.key} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                    <span className="font-mono text-xs text-faint">{f.key}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-fg/85 transition-[width] duration-500"
                        style={{ width: `${Math.round(f.value * 100)}%` }}
                      />
                    </div>
                    <span className="min-w-[3.25rem] text-right font-mono text-xs tabular-nums text-muted">
                      {f.value.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-1 border-t border-border pt-3 font-mono text-xs text-faint sm:grid-cols-2">
                <p>
                  max: <span className="text-muted">{extremes.highest.label}</span>
                </p>
                <p>
                  min: <span className="text-muted">{extremes.lowest.label}</span>
                </p>
              </div>
            </div>

            <div className="panel mt-4 p-4">
              <p className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">
                Share · score card + caption
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => void shareToX()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-fg/25 bg-fg px-3 text-sm font-semibold text-bg transition-opacity hover:opacity-92 disabled:opacity-40 sm:col-span-2"
                >
                  <Share2 className="size-4" aria-hidden />
                  {sharing ? "Opening…" : "Share to X"}
                </button>
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => void downloadPng()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-fg transition-colors hover:border-border-strong disabled:opacity-40"
                >
                  <Download className="size-4" aria-hidden />
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => void copyCaptionOnly()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-fg transition-colors hover:border-border-strong sm:col-span-3"
                >
                  <Copy className="size-4" aria-hidden />
                  Copy caption
                </button>
              </div>
              {shareNote ? (
                <p className="mt-3 text-xs text-muted" role="status">
                  {shareNote}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-faint">
                  Share to X opens the composer with your score +{" "}
                  <span className="text-muted">cel.f00.sh</span>. On desktop, paste once to attach
                  the score card image.
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => go("desire")}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:border-border-strong"
              >
                Adjust answers
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-fg px-6 text-sm font-semibold text-bg"
              >
                <RotateCcw className="size-4" aria-hidden />
                Start over
              </button>
            </div>
            <p className="mt-6 text-xs text-faint">
              Formal product evaluation on self-report inputs. Not a diagnosis.
            </p>
          </section>
        )}
      </StepPanel>
    </Shell>
  );
}
