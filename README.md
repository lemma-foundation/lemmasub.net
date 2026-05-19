# lemmasub.net

Static GitHub Pages site for Lemma.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The site has no build step and can also be opened directly from `index.html`.

## Content Notes

- Explain Lemma in plain language before introducing Lean, Bittensor, or corpus.
- Primary CTA: `Learn how it works`.
- Keep the homepage centered on: miners submit proofs, Lemma verifies them, accepted proofs become open training data.
- Keep one small proof example so visitors can see what is being verified.
- Include a small day/night toggle without adding a build step or dependency.
- Avoid legacy payment, ownership, and crypto-first framing.
- Keep the site static, dependency-free, readable on mobile, and free of decorative background line patterns.

## Deployment

GitHub Pages serves the repository root.
