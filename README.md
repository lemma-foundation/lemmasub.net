# lemmasub.net

Static public site for Lemma, a Verified Reasoning Network.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content Principles

- Use the headline "Verified Reasoning Network."
- Explain Lemma in plain language before mentioning Bittensor, Lean, or corpus schemas.
- Lead with: miners solve, validators verify, accepted solutions become open training data.
- Explain that Lean is the first production domain, not the whole long-term identity.
- Say that validators check proofs and score verified contributions.
- Make the public corpus the product, with the current corpus described as Lean proof data.
- Explain that Affine-style model miners can consume Lemma corpora, while Affine rewards model dominance and Lemma produces verified reasoning data.
- Mention future domains only as adapter-roadmap examples: Verus/Rust, SAT/SMT, optimization certificates, and cryptanalysis witnesses.
- Mention AlphaProof-style systems and frontier benchmarks as research context, not as endorsement or the paid work stream.
- Say that unsolved-slot value is not redistributed to current solvers.
- Do not use smart-contract, escrow, custody, or owner-emission framing on the homepage.
- Keep the site static, calm, low-jargon, and readable on mobile.

## Deployment

The site is static HTML and CSS. Publish the repository contents from the root.
