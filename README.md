# MuSP-demo

An interactive, public-facing guide to the question hierarchy in MuSP-Bench.

The demo organizes the paper's content taxonomy into five explanatory layers, then lets readers compare released benchmark questions across score (`S`), performance (`P`), joint score–performance (`SP`), and either-route (`S/P`) modalities.

Question text, modality labels, and answer contracts come from the released [`questions.csv`](https://huggingface.co/datasets/milan477/MuSP-Bench/blob/main/data/questions.csv). Layer and scope labels are editorial groupings used by this demo.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```
