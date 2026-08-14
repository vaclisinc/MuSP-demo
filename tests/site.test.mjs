import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("builds a static GitHub Pages research demo", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(html, /MuSP-Bench — Score–Performance Understanding/);
  assert.match(html, /\/MuSP-demo\/assets\//);
  assert.match(app, /A benchmark for musical score–performance/);
  assert.match(app, /<iframe/);
  assert.match(app, /function AudioPlayer/);
  assert.match(app, /View the full dataset on Hugging Face/);
  assert.doesNotMatch(app, /01 \/ THE QUESTION MAP|02 \/ FOUR ROUTES|03 \/|ANATOMY OF A QUESTION|WHY THIS BENCHMARK/);
});
