"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Clapperboard,
  Film,
  FolderOpen,
  HelpCircle,
  Layers3,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Config, DEFAULT, PRESETS, Stats } from "@/lib/simulation";
import {
  Episode,
  loadEpisodes,
  saveEpisodes,
  validateEpisodes,
} from "@/lib/storage";
import type { CanvasHandle } from "./SimulationCanvas";
import ModeSwitcher from "./ModeSwitcher";
const Canvas = dynamic(() => import("./SimulationCanvas"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading">
      <Loader2 className="spin" /> Preparing your orbit…
    </div>
  ),
});
type Tab = "Presets" | "Rules" | "Story";
export default function Studio({ initialPreset }: { initialPreset?: string }) {
  const initial = PRESETS.find((p) => p.id === initialPreset) || PRESETS[0];
  const [config, setConfig] = useState<Config>({
    ...DEFAULT,
    ...initial.config,
  });
  const [preset, setPreset] = useState<string>(initial.id);
  const [tab, setTab] = useState<Tab>("Presets");
  const [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(false),
    [resetKey, setResetKey] = useState(0),
    [portrait, setPortrait] = useState(false),
    [recording, setRecording] = useState(false),
    [focus, setFocus] = useState(false),
    [help, setHelp] = useState(false);
  const [stats, setStats] = useState<Stats>({
    balls: 5,
    escapes: 0,
    time: 0,
    finished: false,
  });
  const [toast, setToast] = useState(""),
    [episodes, setEpisodes] = useState<Episode[]>([]),
    [episode, setEpisode] = useState(1),
    [hook, setHook] = useState("Five little balls. One way out."),
    [teaser, setTeaser] = useState("Next episode: the opening gets smaller."),
    [title, setTitle] = useState("The first escape");
  const canvas = useRef<CanvasHandle>(null),
    file = useRef<HTMLInputElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    loadEpisodes()
      .then((e) => {
        setEpisodes(e);
        setStorageReady(true);
      })
      .catch(() => {
        setToast(
          "Local storage is unavailable. You can still use JSON export.",
        );
        setStorageReady(true);
      });
  }, []);
  useEffect(() => {
    if (stats.finished) setPlaying(false);
  }, [stats.finished]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(false);
      if (event.key === "Tab") {
        const modal = document.querySelector(".help-modal");
        const elements = modal?.querySelectorAll<HTMLElement>(
          "button, a, input, select, textarea",
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [help]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(id);
  }, [toast]);
  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }
  function reset() {
    setPlaying(false);
    setResetKey((n) => n + 1);
  }
  function choose(id: string) {
    const p = PRESETS.find((p) => p.id === id)!;
    setPreset(id);
    setConfig((c) => ({ ...DEFAULT, ...p.config, seed: c.seed }));
    reset();
  }
  async function persist(next: Episode[]) {
    if (next.length > 100) {
      setToast(
        "This story has reached 100 checkpoints. Export a backup before starting a new browser story.",
      );
      return;
    }
    setEpisodes(next);
    try {
      await saveEpisodes(next);
      setToast("Episode saved on this browser.");
    } catch {
      setToast("Browser storage failed. Export your story to keep a backup.");
    }
  }
  async function save() {
    if (!storageReady) return;
    const snapshot = canvas.current?.snapshot();
    if (!snapshot) return;
    const entry: Episode = {
      id: crypto.randomUUID(),
      number: episode,
      title,
      hook,
      teaser,
      config: { ...config },
      snapshot,
      savedAt: new Date().toISOString(),
    };
    await persist([...episodes, entry]);
  }
  function restore(e: Episode, continuation = false) {
    setPlaying(false);
    setConfig({ ...e.config });
    canvas.current?.restore({
      ...e.snapshot,
      time: continuation ? 0 : e.snapshot.time,
    });
    setStats({
      ...stats,
      time: continuation ? 0 : e.snapshot.time,
      finished: !continuation && e.snapshot.time >= e.config.duration,
      escapes: e.snapshot.escapes,
      balls: e.snapshot.balls.filter((b) => !b.escaped).length,
    });
    setEpisode(continuation ? e.number + 1 : e.number);
    setTitle(continuation ? `Beyond the ring · ${e.number + 1}` : e.title);
    setHook(continuation ? e.teaser : e.hook);
    setTeaser(e.teaser);
    setToast(
      continuation
        ? "Next episode ready. Change a rule to raise the stakes."
        : "Saved checkpoint restored.",
    );
  }
  function download() {
    const data = JSON.stringify(episodes, null, 2);
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "orbit-story.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(f: File) {
    try {
      if (f.size > 5_000_000) throw Error("File is too large.");
      const e: unknown = JSON.parse(await f.text());
      if (!validateEpisodes(e))
        throw Error("Invalid story file. Please use an Orbit Studio export.");
      await persist([
        ...episodes,
        ...e.map((v) => ({ ...v, id: crypto.randomUUID() })),
      ]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not import this file.");
    }
  }
  async function record() {
    if (recording) {
      canvas.current?.stopRecording();
      return;
    }
    try {
      if (stats.finished) {
        reset();
        setToast("Scene reset. Press Record again to start a new take.");
        return;
      }
      await canvas.current?.record();
      setPlaying(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Recording could not start.");
    }
  }
  return (
    <div className={focus ? "studio-shell focus-mode" : "studio-shell"}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Orbit Studio home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          orbit<span className="brand-light">studio</span>
          <span className="beta">BETA</span>
        </Link>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#studio">
            Create
            <span />
          </a>
          <Link href="/guides">
            The playbook <ArrowRight size={13} />
          </Link>
        </nav>
        <button className="header-help" onClick={() => setHelp(true)}>
          <HelpCircle size={16} /> How it works
        </button>
        <span className="header-status">
          <span /> A little motion. A lot of possibility.
        </span>
      </header>
      <main>
        <ModeSwitcher />
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> YOUR LITTLE CORNER OF CHAOS
            </div>
            <h1>
              Small balls. <em>Endless possibilities.</em>
            </h1>
            <p>
              Make mesmerizing bouncing ball videos. Set the rules. Let the
              story unfold.
            </p>
          </div>
          <button className="intro-expand" onClick={() => setFocus(true)}>
            <Maximize2 size={17} /> Bigger view <ArrowRight size={14} />
          </button>
        </section>
        <section id="studio" className="workspace" aria-label="Video creator">
          <aside className="settings-panel">
            <div className="panel-heading">
              <span>
                <SlidersHorizontal size={17} /> Make it your own
              </span>
              <span className="step">01 — 03</span>
            </div>
            <div className="tabs" role="tablist" aria-label="Creator settings">
              {(["Presets", "Rules", "Story"] as Tab[]).map((t, i) => (
                <button
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  id={`tab-${t}`}
                  key={t}
                  className={tab === t ? "selected" : ""}
                  onClick={() => setTab(t)}
                >
                  {i === 0 ? (
                    <Layers3 size={14} />
                  ) : i === 1 ? (
                    <Settings2 size={14} />
                  ) : (
                    <Clapperboard size={14} />
                  )}{" "}
                  {t}
                  {t === "Story" && <span className="new-dot" />}
                </button>
              ))}
            </div>
            <div
              className="panel-content"
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "Presets" && (
                <>
                  <div className="section-label">
                    A GOOD PLACE TO START <span>05 PRESETS</span>
                  </div>
                  <p className="panel-description">
                    Pick a mood. We’ll handle the physics.
                  </p>
                  <div className="preset-list">
                    {PRESETS.map((p, i) => (
                      <button
                        key={p.id}
                        className={`preset-card ${preset === p.id ? "active" : ""}`}
                        onClick={() => choose(p.id)}
                      >
                        <span
                          className={`preset-art art-${i}`}
                          style={
                            { "--art-color": p.color } as React.CSSProperties
                          }
                        >
                          <span className="mini-ring" />
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                        <span className="preset-copy">
                          <strong>{p.name}</strong>
                          <small>{p.tag}</small>
                        </span>
                        <span className="preset-check">
                          {preset === p.id ? (
                            <Check size={13} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="preset-hint">
                    <Sparkles size={15} />
                    <p>
                      A preset is just the beginning.
                      <br />
                      <button onClick={() => setTab("Rules")}>
                        Tweak the rules <ArrowRight size={12} />
                      </button>{" "}
                      to make it yours.
                    </p>
                  </div>
                </>
              )}
              {tab === "Rules" && (
                <>
                  <div className="section-label">YOUR WORLD, YOUR RULES</div>
                  <p className="panel-description">
                    Small changes. Unexpected outcomes.
                  </p>
                  <Range
                    label="New balls per escape"
                    value={config.spawn}
                    min={0}
                    max={5}
                    onChange={(v) => update("spawn", v)}
                    suffix=" balls"
                  />
                  <Range
                    label="Opening size"
                    value={config.opening}
                    min={10}
                    max={120}
                    onChange={(v) => update("opening", v)}
                    suffix="°"
                  />
                  <Range
                    label="Ring rotation"
                    value={config.rotation}
                    min={-1}
                    max={1}
                    step={0.05}
                    onChange={(v) => update("rotation", v)}
                    suffix=" rad/s"
                  />
                  <Range
                    label="Gravity"
                    value={config.gravity}
                    min={0}
                    max={300}
                    step={10}
                    onChange={(v) => update("gravity", v)}
                  />
                  <label className="field-label">
                    Gravity direction
                    <select
                      value={config.gravityMode}
                      onChange={(e) =>
                        update(
                          "gravityMode",
                          e.target.value as Config["gravityMode"],
                        )
                      }
                    >
                      <option value="down">Downward ↓</option>
                      <option value="center">Toward the center ◎</option>
                      <option value="rotate">Slowly rotating ↻</option>
                    </select>
                  </label>
                  <Range
                    label="Simulation speed"
                    value={config.speed}
                    min={0.25}
                    max={2}
                    step={0.05}
                    onChange={(v) => update("speed", v)}
                    suffix="×"
                  />
                  <Range
                    label="Ball size · applies to new balls"
                    value={config.size}
                    min={3}
                    max={15}
                    onChange={(v) => update("size", v)}
                    suffix=" px"
                  />
                  <Range
                    label="Maximum balls"
                    value={config.maxBalls}
                    min={10}
                    max={300}
                    step={10}
                    onChange={(v) => update("maxBalls", v)}
                  />
                  <Toggle
                    label="Breathing opening"
                    description="Let the exit pulse open and closed"
                    checked={config.pulse}
                    onChange={(v) => update("pulse", v)}
                  />
                  <button
                    className="text-button"
                    onClick={() => {
                      setConfig({ ...DEFAULT });
                      setPreset("population-explosion");
                      reset();
                    }}
                  >
                    Reset all rules <RotateCcw size={12} />
                  </button>
                </>
              )}
              {tab === "Story" && (
                <>
                  <div className="section-label">
                    GIVE THEM A REASON TO RETURN
                  </div>
                  <p className="panel-description">
                    One little escape. A whole new chapter.
                  </p>
                  <div className="character-list">
                    {stats.characters?.map((c) => (
                      <div key={c.name}>
                        <span style={{ background: c.color }} />
                        <strong>{c.name}</strong>
                        <small>{c.escaped ? "Escaped ↗" : "In orbit"}</small>
                      </div>
                    ))}
                  </div>
                  <div className="episode-badge">
                    <Film size={16} />
                    <span>EPISODE {String(episode).padStart(2, "0")}</span>
                    <button
                      aria-label="Next episode number"
                      onClick={() => setEpisode((e) => e + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <label className="field-label">
                    Episode title
                    <input
                      value={title}
                      maxLength={80}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Opening hook
                    <textarea
                      value={hook}
                      maxLength={120}
                      onChange={(e) => setHook(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Next episode teaser
                    <textarea
                      value={teaser}
                      maxLength={120}
                      onChange={(e) => setTeaser(e.target.value)}
                    />
                  </label>
                  <Toggle
                    label="Show story captions"
                    description="Include your hook and ending in the video"
                    checked={config.captions}
                    onChange={(v) => update("captions", v)}
                  />
                  <button
                    className="primary small full"
                    onClick={save}
                    disabled={!storageReady}
                  >
                    <Save size={15} /> Save episode checkpoint
                  </button>
                  <p className="fine-print">
                    Saved on this browser. Export a backup to keep your story
                    safe.
                  </p>
                  <div className="saved-heading">
                    YOUR EPISODES <span>{episodes.length}</span>
                  </div>
                  {episodes.length === 0 ? (
                    <div className="empty-state">
                      <FolderOpen size={24} />
                      <p>
                        Your story starts here.
                        <br />
                        Save your first moment above.
                      </p>
                    </div>
                  ) : (
                    episodes
                      .slice()
                      .reverse()
                      .map((e) => (
                        <div className="saved-episode" key={e.id}>
                          <strong>
                            {String(e.number).padStart(2, "0")} · {e.title}
                          </strong>
                          <small>
                            {e.snapshot.escapes} escapes ·{" "}
                            {e.snapshot.time.toFixed(1)}s
                          </small>
                          <div>
                            <button onClick={() => restore(e)}>Restore</button>
                            <button onClick={() => restore(e, true)}>
                              Continue story <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                  <div className="story-actions">
                    <button onClick={download} disabled={!episodes.length}>
                      <ArrowDownToLine size={13} /> Export JSON
                    </button>
                    <button onClick={() => file.current?.click()}>
                      <Upload size={13} /> Import
                    </button>
                  </div>
                  <input
                    ref={file}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importFile(f);
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
            <div className="panel-footer">
              <span className="live-dot" /> No downloads. No sign-up. Just play.
            </div>
          </aside>
          <div className="preview-panel" ref={stage}>
            <div className="preview-toolbar">
              <div className="live-label">
                <span /> LIVE PREVIEW
              </div>
              <div className="preview-tools">
                <button
                  className={!portrait ? "active" : ""}
                  onClick={() => setPortrait(false)}
                  disabled={recording}
                >
                  4:5
                </button>
                <button
                  className={portrait ? "active" : ""}
                  onClick={() => setPortrait(true)}
                  disabled={recording}
                >
                  9:16
                </button>
                <span className="tool-divider" />
                <button
                  title="Toggle focus view"
                  aria-label="Toggle focus view"
                  onClick={() => setFocus((v) => !v)}
                >
                  {focus ? <X size={16} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>
            <div className={`scene ${portrait ? "portrait" : ""}`}>
              <div className="scene-top">
                <span>
                  <span className={playing ? "live-dot" : "paused-dot"} />
                  {recording
                    ? "RECORDING"
                    : playing
                      ? "SIMULATING"
                      : "READY WHEN YOU ARE"}
                </span>
                <span>SEED {config.seed}</span>
              </div>
              <Canvas
                ref={canvas}
                config={config}
                playing={playing}
                muted={muted}
                resetKey={resetKey}
                portrait={portrait}
                episode={episode}
                hook={hook}
                teaser={teaser}
                onStats={setStats}
                onRecording={setRecording}
                onError={setToast}
              />
              <div className="scene-bottom">
                <span>
                  <i />
                  {PRESETS.find((p) => p.id === preset)?.name}
                </span>
                <span>MADE OF LITTLE MOMENTS</span>
              </div>
              {!playing && stats.time === 0 && (
                <button
                  className="scene-play"
                  aria-label="Play simulation"
                  onClick={() => setPlaying(true)}
                >
                  <Play size={20} fill="currentColor" />
                </button>
              )}
            </div>
            <div className="playback">
              <button
                className="play-button"
                aria-label={playing ? "Pause simulation" : "Play simulation"}
                onClick={() => {
                  if (stats.finished) {
                    reset();
                    setPlaying(true);
                  } else setPlaying((v) => !v);
                }}
              >
                {playing ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </button>
              <button
                className="icon-button"
                aria-label="Restart simulation"
                title="Restart simulation"
                onClick={reset}
                disabled={recording}
              >
                <RotateCcw size={17} />
              </button>
              <div className="timeline">
                <div className="timeline-track">
                  <span
                    style={{
                      width: `${Math.min(100, (stats.time / config.duration) * 100)}%`,
                    }}
                  />
                </div>
                <span>
                  {formatTime(stats.time)}{" "}
                  <i>/ {formatTime(config.duration)}</i>
                </span>
              </div>
              <button
                className={`icon-button ${muted ? "" : "sound-on"}`}
                title={muted ? "Unmute sound" : "Mute sound"}
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                onClick={() => setMuted((v) => !v)}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
            <div className="stat-strip">
              <div>
                <span className="stat-dot" />
                <strong>{String(stats.balls).padStart(2, "0")}</strong>
                <span>in orbit</span>
              </div>
              <div>
                <ArrowRight size={14} />
                <strong>{String(stats.escapes).padStart(2, "0")}</strong>
                <span>escaped</span>
              </div>
              <span className="physics-note">
                A little physics. A little magic. <Sparkles size={12} />
              </span>
            </div>
          </div>
          <aside className="finish-panel">
            <div className="panel-heading">
              <span>
                <Sparkles size={17} /> The finishing touches
              </span>
            </div>
            <div className="finish-content">
              <div className="section-label">LOOK & FEEL</div>
              <label className="field-label palette-label">Color palette</label>
              <div className="palettes">
                {(
                  [
                    {
                      id: "citrus",
                      name: "Citrus",
                      colors: ["#d8f36a", "#f6b766", "#95d5a7"],
                    },
                    {
                      id: "candy",
                      name: "Candy",
                      colors: ["#d9b6ff", "#ff95bc", "#a8c9ff"],
                    },
                    {
                      id: "ocean",
                      name: "Ocean",
                      colors: ["#8ee6d1", "#a9d0fc", "#c4b8fa"],
                    },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={config.palette === p.id}
                    className={config.palette === p.id ? "active" : ""}
                    onClick={() => {
                      update("palette", p.id);
                      setToast(
                        "Palette updated. New balls use these colors; restart to recolor the scene.",
                      );
                    }}
                  >
                    <span>
                      {p.colors.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
              <Toggle
                label="Motion trails"
                description="Leave a little light behind"
                checked={config.trails}
                onChange={(v) => update("trails", v)}
              />
              <Toggle
                label="Escape particles"
                description="A tiny celebration"
                checked={config.particles}
                onChange={(v) => update("particles", v)}
              />
              <div className="finish-divider" />
              <div className="section-label">SOUND ON. WORLD OFF.</div>
              <div className="sound-card">
                <span className="sound-icon">
                  <AudioLines size={22} />
                </span>
                <div>
                  <strong>Pentatonic dreams</strong>
                  <small>Generative · Soft & melodic</small>
                </div>
                <button
                  aria-label={muted ? "Enable sound" : "Disable sound"}
                  onClick={() => setMuted((v) => !v)}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
              <p className="sound-note">
                Every bounce plays a note.
                <br />
                No two moments sound quite the same.
              </p>
              <div className="finish-divider" />
              <div className="section-label">MAKE IT A VIDEO</div>
              <label className="field-label duration-label">
                Duration
                <select
                  value={config.duration}
                  disabled={recording}
                  onChange={(e) => update("duration", Number(e.target.value))}
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </label>
              <div className="export-spec">
                <span>Resolution</span>
                <strong>{portrait ? "900 × 1600" : "900 × 1125"}</strong>
              </div>
              <div className="export-spec">
                <span>Format</span>
                <strong>
                  Browser video <span className="tiny-tag">+ AUDIO</span>
                </strong>
              </div>
              <button
                className={`primary record-button ${recording ? "recording" : ""}`}
                onClick={record}
              >
                {recording ? (
                  <>
                    <span className="record-dot" /> Stop & download
                  </>
                ) : (
                  <>
                    <Film size={16} /> Record video{" "}
                    <ArrowDownToLine size={15} />
                  </>
                )}
              </button>
              <p className="fine-print centered">
                {recording
                  ? "Keep this tab visible while recording."
                  : "Made for your next “just one more watch.”"}
              </p>
              <button
                className="shuffle-button"
                disabled={recording}
                onClick={() => {
                  update("seed", Math.floor(Math.random() * 99999));
                  reset();
                }}
              >
                <Shuffle size={14} /> A fresh little universe
              </button>
            </div>
            <div className="story-promo">
              <span className="promo-eyebrow">
                <Clapperboard size={14} /> TURN MOMENTS INTO CHAPTERS
              </span>
              <h3>
                What happens <em>next?</em>
              </h3>
              <p>
                Give your balls a story.
                <br />
                Give your audience a reason to stay.
              </p>
              <button onClick={() => setTab("Story")}>
                Explore story mode <ArrowRight size={14} />
              </button>
              <span className="promo-orbit" />
            </div>
          </aside>
        </section>
        <section className="below-workspace">
          <span>
            <span className="keyboard-key">∞</span> A tiny experiment in endless
            possibility.
          </span>
          <div>
            <span>
              <Check size={13} /> Free to create
            </span>
            <span>
              <Check size={13} /> Yours to share
            </span>
            <button onClick={() => setHelp(true)}>
              A little guidance <ArrowRight size={13} />
            </button>
          </div>
        </section>
        <section className="seo-section">
          <div>
            <span className="eyebrow">LESS SCROLLING. MORE CREATING.</span>
            <h2>
              Your next satisfying video
              <br />
              starts with a little curiosity.
            </h2>
            <p>
              Orbit Studio is a free bouncing ball simulator and video maker.
              Explore musical collisions, rotating rings, and unexpected
              escapes. Create in your browser, then record your own oddly
              satisfying videos with sound.
            </p>
            <Link href="/guides">
              Read the creator’s playbook <ArrowRight size={15} />
            </Link>
          </div>
          <div className="preset-links">
            {PRESETS.slice(0, 3).map((p) => (
              <Link href={`/presets/${p.id}`} key={p.id}>
                <span>
                  {p.name}
                  <small>{p.tag}</small>
                </span>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          orbit studio <i>© {new Date().getFullYear()}</i>
        </span>
        <span>Built for the joy of watching things happen.</span>
        <Link href="/guides">
          The playbook <ArrowRight size={12} />
        </Link>
      </footer>
      {toast && (
        <div role="status" className="toast">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="modal-close"
              onClick={() => setHelp(false)}
              aria-label="Close help"
            >
              <X size={20} />
            </button>
            <div className="eyebrow">A LITTLE GUIDANCE</div>
            <h2 id="help-title">
              Meet your new
              <br />
              <em>creative orbit.</em>
            </h2>
            <ol>
              <li>
                <strong>Find your rhythm.</strong> Pick a preset and press Play.
                Sound begins with your first interaction.
              </li>
              <li>
                <strong>Change the rules.</strong> Adjust gravity, the opening,
                or how many balls arrive after each escape.
              </li>
              <li>
                <strong>Tell a story.</strong> Save an episode checkpoint.
                Continue from the same scene with a new challenge.
              </li>
              <li>
                <strong>Keep the moment.</strong> Record your canvas and audio.
                Keep the tab visible; downloads use the format your browser
                supports.
              </li>
            </ol>
            <p>
              Stories stay in this browser. Export a JSON backup to move them to
              another device. No account needed.
            </p>
            <button className="primary full" onClick={() => setHelp(false)}>
              Let’s make a little magic <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function formatTime(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <strong>
          {Number(value.toFixed(2))}
          {suffix}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
