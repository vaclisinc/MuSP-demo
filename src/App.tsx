import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

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

const modalityById = Object.fromEntries(modalities.map((item) => [item.id, item])) as Record<Modality, (typeof modalities)[number]>;

function scoreUrl(piece: string) {
  return `${HF_ROOT}/scores/cleaned_reorganized/piece-${piece}.pdf`;
}

function audioUrl(piece: string) {
  return `${HF_ROOT}/audio/piece-${piece}.mp3`;
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function AudioPlayer({ piece, title }: { piece: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [piece]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  };

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={audioUrl(piece)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
      <div className="audio-heading">
        <span>PERFORMANCE AUDIO</span>
        <a href={audioUrl(piece)} target="_blank" rel="noreferrer">source ↗</a>
      </div>
      <div className="audio-main">
        <button className="play-button" onClick={toggle} aria-label={playing ? `Pause ${title}` : `Play ${title}`}>
          {playing ? <span className="pause-icon"><i /><i /></span> : <span className="play-icon" />}
        </button>
        <div className="audio-track">
          <strong>{title}</strong>
          <div className="timeline">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              aria-label="Audio position"
              onChange={(event) => {
                const next = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = next;
                setCurrentTime(next);
              }}
              style={{ "--progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties}
            />
            <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
          </div>
        </div>
      </div>
      <div className="waveform" aria-hidden="true">
        {[12, 22, 38, 18, 46, 29, 54, 34, 18, 42, 62, 48, 25, 38, 52, 31, 18, 44, 58, 35, 21, 38, 49, 28, 16, 33, 42, 22, 12].map((height, index) => <i key={index} style={{ height }} />)}
      </div>
    </div>
  );
}

function ScoreViewer({ piece, title }: { piece: string; title: string }) {
  const url = scoreUrl(piece);
  return (
    <div className="score-viewer">
      <div className="viewer-heading">
        <span>SCORE PDF</span>
        <a href={url} target="_blank" rel="noreferrer">open full score ↗</a>
      </div>
      <iframe src={`${url}#page=1&view=FitH`} title={`Score for ${title}`} loading="lazy" />
      <p>If the embedded viewer is unavailable in your browser, <a href={url} target="_blank" rel="noreferrer">open the PDF directly</a>.</p>
    </div>
  );
}

function Evidence({ question }: { question: Question }) {
  const hasScore = question.modality === "S" || question.modality === "SP" || question.modality === "S/P";
  const hasAudio = question.modality === "P" || question.modality === "SP" || question.modality === "S/P";
  return (
    <div className={`evidence-workbench ${hasScore && hasAudio ? "split" : ""}`}>
      {hasScore && <ScoreViewer piece={question.piece} title={question.title} />}
      {hasAudio && <AudioPlayer piece={question.piece} title={`${question.composer} — ${question.title}`} />}
    </div>
  );
}

export default function App() {
  const [activeLayer, setActiveLayer] = useState<LayerId>("signal");
  const [activeModality, setActiveModality] = useState<Modality | "ALL">("ALL");
  const [expandedQuestion, setExpandedQuestion] = useState<string>("Q2");

  const filteredQuestions = useMemo(
    () => questions.filter((question) => question.layer === activeLayer && (activeModality === "ALL" || question.modality === activeModality)),
    [activeLayer, activeModality],
  );

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
        <p>Musical Score–Performance Understanding Benchmark</p>
        <nav aria-label="Research links">
          <a href="#explorer">Question explorer</a>
          <a href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">Dataset ↗</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">MuSP-Bench · Research demo</p>
          <h1>Can multimodal models understand how a score becomes a <em>performance?</em></h1>
          <p className="hero-lede">
            MuSP-Bench evaluates analytical and interpretive reasoning across complete musical scores and their performances. Its human-authored questions ask models to read notation, hear performed choices, connect the two, and integrate evidence from a single event to an entire work.
          </p>
          <div className="research-axes" aria-label="Benchmark annotation dimensions">
            <span><b>Content</b> pitch → context</span>
            <span><b>Modality</b> S · P · SP · S/P</span>
            <span><b>Horizon</b> short → long</span>
            <span><b>Action</b> identify → explain</span>
          </div>
          <a className="primary-button" href="#explorer">Explore representative questions <span>↓</span></a>
        </div>
        <aside className="research-note">
          <span>BENCHMARK SCOPE</span>
          <p>Questions range from literal score reading to long-horizon judgments about phrasing, rubato, voicing, form, timbre, and expressive intent.</p>
          <div className="score-performance-diagram">
            <div><b>Score</b><small>structure & intent</small><i>𝄞 ♩ ♪ ♩ 𝄐</i></div>
            <span>↔</span>
            <div><b>Performance</b><small>realization & choice</small><i>▂▅▇▃▁▆▇▅▂</i></div>
          </div>
        </aside>
      </section>

      <section className="explorer section" id="explorer">
        <div className="section-heading compact">
          <div>
            <p className="section-number">03 / QUESTION EXPLORER</p>
            <h2>Questions with their<br /><em>required evidence.</em></h2>
          </div>
          <div className="explorer-intro">
            <p>Select a content level and modality. Open a question to inspect the score, listen to the performance, and see the expected answer contract.</p>
            <a href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">View the full dataset on Hugging Face <span>↗</span></a>
          </div>
        </div>

        <div className="filter-block">
          <div className="filter-row">
            <span>Layer</span>
            <div>
              {layers.map((layer) => (
                <button key={layer.id} className={activeLayer === layer.id ? "active" : ""} onClick={() => chooseLayer(layer.id)}>
                  <i style={{ background: layer.color }} />{layer.title}
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
                    <div className="question-metadata">
                      <div className="route-description"><span>{modality.id}</span><p><strong>{modality.label}</strong>{modality.description}</p></div>
                      <div className="answer-contract">
                        <p className="mini-label">Answer contract</p>
                        <dl>
                          <div><dt>Object</dt><dd>{question.answerType}</dd></div>
                          <div><dt>Format</dt><dd>{question.answerFormat}</dd></div>
                          <div><dt>Quantity</dt><dd>{question.answerQuantity}</dd></div>
                        </dl>
                        <div className="format-example"><span>Format example</span><code>{question.formatExample}</code></div>
                        <p className="example-note">Response-shape example from the release, not the ground-truth answer.</p>
                      </div>
                    </div>
                    <Evidence question={question} />
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

      <footer>
        <div className="footer-mark"><span className="mark" aria-hidden="true"><i /><i /><i /></span><strong>MuSP—Bench</strong></div>
        <p>Musical Score–Performance Understanding Benchmark</p>
        <div>
          <a href="https://huggingface.co/datasets/milan477/MuSP-Bench" target="_blank" rel="noreferrer">Dataset ↗</a>
          <a href="https://github.com/vaclisinc/MuSP-demo" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="#top">Top ↑</a>
        </div>
        <small>Question text, modality labels, and answer contracts are drawn from the released dataset. Layer and scope labels in this guided tour are editorial groupings for explanation.</small>
      </footer>
    </main>
  );
}
