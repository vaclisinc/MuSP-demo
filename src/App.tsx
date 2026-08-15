import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Modality = "S" | "P" | "SP" | "S/P";
type Topic = "sound" | "time" | "relations" | "form" | "meaning";

type Question = {
  id: string;
  pieceNumber: string;
  composer: string;
  title: string;
  modality: Modality;
  fullQuestion: string;
  answerObjectType: string;
  answerFormat: string;
  answerQuantity: string;
  answerExample: string;
  cleanedReorganizedScoreFilename: string;
  audioFilename: string;
  topic: Topic;
};

type RollNote = { t: number; d: number; p: number; v: number };
type RollData = Record<string, { source: string; notes: RollNote[] }>;

const BASE = import.meta.env.BASE_URL;
const HF_ROOT = "https://huggingface.co/datasets/milan477/MuSP-Bench/resolve/main";
const DATASET_URL = "https://huggingface.co/datasets/milan477/MuSP-Bench";

const modalityOrder: Modality[] = ["P", "SP", "S/P", "S"];
const modalityMeta: Record<Modality, { label: string; short: string; description: string }> = {
  P: { label: "Performance", short: "Hear", description: "The sounding performance contains the required evidence." },
  SP: { label: "Score ↔ performance", short: "Compare", description: "Answer by relating notation to its realization." },
  "S/P": { label: "Either route", short: "Choose", description: "Score or performance can independently support the answer." },
  S: { label: "Score", short: "Read", description: "The written score contains the required evidence." },
};

const topicMeta: Record<Topic, string> = {
  sound: "Pitch & sound",
  time: "Time & realization",
  relations: "Musical relations",
  form: "Form & memory",
  meaning: "Interpretation",
};

const portraitByComposer: Record<string, string> = {
  Bach: `${BASE}images/composer-bach.webp`,
  Beethoven: `${BASE}images/composer-beethoven.webp`,
  Debussy: `${BASE}images/composer-debussy.webp`,
};

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>;
}

function ArrowIcon() {
  return <Icon><path d="M5 12h13M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing
    ? <Icon size={22}><path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></Icon>
    : <Icon size={22}><path d="m9 6 9 6-9 6V6Z" fill="currentColor" /></Icon>;
}

function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function deriveTopic(question: string, objectType: string): Topic {
  const text = `${question} ${objectType}`.toLowerCase();
  if (/emotion|expressive|character|style|challenge|interpret|mood|tension|identity|title of/.test(text)) return "meaning";
  if (/form|theme|section|coda|exposition|reprise|recapit|phrase|motif|variation|whole piece|part concludes/.test(text)) return "form";
  if (/tempo|bpm|rhythm|meter|duration|timing|rubato|articulation|dynamic|pulse|beat|onset|rest|silence/.test(text)) return "time";
  if (/melod|harmony|chord|cadence|instrument|orchestrat|voice|counterpoint|texture|tonality|key signature/.test(text)) return "relations";
  return "sound";
}

function parseQuestions(csv: string): Question[] {
  const [headers, ...rows] = parseCSV(csv);
  return rows.filter((row) => row.length === headers.length).map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    return {
      ...record,
      pieceNumber: record.pieceNumber.padStart(2, "0"),
      modality: record.modality as Modality,
      topic: deriveTopic(record.fullQuestion, record.answerObjectType),
    } as Question;
  });
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function resourceUrl(path: string) {
  return `${HF_ROOT}/${path}`;
}

function Portrait({ composer, className = "" }: { composer: string; className?: string }) {
  const source = portraitByComposer[composer];
  return source
    ? <img className={className} src={source} alt={`${composer} portrait`} />
    : <span className={`${className} portrait-fallback`} aria-label={`${composer} portrait unavailable`}>{composer.slice(0, 1)}</span>;
}

function Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero-score" aria-label="Composers represented in MuSP-Bench">
        <div className="score-paper" aria-hidden="true">
          <span>𝄞</span><i /><i /><i /><i /><i />
        </div>
        <div className="portrait portrait-bach"><Portrait composer="Bach" /><small>J. S. Bach</small></div>
        <div className="portrait portrait-beethoven"><Portrait composer="Beethoven" /><small>Beethoven</small></div>
        <div className="portrait portrait-debussy"><Portrait composer="Debussy" /><small>Debussy</small></div>
        <p>COMPOSED<br />EVIDENCE</p>
      </div>

      <div className="hero-performance" style={{ "--pianist": `url(${BASE}images/pianist-performance.webp)` } as CSSProperties}>
        <p>PERFORMED<br />EVIDENCE</p>
        <div className="performance-meter" aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <i key={index} />)}</div>
      </div>

      <div className="hero-center">
        <div className="hero-title">
          <span className="hero-mark" aria-hidden="true"><i /><i /><i /></span>
          <h1>MuSP<span>—Bench</span></h1>
          <p>Musical score–performance understanding, measured across what is written, what is heard, and what changes between them.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onExplore}>Enter the benchmark <ArrowIcon /></button>
            <a className="button button-quiet" href={DATASET_URL} target="_blank" rel="noreferrer">Hugging Face <span>↗</span></a>
            <a className="button button-quiet" href={`${BASE}paper/MuSP_Bench.pdf`} target="_blank" rel="noreferrer">Paper <span>↗</span></a>
          </div>
        </div>
        <div className="hero-axis" aria-hidden="true"><span>SCORE</span><i /><span>PERFORMANCE</span></div>
      </div>
      <button className="hero-scroll" onClick={onExplore}><span>Explore all 520 questions</span><i /></button>
    </section>
  );
}

function PianoRoll({ piece, roll, progress }: { piece: string; roll?: RollData[string]; progress: number }) {
  const [zoom, setZoom] = useState(1);
  const notes = roll?.notes ?? [];
  const windowStart = Math.max(0, Math.min(88, progress * 96 - 8 / zoom));
  const windowLength = 24 / zoom;
  const visible = notes.filter((note) => note.t + note.d >= windowStart && note.t <= windowStart + windowLength);
  return (
    <div className="piano-roll-tool">
      <div className="tool-heading">
        <span>PIANO-ROLL LENS</span>
        <label>Zoom <input type="range" min="0.7" max="2.3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      </div>
      {roll ? (
        <div className="piano-roll" aria-label={`Score-derived piano roll for piece ${piece}`}>
          <div className="roll-keys" aria-hidden="true">{["C6", "C5", "C4", "C3"].map((key) => <span key={key}>{key}</span>)}</div>
          <div className="roll-stage">
            {visible.map((note, index) => (
              <i key={`${note.t}-${note.p}-${index}`} style={{
                "--x": `${((note.t - windowStart) / windowLength) * 100}%`,
                "--w": `${Math.max(0.35, (note.d / windowLength) * 100)}%`,
                "--y": `${(1 - Math.min(1, Math.max(0, (note.p - 36) / 60))) * 100}%`,
                "--voice": note.v % 4,
              } as CSSProperties} />
            ))}
            <b style={{ left: `${Math.min(100, Math.max(0, ((progress * 96 - windowStart) / windowLength) * 100))}%` }} />
          </div>
        </div>
      ) : <div className="tool-unavailable">A score-derived piano-roll preview is not available for this orchestral item.</div>}
      <p>Score-derived preview. The playhead follows performance proportionally; it is not a score–audio alignment.</p>
    </div>
  );
}

function EvidenceLab({ question, roll }: { question: Question; roll?: RollData[string] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [taps, setTaps] = useState<number[]>([]);
  const hasScore = question.modality !== "P";
  const hasAudio = question.modality !== "S";

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTaps([]);
  }, [question.id]);

  const tapBpm = useMemo(() => {
    if (taps.length < 2) return null;
    const gaps = taps.slice(1).map((tap, index) => tap - taps[index]);
    return Math.round(60000 / (gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length));
  }, [taps]);

  const registerTap = () => {
    const now = performance.now();
    setTaps((previous) => [...(previous.filter((tap) => now - tap < 3500).slice(-5)), now]);
  };

  const toggle = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) await audioRef.current.play();
    else audioRef.current.pause();
  };

  return (
    <div className="evidence-lab">
      {hasAudio && (
        <div className="performance-deck">
          <audio
            ref={audioRef}
            src={resourceUrl(question.audioFilename)}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          />
          <div className="deck-top"><span>PERFORMANCE / {question.pieceNumber}</span><a href={resourceUrl(question.audioFilename)} target="_blank" rel="noreferrer">audio source ↗</a></div>
          <div className="transport">
            <button className="play-button" onClick={toggle} aria-label={playing ? "Pause performance" : "Play performance"}><PlayIcon playing={playing} /></button>
            <div className="track">
              <strong>{question.composer}</strong><span>{question.title}</span>
              <input
                className="timeline"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                aria-label="Performance position"
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = next;
                  setCurrentTime(next);
                }}
                style={{ "--progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties}
              />
              <div className="time"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
          </div>
          <div className="mir-controls">
            <label>Playback speed
              <select value={speed} onChange={(event) => {
                const value = Number(event.target.value);
                setSpeed(value);
                if (audioRef.current) audioRef.current.playbackRate = value;
              }}>
                {[0.5, 0.75, 1, 1.25].map((value) => <option key={value} value={value}>{value}×</option>)}
              </select>
            </label>
            <button className="tap-button" onClick={registerTap}><span>{tapBpm ? `${tapBpm}` : "TAP"}</span><small>{tapBpm ? "estimated BPM" : "tap the pulse"}</small></button>
          </div>
          <PianoRoll piece={question.pieceNumber} roll={roll} progress={duration ? currentTime / duration : 0} />
        </div>
      )}

      {hasScore && (
        <div className="score-viewer">
          <div className="deck-top"><span>SCORE / {question.pieceNumber}</span><a href={resourceUrl(question.cleanedReorganizedScoreFilename)} target="_blank" rel="noreferrer">open full score ↗</a></div>
          <iframe src={`${resourceUrl(question.cleanedReorganizedScoreFilename)}#page=1&view=FitH`} title={`Score for ${question.title}`} loading="lazy" />
        </div>
      )}
    </div>
  );
}

function QuestionDetail({ question }: { question: Question }) {
  const example = question.answerExample.replace(/^\["?|"?\]$/g, "").replace(/""/g, '"');
  return (
    <article className="question-detail">
      <div className="detail-piece">
        <Portrait composer={question.composer} className="detail-portrait" />
        <div><span>{question.id} · PIECE {question.pieceNumber}</span><strong>{question.composer}</strong><small>{question.title}</small></div>
      </div>
      <div className={`modality-badge modality-${question.modality.replace("/", "-")}`}><b>{question.modality}</b><span>{modalityMeta[question.modality].label}</span></div>
      <h3>{question.fullQuestion}</h3>
      <p className="route-copy">{modalityMeta[question.modality].description}</p>
      <div className="answer-contract">
        <dl>
          <div><dt>Answer object</dt><dd>{question.answerObjectType}</dd></div>
          <div><dt>Required format</dt><dd>{question.answerFormat}</dd></div>
          <div><dt>Quantity</dt><dd>{question.answerQuantity}</dd></div>
        </dl>
        <p><span>Response-shape examples</span><code>{example}</code><small>Examples of form only, not the answer.</small></p>
      </div>
    </article>
  );
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rolls, setRolls] = useState<RollData>({});
  const [loadingError, setLoadingError] = useState("");
  const [activeModality, setActiveModality] = useState<Modality | "ALL">("P");
  const [activeTopic, setActiveTopic] = useState<Topic | "ALL">("ALL");
  const [activeComposer, setActiveComposer] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [visibleCount, setVisibleCount] = useState(36);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/questions.csv`).then((response) => {
        if (!response.ok) throw new Error("The benchmark question file could not be loaded.");
        return response.text();
      }),
      fetch(`${BASE}data/piano-roll.json`).then((response) => response.json() as Promise<RollData>),
    ]).then(([csv, rollData]) => {
      const parsed = parseQuestions(csv);
      setQuestions(parsed);
      setRolls(rollData);
      setSelectedId(parsed.find((question) => question.id === "Q183")?.id ?? parsed.find((question) => question.modality === "P")?.id ?? parsed[0]?.id ?? "");
    }).catch((error: Error) => setLoadingError(error.message));
  }, []);

  const composers = useMemo(() => [...new Set(questions.map((question) => question.composer))].sort(), [questions]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) =>
      (activeModality === "ALL" || question.modality === activeModality)
      && (activeTopic === "ALL" || question.topic === activeTopic)
      && (activeComposer === "ALL" || question.composer === activeComposer)
      && (!needle || `${question.id} ${question.composer} ${question.title} ${question.fullQuestion}`.toLowerCase().includes(needle)),
    );
  }, [questions, activeComposer, activeModality, activeTopic, query]);

  const selected = filtered.find((question) => question.id === selectedId) ?? filtered[0];

  const chooseQuestion = (question: Question) => {
    setSelectedId(question.id);
    document.getElementById("evidence")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateFilter = (callback: () => void) => {
    callback();
    setVisibleCount(36);
  };

  const scrollToExplorer = () => document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top"><span className="mini-mark"><i /><i /><i /></span><strong>MuSP<span>—Bench</span></strong></a>
        <p>Score meets performance.</p>
        <nav aria-label="Research links">
          <a href="#explorer">Questions</a>
          <a href={DATASET_URL} target="_blank" rel="noreferrer">Dataset ↗</a>
          <a href={`${BASE}paper/MuSP_Bench.pdf`} target="_blank" rel="noreferrer">Paper ↗</a>
        </nav>
      </header>

      <Hero onExplore={scrollToExplorer} />

      <section className="route-stage" aria-label="Benchmark evidence routes">
        <div className="route-copy-block">
          <h2>Begin with the <em>performance.</em></h2>
          <p>The most immediate way into MuSP-Bench is to listen. Then open the score, or ask what becomes visible only when the two are compared.</p>
        </div>
        <div className="route-switcher">
          {modalityOrder.map((modality) => (
            <button key={modality} onClick={() => { setActiveModality(modality); scrollToExplorer(); }}>
              <span>{modality}</span><strong>{modalityMeta[modality].label}</strong><small>{modalityMeta[modality].short}</small><ArrowIcon />
            </button>
          ))}
        </div>
      </section>

      <section className="explorer" id="explorer">
        <div className="explorer-heading">
          <h2>The full question set,<br /><em>ready to inspect.</em></h2>
          <div><strong>{questions.length || "—"}</strong><span>released questions<br />24 musical works</span></div>
        </div>

        <div className="filter-console">
          <div className="filter-group route-filter">
            <span>Evidence</span>
            <button className={activeModality === "ALL" ? "active" : ""} onClick={() => updateFilter(() => setActiveModality("ALL"))}>All</button>
            {modalityOrder.map((modality) => <button key={modality} className={activeModality === modality ? "active" : ""} onClick={() => updateFilter(() => setActiveModality(modality))}>{modalityMeta[modality].label}</button>)}
          </div>
          <div className="filter-group">
            <span>Editorial lens</span>
            <button className={activeTopic === "ALL" ? "active" : ""} onClick={() => updateFilter(() => setActiveTopic("ALL"))}>All</button>
            {(Object.keys(topicMeta) as Topic[]).map((topic) => <button key={topic} className={activeTopic === topic ? "active" : ""} onClick={() => updateFilter(() => setActiveTopic(topic))}>{topicMeta[topic]}</button>)}
          </div>
          <div className="filter-fields">
            <label><span>Composer</span><select value={activeComposer} onChange={(event) => updateFilter(() => setActiveComposer(event.target.value))}><option value="ALL">All composers</option>{composers.map((composer) => <option key={composer}>{composer}</option>)}</select></label>
            <label className="search-field"><span>Search</span><input value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Question, work, ID…" /></label>
          </div>
          <p className="annotation-note">Musical lenses are editorial navigation aids, not canonical dataset annotations.</p>
        </div>

        {loadingError ? <div className="load-state error"><strong>Questions unavailable.</strong><p>{loadingError} Refresh the page or use the Hugging Face dataset directly.</p><a href={DATASET_URL}>Open dataset ↗</a></div>
          : !questions.length ? <div className="load-state"><span className="loading-disc" /><strong>Loading the full benchmark…</strong></div>
          : filtered.length ? (
            <>
              <div className="result-line"><span>{filtered.length} matching questions</span><span>Performance routes appear first by default</span></div>
              <div className="question-grid">
                {filtered.slice(0, visibleCount).map((question) => (
                  <button className={`question-row ${selected?.id === question.id ? "active" : ""}`} key={question.id} onClick={() => chooseQuestion(question)}>
                    <Portrait composer={question.composer} className="row-portrait" />
                    <span className={`row-route modality-${question.modality.replace("/", "-")}`}>{question.modality}</span>
                    <span className="row-copy"><small>{question.id} · {question.composer} · {question.title}</small><strong>{question.fullQuestion}</strong></span>
                    <span className="row-topic">{topicMeta[question.topic]}</span>
                    <ArrowIcon />
                  </button>
                ))}
              </div>
              {visibleCount < filtered.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 36)}>Show 36 more <span>{visibleCount} / {filtered.length}</span></button>}
            </>
          ) : <div className="load-state"><strong>No questions match this view.</strong><p>Clear a filter or search a different work.</p><button onClick={() => { setActiveModality("ALL"); setActiveTopic("ALL"); setActiveComposer("ALL"); setQuery(""); }}>Clear filters</button></div>}
      </section>

      {selected && (
        <section className="evidence" id="evidence">
          <div className="evidence-heading"><h2>Question in context.</h2><p>Select another question above to change every surface below.</p></div>
          <div className="evidence-layout">
            <QuestionDetail question={selected} />
            <EvidenceLab question={selected} roll={rolls[selected.pieceNumber]} />
          </div>
        </section>
      )}

      <footer>
        <div className="footer-top"><a className="wordmark" href="#top"><span className="mini-mark"><i /><i /><i /></span><strong>MuSP<span>—Bench</span></strong></a><p>Written evidence.<br />Performed evidence.<br />One benchmark.</p></div>
        <div className="footer-links"><a href={DATASET_URL}>Hugging Face ↗</a><a href={`${BASE}paper/MuSP_Bench.pdf`}>Paper PDF ↗</a><a href="https://github.com/vaclisinc/MuSP-demo">GitHub ↗</a><a href="#top">Back to top ↑</a></div>
        <small>Question text, modality labels, and answer contracts are loaded from the released MuSP-Bench dataset. Editorial lenses are navigation aids only. Composer portraits: public-domain works via Wikimedia Commons. Piano-roll previews are derived from repository MusicXML; the performance playhead is proportional, not an alignment.</small>
      </footer>
    </main>
  );
}
