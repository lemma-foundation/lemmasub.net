# lemmasub.net

Static GitHub Pages site for Lemma.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The site has no build step. The homepage can also be opened directly from `index.html`; the dashboard data fetch needs the local preview server.

## Dashboard Data

`dashboard/index.html` renders `data/current-problems.json`. Generate that file from the Lemma checkout with:

```bash
uv run python scripts/refresh_site_current_problems.py --site-repo /path/to/lemmasub.net
```

## Content Notes

- Explain Lemma in plain language as an incentive layer for open formal mathematics.
- Primary CTA: `View live dashboard`.
- Keep the homepage centered on: miners submit Lean proofs, validators verify them, and accepted proofs become replayable theorem/proof records in an open corpus of machine-verified mathematics.
- Model-training value is a downstream use case, not the hero framing.
- Do not broaden the homepage beyond formal mathematics.
- Do not use internal shorthand as public copy.
- Keep one small proof example so visitors can see what is being verified.
- Include a small day/night toggle without adding a build step or dependency.
- Avoid legacy payment, ownership, and crypto-first framing.
- Keep the site static, dependency-free, readable on mobile, and free of decorative background line patterns.

## Deployment

GitHub Pages serves the repository root.
