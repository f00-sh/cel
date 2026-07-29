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
  HYPER,
} from "@/lib/model";
import { downloadScorecard } from "@/lib/scorecard";
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

  async function shareCard(openComposer: boolean) {
    setSharing(true);
    setShareNote(null);
    try {
      const blob = await downloadScorecard({
        path: survey.path,
        handle: survey.handle,
        score,
        F: breakdown.F,
        tau: HYPER.tau,
        tierTitle: tier.title,
        highest: extremes.highest.label,
        lowest: extremes.lowest.label,
        breakdown,
      });
      const text = caption();
      await navigator.clipboard.writeText(text).catch(() => undefined);
      const file = new File([blob], `cel-index-${score.toFixed(1)}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (!openComposer && nav.share && nav.canShare?.({ files: [file], text })) {
        await nav.share({ files: [file], text, title: labels.full });
        setShareNote("Shared via system sheet.");
      } else if (openComposer) {
        setShareNote(
          "Score card image downloaded and caption copied. Attach the PNG when the composer opens.",
        );
        window.setTimeout(() => {
          window.open(
            `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
            "_blank",
            "noopener,noreferrer",
          );
        }, 350);
      } else {
        setShareNote("Score card PNG downloaded. Caption copied to clipboard.");
      }
    } catch {
      setShareNote("Could not generate the image. Caption can still be copied.");
    } finally {
      setSharing(false);
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

  return (
    <Shell>
      {step !== "landing" && step !== "result" ? (
        <div className="mb-4 flex justify-end">
          <MethodLink />
        </div>
      ) : null}
      {step !== "landing" ? (
        <Progress stepIndex={stepIndex} total={STEPS.length} />
      ) : null}

      {step === "landing" && (
        <section className="text-center">
          <p className="font-mono text-[0.7rem] font-medium tracking-[0.28em] text-muted uppercase">
            Self-assessment · Product model
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            Cel Index
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Compute your Femcel or Incel Index from the formal product model. Optional X profile
            priors. Transparent factors. Shareable score card.
          </p>
          <div className="math-mono mx-auto mt-6 max-w-md rounded-lg border border-border bg-surface px-4 py-4 text-sm leading-relaxed text-fg/90 sm:text-base">
            <p className="text-center text-accent-soft">
              F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ · Ψ
            </p>
            <p className="mt-3 text-center text-xs text-faint">
              positive classification when F &gt; τ
            </p>
          </div>
          <ul className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm text-muted">
            {[
              "Questions map 1:1 onto model variables",
              "Optional X import pre-fills I, C, M, R from public profile aggregates",
              "Result includes factor decomposition + PNG score card for X",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg/50" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go("x")}
            className="mt-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[14rem]"
          >
            Start assessment
            <ArrowRight className="size-4" aria-hidden />
          </button>
          <div className="mt-5 flex flex-col items-center gap-2">
            <MethodLink />
            <p className="text-xs text-faint">
              Self-report tool. Not a clinical diagnosis or medical advice.
            </p>
          </div>
        </section>
      )}

      {step === "x" && (
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            X profile import
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            Optional. We read{" "}
            <strong className="font-medium text-fg/90">public profile aggregates</strong> (post
            count, likes, media, following/followers, bio, account age) and map them to priors for{" "}
            <span className="math-mono text-fg">I</span>,{" "}
            <span className="math-mono text-fg">C</span>,{" "}
            <span className="math-mono text-fg">M</span>, and{" "}
            <span className="math-mono text-fg">R</span>.
          </p>
          <p className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-faint">
            We do <span className="text-muted">not</span> pull full post-text history, private likes
            graphs, or DMs — those require authenticated timeline access. See methodology §6.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
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
                className="min-h-12 w-full rounded-lg border border-border bg-surface-2 py-3 pr-3 pl-8 text-base text-fg outline-none placeholder:text-faint focus:border-border-strong"
              />
            </div>
            <button
              type="button"
              disabled={looking || handleInput.trim().length < 1}
              onClick={() => void doImport()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:border-border-strong disabled:opacity-40"
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
            <p className="mt-3 text-sm text-accent-soft" role="alert">
              {lookupError}
            </p>
          ) : null}
          {profile ? (
            <div className="mt-5 rounded-lg border border-border bg-surface p-4">
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
              <ul className="mt-3 space-y-1 text-xs text-faint">
                {profile.traces.map((t) => (
                  <li key={t.field} className="rounded-md border border-border bg-surface-2/50 px-2 py-1.5">
                    <span className="font-mono text-fg">{t.modelSymbol}</span> ← {t.signals}
                    <p className="mt-0.5 text-faint">{t.mapping}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                These values appear on later steps with a “Pre-filled from X” badge. D, S, B, L, P
                remain manual.
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
          <div className="mt-8 grid gap-8">
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
          <p className="mt-6 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-muted">
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
          <div className="mt-8">
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
          <div className="mt-8 grid gap-8">
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
          <div className="mt-8 grid gap-8">
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
          <div className="mt-8">
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
            <p className="font-mono text-[0.7rem] tracking-[0.22em] text-muted uppercase">
              {labels.full}
              {survey.handle ? ` · @${survey.handle}` : ""}
            </p>
            <MethodLink />
          </div>
          <div
            className={`mt-4 transition-all duration-500 ease-out ${
              resultReady ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            <p className="font-mono text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">
              {score.toFixed(1)}
              <span className="ml-1 text-2xl font-medium text-muted sm:text-3xl">/ 100</span>
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-fg sm:text-3xl">
              {tier.title}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              {tier.blurb}
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-surface p-4 sm:p-5">
            <p className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">
              Product evaluation
            </p>
            <p className="mt-1 font-mono text-lg tabular-nums text-fg">
              F = {breakdown.F.toFixed(4)} · τ = {HYPER.tau.toFixed(2)} ·{" "}
              {breakdown.F > HYPER.tau ? "F > τ" : "F ≤ τ"}
            </p>
            <ul className="mt-4 grid gap-2">
              {breakdown.factors.map((f) => (
                <li key={f.key} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                  <span className="font-mono text-xs text-faint">{f.key}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-fg/80"
                      style={{ width: `${Math.round(f.value * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {f.value.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-1 font-mono text-xs text-faint sm:grid-cols-2">
              <p>
                max: <span className="text-muted">{extremes.highest.label}</span> (
                {extremes.highest.key}={extremes.highest.value.toFixed(3)})
              </p>
              <p>
                min: <span className="text-muted">{extremes.lowest.label}</span> (
                {extremes.lowest.key}={extremes.lowest.value.toFixed(3)})
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[0.65rem] tracking-widest text-faint uppercase">
              Share · score card + caption
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sharing}
                onClick={() => void shareCard(false)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 text-sm font-semibold text-fg hover:border-border-strong disabled:opacity-40"
              >
                <Download className="size-4" aria-hidden />
                Download PNG
              </button>
              <button
                type="button"
                disabled={sharing}
                onClick={() => void shareCard(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 text-sm font-semibold text-fg hover:border-border-strong disabled:opacity-40"
              >
                <Share2 className="size-4" aria-hidden />
                Share to X
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(caption()).then(
                    () => setShareNote("Caption copied."),
                    () => setShareNote("Could not copy caption."),
                  );
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 text-sm font-semibold text-fg hover:border-border-strong"
              >
                <Copy className="size-4" aria-hidden />
                Copy caption
              </button>
            </div>
            {shareNote ? <p className="mt-3 text-xs text-muted">{shareNote}</p> : null}
            <p className="mt-3 text-xs text-faint">
              X’s web composer cannot auto-attach images from a link. We download the score card PNG
              and open the caption — attach the image in the composer.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => go("desire")}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg"
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
    </Shell>
  );
}
