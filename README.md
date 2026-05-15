# lemmasub.net

Static public website for Lemma.

This repo hosts the public landing page, miner board, and setup guide.
Keep it boring: static HTML, shared CSS, and links back to the Lemma protocol
repo.

## Local Preview

From the Lemma checkout, generate the dashboard JSON:

```bash
uv run lemma dashboard export --output ../lemmasub.net/data/miner-dashboard.json
```

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8877/`
- `http://127.0.0.1:8877/miners/index.html`
- `http://127.0.0.1:8877/setup/index.html`
- `http://127.0.0.1:8877/faq/index.html`

There is no build step.

Check the static code:

```bash
node scripts/check-miner-dashboard.js
```

## Site Rules

- Keep the public story aligned with the current proof protocol: verified Lean
  proofs earn current-epoch rewards, and unearned budget routes to the
  owner/burn UID.
- `data/miner-dashboard.json` is a static public export from the Lemma manifest
  and solved ledger.
- There is no browser solve portal. Miners use the Lemma CLI/Axon path.
- Do not bring prose judging, reasoning scores, proof-efficiency scoring, or the
  generated-status framing back into this site.
- Do not publish proof scripts, raw validator logs, wallet material, deploy
  keys, bearer tokens, SSH usernames, Droplet inventory, or Lean worker
  endpoints.
