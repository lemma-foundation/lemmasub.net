# lemmasub.net

Static public website for Lemma.

This repo hosts the public landing page, miner board, and browser solve portal.
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
- `http://127.0.0.1:8877/solve/index.html`
- `http://127.0.0.1:8877/faq/index.html`

There is no build step.

Check the static code plus the Python/JS commitment and portal-signing fixture:

```bash
node --check assets/solve.js
node scripts/check-solve-commitment.js
node scripts/check-miner-dashboard.js
```

## Site Rules

- Keep the public story aligned with the current proof protocol: verified Lean
  proofs decide rewards, earliest valid commitment block wins, and same-block
  valid commitments split.
- `data/miner-dashboard.json` is a static public export from the Lemma manifest
  and solved ledger.
- `/solve/` is a static wallet UI for the Lemma portal API. It must compute the
  same commitment preimage as the Python protocol and never ask for seed
  phrases or private keys. Its hosted proof check must run only after chain
  readback confirms the exact `lemma:v1:<commitment-hash>` payload; the portal
  service enforces the same on-chain commitment gate.
- Do not bring prose judging, reasoning scores, proof-efficiency scoring, or the
  generated-status framing back into this site.
- Do not publish proof scripts, raw validator logs, wallet material, deploy
  keys, bearer tokens, SSH usernames, Droplet inventory, or Lean worker
  endpoints.
