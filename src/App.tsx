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

const BASE = import.meta.env.BASE_URL;
const HF_ROOT = "https://huggingface.co/datasets/milan477/MuSP-Bench/resolve/main";
const DATASET_URL = "https://huggingface.co/datasets/milan477/MuSP-Bench";

const modalityOrder: Modality[] = ["P", "SP", "S/P", "S"];
const modalityMeta: Record<Modality, { label: string; description: string }> = {
  P: { label: "Performance-only", description: "The sounding performance contains everything needed to answer." },
  SP: { label: "Score ↔ performance", description: "Answer by relating notation to its realization." },
  "S/P": { label: "Either route", description: "Score or performance can independently support the answer." },
  S: { label: "Score-only", description: "The written score contains everything needed to answer." },
};

const topicMeta: Record<Topic, string> = {
  sound: "Pitch & sound",
  time: "Time & realization",
  relations: "Musical relations",
  form: "Form & memory",
  meaning: "Interpretation",
};

const contentBands = [
  { title: "Musical elements", detail: "Pitch · time · timbre" },
  { title: "Performance realization", detail: "Dynamics · articulation · technique" },
  { title: "Musical organization", detail: "Melody · harmony · orchestration · form" },
  { title: "Interpretation & context", detail: "Expression · identity · style" },
];

const portraitByComposer: Record<string, string> = Object.fromEntries(
  ["bach", "balakirev", "beethoven", "chopin", "debussy", "glinka", "haydn", "liszt", "mozart", "rachmaninoff", "schubert", "schumann", "scriabin"]
    .map((name) => [name[0].toUpperCase() + name.slice(1), `${BASE}images/composer-${name}.webp`]),
);

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>;
}

function ArrowIcon() {
  return <Icon><path d="M5 12h13M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return <Icon><path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
}

function IndexIcon() {
  return <Icon><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></Icon>;
}

function CloseIcon() {
  return <Icon><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></Icon>;
}

function ModalityIcon({ modality }: { modality: Modality }) {
  const score = <><path d="M5 7h6M5 10h6M5 13h6M9 5v10.5a2 2 0 1 1-1.4-1.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /><circle cx="6.2" cy="16.3" r="1.7" fill="currentColor" /></>;
  const audio = <path d="M14 13v-2M17 16V8M20 14v-4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />;
  return (
    <span className={`modality-icon modality-${modality.replace("/", "-")}`} aria-label={modalityMeta[modality].label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {modality === "P" && <path d="M5 13v-2M9 17V7M13 14v-4M17 18V6M21 13v-2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />}
        {modality === "S" && score}
        {(modality === "SP" || modality === "S/P") && <>{score}{audio}{modality === "S/P" && <path d="M12.5 5v14" stroke="currentColor" strokeWidth="1" opacity=".35" />}</>}
      </svg>
    </span>
  );
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
  return <img className={className} src={portraitByComposer[composer]} alt={`${composer} portrait`} />;
}

function Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero-score" aria-label="Composers represented in MuSP-Bench">
        <div className="score-paper" aria-hidden="true"><span>𝄞</span><i /><i /><i /><i /><i /></div>
        <div className="portrait portrait-bach"><Portrait composer="Bach" /><small>J. S. Bach</small></div>
        <div className="portrait portrait-beethoven"><Portrait composer="Beethoven" /><small>Beethoven</small></div>
        <div className="portrait portrait-debussy"><Portrait composer="Debussy" /><small>Debussy</small></div>
        <div className="portrait portrait-chopin"><Portrait composer="Chopin" /><small>Chopin</small></div>
        <div className="portrait portrait-liszt"><Portrait composer="Liszt" /><small>Liszt</small></div>
        <div className="portrait portrait-rachmaninoff"><Portrait composer="Rachmaninoff" /><small>Rachmaninoff</small></div>
        <p>SCORE<br />MODALITY</p>
      </div>

      <div className="hero-performance" style={{ "--pianist": `url(${BASE}images/pianist-performance.webp)` } as CSSProperties}>
        <p>PERFORMANCE<br />MODALITY</p>
        <div className="performance-meter" aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <i key={index} />)}</div>
      </div>

      <div className="hero-center">
        <div className="hero-title">
          <span className="hero-mark" aria-hidden="true"><i /><i /><i /></span>
          <h1>MuSP—Bench</h1>
          <p className="hero-facts"><strong>A human-authored, score–performance multimodal benchmark.</strong> 490 questions across 24 classical piano and orchestral works.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onExplore}>Open a question <ArrowIcon /></button>
            <a className="button button-quiet" href={DATASET_URL} target="_blank" rel="noreferrer">Hugging Face <span>↗</span></a>
            <a className="button button-quiet" href={`${BASE}paper/MuSP_Bench.pdf`} target="_blank" rel="noreferrer">Paper <span>↗</span></a>
          </div>
        </div>
        <div className="hero-axis" aria-hidden="true"><span>SCORE</span><i /><span>PERFORMANCE</span></div>
      </div>
      <button className="hero-scroll" onClick={onExplore}><span>Explore all 490 questions</span><i /></button>
    </section>
  );
}

function BenchmarkMap() {
  return (
    <section className="benchmark-map" aria-label="Benchmark coverage">
      <div className="map-intro">
        <h2>Two ways to read the benchmark.</h2>
      </div>
      <div className="map-column">
        <h3>Modality</h3>
        <div className="map-list modality-list">
          {modalityOrder.map((modality) => <div key={modality}><ModalityIcon modality={modality} /><span><strong>{modalityMeta[modality].label}</strong><small>{modality}</small></span></div>)}
        </div>
      </div>
      <div className="map-column">
        <h3>Content breadth</h3>
        <div className="content-hierarchy">
          <span className="hierarchy-axis">detail <i /> whole work</span>
          {contentBands.map((band, index) => <div key={band.title} style={{ "--level": index } as CSSProperties}><i /><span><strong>{band.title}</strong><small>{band.detail}</small></span></div>)}
        </div>
      </div>
    </section>
  );
}

function AudioPlayer({ question }: { question: Question }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [question.id]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) await audioRef.current.play();
    else audioRef.current.pause();
  };

  return (
    <div className="performance-player">
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
      <div className="media-heading performance-heading">
        <img src={`${BASE}images/pianist-performance.webp`} alt="Pianist at a grand piano" />
        <div><span>PERFORMANCE / {question.pieceNumber}</span><strong>The performed work</strong></div>
        <a href={resourceUrl(question.audioFilename)} target="_blank" rel="noreferrer">source ↗</a>
      </div>
      <div className="transport">
        <button className="play-button" onClick={toggle} aria-label={playing ? "Pause performance" : "Play performance"}><PlayIcon playing={playing} /></button>
        <div className="track">
          <strong>{question.composer} — {question.title}</strong>
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
    </div>
  );
}

function ScoreViewer({ question }: { question: Question }) {
  return (
    <div className="score-viewer">
      <div className="media-heading score-heading">
        <Portrait composer={question.composer} className="media-portrait" />
        <div><span>SCORE / {question.pieceNumber}</span><strong>{question.composer}, composer</strong></div>
        <a href={resourceUrl(question.cleanedReorganizedScoreFilename)} target="_blank" rel="noreferrer">open score ↗</a>
      </div>
      <iframe src={`${resourceUrl(question.cleanedReorganizedScoreFilename)}#page=1&view=FitH`} title={`Score for ${question.title}`} loading="lazy" />
    </div>
  );
}

function EvidenceMedia({ question }: { question: Question }) {
  const hasScore = question.modality !== "P";
  const hasAudio = question.modality !== "S";
  return <div className={`evidence-media ${hasScore && hasAudio ? "both" : ""}`}>{hasAudio && <AudioPlayer question={question} />}{hasScore && <ScoreViewer question={question} />}</div>;
}

function QuestionDetail({ question }: { question: Question }) {
  const example = question.answerExample.replace(/^\["?|"?\]$/g, "").replace(/""/g, '"');
  return (
    <article className="question-detail">
      <div className="question-topline">
        <div className="question-meta"><span>{question.id} · PIECE {question.pieceNumber}</span><span>{topicMeta[question.topic]}</span></div>
        <div className="modality-badge"><ModalityIcon modality={question.modality} /><span>{modalityMeta[question.modality].label}</span></div>
        <div className="work-line"><Portrait composer={question.composer} className="work-portrait" /><p><strong>{question.composer}</strong><span>{question.title}</span></p></div>
      </div>
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

function QuestionIndex({ questions, selected, onChoose, onClose }: { questions: Question[]; selected?: Question; onChoose: (question: Question) => void; onClose: () => void }) {
  return (
    <aside className="index-drawer" aria-label="Question index">
      <div className="drawer-heading"><div><strong>Question index</strong><span>{questions.length} matching questions</span></div><button onClick={onClose} aria-label="Close question index"><CloseIcon /></button></div>
      <div className="drawer-list">
        {questions.map((question) => (
          <button key={question.id} className={selected?.id === question.id ? "active" : ""} onClick={() => onChoose(question)}>
            <span className={`drawer-route modality-${question.modality.replace("/", "-")}`}>{question.modality}</span>
            <span><small>{question.id} · {question.composer}</small><strong>{question.fullQuestion}</strong></span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingError, setLoadingError] = useState("");
  const [activeModality, setActiveModality] = useState<Modality | "ALL">("P");
  const [activeTopic, setActiveTopic] = useState<Topic | "ALL">("ALL");
  const [activeComposer, setActiveComposer] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [indexOpen, setIndexOpen] = useState(false);

  useEffect(() => {
    fetch(`${BASE}data/questions.csv`).then((response) => {
      if (!response.ok) throw new Error("The benchmark question file could not be loaded.");
      return response.text();
    }).then((csv) => {
      const parsed = parseQuestions(csv);
      setQuestions(parsed);
      setSelectedId(parsed.find((question) => question.id === "Q183")?.id ?? parsed.find((question) => question.modality === "P")?.id ?? parsed[0]?.id ?? "");
    }).catch((error: Error) => setLoadingError(error.message));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", indexOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [indexOpen]);

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
  const selectedIndex = selected ? filtered.findIndex((question) => question.id === selected.id) : -1;

  const updateFilter = (callback: () => void) => {
    callback();
    setSelectedId("");
  };

  const moveQuestion = (direction: -1 | 1) => {
    if (!filtered.length) return;
    const next = (selectedIndex + direction + filtered.length) % filtered.length;
    setSelectedId(filtered[next].id);
  };

  const chooseQuestion = (question: Question) => {
    setSelectedId(question.id);
    setIndexOpen(false);
  };

  const scrollToExplorer = () => document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top"><span className="mini-mark"><i /><i /><i /></span><strong>MuSP<span>—Bench</span></strong></a>
        <p>Score meets performance.</p>
        <nav aria-label="Research links"><a href="#explorer">Questions</a><a href={DATASET_URL} target="_blank" rel="noreferrer">Dataset ↗</a><a href={`${BASE}paper/MuSP_Bench.pdf`} target="_blank" rel="noreferrer">Paper ↗</a></nav>
      </header>

      <Hero onExplore={scrollToExplorer} />
      <BenchmarkMap />

      <section className="explorer" id="explorer">
        <div className="explorer-heading">
          <h2>Question explorer</h2>
          <p>Browse all 490 released questions.</p>
        </div>

        <div className="filter-console">
          <div className="filter-group route-filter">
            <span>Modality</span>
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

        {loadingError ? <div className="load-state error"><strong>Questions unavailable.</strong><p>{loadingError} Refresh the page or use the Hugging Face dataset directly.</p></div>
          : !questions.length ? <div className="load-state"><span className="loading-disc" /><strong>Loading the benchmark…</strong></div>
          : selected ? (
            <div className="question-workspace">
              <div className="workspace-bar">
                <button className="index-button" onClick={() => setIndexOpen(true)}><IndexIcon /> Open index <span>{filtered.length}</span></button>
                <div className="card-pagination"><span>{selectedIndex + 1} / {filtered.length}</span><button onClick={() => moveQuestion(-1)} aria-label="Previous question"><ChevronIcon direction="left" /></button><button onClick={() => moveQuestion(1)} aria-label="Next question"><ChevronIcon direction="right" /></button></div>
              </div>
              <div className="evidence-layout" key={selected.id}>
                <QuestionDetail question={selected} />
                <EvidenceMedia question={selected} />
              </div>
            </div>
          ) : <div className="load-state"><strong>No questions match this view.</strong><p>Clear a filter or search a different work.</p><button onClick={() => { setActiveModality("ALL"); setActiveTopic("ALL"); setActiveComposer("ALL"); setQuery(""); }}>Clear filters</button></div>}
      </section>

      {indexOpen && <><button className="drawer-scrim" aria-label="Close question index" onClick={() => setIndexOpen(false)} /><QuestionIndex questions={filtered} selected={selected} onChoose={chooseQuestion} onClose={() => setIndexOpen(false)} /></>}

      <footer>
        <div className="footer-top"><a className="wordmark" href="#top"><span className="mini-mark"><i /><i /><i /></span><strong>MuSP<span>—Bench</span></strong></a><p>Score modality.<br />Performance modality.<br />One benchmark.</p></div>
        <div className="footer-links"><a href={DATASET_URL}>Hugging Face ↗</a><a href={`${BASE}paper/MuSP_Bench.pdf`}>Paper PDF ↗</a><a href="https://github.com/vaclisinc/MuSP-demo">GitHub ↗</a><a href="#top">Back to top ↑</a></div>
        <small>Question text, modality labels, and answer contracts are loaded from the released MuSP-Bench dataset. Editorial lenses are navigation aids only. Composer portraits are public-domain or freely licensed images via Wikimedia Commons.</small>
      </footer>
    </main>
  );
}
