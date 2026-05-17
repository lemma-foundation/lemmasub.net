# lemmasub.net

Static public site for Lemma, a Bittensor subnet for Lean-verified proof discovery and public proof artifacts.

## Local preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content principles

- Make the proof loop understandable without assuming Bittensor knowledge.
- Center public Formal Conjectures statements as target material.
- Explain the closed loop from Formal Conjectures target to proof artifact and upstream PR candidate.
- State that Lemma is independent and not endorsed by Google DeepMind or the Formal Conjectures authors.
- Keep rewards secondary to objective Lean verification.
- State that upstream PR acceptance is independent from Lemma reward eligibility.
- Do not promise rewards or live target availability without registry custody metadata.

## Deployment

The site is static HTML, CSS, and JavaScript. Publish the repository contents from the root.
