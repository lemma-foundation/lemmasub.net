# lemmasub.net

Static public site for Lemma, a Bittensor subnet for solving Google DeepMind's Formal Conjectures with Lean-checked proofs.

## Local preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content principles

- Make the proof loop understandable without assuming Bittensor knowledge.
- Say above the fold that Lemma solves open conjectures from Google DeepMind's public `formal-conjectures` repository.
- Explain the closed loop from Google DeepMind conjecture to Lemma bounty, Lean proof, payout eligibility, proof artifact, and upstream pull request.
- Explain miners as proof searchers, validators as proof checkers, and Lean as the judge.
- State that Lemma is independent and not endorsed by Google DeepMind or the Formal Conjectures authors after the core story is clear.
- Keep rewards secondary to objective Lean verification.
- State that upstream pull request acceptance is independent from Lemma bounty eligibility.
- Do not promise rewards or live target availability without registry custody metadata.

## Deployment

The site is static HTML, CSS, and JavaScript. Publish the repository contents from the root.
