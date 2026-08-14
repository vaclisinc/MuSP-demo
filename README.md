# MuSP-demo

Research demo for **MuSP-Bench**, a human-authored benchmark for analytical and interpretive reasoning across musical scores and performances.

The question explorer presents representative released questions alongside the score PDF and/or performance audio needed to answer them. Question wording, modality, and answer contracts come from the canonical [`questions.csv`](https://huggingface.co/datasets/milan477/MuSP-Bench/blob/main/data/questions.csv). Content-level and scope groupings in the interface are editorial aids, not additional canonical annotations.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` are built and deployed through GitHub Pages.
