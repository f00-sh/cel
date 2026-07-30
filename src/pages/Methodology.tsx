import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { HYPER } from "@/lib/model";
import { Shell } from "@/components/ui";

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-fg sm:text-2xl">
        <span className="font-mono text-sm text-faint">{n}.</span> {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function MethodologyPage() {
  const { k, C0, tau } = HYPER;
  return (
    <Shell
      topRight={
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-white/80 uppercase">
          Spec · v1
        </span>
      }
    >
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex min-h-9 items-center gap-1.5 border border-white/40 px-2.5 py-1.5 text-xs font-medium text-white/90 no-underline transition-colors hover:border-white hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Assessment
          </Link>
        </div>
        <header className="step-panel">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Methodology
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            Formal definition of the index, the product decomposition, classification rule, survey
            instruments, and the limited X-profile estimator. Self-report model — not a clinical
            instrument.
          </p>
        </header>

        <div className="step-panel mt-10 space-y-10 text-sm leading-relaxed text-muted sm:text-base">
          <Section n="1" title="Object of measurement">
            <p>
              Let an individual report latent constructs related to partnership desire, realized
              outcomes, online immersion, involuntary framing, identity-content exposure, perceived
              deficits, and affective load. The Cel Index compresses these into a single scalar{" "}
              <span className="math-mono text-fg">F ∈ [0, 1]</span> via a multiplicative product.
              Gender path selects only the output label family (Femcel / Incel / Cel); it does not
              enter the product.
            </p>
          </Section>

          <Section n="2" title="Variables">
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-border bg-surface-2/50 text-faint">
                  <tr>
                    <th className="px-3 py-2 font-mono font-medium">Sym</th>
                    <th className="px-3 py-2 font-medium">Construct</th>
                    <th className="px-3 py-2 font-medium">Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface/60">
                  {[
                    ["I", "Online immersion", "[0,1]"],
                    ["D", "Desired partnership intensity", "[0,1]"],
                    ["S", "Realized relationship / dating success", "[0,1]"],
                    ["B", "Involuntary framing of the gap", "[0,1]"],
                    ["C", "Identity-content exposure", "[0,1]"],
                    ["L", "Perceived looks deficit", "[0,1]"],
                    ["P", "Perceived personality / social deficit", "[0,1]"],
                    ["M", "Perceived dating-market pressure", "[0,1]"],
                    ["R", "Affective charge (resentment, despair, etc.)", "[0,1]"],
                    ["k, C₀", "Identity logistic hyperparameters", "fixed"],
                    ["τ", "Classification threshold", "fixed"],
                  ].map(([sym, construct, domain]) => (
                    <tr key={sym}>
                      <td className="px-3 py-2 font-mono text-fg">{sym}</td>
                      <td className="px-3 py-2">{construct}</td>
                      <td className="px-3 py-2 font-mono text-faint">{domain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section n="3" title="Product model">
            <div className="panel math-mono px-4 py-4 text-sm text-fg sm:text-base">
              <p>F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ(L, P, M) · Ψ(R)</p>
              <p className="mt-3 text-muted">where</p>
              <p className="mt-2 text-fg/90">(x)₊ = max(0, x)</p>
              <p className="text-fg/90">σ(x) = (1 + e⁻ˣ)⁻¹</p>
              <p className="text-fg/90">ρ = clamp₀₁(0.22 + 0.36L + 0.22P + 0.20M)</p>
              <p className="text-fg/90">Ψ = 0.32 + 0.68R</p>
              <p className="mt-3 text-muted">
                hyperparameters: k = {k}, C₀ = {C0}, τ = {tau}
              </p>
            </div>
            <p>
              Multiplicativity encodes necessity: any factor near zero collapses{" "}
              <span className="math-mono text-fg">F</span>. The desire gap{" "}
              <span className="math-mono text-fg">(D − S)₊</span> is the structural core; without an
              open gap the remaining terms cannot produce a high index.
            </p>
          </Section>

          <Section n="4" title="Classification & display score">
            <div className="panel math-mono px-4 py-4 text-sm text-fg">
              <p>label_positive ⟺ F &gt; τ</p>
              <p className="mt-2">S_display = 100 · F ∈ [0, 100]</p>
            </div>
            <p>Tier bands on F (relative to τ):</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="text-fg">High</span>: F &gt; 2.2τ
              </li>
              <li>
                <span className="text-fg">Elevated</span>: τ &lt; F ≤ 2.2τ
              </li>
              <li>
                <span className="text-fg">Borderline</span>: 0.45τ &lt; F ≤ τ
              </li>
              <li>
                <span className="text-fg">Low</span>: F ≤ 0.45τ
              </li>
            </ul>
            <p>Path label: woman → Femcel Index; man → Incel Index; other → Cel Index.</p>
          </Section>

          <Section n="5" title="Survey instruments">
            <p>
              Each construct is elicited with a continuous self-report control on [0, 1] (percent
              scale in the UI). Mapping is direct: slider value becomes the corresponding model
              variable (except ρ and Ψ, which are derived). Live gap{" "}
              <span className="math-mono text-fg">(D − S)₊</span> is shown on the desire step.
            </p>
          </Section>

          <Section n="6" title="X profile prefill (optional)">
            <p className="panel-soft px-3 py-3 text-fg/90">
              Scope: public profile aggregates only — post count, likes, media count, following,
              followers, bio text, account age. We do not ingest private data, DMs, or a full
              post-text corpus (authenticated timeline access is required for that and is not used
              here).
            </p>
            <p>Estimator priors (all clamped to [0, 1]):</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <span className="math-mono text-fg">Î</span> = 0.45·r + 0.25·v + 0.30·f — r
                log-scaled posts/day, v log lifetime posts, f log following
              </li>
              <li>
                <span className="math-mono text-fg">Ĉ</span> from bio keyword hits + post volume +
                media/post ratio (content-mix proxy, not post NLP)
              </li>
              <li>
                <span className="math-mono text-fg">M̂</span> from follower level and
                following/follower asymmetry
              </li>
              <li>
                <span className="math-mono text-fg">R̂</span> from likes/day intensity + bio heat +
                post rate
              </li>
            </ul>
            <p>
              Not estimated from X (must be self-reported): D, S, B, L, P. Every pre-filled slider
              is editable and flagged in the assessment UI with its source signals.
            </p>
          </Section>

          <Section n="7" title="Limitations">
            <ul className="list-disc space-y-2 pl-5">
              <li>Self-report bias and social desirability effects.</li>
              <li>
                Multiplicative form is a structural assumption, not an empirical MLE fit.
              </li>
              <li>Hyperparameters (k, C₀, τ, ρ weights) are fixed design choices.</li>
              <li>
                X priors are coarse aggregate proxies — transparent, but not substitutes for honest
                self-report on D, S, B.
              </li>
              <li>Not validated as a clinical, diagnostic, or psychometric instrument.</li>
            </ul>
          </Section>

          <Section n="8" title="Reference form">
            <div className="panel math-mono border-dashed px-4 py-4 text-sm text-accent-soft">
              <p>F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ(L,P,M) · Ψ(R)</p>
              <p className="mt-1">positive ⟺ F &gt; τ</p>
              <p className="mt-1">S_display = 100 · F</p>
            </div>
          </Section>
        </div>

        <div className="mt-12 border-t border-white/40 pt-8">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center border border-black bg-black px-6 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-92"
          >
            Take the assessment
          </Link>
        </div>
    </Shell>
  );
}
