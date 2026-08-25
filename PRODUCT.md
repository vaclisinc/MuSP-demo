# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Music-information-retrieval researchers, paper readers, and benchmark evaluators who need to understand MuSP-Bench quickly and inspect real score–performance questions with their evidence.

## Product Purpose

MuSP-demo is the public, static companion to MuSP-Bench. It explains the benchmark and lets visitors explore the released question set alongside the score and/or performance evidence required to answer each question.

## Positioning

MuSP-Bench evaluates musical understanding across symbolic scores, audio performances, and their relationship, while preserving explicit modality and answer-contract semantics for every human-authored question.

## Operating Context

Visitors typically arrive from the paper or Hugging Face dataset, then move from compact benchmark framing directly into a released question, its recorded performance and/or score evidence, and an optional full-set index.

## Capabilities and Constraints

- The site is a React/Vite static GitHub Pages deployment.
- Released question wording, modality labels, and answer-contract semantics are canonical and must not be rewritten.
- Interface groupings are editorial aids and must remain explicitly distinguished from canonical annotations.
- Score evidence, performance evidence, and score–performance comparison must remain clearly identifiable.
- The complete released example set should be browsable rather than represented by only a small showcase subset.
- The attached paper is served as a static PDF from the repository.

## Brand Commitments

- Use the name “MuSP-Bench” or “MuSP benchmark.”
- The benchmark’s subject is the living relationship between composed score and performed interpretation.
- Composer portraits from represented repertoire and authentic piano-performance imagery are first-class visual evidence, not decoration.

## Evidence on Hand

- Released dataset: https://huggingface.co/datasets/milan477/MuSP-Bench
- Canonical paper PDF served by the site: `public/paper/MuSP_Bench.pdf`
- Existing score PDFs, performance audio, canonical questions, and answer contracts referenced by `src/App.tsx`.
- Source benchmark repository and tooling in sibling `../muno-lm`.

## Product Principles

- Let visitors enter a real question and inspect its evidence before asking them to read methodology.
- Keep score, performance, and comparison routes legible at every step.
- Make the full benchmark feel explorable without weakening canonical semantics.
- Prefer real musical artifacts and people over generic research-dashboard decoration.
