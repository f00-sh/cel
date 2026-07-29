# Cel Index

**[cel.f00.sh](https://cel.f00.sh)** — Femcel / Incel self-assessment from a formal product model.

```
F = I · (D − S)₊ · B · σ(k(C − C₀)) · ρ(L, P, M) · Ψ(R)
```

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind v4
- **Host:** Cloudflare Pages (`f00-cel`) → https://cel.f00.sh
- **X import:** Pages Function `POST /api/x-import` (optional `X_BEARER_TOKEN`)

Source lives under `src/`. This is a reconstruction from the production product model and UI (original session tree was not on disk).

## Develop

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=f00-cel --branch=main
```

Optional:

```bash
npx wrangler pages secret put X_BEARER_TOKEN --project-name=f00-cel
```

## Layout

| Path | Role |
|------|------|
| `src/lib/model.ts` | Product model, classification, captions |
| `src/pages/Assessment.tsx` | Multi-step survey + results |
| `src/pages/Methodology.tsx` | Spec page |
| `src/lib/scorecard.ts` | Canvas PNG export |
| `functions/api/x-import.ts` | Edge X prefill |

## License

MIT.
