"use client";

import { useMemo, useState } from "react";

type Modality = "S" | "P" | "SP" | "S/P";
type LayerId = "signal" | "time" | "language" | "structure" | "meaning";

type Question = {
  id: string;
  layer: LayerId;
  scope: "Local" | "Passage" | "Whole work";
  modality: Modality;
  composer: string;
  title: string;
  question: string;
  answerType: string;
  answerFormat: string;
  answerQuantity: string;
  formatExample: string;
  piece: string;
};

const HF_ROOT = "https://huggingface.co/datasets/milan477/MuSP-Bench/resolve/main";

const layers: Array<{
  id: LayerId;
  number: string;
  eyebrow: string;
  title: string;
  short: string;
  description: string;
  concepts: string[];
  evidence: string;
  color: string;
}> = [
  {
    id: "signal",
    number: "01",
    eyebrow: "The musical atoms",
    title: "Pitch & sound",
    short: "What is there?",
    description: "Begin with the smallest perceptible or notated units: pitch identity, register, spelling, and timbral color.",
    concepts: ["Pitch", "Register", "Accidentals", "Timbre"],
    evidence: "A note, sonority, or brief instant",
    color: "var(--coral)",
  },
  {
    id: "time",
    number: "02",
    eyebrow: "Events become gestures",
    title: "Time & realization",
    short: "How is it played?",
    description: "Notes gain duration, pulse, articulation, dynamics, ornament, and performed timing. The score and the sounding result may now diverge.",
    concepts: ["Rhythm", "Meter", "Tempo", "Articulation", "Dynamics"],
    evidence: "A beat, bar, or a few seconds",
    color: "var(--amber)",
  },
  {
    id: "language",
    number: "03",
    eyebrow: "Relations create syntax",
    title: "Musical language",
    short: "How do events relate?",
    description: "Individual events connect horizontally and vertically—as melody, harmony, voicing, counterpoint, and orchestration.",
    concepts: ["Melody", "Harmony", "Voicing", "Counterpoint", "Orchestration"],
    evidence: "Several bars or an instrumental exchange",
    color: "var(--leaf)",
  },
  {
    id: "structure",
    number: "04",
    eyebrow: "Memory across distance",
    title: "Form & organization",
    short: "How does it unfold?",
    description: "The listener must connect distant evidence: repetition, variation, themes, phrases, sections, development, and large-scale form.",
    concepts: ["Theme", "Phrasing", "Variation", "Segmentation", "Form"],
    evidence: "A section, non-contiguous spans, or the full work",
    color: "var(--blue)",
  },
  {
    id: "meaning",
    number: "05",
    eyebrow: "From structure to understanding",
    title: "Interpretation & context",
    short: "What does it mean?",
    description: "The highest layer asks what a realization communicates—and what the music reveals about character, style, identity, and artistic intent.",
    concepts: ["Character", "Emotion", "Expressive intent", "Style", "Context"],
    evidence: "Integrated score, performance, and musical knowledge",
    color: "var(--violet)",
  },
];

const modalities: Array<{ id: Modality; label: string; description: string; count: number }> = [
  { id: "S", label: "Score", description: "The written score alone contains the minimum evidence.", count: 180 },
  { id: "P", label: "Performance", description: "The sounding performance alone is required.", count: 106 },
  { id: "SP", label: "Score + performance", description: "The question depends on relating notation to its realization.", count: 72 },
  { id: "S/P", label: "Either route", description: "Score or performance can independently support an answer.", count: 132 },
];

const questions: Question[] = [
  {
    id: "Q2", layer: "signal", scope: "Local", modality: "S", composer: "Bach", title: "Fugue BWV 875",
    question: "What is the largest interval between two consecutive notes in the soprano voice of bars 3–4?",
    answerType: "Interval", answerFormat: "Interval quality and size", answerQuantity: "Single",
    formatExample: "perfect fifth", piece: "01",
  },
  {
    id: "Q184", layer: "signal", scope: "Local", modality: "P", composer: "Bach", title: "Prelude BWV 848",
    question: "Between 00:16 and 00:19, the performer brings out two melodic lines in two different registers. What is the highest note within the lowest of the two emphasized melodies?",
    answerType: "Pitch", answerFormat: "Pitch with octave number", answerQuantity: "Single",
    formatExample: "G♯3", piece: "02",
  },
  {
    id: "Q186", layer: "time", scope: "Passage", modality: "P", composer: "Bach", title: "Prelude BWV 848",
    question: "Listen to the performance and feel the pulse given by the slower-moving voice in the opening. Which BPM range best matches the tempo?",
    answerType: "Choice", answerFormat: "One choice copied exactly from the question", answerQuantity: "Single",
    formatExample: "50–60", piece: "02",
  },
  {
    id: "Q254", layer: "time", scope: "Local", modality: "SP", composer: "Bach", title: "Fugue BWV 875",
    question: "The performer plays bars 1–2 with different articulation: sometimes legato, sometimes staccato. Which eighth notes are played staccato?",
    answerType: "Pitch", answerFormat: "Pitch with octave number", answerQuantity: "List ordered by appearance",
    formatExample: "A2, C♯3, E♭4", piece: "01",
  },
  {
    id: "Q198", layer: "language", scope: "Local", modality: "P", composer: "Beethoven", title: "Symphony No. 2, movement 3",
    question: "Which instrument plays the main melody, 0:11 onwards?",
    answerType: "Short text", answerFormat: "Instrument name", answerQuantity: "Single",
    formatExample: "Piano", piece: "20",
  },
  {
    id: "Q193", layer: "language", scope: "Passage", modality: "SP", composer: "Beethoven", title: "Piano Sonata No. 21, movement 1",
    question: "In the re-exposition, after the theme recurs in diminution, the piece briefly modulates to A major. The A major passage concludes with a half cadence at what time?",
    answerType: "Timestamp", answerFormat: "M:SS or MM:SS, rounded down", answerQuantity: "Single",
    formatExample: "02:54", piece: "05",
  },
  {
    id: "Q325", layer: "language", scope: "Passage", modality: "S/P", composer: "Bach", title: "Fugue BWV 875",
    question: "After the secondary sixteenth-note motif is first presented as A4–B♭4–A4–G4–B♭4–A4–G4–F♯4, what are the first notes of its next three appearances?",
    answerType: "Pitch", answerFormat: "Pitch with octave number", answerQuantity: "List ordered by appearance",
    formatExample: "A4, G♯3, B♭2", piece: "01",
  },
  {
    id: "Q188", layer: "structure", scope: "Passage", modality: "P", composer: "Balakirev", title: "Islamey",
    question: "The passage beginning at 0:21 forms a distinct section through its repeated melodic pattern and texture. Until what time does the music remain recognizably within that same pattern and texture?",
    answerType: "Timestamp", answerFormat: "M:SS or MM:SS, rounded down", answerQuantity: "Single",
    formatExample: "02:54", piece: "03",
  },
  {
    id: "Q263", layer: "structure", scope: "Whole work", modality: "SP", composer: "Balakirev", title: "Islamey",
    question: "The first part concludes at 2:04. Up until there, how many times in total were bars 1–2 played or varied, counting a variation only when the full two-bar passage and essential melody remain?",
    answerType: "Integer", answerFormat: "Positive integer", answerQuantity: "Single",
    formatExample: "4", piece: "03",
  },
  {
    id: "Q334", layer: "structure", scope: "Whole work", modality: "S/P", composer: "Beethoven", title: "Piano Sonata No. 23, movement 1",
    question: "The coda, which starts in bar 203, reviews the two main themes: in what order? Consider a theme evoked when it is played or varied for at least four bars.",
    answerType: "Integer", answerFormat: "Positive integer", answerQuantity: "List ordered by appearance",
    formatExample: "1, 1, 1, 2", piece: "04",
  },
  {
    id: "Q183", layer: "meaning", scope: "Passage", modality: "P", composer: "Bach", title: "Fugue BWV 875",
    question: "Between 1:26 and 1:39, the performer uses an unusual rubato. Which note carries the greatest expressive tension, receiving the strongest dramatic and interpretive emphasis?",
    answerType: "Pitch", answerFormat: "Pitch class without octave number", answerQuantity: "Single",
    formatExample: "A", piece: "01",
  },
  {
    id: "Q330", layer: "meaning", scope: "Passage", modality: "S/P", composer: "Beethoven", title: "Piano Sonata No. 23, movement 1",
    question: "When the first theme is played for the second time in a different texture, what emotion likely best describes the new nuance the composer and performer bring to it?",
    answerType: "Choice", answerFormat: "One choice copied exactly from the question", answerQuantity: "Single",
    formatExample: "Not supplied in release", piece: "04",
  },
  {
    id: "Q360", layer: "meaning", scope: "Whole work", modality: "S/P", composer: "Scriabin", title: "Etude Op. 8 No. 11",
    question: "What is the main source of challenge for the pianist in this piece: polyphonic texture, complex polyrhythms, emotional depth, virtuosic arpeggios, large leaps, hand synchronization, or rapid scales?",
    answerType: "Choice", answerFormat: "One choice copied exactly from the question", answerQuantity: "Single",
    formatExample: "Not supplied in release", piece: "17",
  },
  {
    id: "Q362", layer: "meaning", scope: "Whole work", modality: "S/P", composer: "Bach", title: "Fugue BWV 875",
    question: "What is the title of this work?",
    answerType: "Short text", answerFormat: "Short phrase", answerQuantity: "Single",
    formatExample: "Waltz in E major, Op. 39 No. 5", piece: "01",
  },
];

const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer])) as Record<LayerId, (typeof layers)[number]>;
const modalityById = Object.fromEntries(modalities.map((item) => [item.id, item])) as Record<Modality, (typeof modalities)[number]>;

function scoreUrl(piece: string) {
  return `${HF_ROOT}/scores/cleaned_reorganized/piece-${piece}.pdf`;
}

function audioUrl(piece: string) {
  return `${HF_ROOT}/audio/piece-${piece}.mp3`;
}

export default function Home() {
  const [activeLayer, setActiveLayer] = useState<LayerId>("signal");
  const [activeModality, setActiveModality] = useState<Modality | "ALL">("ALL");
  const [expandedQuestion, setExpandedQuestion] = useState<string>("Q2");

  const filteredQuestions = useMemo(
    () => questions.filter((question) => question.layer === activeLayer && (activeModality === "ALL" || question.modality === activeModality)),
    [activeLayer, activeModality],
  );

  const currentLayer = layerById[activeLayer];

  const chooseLayer = (id: LayerId) => {
    setActiveLayer(id);
    const first = questions.find((question) => question.layer === id && (activeModality === "ALL" || question.modality === activeModality));
    setExpandedQuestion(first?.id ?? "");
  };

  const chooseModality = (id: Modality | "ALL") => {
    setActiveModality(id);
    const first = questions.find((question) => question.layer === activeLayer && (id === "ALL" || question.modality === id));
    setExpandedQuestion(first?.id ?? "");
  };

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="MuSP-Bench home">
          <span className="mark" aria-hidden="true"><i /><i /><i /></span>
          <span>MuSP<span>—Bench</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#map">Question map</a>
          <a href="#explorer">Examples</a>
          <a href="#anatomy">Anatomy</a>
        </nav>
        <a className="header-link" href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">
          Dataset <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span>Human-authored benchmark</span><span>Score × performance</span></p>
          <h1>Music understanding,<br /><em>one layer at a time.</em></h1>
          <p className="hero-lede">
            Explore how 490 questions move from a single note to the shape, interpretation, and identity of a complete musical work.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#map">Start with the first layer <span>↓</span></a>
            <a className="text-link" href="#explorer">Browse real questions <span>→</span></a>
          </div>
          <dl className="hero-stats" aria-label="Dataset summary">
            <div><dt>490</dt><dd>questions</dd></div>
            <div><dt>24</dt><dd>complete works</dd></div>
            <div><dt>4</dt><dd>modality routes</dd></div>
            <div><dt>10</dt><dd>content families</dd></div>
          </dl>
        </div>

        <div className="hero-stair" aria-label="Five levels of musical understanding">
          <p className="stair-label">A question can climb</p>
          {[...layers].reverse().map((layer, index) => (
            <button
              key={layer.id}
              className={`stair stair-${index + 1}`}
              style={{ "--step-color": layer.color } as React.CSSProperties}
              onClick={() => { chooseLayer(layer.id); document.getElementById("map")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <span>{layer.number}</span>
              <strong>{layer.title}</strong>
              <small>{layer.short}</small>
            </button>
          ))}
          <div className="stair-axis"><span>local evidence</span><span>whole-work understanding</span></div>
        </div>
      </section>

      <section className="question-map section" id="map">
        <div className="section-heading">
          <div>
            <p className="section-number">01 / THE QUESTION MAP</p>
            <h2>Zoom out.<br /><em>The question changes.</em></h2>
          </div>
          <p>Each layer keeps the details below it, then asks the model to connect more musical evidence across time and modality.</p>
        </div>

        <div className="map-layout">
          <div className="layer-list" role="tablist" aria-label="Understanding layers">
            {layers.map((layer) => (
              <button
                key={layer.id}
                role="tab"
                aria-selected={activeLayer === layer.id}
                className={activeLayer === layer.id ? "active" : ""}
                onClick={() => chooseLayer(layer.id)}
                style={{ "--step-color": layer.color } as React.CSSProperties}
              >
                <span>{layer.number}</span>
                <span><strong>{layer.title}</strong><small>{layer.short}</small></span>
                <b aria-hidden="true">→</b>
              </button>
            ))}
          </div>

          <article className="layer-detail" style={{ "--step-color": currentLayer.color } as React.CSSProperties}>
            <div className="detail-topline"><span>{currentLayer.number}</span><span>{currentLayer.eyebrow}</span></div>
            <h3>{currentLayer.title}</h3>
            <p>{currentLayer.description}</p>
            <div className="concept-cloud">
              {currentLayer.concepts.map((concept) => <span key={concept}>{concept}</span>)}
            </div>
            <div className="evidence-scale">
              <div className="scale-track"><i /></div>
              <span>Evidence footprint</span>
              <strong>{currentLayer.evidence}</strong>
            </div>
            <p className="layer-prompt">At this layer, ask: <strong>“{currentLayer.short}”</strong></p>
          </article>
        </div>
      </section>

      <section className="modalities section" id="routes">
        <div className="section-heading compact">
          <div>
            <p className="section-number">02 / FOUR ROUTES TO EVIDENCE</p>
            <h2>The same music.<br /><em>Different ways of knowing.</em></h2>
          </div>
          <p>Modality describes the minimum evidence needed—not merely the files supplied to a model.</p>
        </div>
        <div className="modality-grid">
          {modalities.map((item) => (
            <article className={`modality-card modality-${item.id.replace("/", "-")}`} key={item.id}>
              <div><span className="modality-code">{item.id}</span><span className="modality-count">{item.count} Q</span></div>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <button onClick={() => { chooseModality(item.id); document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" }); }}>
                See examples <span>→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="explorer section" id="explorer">
        <div className="section-heading compact">
          <div>
            <p className="section-number">03 / QUESTION EXPLORER</p>
            <h2>See the benchmark<br /><em>in its own words.</em></h2>
          </div>
          <p>These are released MuSP-Bench questions, lightly typeset for reading. Select a layer and an evidence route to compare what changes.</p>
        </div>

        <div className="filter-block">
          <div className="filter-row">
            <span>Layer</span>
            <div>
              {layers.map((layer) => (
                <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => chooseLayer(layer.id)}>
                  <i style={{ background: layer.color }} />{layer.number} {layer.title}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span>Evidence</span>
            <div>
              <button className={activeModality === "ALL" ? "active" : ""} onClick={() => chooseModality("ALL")}>All routes</button>
              {modalities.map((item) => (
                <button key={item.id} className={activeModality === item.id ? "active" : ""} onClick={() => chooseModality(item.id)}>{item.id} · {item.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="results-topline">
          <span>{filteredQuestions.length} curated example{filteredQuestions.length === 1 ? "" : "s"}</span>
          <span>From the released 490-question CSV</span>
        </div>

        <div className="question-list">
          {filteredQuestions.length > 0 ? filteredQuestions.map((question) => {
            const open = expandedQuestion === question.id;
            const modality = modalityById[question.modality];
            return (
              <article className={`question-card ${open ? "open" : ""}`} key={question.id}>
                <button className="question-summary" onClick={() => setExpandedQuestion(open ? "" : question.id)} aria-expanded={open}>
                  <span className={`route route-${question.modality.replace("/", "-")}`}>{question.modality}</span>
                  <span className="question-main">
                    <small>{question.id} · {question.composer} · {question.title}</small>
                    <strong>{question.question}</strong>
                  </span>
                  <span className="question-scope">{question.scope}</span>
                  <span className="question-toggle" aria-hidden="true">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="question-detail">
                    <div className="answer-contract">
                      <p className="mini-label">Answer contract</p>
                      <dl>
                        <div><dt>Object</dt><dd>{question.answerType}</dd></div>
                        <div><dt>Format</dt><dd>{question.answerFormat}</dd></div>
                        <div><dt>Quantity</dt><dd>{question.answerQuantity}</dd></div>
                      </dl>
                      <div className="format-example"><span>Format example</span><code>{question.formatExample}</code></div>
                      <p className="example-note">A response-shape example from the release—not this question’s ground-truth answer.</p>
                    </div>
                    <div className="evidence-panel">
                      <p className="mini-label">Minimum evidence route</p>
                      <h4>{modality.id} · {modality.label}</h4>
                      <p>{modality.description}</p>
                      <div className="asset-actions">
                        {(question.modality === "S" || question.modality === "SP" || question.modality === "S/P") && (
                          <a href={scoreUrl(question.piece)} target="_blank" rel="noreferrer">Open score <span>↗</span></a>
                        )}
                        {(question.modality === "P" || question.modality === "SP" || question.modality === "S/P") && (
                          <audio controls preload="none" src={audioUrl(question.piece)} aria-label={`Performance audio for ${question.title}`} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          }) : (
            <div className="empty-state">
              <span>∅</span><h3>No curated example in this slice—yet.</h3>
              <p>The released dataset still contains questions for this route. Choose “All routes” to continue the guided tour.</p>
              <button onClick={() => chooseModality("ALL")}>Show all routes</button>
            </div>
          )}
        </div>
      </section>

      <section className="anatomy section" id="anatomy">
        <div className="section-heading light compact">
          <div>
            <p className="section-number">04 / ANATOMY OF A QUESTION</p>
            <h2>Difficulty is not<br /><em>a single ladder.</em></h2>
          </div>
          <p>Every MuSP-Bench question sits at the intersection of four independent decisions. Together, they explain why two questions about the same note can demand very different understanding.</p>
        </div>

        <div className="axis-grid">
          <article><span>01</span><h3>Content</h3><p>What musical idea is being understood?</p><div>Pitch → Time → Realization → Melody → Harmony → Orchestration → Organization → Interpretation → Timbre → Context</div></article>
          <article><span>02</span><h3>Modality</h3><p>Where does the minimum evidence live?</p><div>S · P · SP · S/P</div></article>
          <article><span>03</span><h3>Horizon</h3><p>How far must evidence be integrated?</p><div>Short · Medium · Long · Any</div></article>
          <article><span>04</span><h3>Action</h3><p>What must the reasoner do with it?</p><div>Identify · Localize · Quantify · Compare · Infer · Transcribe · Explain</div></article>
        </div>

        <div className="worked-example">
          <div className="worked-label"><span>Worked reading</span><strong>Q193</strong></div>
          <blockquote>“The A major passage concludes with a half cadence at what time?”</blockquote>
          <div className="worked-path">
            <div><span>Content</span><strong>Harmony</strong><small>recognize the cadence</small></div>
            <i>+</i>
            <div><span>Modality</span><strong>SP</strong><small>align score and audio</small></div>
            <i>+</i>
            <div><span>Horizon</span><strong>Passage</strong><small>track a modulation</small></div>
            <i>+</i>
            <div><span>Action</span><strong>Localize</strong><small>return a timestamp</small></div>
          </div>
        </div>
      </section>

      <section className="why section">
        <div className="why-copy">
          <p className="section-number">WHY THIS BENCHMARK</p>
          <h2>A score is a plan.<br />A performance is <em>a choice.</em></h2>
          <p>Musicians move continually between written structure and realized sound. MuSP-Bench asks whether multimodal models can do the same—not only name chords or notes, but follow a phrase, hear a structural turn, and explain how a performer shapes it.</p>
          <a href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">Explore the complete dataset <span>↗</span></a>
        </div>
        <div className="translation-diagram" aria-label="Score to performance translation">
          <div className="paper-panel"><span>THE SCORE</span><b>intent</b><div className="staff">𝄞 &nbsp; ♩ ♪ ♩ &nbsp; 𝄐</div><small>pitch · rhythm · harmony · structure</small></div>
          <div className="translation-arrow"><span>realized as</span><i>→</i><span>understood through</span><i>←</i></div>
          <div className="sound-panel"><span>THE PERFORMANCE</span><b>choice</b><div className="wave">▂▅▇▃▁▆▇▅▂▃▆▃▁</div><small>timing · phrasing · voicing · timbre</small></div>
        </div>
      </section>

      <footer>
        <div className="footer-mark"><span className="mark" aria-hidden="true"><i /><i /><i /></span><strong>MuSP—Bench</strong></div>
        <p>Musical Score–Performance Understanding Benchmark</p>
        <div>
          <a href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">Dataset ↗</a>
          <a href="https://huggingface.co/datasets/milan477/MuSP-Bench/blob/main/data/questions.csv" target="_blank" rel="noreferrer">Questions CSV ↗</a>
          <a href="#top">Back to top ↑</a>
        </div>
        <small>Question text, modality labels, and answer contracts are drawn from the released dataset. Layer and scope labels in this guided tour are editorial groupings for explanation.</small>
      </footer>
    </main>
  );
}
