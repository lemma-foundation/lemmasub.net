# lemmasub.net

Static public website for Lemma.

This repo is intentionally separate from the subnet implementation repo. The
website can move quickly while the protocol/operator code stays boring.

## Local Preview

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8877/`
- `http://127.0.0.1:8877/dashboard/`

## Public Dashboard Data

The dashboard reads `data/public-dashboard.json`. In production, a validator or
operator job should upload only this sanitized JSON file. Do not publish raw
validator logs, private exports, wallet files, proof scripts, Droplet details, or
Lean worker endpoints.

UID, coldkey, and hotkey links stay empty until a public explorer URL template is
chosen for the live network.
