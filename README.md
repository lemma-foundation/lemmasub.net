# lemmasub.net

Static public website for Lemma.

This repo hosts the small public landing page and FAQ. Keep it boring: static
HTML, shared CSS, a tiny theme script, and links back to the Lemma protocol
repo.

## Local Preview

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8877/`
- `http://127.0.0.1:8877/faq/index.html`
- `http://127.0.0.1:8877/dashboard/index.html`

Quick local checks:

```bash
node --check assets/site.js
```

## Dashboard Status

The old public dashboard refresh is retired. This repo no longer tracks
`data/public-dashboard.json`, and `.gitignore` blocks it from being re-added by
ordinary `git add` commands.

If `Refresh public dashboard data` commits continue appearing, they are coming
from an older validator-side publisher outside this repo. Stop the old
`lemma-public-dashboard.service`, `lemma-public-dashboard.path`, and
`lemma-public-dashboard.timer` units on that host before publishing more site
changes.

## Site Rules

- Keep the public story aligned with the current WTA protocol: first valid Lean
  proof wins.
- Do not bring prose judging, reasoning scores, proof-efficiency scoring, or the
  old generated-dashboard framing back into this site.
- Do not publish proof scripts, raw validator logs, wallet material, deploy
  keys, bearer tokens, SSH usernames, Droplet inventory, or Lean worker
  endpoints.
