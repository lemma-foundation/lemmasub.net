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

## Public Dashboard Data

The dashboard reads `data/public-dashboard.json`. Pushing HTML, CSS, or JS
changes does not make the dashboard live by itself. The live site is static:
browsers fetch whatever JSON file is currently committed in this repo. If no
machine refreshes that file, the dashboard will be real but stale.

The source of truth for that JSON file is the Lemma repo exporter:

```bash
cd LOCAL_WORKSPACE/lemma
NETUID=467 \
SUBTENSOR_NETWORK=test \
SUBTENSOR_CHAIN_ENDPOINT=wss://test.finney.opentensor.ai:443 \
PYTHONDONTWRITEBYTECODE=1 \
.venv/bin/python -m tools.public_dashboard \
  --summary-jsonl /var/lib/lemma/training.jsonl \
  --json-out LOCAL_WORKSPACE/lemmasub.net/data/public-dashboard.json \
  --html-out /private/tmp/lemma-public-dashboard.html
```

Run the exporter on a schedule from the operator environment, then publish only
the refreshed `data/public-dashboard.json` file. Cron, launchd, GitHub Actions,
or a static-host deploy job are all fine as long as the job has testnet access,
the validator summary export, and Git push access.

Set the network values explicitly. Without those environment variables, the
exporter falls back to Finney/netuid 0. The public Lemma testnet dashboard should
use `SUBTENSOR_NETWORK=test` and `NETUID=467`.

For the live site, the recommended path is a validator-side cron or launchd job
on one always-on machine. That can be your local machine if it stays online, or
a VPS (Virtual Private Server) if you want steadier uptime.

Use the machine that already has the validator summary export when possible.
That is usually the validator/operator host, not a Lean-worker-only host. A
Lean worker can run the refresh job only if it also has the Lemma repo, this
site repo, access to the validator summary JSONL, network access, and a tightly
scoped Git deploy key for pushing this repo. If the Lean worker is just a private
verify box, keep it that way and run the exporter from the validator host or a
separate tiny automation machine.

```bash
cd LOCAL_WORKSPACE/lemma
NETUID=467 \
SUBTENSOR_NETWORK=test \
SUBTENSOR_CHAIN_ENDPOINT=wss://test.finney.opentensor.ai:443 \
PYTHONDONTWRITEBYTECODE=1 \
.venv/bin/python -m tools.public_dashboard \
  --summary-jsonl /var/lib/lemma/training.jsonl \
  --json-out LOCAL_WORKSPACE/lemmasub.net/data/public-dashboard.json \
  --html-out /private/tmp/lemma-public-dashboard.html

cd LOCAL_WORKSPACE/lemmasub.net
if ! git diff --quiet -- data/public-dashboard.json; then
  git add data/public-dashboard.json
  git commit -m "Refresh public dashboard data"
  git push origin main
fi
```

A 2-5 minute cadence is reasonable for the public site. The machine running this
needs the Lemma repo, this site repo, network access, validator summary export
access, and Git push access to `spacetime-tao/lemmasub.net`.

Minimal cron shape:

```cron
*/3 * * * * cd LOCAL_WORKSPACE/lemma && NETUID=467 SUBTENSOR_NETWORK=test SUBTENSOR_CHAIN_ENDPOINT=wss://test.finney.opentensor.ai:443 PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m tools.public_dashboard --summary-jsonl /var/lib/lemma/training.jsonl --json-out LOCAL_WORKSPACE/lemmasub.net/data/public-dashboard.json --html-out /private/tmp/lemma-public-dashboard.html && cd LOCAL_WORKSPACE/lemmasub.net && if ! git diff --quiet -- data/public-dashboard.json; then git add data/public-dashboard.json && git commit -m "Refresh public dashboard data" && git push origin main; fi
```

For launchd, use the same command with a `StartInterval` around `180` to `300`
seconds.

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

If multiple validators later publish summaries, do not concatenate those files
and call the result global. Add an aggregator that unions by network, netuid,
lookback, UID, and theorem ID, then label the dashboard as a merged network view.

The website should publish only sanitized public dashboard output: theorem
triplet, seed metadata, public metagraph miner fields, and aggregate passed-proof
counts. Do not publish raw validator logs, private exports, wallet files,
proof scripts, Droplet details, SSH usernames, or Lean worker endpoints.

UID, coldkey, and hotkey links stay empty until a public explorer URL template is
chosen for the live network.
