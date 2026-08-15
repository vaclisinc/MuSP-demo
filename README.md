# MuSP-demo

Research demo for **MuSP-Bench**, a human-authored benchmark for analytical and interpretive reasoning across musical scores and performances.

The question explorer presents the complete released question set alongside the score PDF and/or performance audio needed to answer each item. Question wording, modality, and answer contracts come from the [released MuSP-Bench dataset](https://huggingface.co/datasets/milan477/MuSP-Bench). Content-level groupings in the interface are editorial aids, not additional canonical annotations.

The evidence workbench includes performance-speed and tap-tempo controls plus score-derived piano-roll previews. The piano-roll playhead follows the performance proportionally and is explicitly not presented as a score–audio alignment.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` are built and deployed through GitHub Pages.
