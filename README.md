# lemmasub.net

Static GitHub Pages site for Lemma.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The site has no build step. The homepage can also be opened directly from `index.html`; the dashboard data fetch needs the local preview server.

## Dashboard Data

`dashboard/index.html` loads `https://api.lemmasub.net/current-problems.json` first and falls back to `data/current-problems.json` if the live API is unavailable. Generate the fallback file from the Lemma checkout with:

```bash
uv run python scripts/refresh_site_current_problems.py --site-repo /path/to/lemmasub.net
```

## Content Notes

- Explain Lemma in plain language as an open competition for formal proof.
- Primary CTA: `View live dashboard`.
- Keep the homepage centered on: miners run proof-search agents, validators verify Lean submissions, and verified solutions earn credit.
- Treat proof records, corpus snapshots, and training-data value as supporting publication surfaces, not the hero framing.
- Keep the homepage focused on formal mathematics.
- Do not make the homepage crypto-first.
- Do not imply humans manually proving lemmas is the main scaling path.
- Do not use internal shorthand as public copy.
- Keep one small proof example so visitors can see what is being verified.
- Include a small day/night toggle without adding a build step or dependency.
- Keep the site static, dependency-free, readable on mobile, and free of decorative background line patterns.

## Deployment

GitHub Pages serves the repository root.
