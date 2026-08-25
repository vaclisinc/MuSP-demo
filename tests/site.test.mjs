import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(app, /Advanced multimodal benchmarking of music understanding across/);
  assert.match(app, /className="score-word">score/);
  assert.match(app, /className="performance-word">performance/);
  assert.match(app, /18 classical piano pieces or movements and 6 orchestral excerpts/);
  assert.match(app, /460 open-ended questions/);
  assert.match(app, /<iframe/);
  assert.match(app, /function AudioPlayer/);
  assert.match(app, /function ScoreViewer/);
  assert.match(app, /function QuestionDetail/);
  assert.match(app, /Released answer/);
  assert.match(app, /function AnswerReveal/);
  assert.match(app, /function TapTempo/);
  assert.match(app, /function PianoHelper/);
  assert.match(app, /function playPitch/);
  assert.match(app, /\[0, 1\]\.flatMap/);
  assert.match(app, /\["SP", "S\/P", "P", "S"\]/);
  assert.match(app, /return modality === "SP" \? "S&P"/);
  assert.match(app, /answer_example/);
  assert.match(app, /answers: r\.answers/);
  assert.match(app, /Performance only/);
  assert.match(app, /Score only/);
  assert.match(app, /Question explorer/);
  assert.match(app, /Hugging Face/);
  assert.match(questions.split("\n", 1)[0], /"answer_example","answers"/);
  assert.equal([...questions.matchAll(/^"musp_\d+"/gm)].length, 490);
  assert.ok(paper.length > 50_000);
  assert.doesNotMatch(app, /pianist-performance|function Portrait/);
});
