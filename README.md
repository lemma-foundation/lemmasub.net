# lemmasub.net

Static public site for Lemma, a Lean-only proof-data subnet with a graph-shaped corpus substrate.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content Principles

- Explain Lemma in plain language before Bittensor or verifier details.
- Say that miners create Lean proofs accepted by a deterministic verifier.
- Say that Lean theorem proving is the only production launch domain.
- Say that graph-shaped rows are foundational for future mechanisms.
- Say that validators check artifacts and score verified contributions.
- Make the public corpus the product, with the current corpus described as Lean proof data.
- Explain that Affine-style model miners can consume Lemma corpora, while Affine rewards model dominance and Lemma produces verifier-grounded data.
- Mention future domains only as adapter-roadmap examples: Verus/Rust, SAT/SMT, optimization certificates, and cryptanalysis witnesses.
- Mention AlphaProof-style systems and frontier benchmarks as research context, not as endorsement or the v1 paid work stream.
- Say that unsolved-slot value is not redistributed to current solvers.
- Do not use smart-contract, escrow, custody, or owner-emission framing on the homepage.
- Keep the site static, calm, low-jargon, and readable on mobile.
- Use the headline “Verifier-grounded training data.”

## Deployment

The site is static HTML and CSS. Publish the repository contents from the root.
