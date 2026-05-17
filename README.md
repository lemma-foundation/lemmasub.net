# lemmasub.net

Static public website for Lemma.

This repo hosts the public landing page and dashboard. It intentionally stays
separate from the subnet implementation repo so the website can remain a small
static surface while Lemma protocol and operator code stay boring.

## Local Preview

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8877/`
- `http://127.0.0.1:8877/dashboard/index.html`

Opening `index.html` or `dashboard/index.html` directly from Finder should load
the shared CSS and JavaScript, but some browsers block `file://` JSON fetches.
Use the local preview server when checking live dashboard data.

Quick local checks:

```bash
node scripts/check-dashboard.js
node --check assets/site.js
python3 -m json.tool data/public-dashboard.json >/dev/null
```

## Public Dashboard Data

The dashboard reads `data/public-dashboard.json`. Pushing HTML, CSS, or JS
changes does not make the dashboard live by itself. The live site is static:
browsers fetch whatever JSON file is currently committed in this repo. If no
machine refreshes that file, the dashboard will be real but stale.

The source of truth for that JSON file is the Lemma repo exporter,
`tools/public_dashboard.py`. Run it from the operator environment after validator
rounds, then publish only the refreshed `data/public-dashboard.json` file. The
clean live path is round-aligned: when the validator appends summary rows, a
small publisher regenerates and pushes this JSON.

Set the network values explicitly. Without those environment variables, the
exporter falls back to Finney/netuid 0. The public Lemma testnet dashboard should
use `SUBTENSOR_NETWORK=test` and `NETUID=467`.

Keep the Lemma checkout on the refresh machine current before publishing dashboard
JSON. In particular, the site expects the exporter contract that writes
`schema_version: 4`, `uid_variant_problems`, `theorem_display_mode`,
`theorems.*.plain_english`, `theorems.*.source_lane`,
`proofs_passed_prior_round`, and `miners[].passed_prior_round`. If the
validator summary JSONL is stale or missing, the exporter should publish
unavailable round data rather than inventing a count from the rolling 24-hour
totals.

For the live site, the recommended path is a validator-side post-round publish
step on one always-on machine. That can be your local machine if it stays online,
or a VPS (Virtual Private Server) if you want steadier uptime.

Use the machine that already has the validator summary export when possible.
That is usually the validator/operator host, not a Lean-worker-only host. A
Lean worker can run the refresh job only if it also has the Lemma repo, this
site repo, access to the validator summary JSONL, network access, and a tightly
scoped Git deploy key for pushing this repo. If the Lean worker is just a private
verify box, keep it that way and run the exporter from the validator host or a
separate tiny automation machine.

The Lemma repo includes the preferred publisher:
`deploy/scripts/lemma-refresh-public-dashboard`. Its default site checkout is
`/opt/lemmasub.net`, and it regenerates the JSON through a temporary file,
validates it, installs it, commits only `data/public-dashboard.json`, and pushes
`main` when the file changed. The matching systemd units are
`deploy/systemd/lemma-public-dashboard.service`,
`deploy/systemd/lemma-public-dashboard.path`, and
`deploy/systemd/lemma-public-dashboard.timer`.

Run the publisher on the machine that has the validator summary export, network
access, and a tightly scoped deploy key for this repo. The path unit is the
round-aligned trigger; the timer is a three-minute fallback if one trigger is
missed.

In plain English: a validator/operator machine runs the Lemma exporter every few
minutes. The exporter asks the chain for public metagraph data, reads that
validator's local summary export for proofs that passed, and writes a sanitized
`data/public-dashboard.json`. That machine commits and pushes only that JSON
file to this static site repo. Browsers on `lemmasub.net` fetch the JSON file;
they never connect to the validator, wallet files, logs, proof scripts, or Lean
worker.

### Proof Counts

The current public site uses one canonical validator-side summary export. A
"proof that passed" on the dashboard means a unique theorem ID per UID accepted
by Lean in that export's configured lookback window. The Lemma exporter
deduplicates within one summary file by UID and theorem ID.

The top dashboard metric should show proofs passed in the most recent exported
round. The miner table should keep the rolling 24-hour count so operators can
compare recent miner activity without pretending it is the current round's
score. The miner table also marks whether each UID passed that latest exported
round when the summary export is available.

If multiple validators later publish summaries, do not concatenate those files
and call the result global. Add an aggregator that unions by network, netuid,
lookback, UID, and theorem ID, then label the dashboard as a merged network view.

The website should publish only sanitized public dashboard output: theorem
triplet, seed metadata, public metagraph miner fields, and aggregate passed-proof
counts. Do not publish raw validator logs, private exports, wallet files,
proof scripts, Droplet details, SSH usernames, or Lean worker endpoints.

UID, coldkey, and hotkey links stay empty until a public explorer URL template is
chosen for the live network.

## Public Bounty Data

The bounty page may show candidate targets, but `active_bounties` must contain
only rows backed by funded `LemmaBountyEscrow` state on Bittensor EVM. Unfunded
targets stay candidates or drafts. Do not publish proof text, salts, private
validator data, custody keys, or any manual-payout promise in the static feed.
