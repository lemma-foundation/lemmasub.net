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

- Explain Lemma in plain language as an open competition that produces public verified proof data.
- Primary CTA: `View live dashboard`.
- Keep the homepage centered on the user-facing idea: miners compete to solve Lean theorem-proving tasks; validators verify proofs; accepted proofs become public training data for future theorem-proving models.
- Keep proof-data value in the hero path, but do not overstate model-improvement results before they are measured.
- Keep the homepage focused on formal mathematics.
- Make first-use jargon terms clickable with short inline definitions.
- Dashboard timing should show local task-set time first and block numbers second.
- Dashboard level cap should display the public `frontier_depth` as a one-based user-facing level: open tasks can be this level or lower.
- Dashboard task cards should show each task's own one-based level from `queue_depth`, not the raw zero-based value.
- Do not use `K`, `epoch`, or pool-size language in public dashboard copy.
- Do not make the homepage crypto-first.
- Do not imply humans manually proving lemmas is the main scaling path.
- Use `Data` for the public Proof Atlas link; do not use `Corpus` as a product label.
- Do not introduce builder or auditor as public protocol roles.
- Do not use ingredient repo names as the product frame; use them only when explaining reproducible task generation.
- Do not use internal shorthand as public copy.
- Keep one small proof example so visitors can see what is being verified.
- Include a small day/night toggle without adding a build step or dependency.
- Keep the site static, dependency-free, readable on mobile, and free of decorative background line patterns.

## Deployment

GitHub Pages serves the repository root.
