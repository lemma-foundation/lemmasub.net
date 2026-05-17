# lemmasub.net

Static public site for Lemma, a Bittensor subnet for Lean-verified proof discovery.

## Local preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content principles

- Make the proof loop understandable without assuming Bittensor knowledge.
- Center public Formal Conjectures statements as target material.
- State that Lemma is independent and not endorsed by Google DeepMind or the Formal Conjectures authors.
- Keep rewards secondary to objective Lean verification.
- Do not imply guaranteed rewards or live target availability without registry custody metadata.

## Deployment

The site is static HTML, CSS, and JavaScript. Publish the repository contents from the root.
