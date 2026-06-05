# lemmasub.net

Static GitHub Pages site for Lemma.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The site has no build step. Open `index.html` directly, or use the preview server above.

## Content Notes

- Explain Lemma in plain language as an open competition that produces public verified proof data.
- Primary CTA: `Read docs`.
- Keep the homepage centered on the user-facing idea: miners compete to prove Lean theorem-proving tasks; validators verify proofs; accepted proofs become open, replayable proof records.
- Keep proof-data value in the hero path, but do not overstate model-improvement results before they are measured.
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
