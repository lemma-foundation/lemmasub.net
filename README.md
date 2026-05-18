# lemmasub.net

Static public site for Lemma, an open AlphaProof-style proof-data engine for Lean.

## Local Preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content Principles

- Explain Lemma in plain language before Bittensor or Lean details.
- Say that miners create Lean-verified theorem/proof data.
- Say that validators check proofs with Lean and score verified contributions.
- Make the public corpus the product.
- Mention AlphaProof-style systems and frontier benchmarks as research context, not as endorsement or the v1 paid work stream.
- Say that unsolved-slot value is not redistributed to current solvers.
- Do not use smart-contract, escrow, custody, or owner-emission framing on the homepage.
- Keep the site static, calm, low-jargon, and readable on mobile.
- Use the headline “Train the best open mathematical prover.”

## Deployment

The site is static HTML and CSS. Publish the repository contents from the root.
