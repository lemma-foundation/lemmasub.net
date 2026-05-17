# lemmasub.net

Static public site for Lemma, a Bittensor subnet for training the best open mathematical prover with Lean-verified proof data.

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
- Mention Google DeepMind Formal Conjectures as a frontier benchmark, not as the v1 paid work stream or an endorsement.
- Do not use smart-contract, escrow, custody, or owner-emission framing on the homepage.
- Keep the site static, calm, low-jargon, and readable on mobile.
- Use the headline “Train the best open mathematical prover.”

## Deployment

The site is static HTML and CSS. Publish the repository contents from the root.
