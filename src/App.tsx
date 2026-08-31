import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Modality = "S" | "P" | "SP" | "S/P";
type Question = {
  id: string; pieceNumber: string; composer: string; title: string; question: string;
  modality: Modality; submodality: string; horizon: string; answerObjectType: string;
  answerFormat: string; answerQuantity: string; answerExample: string; answers: string;
  audio: string; pdf: string;
};

const BASE = import.meta.env.BASE_URL;
const HF_ROOT = "https://huggingface.co/datasets/milan477/MuSP-Bench/resolve/main";
const DATASET_URL = "https://huggingface.co/datasets/milan477/MuSP-Bench";
const PAPER_URL = "https://arxiv.org/abs/2608.28212";
const AUDIO_DURATIONS: Record<string, number> = {
  "inputs/audio/piece-01.wav": 482.249, "inputs/audio/piece-02.wav": 275.297, "inputs/audio/piece-03.wav": 1971.321,
  "inputs/audio/piece-04.wav": 2277.389, "inputs/audio/piece-05.wav": 2554.202, "inputs/audio/piece-06.wav": 2160.786,
  "inputs/audio/piece-07.wav": 451.525, "inputs/audio/piece-08.wav": 1201.807, "inputs/audio/piece-09.wav": 1320.118,
  "inputs/audio/piece-10.wav": 946.673, "inputs/audio/piece-11.wav": 2997.724, "inputs/audio/piece-12.wav": 1172.95,
  "inputs/audio/piece-13.wav": 1160.3, "inputs/audio/piece-14.wav": 1061.958, "inputs/audio/piece-15.wav": 428.625,
  "inputs/audio/piece-16.wav": 1552.56, "inputs/audio/piece-17.wav": 1160.037, "inputs/audio/piece-18.wav": 2828.814,
  "inputs/audio/piece-21.wav": 99.908, "inputs/audio/piece-22.wav": 104.104, "inputs/audio/piece-24.wav": 78.156,
};
const modalityOrder: Modality[] = ["SP", "S/P", "P", "S"];
const modalityMeta: Record<Modality, { label: string; short: string }> = {
  S: { label: "Score only", short: "Read the notation" },
  P: { label: "Performance only", short: "Listen to the performance" },
  SP: { label: "Score & performance", short: "Relate notation and sound" },
  "S/P": { label: "Score or performance", short: "Either source is sufficient" },
};

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>;
}
function Arrow() { return <Icon><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></Icon>; }
function External() { return <Icon><path d="M14 5h5v5m0-5-8 8M18 13v5H6V6h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></Icon>; }
function Search() { return <Icon><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></Icon>; }
function Play({ active }: { active: boolean }) { return active ? <Icon><path d="M9 7v10m6-10v10" stroke="currentColor" strokeWidth="2" /></Icon> : <Icon><path d="m9 7 8 5-8 5V7Z" fill="currentColor" /></Icon>; }
function displayModality(modality: Modality) { return modality === "SP" ? "S&P" : modality; }

function parseCSV(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseQuestions(csv: string): Question[] {
  const [headers, ...rows] = parseCSV(csv);
  return rows.filter((row) => row.length === headers.length).map((row) => {
    const r = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
    return { id: r.id, pieceNumber: r.piece_number.padStart(2, "0"), composer: r.composer, title: r.title,
      question: r.question, modality: r.modality as Modality, submodality: r.submodality, horizon: r.horizon,
      answerObjectType: r.answer_object_type, answerFormat: r.answer_format, answerQuantity: r.answer_quantity,
      answerExample: r.answer_example, answers: r.answers, audio: r.audio, pdf: r.pdf };
  });
}

function values(raw: string) {
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [String(parsed)]; }
  catch { return raw ? [raw] : []; }
}
function resource(path: string) { return /^https?:\/\//.test(path) ? path : `${HF_ROOT}/${path}`; }
function time(value: number) { if (!Number.isFinite(value)) return "0:00"; return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`; }
function timestampSeconds(value: string) { const [minutes, seconds] = value.split(":").map(Number); return minutes * 60 + seconds; }

function JumpText({ text, enableTime }: { text: string; enableTime: boolean }) {
  if (!enableTime) return <>{text}</>;
  const parts = text.split(/(\b\d{1,2}:\d{2}\b)/g);
  return <>{parts.map((part, index) => /^\d{1,2}:\d{2}$/.test(part) ? <button key={`${part}-${index}`} className="time-jump" onClick={() => window.dispatchEvent(new CustomEvent("musp:seek-audio", { detail: timestampSeconds(part) }))} title={`Play from ${part}`}>{part}<span aria-hidden="true">▶</span></button> : part)}</>;
}

function AudioPlayer({ question }: { question: Question }) {
  const ref = useRef<HTMLAudioElement>(null); const pendingSeek = useRef<number | null>(null); const [playing, setPlaying] = useState(false); const [at, setAt] = useState(0); const [duration, setDuration] = useState(AUDIO_DURATIONS[question.audio] ?? 0);
  useEffect(() => { pendingSeek.current = null; setPlaying(false); setAt(0); setDuration(AUDIO_DURATIONS[question.audio] ?? 0); }, [question.id, question.audio]);
  useEffect(() => { const seek = (event: Event) => { const seconds = (event as CustomEvent<number>).detail; const audio = ref.current; if (!audio || !Number.isFinite(seconds)) return; pendingSeek.current = seconds; setAt(seconds); setPlaying(true); if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) { audio.currentTime = Math.min(seconds, Number.isFinite(audio.duration) ? audio.duration : seconds); pendingSeek.current = null; } void audio.play().catch(() => setPlaying(false)); }; window.addEventListener("musp:seek-audio", seek); return () => window.removeEventListener("musp:seek-audio", seek); }, []);
  const toggle = async () => { if (!ref.current) return; if (ref.current.paused) await ref.current.play(); else ref.current.pause(); };
  return <section className="media-card audio-card">
    <div className="media-head"><div><span>Performance</span><strong>{question.composer} · {question.title}</strong></div><a href={resource(question.audio)} target="_blank" rel="noreferrer">Open audio <External /></a></div>
    <audio ref={ref} src={resource(question.audio)} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={e => { const audio = e.currentTarget; setDuration(audio.duration); if (pendingSeek.current !== null) { const target = Math.min(pendingSeek.current, audio.duration); audio.currentTime = target; setAt(target); pendingSeek.current = null; } }} onDurationChange={e => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration); }} onTimeUpdate={e => setAt(e.currentTarget.currentTime)} />
    <div className="player"><button onClick={toggle} aria-label={playing ? "Pause" : "Play"}><Play active={playing} /></button><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(at, duration || 0)} aria-label="Audio position" onChange={e => { const n = Number(e.target.value); if (ref.current) ref.current.currentTime = n; setAt(n); }} style={{ "--progress": `${duration ? at / duration * 100 : 0}%` } as CSSProperties} /><span>{time(at)} / {time(duration)}</span></div>
  </section>;
}

function ScoreViewer({ question }: { question: Question }) {
  return <section className="media-card score-card"><div className="media-head"><div><span>Score</span><strong>Piece {question.pieceNumber}</strong></div><a href={resource(question.pdf)} target="_blank" rel="noreferrer">Open PDF <External /></a></div><iframe src={`${resource(question.pdf)}#page=1&view=FitH`} title={`Score for ${question.title}`} loading="lazy" /></section>;
}

function AnswerReveal({ answers, enableTime }: { answers: string[]; enableTime: boolean }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [answers.join("|")]);
  return <section className={`released-answer${revealed ? " revealed" : ""}`}>
    <span>Released answer</span>
    <div className="answer-content">{answers.length ? <ul>{answers.map((answer, i) => <li key={`${answer}-${i}`}><JumpText text={answer} enableTime={enableTime} /></li>)}</ul> : <p>Not provided in the release.</p>}</div>
    {!revealed && <button className="answer-cover" onClick={() => setRevealed(true)}><i /> <strong>Reveal answer</strong><small>Try it yourself first</small></button>}
  </section>;
}

const pianoOctaves = [2, 3, 4, 5, 6];
const whitePitchClasses = [{ name: "C", semitone: 0 }, { name: "D", semitone: 2 }, { name: "E", semitone: 4 }, { name: "F", semitone: 5 }, { name: "G", semitone: 7 }, { name: "A", semitone: 9 }, { name: "B", semitone: 11 }];
const blackPitchClasses = [{ name: "C♯", semitone: 1, afterWhite: 1 }, { name: "D♯", semitone: 3, afterWhite: 2 }, { name: "F♯", semitone: 6, afterWhite: 4 }, { name: "G♯", semitone: 8, afterWhite: 5 }, { name: "A♯", semitone: 10, afterWhite: 6 }];
function pianoFrequency(octave: number, semitone: number) { const midi = 12 * (octave + 1) + semitone; return 440 * (2 ** ((midi - 69) / 12)); }
const composerNames = ["bach", "beethoven", "chopin", "debussy", "haydn", "liszt", "mozart", "rachmaninoff", "schubert", "schumann", "scriabin", "balakirev", "glinka"];
let pianoAudioContext: AudioContext | null = null;

function playPitches(frequencies: number[]) {
  if (!frequencies.length) return;
  pianoAudioContext ??= new AudioContext();
  const master = pianoAudioContext.createGain(); const now = pianoAudioContext.currentTime;
  master.gain.setValueAtTime(.0001, now); master.gain.exponentialRampToValueAtTime(.2 / Math.sqrt(frequencies.length), now + .015); master.gain.exponentialRampToValueAtTime(.0001, now + .8); master.connect(pianoAudioContext.destination);
  frequencies.forEach(frequency => { const oscillator = pianoAudioContext!.createOscillator(); oscillator.type = "sine"; oscillator.frequency.value = frequency; oscillator.connect(master); oscillator.start(now); oscillator.stop(now + .82); });
}

function TapTempo() {
  const [taps, setTaps] = useState<number[]>([]);
  const tap = () => setTaps(current => [...current.filter(value => Date.now() - value < 4000), Date.now()].slice(-8));
  const intervals = taps.slice(1).map((value, i) => value - taps[i]);
  const bpm = intervals.length ? Math.round(60000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)) : 0;
  return <div className="mini-tool"><div className="tool-head"><span>Tap tempo</span><button onClick={() => setTaps([])}>Reset</button></div><button className="tap-pad" onClick={tap}><strong>{bpm || "Tap"}</strong><small>{bpm ? "BPM" : "at least twice"}</small></button><div className="tap-dots">{Array.from({ length: 8 }, (_, i) => <i key={i} className={i < taps.length ? "on" : ""} />)}</div></div>;
}

function PianoHelper() {
  const [notes, setNotes] = useState<{ note: string; frequency: number }[]>([]);
  const pianoScrollRef = useRef<HTMLDivElement>(null);
  const hasNote = (note: string) => notes.some(item => item.note === note);
  const toggle = (note: string, frequency: number) => setNotes(current => { const next = current.some(item => item.note === note) ? current.filter(item => item.note !== note) : [...current, { note, frequency }]; playPitches(next.map(item => item.frequency)); return next; });
  const moveOctave = (direction: -1 | 1) => pianoScrollRef.current?.scrollBy({ left: direction * 196, behavior: "smooth" });
  return <div className="mini-tool piano-tool"><div className="tool-head"><span>Chord helper · C2–B6</span><div className="piano-actions"><button onClick={() => moveOctave(-1)} aria-label="Move down one octave">−</button><button onClick={() => moveOctave(1)} aria-label="Move up one octave">+</button><button onClick={() => setNotes([])}>Clear</button></div></div><div className="piano-scroll" ref={pianoScrollRef}><div className="piano-wide"><div className="white-keys">{pianoOctaves.flatMap(octave => whitePitchClasses.map(key => { const note = `${key.name}${octave}`; return <button key={note} className={`white${hasNote(note) ? " active" : ""}`} onClick={() => toggle(note, pianoFrequency(octave, key.semitone))} aria-pressed={hasNote(note)} aria-label={`Toggle ${note} in chord`}><span>{note}</span></button>; }))}</div>{pianoOctaves.flatMap((octave, octaveIndex) => blackPitchClasses.map(key => { const note = `${key.name}${octave}`; const left = ((octaveIndex * 7 + key.afterWhite) / 35) * 100; return <button key={note} className={`black${hasNote(note) ? " active" : ""}`} style={{ left: `${left}%` }} onClick={() => toggle(note, pianoFrequency(octave, key.semitone))} aria-pressed={hasNote(note)} aria-label={`Toggle ${note} in chord`}><span>{note}</span></button>; }))}</div></div><p>{notes.length ? notes.map(item => item.note).join(" · ") : "Select notes to build and hear a chord"}</p></div>;
}

function EvidencePanel({ question }: { question: Question }) {
  const hasScore = question.modality !== "P"; const hasAudio = question.modality !== "S";
  const showBoth = hasScore && hasAudio;
  const [tab, setTab] = useState<"score" | "audio">(hasScore ? "score" : "audio");
  useEffect(() => setTab(hasScore ? "score" : "audio"), [question.id, hasScore]);
  return <div className="evidence-column"><div className="evidence-tabs">{showBoth ? <strong>Score & audio</strong> : <>{hasScore && <button className={tab === "score" ? "active" : ""} onClick={() => setTab("score")}>Score</button>}{hasAudio && <button className={tab === "audio" ? "active" : ""} onClick={() => setTab("audio")}>Audio</button>}</>}<span>Evidence</span></div><div className={`evidence-view${showBoth ? " dual-evidence" : ""}`}>{showBoth ? <><AudioPlayer question={question} /><ScoreViewer question={question} /></> : tab === "score" && hasScore ? <ScoreViewer question={question} /> : <AudioPlayer question={question} />}</div><div className="helpers"><TapTempo /><PianoHelper /></div></div>;
}

function QuestionDetail({ question }: { question: Question }) {
  const answers = values(question.answers); const examples = values(question.answerExample);
  return <article className="question-detail">
    <div className="question-meta"><span className={`modality m-${question.modality.replace("/", "-")}`}>{displayModality(question.modality)}</span><span>{modalityMeta[question.modality].label}</span><span>{question.id}</span><span>Piece {question.pieceNumber}</span></div>
    <p className="eyebrow">{question.composer} · {question.title}</p><h2><JumpText text={question.question} enableTime={question.modality !== "S"} /></h2>
    <AnswerReveal answers={answers} enableTime={question.modality !== "S"} />
    <section className="contract"><h3>Answer contract</h3><dl><div><dt>Object</dt><dd>{question.answerObjectType}</dd></div><div><dt>Format</dt><dd>{question.answerFormat}</dd></div><div><dt>Quantity</dt><dd>{question.answerQuantity}</dd></div><div><dt>Format example</dt><dd>{examples.join(" · ")}<small>Example of form only—not the answer.</small></dd></div></dl></section>
  </article>;
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]); const [error, setError] = useState("");
  const [modality, setModality] = useState<Modality | "ALL">("ALL"); const [composer, setComposer] = useState("ALL"); const [work, setWork] = useState("ALL"); const [query, setQuery] = useState(""); const [selectedId, setSelectedId] = useState("");
  useEffect(() => { fetch(`${BASE}data/questions.csv`).then(r => { if (!r.ok) throw new Error("Questions could not be loaded."); return r.text(); }).then(csv => { const parsed = parseQuestions(csv); setQuestions(parsed); setSelectedId(parsed[0]?.id ?? ""); }).catch((e: Error) => setError(e.message)); }, []);
  const composers = useMemo(() => [...new Set(questions.map(q => q.composer))].sort(), [questions]);
  const works = useMemo(() => [...new Map(questions.filter(q => composer === "ALL" || q.composer === composer).map(q => [`${q.composer}|||${q.title}`, { value: `${q.composer}|||${q.title}`, composer: q.composer, title: q.title }])).values()].sort((a, b) => a.composer.localeCompare(b.composer) || a.title.localeCompare(b.title)), [questions, composer]);
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return questions.filter(q => (modality === "ALL" || q.modality === modality) && (composer === "ALL" || q.composer === composer) && (work === "ALL" || `${q.composer}|||${q.title}` === work) && (!needle || `${q.id} ${q.composer} ${q.title} ${q.question} ${q.answers}`.toLowerCase().includes(needle))); }, [questions, modality, composer, work, query]);
  const selected = filtered.find(q => q.id === selectedId) ?? filtered[0];
  const choose = (q: Question) => { setSelectedId(q.id); document.getElementById("question")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return <main>
    <header id="top"><a className="brand" href="#top">MuSP<span>Bench</span></a><nav><a href="#explore">Explore</a><a href={DATASET_URL} target="_blank" rel="noreferrer">Dataset <External /></a><a href={PAPER_URL} target="_blank" rel="noreferrer">Paper <External /></a></nav></header>
    <section className="masthead"><div><p className="kicker">MuSP-Bench · 490 human-authored questions</p><h1>Advanced multimodal benchmarking of music understanding across <span className="score-word">score</span> and <span className="performance-word">performance</span></h1></div><div className="masthead-copy"><p><strong>18 classical piano pieces or movements and 6 orchestral excerpts.</strong> The benchmark combines 460 open-ended questions with predefined answer formats and 30 questions with multiple options.</p><p>Piano materials are derived from (n)ASAP and corrected using PianoCoRe consensus MIDI; orchestral scores and audio come from BSED.</p><a className="primary" href="#explore">Browse questions <Arrow /></a></div></section>
    <div className="composer-marquee" aria-label="Composers represented in MuSP-Bench"><div>{[0, 1].flatMap(copy => composerNames.map(name => <figure key={`${copy}-${name}`} aria-hidden={copy === 1}><img src={`${BASE}images/composer-${name}.webp`} alt="" /><figcaption>{name}</figcaption></figure>))}</div></div>
    <section className="routes"><div><p className="section-no">01 / Modalities</p><h2>Four routes to an answer.</h2><p>Canonical modality labels are preserved in the data; S&P is the interface label for SP.</p></div>{modalityOrder.map(m => <article key={m}><span className={`modality m-${m.replace("/", "-")}`}>{displayModality(m)}</span><h3>{modalityMeta[m].label}</h3><p>{modalityMeta[m].short}</p><strong>{questions.filter(q => q.modality === m).length || "—"}</strong></article>)}</section>
    <section className="explorer" id="explore"><div className="explorer-title"><p className="section-no">02 / Question explorer</p><h2>Browse the benchmark.</h2><p>Questions, answer contracts, released answers, and source evidence in one place.</p></div>
      <div className="toolbar"><label className="search"><Search /><input value={query} onChange={e => { setQuery(e.target.value); setSelectedId(""); }} placeholder="Search questions, works, answers…" /></label><label><span>Composer</span><select value={composer} onChange={e => { setComposer(e.target.value); setWork("ALL"); setSelectedId(""); }}><option value="ALL">All composers</option>{composers.map(c => <option key={c}>{c}</option>)}</select></label><label><span>Work</span><select value={work} onChange={e => { setWork(e.target.value); setSelectedId(""); }}><option value="ALL">All works</option>{works.map(item => <option key={item.value} value={item.value}>{composer === "ALL" ? `${item.composer} — ${item.title}` : item.title}</option>)}</select></label></div>
      <div className="modality-tabs"><button className={modality === "ALL" ? "active" : ""} onClick={() => { setModality("ALL"); setSelectedId(""); }}>All <span>{questions.length}</span></button>{modalityOrder.map(m => <button key={m} className={modality === m ? "active" : ""} onClick={() => { setModality(m); setSelectedId(""); }}>{displayModality(m)} <span>{questions.filter(q => q.modality === m).length}</span></button>)}</div>
      {error ? <p className="empty">{error}</p> : !questions.length ? <p className="empty">Loading benchmark…</p> : !selected ? <p className="empty">No questions match these filters.</p> : <div className="workspace">
        <aside><p>{filtered.length} questions</p><div>{filtered.map(q => <button key={q.id} className={q.id === selected.id ? "active" : ""} onClick={() => choose(q)}><span className={`modality m-${q.modality.replace("/", "-")}`}>{displayModality(q.modality)}</span><strong>{q.question}</strong><small>{q.composer} · {q.title}</small></button>)}</div></aside>
        <div className="question-pane" id="question"><QuestionDetail question={selected} /></div><EvidencePanel question={selected} />
      </div>}
      <p className="editorial-note">Filters are navigation aids. Question wording, modality labels, answers, and answer-contract fields are loaded from the released MuSP-Bench dataset.</p>
    </section>
    <footer><div><a className="brand" href="#top">MuSP<span>Bench</span></a><p>Score–performance understanding,<br />made explorable.</p></div><div><a href={DATASET_URL}>Hugging Face <External /></a><a href={PAPER_URL} target="_blank" rel="noreferrer">Paper <External /></a><a href="https://github.com/vaclisinc/MuSP-demo">GitHub <External /></a></div><small>MuSP-Bench · Research demo</small></footer>
  </main>;
}
