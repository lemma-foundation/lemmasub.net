# lemmasub.net

Static public website for Lemma.

Lemma is framed publicly as a Bittensor subnet for machine-checkable
mathematics: miners produce Lean proofs, validators verify them mechanically,
and rewards attach to proof correctness.

The site has two task surfaces:

- `/cadence/` for recurring validator-scored cadence tasks.
- `/bounties/` for manual winner-take-all Formal Conjectures campaigns.

## Local Preview

From the Lemma checkout, generate public JSON:

```bash
uv run lemma dashboard export --output ../lemmasub.net/data/cadence.json
uv run lemma dashboard export-bounties --output ../lemmasub.net/data/bounties.json
```

Live feeds are served from the validator droplet, not from Git commits:

```bash
uv run lemma dashboard publish --output-dir /var/www/lemma-live
```

Then preview the static site:

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

Open:

- `http://127.0.0.1:8877/`
- `http://127.0.0.1:8877/cadence/`
- `http://127.0.0.1:8877/bounties/`
- `http://127.0.0.1:8877/setup/`
- `http://127.0.0.1:8877/faq/`

Check the static code:

```bash
node scripts/check-task-pages.js
```

## Site Rules

- Keep the public story direct: Lemma is a proof market for Lean-verified work.
  Cadence tasks are automatic subnet reward work; bounty tasks are manual
  owner-paid campaigns.
- Public cadence JSON shows task state, UIDs, and full hotkeys. It must not
  publish proof bodies, proof hashes, proof nonces, or commitment hashes.
- Live task feeds should be tiny overwritten JSON files from the validator
  droplet, not GitHub commit churn or historical archives.
- The setup page should describe OpenAI-compatible providers rather than tying
  setup to one company. Keep provider links visible for OpenAI, Gemini, Chutes,
  and Anthropic, and keep the Anthropic copy clear that its compatibility layer
  is for testing and comparison rather than preferred production use.
- Every setup command panel should have a copy button, and wrapped code must
  remain readable at desktop, split-window, and mobile widths.
- There is no browser solve portal. Miners use the Lemma CLI/Axon path.
