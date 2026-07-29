# AGENTS.md — Cel Index

## Product

**Cel Index** — web self-assessment at https://cel.f00.sh

## Edge (Cloudflare)

- Pages project: `f00-cel`
- Custom domain: `cel.f00.sh`
- Package host: none (web app)
- X import: Pages Function under `/_serverFn/*` (optional `X_BEARER_TOKEN`)
- Do not use Vercel or GitHub Pages for delivery

## Language

Static frontend (shipped build under `site/`) + Cloudflare Pages Functions (TypeScript).

## Public copy

Product-only. No agent/process/DNS chatter on the site.
