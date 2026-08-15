import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds a static GitHub Pages research demo", async () => {
  const [html, app, questions, paper] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/data/questions.csv", import.meta.url), "utf8"),
    readFile(new URL("../dist/paper/MuSP_Bench.pdf", import.meta.url)),
  ]);
  assert.match(html, /MuSP-Bench — Score–Performance Understanding/);
  assert.match(html, /\/assets\//);
  assert.doesNotMatch(html, /\/MuSP-demo\//);
  assert.doesNotMatch(html, /rel=["'](?:shortcut )?icon["']|favicon/i);
  assert.match(app, /A human-authored, score–performance multimodal benchmark/);
  assert.match(app, /490 questions across 24 classical piano and orchestral works/);
  assert.match(app, /<iframe/);
  assert.match(app, /function QuestionIndex/);
  assert.match(app, /function AudioPlayer/);
  assert.match(app, /function ScoreViewer/);
  assert.match(app, /function RouteMark/);
  assert.match(app, /Performance-only/);
  assert.match(app, /Score-only/);
  assert.match(app, /Content breadth/);
  assert.match(app, /breadth-figure/);
  assert.match(app, /Question explorer/);
  assert.match(app, /Question index/);
  assert.match(app, /Hugging Face/);
  assert.equal([...questions.matchAll(/^"Q\d+"/gm)].length, 490);
  assert.ok(paper.length > 50_000);
  assert.doesNotMatch(app, /PIANO-ROLL LENS|tap-button|piano-roll|Tap tempo/);
  assert.doesNotMatch(app, /Every question identifies what evidence|The full question set/);
  assert.doesNotMatch(app, /01 \/ THE QUESTION MAP|02 \/ FOUR ROUTES|03 \/|ANATOMY OF A QUESTION|WHY THIS BENCHMARK/);

  const composers = [
    "bach", "balakirev", "beethoven", "chopin", "debussy", "glinka", "haydn",
    "liszt", "mozart", "rachmaninoff", "schubert", "schumann", "scriabin",
  ];
  await Promise.all(
    composers.map((composer) =>
      access(new URL(`../dist/images/composer-${composer}.webp`, import.meta.url)),
    ),
  );
});
