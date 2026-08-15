import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds a static GitHub Pages research demo", async () => {
  const [html, app, questions, roll, paper] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/data/questions.csv", import.meta.url), "utf8"),
    readFile(new URL("../dist/data/piano-roll.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/paper/MuSP_Bench.pdf", import.meta.url)),
  ]);
  assert.match(html, /MuSP-Bench — Score–Performance Understanding/);
  assert.match(html, /\/MuSP-demo\/assets\//);
  assert.match(app, /Musical score–performance understanding/);
  assert.match(app, /<iframe/);
  assert.match(app, /function EvidenceLab/);
  assert.match(app, /PIANO-ROLL LENS/);
  assert.match(app, /Hugging Face/);
  assert.equal(questions.trim().split("\n").length, 521);
  assert.ok(Object.keys(JSON.parse(roll)).length >= 18);
  assert.ok(paper.length > 50_000);
  assert.doesNotMatch(app, /01 \/ THE QUESTION MAP|02 \/ FOUR ROUTES|03 \/|ANATOMY OF A QUESTION|WHY THIS BENCHMARK/);
});
