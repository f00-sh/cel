# Cel Index

**[cel.f00.sh](https://cel.f00.sh)** — Femcel / Incel self-assessment from a formal product model.

## Hosting

Cloudflare is the only delivery plane:

| Surface | Host |
|---------|------|
| Site + SPA | Cloudflare Pages project `f00-cel` → https://cel.f00.sh |
| X profile import | Pages Function `POST /_serverFn/<id>` |

GitHub holds source/history only.

## Deploy

```bash
# from repo root
npx wrangler pages deploy site --project-name=f00-cel --branch=main
```

Optional secret for live X prefill:

```bash
npx wrangler pages secret put X_BEARER_TOKEN --project-name=f00-cel
```

Without `X_BEARER_TOKEN`, the survey still works; import returns a soft error and the user continues manually.

## Layout

| Path | Role |
|------|------|
| `site/` | Static app (HTML/CSS/JS) + SPA `_redirects` |
| `functions/_serverFn/[id].ts` | TanStack serverFn-compatible X import |
| `.github/workflows/pages.yml` | Deploy on push |

## License

MIT.
