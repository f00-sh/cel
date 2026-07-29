/**
 * TanStack Start serverFn shim for Cel Index X-profile import.
 * Client calls: POST /_serverFn/<hash> with header x-tsr-serverFn: true
 * Body: { "data": { "handle": "username" } }
 *
 * Optional secret: X_BEARER_TOKEN (X API v2) for real public_metrics.
 * Without it, returns ok:false so the survey continues without prefill.
 */

type Estimated = {
  onlineLife: number;
  identityContent: number;
  marketPressure: number;
  affectLoad: number;
};

type Trace = {
  field: keyof Estimated;
  modelSymbol: string;
  signals: string[];
  value: number;
};

type Profile = {
  handle: string;
  avatar?: string;
  name?: string;
  bio?: string;
  estimated: Estimated;
  traces: Trace[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function log01(n: number, scale: number): number {
  return clamp01(Math.log1p(Math.max(0, n)) / Math.log1p(scale));
}

function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const h = raw.trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,15}$/.test(h)) return null;
  return h;
}

function estimateFromMetrics(
  handle: string,
  metrics: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  },
  bio: string,
  avatar?: string,
  name?: string
): Profile {
  const followers = metrics.followers_count ?? 0;
  const following = metrics.following_count ?? 0;
  const tweets = metrics.tweet_count ?? 0;

  // Rough activity proxies (public aggregates only; no timeline NLP).
  const postsPerDay = tweets > 0 ? tweets / (365 * 3) : 0; // assume ~3y account without created_at
  const r = log01(postsPerDay * 30, 120); // monthly-ish
  const v = log01(tweets, 50_000);
  const f = log01(following, 5_000);
  const onlineLife = clamp01(0.45 * r + 0.25 * v + 0.3 * f);

  const bioL = bio.toLowerCase();
  const keywordHits = [
    "lonely",
    "alone",
    "femcel",
    "incel",
    "blackpill",
    "looksmax",
    "single",
    "forever alone",
    "no bf",
    "no gf",
  ].filter((k) => bioL.includes(k)).length;
  const identityContent = clamp01(
    0.35 * Math.min(1, keywordHits / 3) + 0.4 * v + 0.25 * log01(tweets / Math.max(1, following), 50)
  );

  const followAsym =
    followers + following === 0
      ? 0.5
      : following / Math.max(1, followers + following);
  const marketPressure = clamp01(
    0.55 * log01(followers, 100_000) + 0.45 * followAsym
  );

  // Without engagement/timeline, keep affect modest and transparent.
  const affectLoad = clamp01(0.35 * onlineLife + 0.25 * identityContent + 0.4 * 0.45);

  const estimated: Estimated = {
    onlineLife,
    identityContent,
    marketPressure,
    affectLoad,
  };

  const traces: Trace[] = [
    {
      field: "onlineLife",
      modelSymbol: "I",
      value: onlineLife,
      signals: [
        `tweet_count=${tweets}`,
        `following=${following}`,
        "proxy posts/day from lifetime volume",
      ],
    },
    {
      field: "identityContent",
      modelSymbol: "C",
      value: identityContent,
      signals: [
        `bio_keyword_hits=${keywordHits}`,
        `tweet_count=${tweets}`,
        "no post NLP — bio + volume only",
      ],
    },
    {
      field: "marketPressure",
      modelSymbol: "M",
      value: marketPressure,
      signals: [`followers=${followers}`, `following=${following}`],
    },
    {
      field: "affectLoad",
      modelSymbol: "R",
      value: affectLoad,
      signals: ["coarse proxy from I/C (no timeline)"],
    },
  ];

  return {
    handle,
    avatar,
    name,
    bio,
    estimated,
    traces,
  };
}

async function lookupX(handle: string, token: string): Promise<Profile | { error: string }> {
  const url = new URL(`https://api.twitter.com/2/users/by/username/${handle}`);
  url.searchParams.set(
    "user.fields",
    "public_metrics,description,profile_image_url,name"
  );
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "cel-index-cf/1.0",
    },
  });
  if (res.status === 404) return { error: `No X user @${handle}` };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `X API ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}` };
  }
  const json = (await res.json()) as {
    data?: {
      username?: string;
      name?: string;
      description?: string;
      profile_image_url?: string;
      public_metrics?: {
        followers_count?: number;
        following_count?: number;
        tweet_count?: number;
        listed_count?: number;
      };
    };
    errors?: Array<{ detail?: string; title?: string }>;
  };
  if (!json.data) {
    const msg = json.errors?.[0]?.detail || json.errors?.[0]?.title || "user not found";
    return { error: msg };
  }
  const d = json.data;
  return estimateFromMetrics(
    (d.username || handle).toLowerCase(),
    d.public_metrics || {},
    d.description || "",
    d.profile_image_url?.replace("_normal", "_400x400"),
    d.name
  );
}

export const onRequestPost: PagesFunction<{ X_BEARER_TOKEN?: string }> = async (ctx) => {
  const id = ctx.params.id;
  // Only the known TanStack serverFn id from the current client build
  const KNOWN =
    "5914f6941cfd14f7c7e70f5ab42d8d44a36ec77e5cd8c7eac2844649e5f0d137";
  if (id !== KNOWN) {
    return Response.json(
      { ok: false, error: "unknown server function" },
      { status: 404 }
    );
  }

  let body: unknown = null;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const data =
    body && typeof body === "object" && body !== null && "data" in body
      ? (body as { data?: { handle?: unknown } }).data
      : (body as { handle?: unknown } | null);

  const handle = normalizeHandle(data?.handle);
  if (!handle) {
    return Response.json(
      { ok: false, error: "Enter a valid X handle (1–15 letters, numbers, _)." },
      { status: 200 }
    );
  }

  const token = ctx.env.X_BEARER_TOKEN;
  if (!token) {
    return Response.json(
      {
        ok: false,
        error:
          "X import is not configured on this edge (missing X_BEARER_TOKEN). Continue without import.",
      },
      { status: 200 }
    );
  }

  try {
    const result = await lookupX(handle, token);
    if ("error" in result) {
      return Response.json({ ok: false, error: result.error }, { status: 200 });
    }
    return Response.json({ ok: true, profile: result }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "lookup failed";
    return Response.json(
      { ok: false, error: `Lookup failed. Continue without import. (${msg})` },
      { status: 200 }
    );
  }
};
