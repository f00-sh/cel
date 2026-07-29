/**
 * X profile prefill for Cel Index.
 * POST /api/x-import  { "handle": "username" }
 *
 * Primary: public fxtwitter/vxtwitter profile APIs (no token).
 * Optional: X_BEARER_TOKEN for official X API v2 if set.
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

type Metrics = {
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  media: number;
  createdAt?: string;
  name?: string;
  bio?: string;
  avatar?: string;
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

function estimate(handle: string, m: Metrics): Profile {
  const followers = m.followers;
  const following = m.following;
  const tweets = m.tweets;
  const likes = m.likes;
  const media = m.media;
  const bio = m.bio || "";

  let accountDays = 365 * 2;
  if (m.createdAt) {
    const ms = Date.now() - Date.parse(m.createdAt);
    if (Number.isFinite(ms) && ms > 0) accountDays = Math.max(14, ms / 86400000);
  }
  const postsPerDay = tweets / accountDays;
  const likesPerDay = likes / accountDays;
  const mediaRatio = tweets > 0 ? media / tweets : 0;

  // Î = 0.45·r + 0.25·v + 0.30·f
  const r = log01(postsPerDay * 30, 120);
  const v = log01(tweets, 50_000);
  const f = log01(following, 5_000);
  const onlineLife = clamp01(0.45 * r + 0.25 * v + 0.3 * f);

  // Ĉ from bio keywords + volume + media/post
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
    "cel",
  ];
  const keywordHits = keywords.filter((k) => bioL.includes(k)).length;
  const identityContent = clamp01(
    0.3 * Math.min(1, keywordHits / 3) +
      0.35 * v +
      0.2 * clamp01(mediaRatio * 2) +
      0.15 * log01(tweets / Math.max(1, following), 50),
  );

  // M̂ followers + asymmetry
  const followAsym =
    followers + following === 0
      ? 0.5
      : following / Math.max(1, followers + following);
  const marketPressure = clamp01(0.55 * log01(followers, 100_000) + 0.45 * followAsym);

  // R̂ likes/day + bio heat + post rate
  const heat = (bioL.match(/hate|rage|angry|despair|depressed|kill|worthless|manic/g) || [])
    .length;
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
      mapping: "I-hat = 0.45*r + 0.25*v + 0.30*f",
      value: onlineLife,
      signals: `tweets=${tweets}; following=${following}; ~posts/day=${postsPerDay.toFixed(2)}`,
    },
    {
      field: "identityContent",
      modelSymbol: "C",
      mapping: "bio keywords + post volume + media/post ratio",
      value: identityContent,
      signals: `bio_hits=${keywordHits}; media=${media}; tweets=${tweets}`,
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
      signals: `likes=${likes}; bio_heat=${heat}; posts/day=${postsPerDay.toFixed(2)}`,
    },
  ];

  return {
    handle,
    avatar: m.avatar?.replace("_normal", "_400x400"),
    name: m.name,
    bio,
    estimated,
    traces,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "cel-index-cf/1.1 (+https://cel.f00.sh)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fromFxTwitter(handle: string): Promise<Metrics | null> {
  try {
    const json = (await fetchJson(`https://api.fxtwitter.com/${handle}`)) as {
      code?: number;
      user?: {
        screen_name?: string;
        followers?: number;
        following?: number;
        tweets?: number;
        likes?: number;
        media_count?: number;
        name?: string;
        description?: string;
        avatar_url?: string;
        joined?: string;
      };
    };
    if (json.code !== 200 || !json.user) return null;
    const u = json.user;
    return {
      followers: u.followers ?? 0,
      following: u.following ?? 0,
      tweets: u.tweets ?? 0,
      likes: u.likes ?? 0,
      media: u.media_count ?? 0,
      createdAt: u.joined,
      name: u.name,
      bio: u.description,
      avatar: u.avatar_url,
    };
  } catch {
    return null;
  }
}

async function fromVxTwitter(handle: string): Promise<Metrics | null> {
  try {
    const json = (await fetchJson(`https://api.vxtwitter.com/${handle}`)) as {
      screen_name?: string;
      followers_count?: number;
      following_count?: number;
      tweet_count?: number;
      likes?: number;
      media_count?: number;
      name?: string;
      description?: string;
      profile_image_url?: string;
      created_at?: string;
    };
    if (!json.screen_name && json.tweet_count == null) return null;
    return {
      followers: json.followers_count ?? 0,
      following: json.following_count ?? 0,
      tweets: json.tweet_count ?? 0,
      likes: json.likes ?? 0,
      media: json.media_count ?? 0,
      createdAt: json.created_at,
      name: json.name,
      bio: json.description,
      avatar: json.profile_image_url,
    };
  } catch {
    return null;
  }
}

async function fromOfficialX(handle: string, token: string): Promise<Metrics | null> {
  try {
    const url = new URL(`https://api.twitter.com/2/users/by/username/${handle}`);
    url.searchParams.set(
      "user.fields",
      "public_metrics,description,profile_image_url,name,created_at",
    );
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "cel-index-cf/1.1",
      },
    });
    if (!res.ok) return null;
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
    };
    const d = json.data;
    if (!d) return null;
    const pm = d.public_metrics || {};
    return {
      followers: pm.followers_count ?? 0,
      following: pm.following_count ?? 0,
      tweets: pm.tweet_count ?? 0,
      likes: pm.like_count ?? 0,
      media: 0,
      createdAt: d.created_at,
      name: d.name,
      bio: d.description,
      avatar: d.profile_image_url,
    };
  } catch {
    return null;
  }
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

  try {
    // Prefer free public profile APIs; optional official token as extra path
    let metrics =
      (await fromFxTwitter(handle)) ||
      (await fromVxTwitter(handle)) ||
      null;

    if (!metrics && ctx.env.X_BEARER_TOKEN) {
      metrics = await fromOfficialX(handle, ctx.env.X_BEARER_TOKEN);
    }

    if (!metrics) {
      return Response.json(
        {
          ok: false,
          error: `Could not load @${handle}. Check the handle or skip import.`,
        },
        { status: 200 },
      );
    }

    const profile = estimate(handle, metrics);
    return Response.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "lookup failed";
    return Response.json(
      { ok: false, error: `Lookup failed. Continue without import. (${msg})` },
      { status: 200 },
    );
  }
};
