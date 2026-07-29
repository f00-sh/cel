/**
 * Optional X profile prefill for Cel Index.
 * POST /api/x-import  { "handle": "username" }
 * Secret: X_BEARER_TOKEN (X API v2)
 */

type Estimated = {
  onlineLife: number;
  identityContent: number;
  marketPressure: number;
  affectLoad: number;
};

type PrefillField = keyof Estimated;

type Trace = {
  field: PrefillField;
  modelSymbol: string;
  mapping: string;
  signals: string;
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
    like_count?: number;
  },
  bio: string,
  avatar?: string,
  name?: string,
  createdAt?: string,
): Profile {
  const followers = metrics.followers_count ?? 0;
  const following = metrics.following_count ?? 0;
  const tweets = metrics.tweet_count ?? 0;
  const likes = metrics.like_count ?? 0;

  let accountDays = 365 * 3;
  if (createdAt) {
    const ms = Date.now() - Date.parse(createdAt);
    if (Number.isFinite(ms) && ms > 0) accountDays = Math.max(30, ms / 86400000);
  }
  const postsPerDay = tweets / accountDays;
  const likesPerDay = likes / accountDays;

  const r = log01(postsPerDay * 30, 120);
  const v = log01(tweets, 50_000);
  const f = log01(following, 5_000);
  const onlineLife = clamp01(0.45 * r + 0.25 * v + 0.3 * f);

  const bioL = bio.toLowerCase();
  const keywords = [
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
  ];
  const keywordHits = keywords.filter((k) => bioL.includes(k)).length;
  // media/post ratio unavailable without media_count field; volume proxy only
  const identityContent = clamp01(
    0.35 * Math.min(1, keywordHits / 3) +
      0.4 * v +
      0.25 * log01(tweets / Math.max(1, following), 50),
  );

  const followAsym =
    followers + following === 0
      ? 0.5
      : following / Math.max(1, followers + following);
  const marketPressure = clamp01(0.55 * log01(followers, 100_000) + 0.45 * followAsym);

  const heat =
    (bioL.match(/hate|rage|angry|despair|depressed|kill|worthless/g) || []).length;
  const affectLoad = clamp01(
    0.4 * log01(likesPerDay * 30, 500) + 0.25 * Math.min(1, heat / 2) + 0.35 * r,
  );

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
      mapping: "Î = 0.45·r + 0.25·v + 0.30·f",
      value: onlineLife,
      signals: `tweet_count=${tweets}; following=${following}; ~posts/day=${postsPerDay.toFixed(2)}`,
    },
    {
      field: "identityContent",
      modelSymbol: "C",
      mapping: "bio keywords + post volume (no post NLP)",
      value: identityContent,
      signals: `bio_keyword_hits=${keywordHits}; tweet_count=${tweets}`,
    },
    {
      field: "marketPressure",
      modelSymbol: "M",
      mapping: "followers + following/follower asymmetry",
      value: marketPressure,
      signals: `followers=${followers}; following=${following}`,
    },
    {
      field: "affectLoad",
      modelSymbol: "R",
      mapping: "likes/day + bio heat + post rate",
      value: affectLoad,
      signals: `like_count=${likes}; bio_heat=${heat}; posts/day=${postsPerDay.toFixed(2)}`,
    },
  ];

  return { handle, avatar, name, bio, estimated, traces };
}

async function lookupX(handle: string, token: string): Promise<Profile | { error: string }> {
  const url = new URL(`https://api.twitter.com/2/users/by/username/${handle}`);
  url.searchParams.set(
    "user.fields",
    "public_metrics,description,profile_image_url,name,created_at",
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
      created_at?: string;
      public_metrics?: {
        followers_count?: number;
        following_count?: number;
        tweet_count?: number;
        like_count?: number;
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
    d.name,
    d.created_at,
  );
}

export const onRequestPost: PagesFunction<{ X_BEARER_TOKEN?: string }> = async (ctx) => {
  let body: unknown = null;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const handle = normalizeHandle(
    body && typeof body === "object" && body !== null && "handle" in body
      ? (body as { handle?: unknown }).handle
      : null,
  );
  if (!handle) {
    return Response.json(
      { ok: false, error: "Enter a valid X handle (1–15 letters, numbers, _)." },
      { status: 200 },
    );
  }
  const token = ctx.env.X_BEARER_TOKEN;
  if (!token) {
    return Response.json(
      {
        ok: false,
        code: "not_configured",
        error:
          "X import is temporarily unavailable. Skip and set I, C, M, and R yourself — scoring is the same.",
      },
      { status: 200 },
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
      { status: 200 },
    );
  }
};
