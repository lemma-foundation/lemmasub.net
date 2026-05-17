# lemmasub.net

Static public site for Lemma, a Bittensor subnet for training open mathematical AI with Lean-verified proof data.

## Local preview

```bash
python3 -m http.server 8877 --bind localhost
```

Open `http://localhost:8877/`.

The page is dependency-free and can also be opened directly from `index.html`.

## Content principles

- Explain Lemma in plain language before Bittensor or Lean details.
- Say that miners create Lean-verified theorem/proof data.
- Say that validators check proofs with Lean and score verified contributions.
- Make the public corpus the product.
- Mention Google DeepMind's Formal Conjectures as a frontier benchmark, not as the v1 paid work stream or an endorsement.
- Do not use smart contract, escrow, bounty custody, or owner-emission framing on the homepage.
- Keep animations subtle and respect reduced-motion settings.

## Deployment

The site is static HTML, CSS, and JavaScript. Publish the repository contents from the root.
