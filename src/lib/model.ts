/** Cel Index product model — recovered from production build. */

export const HYPER = {
  k: 8,
  C0: 0.42,
  tau: 0.1,
} as const;

export type PathId = "woman" | "man" | "other";

export type SurveyState = {
  path: PathId;
  handle: string | null;
  desire: number;
  outcomes: number;
  involuntary: number;
  onlineLife: number;
  identityContent: number;
  looksDeficit: number;
  personalityDeficit: number;
  marketPressure: number;
  affectLoad: number;
};

export const DEFAULT_SURVEY: SurveyState = {
  path: "woman",
  handle: null,
  desire: 0.7,
  outcomes: 0.25,
  involuntary: 0.7,
  onlineLife: 0.55,
  identityContent: 0.4,
  looksDeficit: 0.45,
  personalityDeficit: 0.4,
  marketPressure: 0.5,
  affectLoad: 0.45,
};

export type ModelInputs = {
  I: number;
  D: number;
  S: number;
  B: number;
  C: number;
  L: number;
  P: number;
  M: number;
  R: number;
  k: number;
  C0: number;
  tau: number;
};

export type Factor = {
  key: string;
  label: string;
  value: number;
  weight: string;
};

export type Breakdown = {
  F: number;
  gap: number;
  id: number;
  rho: number;
  psi: number;
  factors: Factor[];
};

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function toModelInputs(s: SurveyState): ModelInputs {
  return {
    I: s.onlineLife,
    D: s.desire,
    S: s.outcomes,
    B: s.involuntary,
    C: s.identityContent,
    L: s.looksDeficit,
    P: s.personalityDeficit,
    M: s.marketPressure,
    R: s.affectLoad,
    ...HYPER,
  };
}

/**
 * F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ(L,P,M) · Ψ(R)
 * ρ = clamp₀₁(0.22 + 0.36L + 0.22P + 0.20M)
 * Ψ = 0.32 + 0.68R
 */
export function evaluate(e: ModelInputs): Breakdown {
  const gap = Math.max(0, e.D - e.S);
  const id = sigmoid(e.k * (e.C - e.C0));
  const rho = clamp01(0.22 + 0.36 * e.L + 0.22 * e.P + 0.2 * e.M);
  const psi = 0.32 + 0.68 * e.R;
  const F = clamp01(e.I * gap * e.B * id * rho * psi);
  return {
    F,
    gap,
    id,
    rho,
    psi,
    factors: [
      { key: "I", label: "Online immersion", value: e.I, weight: "multiplies" },
      { key: "(D−S)₊", label: "Desire gap", value: gap, weight: "multiplies" },
      { key: "B", label: "Involuntary framing", value: e.B, weight: "multiplies" },
      { key: "σ(C)", label: "Identity exposure", value: id, weight: "multiplies" },
      { key: "ρ", label: "Self / market pressure", value: rho, weight: "multiplies" },
      { key: "Ψ", label: "Affect load", value: psi, weight: "multiplies" },
    ],
  };
}

export function displayScore(F: number): number {
  return Math.round(clamp01(F) * 1000) / 10;
}

export type PathLabels = {
  short: string;
  full: string;
  dual: string;
};

export function pathLabels(path: PathId): PathLabels {
  if (path === "woman") return { short: "Femcel", full: "Femcel Index", dual: "femcel" };
  if (path === "man") return { short: "Incel", full: "Incel Index", dual: "incel" };
  return { short: "Cel", full: "Cel Index", dual: "cel" };
}

export type Tier = {
  tier: "high" | "elevated" | "borderline" | "low";
  title: string;
  blurb: string;
};

export function classify(F: number, tau: number, path: PathId): Tier {
  const r = pathLabels(path);
  if (F > tau * 2.2) {
    return {
      tier: "high",
      title: `High ${r.short}`,
      blurb:
        "F is well above τ. The desire–outcome gap is open and the remaining multipliers amplify rather than cancel.",
    };
  }
  if (F > tau) {
    return {
      tier: "elevated",
      title: `Elevated ${r.short}`,
      blurb:
        "F > τ. Classification is positive; inspect the factor panel for which terms dominate.",
    };
  }
  if (F > tau * 0.45) {
    return {
      tier: "borderline",
      title: "Borderline",
      blurb:
        "Near threshold. Small changes in gap, immersion, or involuntary framing can flip the label.",
    };
  }
  return {
    tier: "low",
    title: `Low ${r.short}`,
    blurb:
      "F ≤ τ. At least one material factor is low, or the desire–outcome gap is closed.",
  };
}

export function factorExtremes(factors: Factor[]) {
  const sorted = [...factors].sort((a, b) => a.value - b.value);
  return { lowest: sorted[0]!, highest: sorted[sorted.length - 1]! };
}

export const SITE_URL = "https://cel.f00.sh";

export function shareCaption(args: {
  path: PathId;
  handle: string | null;
  score: number;
  F: number;
  tau: number;
  tierTitle: string;
  highest: string;
  lowest: string;
}): string {
  const t = pathLabels(args.path);
  const who = args.handle ? `@${args.handle.replace(/^@/, "")}` : "my";
  return `${who} ${t.full}: ${args.score.toFixed(1)} / 100
${args.tierTitle} · F=${args.F.toFixed(4)} (τ=${args.tau})

max factor: ${args.highest}
min factor: ${args.lowest}

F = I · (D − S)₊ · B · σ(C) · ρ · Ψ
${SITE_URL}
${SITE_URL}/methodology`;
}

export type StepId =
  | "landing"
  | "x"
  | "path"
  | "desire"
  | "control"
  | "online"
  | "self"
  | "affect"
  | "result";

export const STEPS: StepId[] = [
  "landing",
  "x",
  "path",
  "desire",
  "control",
  "online",
  "self",
  "affect",
  "result",
];
