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

## Theme

Brand tokens/fonts from hub only: `https://f00.sh/theme/f00-theme-14.css` (Heartbox palette, Onyx). Do not redefine brand colors/fonts locally. Source: heartbox.f00.sh.

## Visual law (all f00 products)

- **Contrasts:** Nirvana *Heart-Shaped Box* video / Heartbox palette — hospital-night bg, cream fg, poppy accent, verse sky, silver metal.
- **Text & boxes:** Nirvana *Bleach* album — hard square frames, catalog mono labels, no rounded glass, thin rules, raw liner-note density.
- Theme CSS: `https://f00.sh/theme/f00-theme-14.css` (do not invent brand hex or soft UI radii).

