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
ordinary `git add` commands. Keep the old validator-side
`lemma-public-dashboard.timer` disabled so refresh commits do not return.

## Site Rules

- Keep the public story aligned with the current WTA protocol: verified Lean
  proofs decide rewards, and same-batch ties split equally.
- Do not bring prose judging, reasoning scores, proof-efficiency scoring, or the
  old generated-dashboard framing back into this site.
- Do not publish proof scripts, raw validator logs, wallet material, deploy
  keys, bearer tokens, SSH usernames, Droplet inventory, or Lean worker
  endpoints.
