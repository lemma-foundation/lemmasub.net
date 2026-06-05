# lemmasub.net

Static GitHub Pages site for Lemma.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The site has no build step. Open `index.html` directly, or use the preview server above.

## Pages

- `index.html` - hand-maintained homepage.
- `board.html` - real-task board (open `sorry` gaps and restated conjectures).
- `solved.html` - solved-proof explorer (accepted proofs/patches with apply and replay instructions).

`board.html` and `solved.html` are generated from the Proof Atlas real-task artifacts and should be regenerated, not hand-edited:

```bash
uv run lemma site build --atlas ~/lemma-proof-atlas --out /tmp/lemma-site
cp /tmp/lemma-site/board.html /tmp/lemma-site/solved.html .
```

When no real-task data is published yet, the generated pages render honest empty states.

## Content Notes

- Explain Lemma in plain language as verified proof work on real, missing Lean tasks.
- Primary CTA: the task board.
- Keep the homepage centered on the user-facing idea: miners fill real Lean missing-proof gaps; validators verify every submission with Lean; each accepted proof becomes an open, replayable record.
- Keep proof-data value as a downstream byproduct, not the thing sold or scored; do not overstate model-improvement results before they are measured.
- Keep the homepage focused on formal mathematics.
- Make first-use jargon terms clickable with short inline definitions.
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
