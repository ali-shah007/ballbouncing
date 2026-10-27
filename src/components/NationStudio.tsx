"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDownToLine,
  Building2,
  Check,
  ChevronRight,
  Coins,
  Globe2,
  Leaf,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import ModeSwitcher from "./ModeSwitcher";
import NationMap, { Country } from "./NationMap";
import {
  BUILDINGS,
  BuildingType,
  DISTRICTS,
  MILESTONES,
  NationSave,
  applyOffline,
  build,
  costOf,
  createNation,
  nationStats,
  notify,
  research,
  tickNation,
  validNation,
} from "@/lib/nation";
const money = (n: number) => Math.floor(n).toLocaleString();
export default function NationStudio() {
  const [countries, setCountries] = useState<Country[]>([]),
    [query, setQuery] = useState(""),
    [country, setCountry] = useState<Country | null>(null),
    [save, setSave] = useState<NationSave | null>(null),
    [tab, setTab] = useState<"Build" | "Research" | "Policies" | "Goals">(
      "Build",
    ),
    [region, setRegion] = useState(0),
    [selected, setSelected] = useState<number | null>(null),
    [toast, setToast] = useState(""),
    [offline, setOffline] = useState(""),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [zoom, setZoom] = useState(1),
    [cinema, setCinema] = useState(false),
    [recording, setRecording] = useState(false),
    [loadError, setLoadError] = useState("");
  const model = useRef<NationSave | null>(null),
    canvas = useRef<HTMLCanvasElement | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    file = useRef<HTMLInputElement>(null),
    clock = useRef({ paused: false, speed: 1 }),
    recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  clock.current = { paused, speed };
  const onCanvas = useCallback((c: HTMLCanvasElement) => {
    canvas.current = c;
  }, []);
  function refresh() {
    if (model.current) setSave(structuredClone(model.current));
  }
  function persist() {
    if (!model.current) return;
    try {
      localStorage.setItem(
        `nation-rise:${model.current.country}`,
        JSON.stringify(model.current),
      );
      localStorage.setItem("nation-rise:last", model.current.country);
    } catch {
      setToast(
        "Browser storage unavailable. Export your campaign to keep a backup.",
      );
    }
  }
  function start(c: Country) {
    let state = createNation(c.properties.name);
    try {
      const stored = JSON.parse(
        localStorage.getItem(`nation-rise:${c.properties.name}`) || "null",
      );
      if (validNation(stored)) {
        state = stored;
        const report = applyOffline(state);
        if (report.seconds > 15)
          setOffline(
            `Welcome back. ${Math.floor(report.seconds / 60)} minutes simulated · treasury change ${money(report.earned)} credits. Offline progress is capped at 4 hours.`,
          );
      }
    } catch {}
    model.current = state;
    setCountry(c);
    setSave(structuredClone(state));
    setSelected(null);
    setPaused(false);
    setZoom(1);
    persist();
  }
  useEffect(() => {
    let active = true;
    fetch("/data/countries.geojson")
      .then((r) => {
        if (!r.ok) throw Error("Country map could not load. Refresh to retry.");
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const list = (data.features as Country[]).sort((a, b) =>
          a.properties.name.localeCompare(b.properties.name),
        );
        setCountries(list);
        try {
          const last = localStorage.getItem("nation-rise:last");
          const c = list.find((c) => c.properties.name === last);
          if (c) start(c);
        } catch {}
      })
      .catch((e) => setLoadError(e.message));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let last = Date.now(),
      count = 0;
    const timer = setInterval(() => {
      const now = Date.now();
      if (!model.current || document.hidden) {
        last = now;
        return;
      }
      if (!clock.current.paused)
        tickNation(
          model.current,
          Math.min(10, (now - last) / 1000) * clock.current.speed,
        );
      model.current.lastSaved = now;
      last = now;
      refresh();
      if (++count % 5 === 0) persist();
    }, 1000);
    const resume = () => {
      if (!model.current) return;
      if (!document.hidden) {
        if (!clock.current.paused) {
          const report = applyOffline(model.current);
          if (report.seconds > 20)
            setOffline(
              `While you were away: ${money(report.earned)} credits treasury change.`,
            );
        } else model.current.lastSaved = Date.now();
        last = Date.now();
        refresh();
      }
      persist();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pagehide", persist);
      persist();
      if (recorder.current?.state === "recording") recorder.current.stop();
      if (recordTimer.current) clearTimeout(recordTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function action(fn: (s: NationSave) => string | null | void) {
    if (!model.current) return;
    const message = fn(model.current);
    if (message) setToast(message);
    refresh();
    persist();
  }
  function exportSave() {
    if (!model.current) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(model.current, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `nation-rise-${model.current.country}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importSave(f: File) {
    try {
      if (f.size > 1e6) throw Error("Save file too large.");
      const s: unknown = JSON.parse(await f.text());
      if (!validNation(s))
        throw Error("This is not a valid Nation Rise campaign.");
      const c = countries.find((c) => c.properties.name === s.country);
      if (!c) throw Error("Country not found.");
      s.lastSaved = Date.now();
      model.current = s;
      setCountry(c);
      setSelected(null);
      refresh();
      persist();
      setToast("Campaign imported.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Import failed.");
    }
  }
  function record() {
    try {
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
        return;
      }
      if (!canvas.current || typeof MediaRecorder === "undefined")
        throw Error(
          "Recording needs a supported browser such as desktop Chrome.",
        );
      const mime = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) throw Error("No supported video format.");
      const stream = canvas.current.captureStream(30),
        r = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: 8000000,
        }),
        chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        if (recordTimer.current) clearTimeout(recordTimer.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const url = URL.createObjectURL(new Blob(chunks, { type: mime }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `nation-rise.${mime.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      };
      r.onerror = () =>
        setToast("Recording failed. Try again in a supported browser.");
      recorder.current = r;
      r.start(500);
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Recording failed.");
    }
  }
  const stats = save ? nationStats(save) : null,
    building = save?.buildings.find((b) => b.id === selected);
  const queue = save?.buildings.filter((b) => b.remaining > 0) || [];
  return (
    <div className={`nation-page ${cinema ? "nation-cinema" : ""}`}>
      <header className="nation-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          orbit<span className="brand-light">studio</span>
        </Link>
        <span className="nation-header-note">
          <span /> THE ART OF BUILDING A BETTER TOMORROW
        </span>
        <span className="nation-pill">EXPERIMENT 03</span>
      </header>
      <main className="nation-main">
        <ModeSwitcher active="nation" />
        <section className="nation-intro">
          <div>
            <div className="eyebrow">
              A WORLD OF POSSIBILITY. A COUNTRY OF YOUR OWN.
            </div>
            <h1>
              Small beginnings.<em> Great nations.</em>
            </h1>
            <p>
              Build thoughtfully. Grow steadily. Leave things a little better
              than you found them.
            </p>
          </div>
          <span className="nation-seal">
            <Globe2 size={26} />
            <span>
              NATION
              <br />
              <strong>RISE</strong>
            </span>
          </span>
        </section>
        {!save || !country ? (
          <section className="nation-welcome">
            <div className="nation-globe">
              🌍
              <span className="globe-orbit" />
            </div>
            <div>
              <div className="eyebrow">YOUR STORY STARTS SOMEWHERE</div>
              <h2>
                Where will you
                <br />
                <em>make a difference?</em>
              </h2>
              <p>
                Choose a country and shape its next chapter. Start with 12,000
                credits, a small community, and a world of potential.
              </p>
              <label className="nation-field">
                Choose your country
                <select
                  aria-label="Choose your country"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                >
                  <option value="">
                    {countries.length
                      ? "Select a country…"
                      : "Loading countries…"}
                  </option>
                  {countries.map((c) => (
                    <option
                      key={c.properties.code + c.properties.name}
                      value={c.properties.name}
                    >
                      {c.properties.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="nation-primary"
                disabled={!query}
                onClick={() => {
                  const c = countries.find((c) => c.properties.name === query);
                  if (c) start(c);
                }}
              >
                Begin your chapter <ArrowRight size={16} />
              </button>
              {loadError && <p role="alert">{loadError}</p>}
              <small>
                Fictional, balanced economies · Real country outlines · Saved on
                this device
              </small>
            </div>
          </section>
        ) : (
          <>
            <section className="nation-dashboard">
              <div className="nation-stat">
                <span>
                  <Coins size={14} /> NATIONAL TREASURY
                </span>
                <strong data-testid="treasury">◈ {money(save.cash)}</strong>
                <small className={stats!.net >= 0 ? "positive" : "negative"}>
                  {stats!.net >= 0 ? "+" : ""}
                  {money(stats!.net)} credits / minute
                </small>
              </div>
              <div className="nation-stat">
                <span>
                  <Building2 size={14} /> PEOPLE & PLACES
                </span>
                <strong>
                  {money(save.population)}
                  <i> residents</i>
                </strong>
                <small>
                  {Math.round(stats!.employment)}% employment ·{" "}
                  {save.buildings.length} projects
                </small>
              </div>
              <div className="nation-stat">
                <span>
                  <Leaf size={14} /> QUALITY OF LIFE
                </span>
                <strong>
                  {Math.round(stats!.happiness)}
                  <i>/100</i>
                </strong>
                <small>
                  {Math.round(stats!.health)} health ·{" "}
                  {Math.round(stats!.pollution)} pollution
                </small>
              </div>
              <div className="nation-stat">
                <span>
                  <TrendingUp size={14} /> DEVELOPMENT
                </span>
                <strong>
                  Tier {save.research + 1}
                  <i> / 6</i>
                </strong>
                <small>
                  {Math.floor(save.knowledge)} research points ·{" "}
                  {save.claimed.length}/{MILESTONES.length} goals
                </small>
              </div>
            </section>
            <section className="nation-workspace">
              <div className="nation-map-panel">
                <div className="nation-map-toolbar">
                  <span>
                    <span /> LIVE NATIONAL DEVELOPMENT
                  </span>
                  <div>
                    <button
                      aria-label="Zoom out map"
                      onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      aria-label="Zoom in map"
                      onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      aria-label="Toggle large nation view"
                      onClick={() => setCinema((v) => !v)}
                    >
                      {cinema ? <X size={15} /> : <Maximize2 size={15} />}
                    </button>
                  </div>
                </div>
                <NationMap
                  country={country}
                  save={save}
                  zoom={zoom}
                  onSelect={setSelected}
                  onCanvas={onCanvas}
                />
                <div className="nation-map-footer">
                  <span>Click a project to inspect & upgrade</span>
                  <div>
                    <button
                      onClick={() => setPaused((v) => !v)}
                      aria-label={paused ? "Resume economy" : "Pause economy"}
                    >
                      {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
                      {paused ? "Resume" : "Pause"}
                    </button>
                    <select
                      aria-label="Simulation speed"
                      value={speed}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSpeed(value);
                        action((s) => {
                          notify(
                            s,
                            `Time-lapse set to ${value}×. Construction and the economy now progress at this speed.`,
                          );
                        });
                      }}
                    >
                      <option value={1}>1× real time</option>
                      <option value={2}>2× progress</option>
                      <option value={5}>5× time-lapse</option>
                    </select>
                    <button
                      onClick={record}
                      className={recording ? "negative" : ""}
                    >
                      <ArrowDownToLine size={13} />
                      {recording ? "Stop & download" : "Record story"}
                    </button>
                  </div>
                </div>
                <div className="nation-resources">
                  {[
                    ["Food", stats!.food, save.population],
                    [
                      "Electricity",
                      stats!.power,
                      save.population +
                        save.buildings.reduce(
                          (n, b) =>
                            n +
                            b.level *
                              (b.type === "factory"
                                ? 140
                                : b.type === "port"
                                  ? 80
                                  : 0),
                          0,
                        ),
                    ],
                    ["Housing", stats!.housing, save.population],
                  ].map(([name, capacity, demand]) => (
                    <div key={name}>
                      <span>
                        {name}
                        <strong>
                          {Math.round(Number(capacity))} /{" "}
                          {Math.round(Number(demand))}
                        </strong>
                      </span>
                      <i>
                        <b
                          style={{
                            width: `${Math.min(100, (Number(capacity) / Number(demand)) * 100)}%`,
                            background:
                              Number(capacity) < Number(demand)
                                ? "#ca9274"
                                : "#91a77c",
                          }}
                        />
                      </i>
                      <small>
                        {Number(capacity) < Number(demand)
                          ? "Shortage · growth or productivity limited"
                          : "Capacity supports current demand"}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              <aside className="nation-control">
                <div className="nation-control-heading">
                  <Settings2 size={16} /> Make room for progress.
                </div>
                <div className="nation-tabs">
                  {(["Build", "Research", "Policies", "Goals"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        className={tab === t ? "active" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
                <div className="nation-control-content">
                  {tab === "Build" && (
                    <>
                      <label className="nation-field">
                        DEVELOPMENT DISTRICT
                        <select
                          value={region}
                          onChange={(e) => setRegion(Number(e.target.value))}
                        >
                          {DISTRICTS.map((r, i) => (
                            <option key={r} value={i}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="nation-muted">
                        Districts are game development zones, not actual
                        municipal boundaries.
                      </p>
                      <label className="nation-field">
                        INSPECT A PROJECT
                        <select
                          aria-label="Inspect a project"
                          value={selected ?? ""}
                          onChange={(e) =>
                            setSelected(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        >
                          <option value="">Select a project to upgrade…</option>
                          {save.buildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {BUILDINGS[b.type].name} · Lv.{b.level} ·{" "}
                              {DISTRICTS[b.region]}
                            </option>
                          ))}
                        </select>
                      </label>
                      {building && (
                        <div className="nation-inspect">
                          <button
                            aria-label="Close project inspection"
                            onClick={() => setSelected(null)}
                          >
                            <X size={13} />
                          </button>
                          <span>PROJECT INSPECTION</span>
                          <h3>
                            {BUILDINGS[building.type].name} · Lv.
                            {building.level}
                          </h3>
                          <p>
                            {DISTRICTS[building.region]} ·{" "}
                            {building.remaining
                              ? `${Math.ceil(building.remaining)}s remaining`
                              : "Operational"}
                          </p>
                          <button
                            className="nation-primary"
                            disabled={
                              !!building.remaining || building.level >= 5
                            }
                            onClick={() =>
                              action((s) =>
                                build(
                                  s,
                                  building.type,
                                  building.region,
                                  building.id,
                                ),
                              )
                            }
                          >
                            Upgrade · ◈{" "}
                            {money(costOf(building.type, building.level + 1))}
                          </button>
                        </div>
                      )}
                      <div className="nation-build-list">
                        {(Object.keys(BUILDINGS) as BuildingType[]).map(
                          (type) => {
                            const b = BUILDINGS[type];
                            return (
                              <div className="nation-build-card" key={type}>
                                <span
                                  className="nation-build-icon"
                                  style={{
                                    background: b.color + "30",
                                    color: b.color,
                                  }}
                                >
                                  {b.icon}
                                </span>
                                <div>
                                  <strong>{b.name}</strong>
                                  <p>{b.description}</p>
                                  <small>
                                    ◈ {money(b.cost)} · {b.time}s · {b.upkeep}
                                    /min upkeep
                                  </small>
                                </div>
                                <button
                                  aria-label={`Build ${b.name}`}
                                  disabled={
                                    save.cash < b.cost ||
                                    queue.length >= 2 + save.research ||
                                    (type === "port" && save.research < 1)
                                  }
                                  onClick={() =>
                                    action((s) => build(s, type, region))
                                  }
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </>
                  )}
                  {tab === "Research" && (
                    <>
                      <div className="nation-feature-icon">✦</div>
                      <h2>Ideas become possibility.</h2>
                      <p className="nation-body">
                        Every completed learning campus generates research
                        points. Each research tier increases industrial
                        productivity by 12% and adds a construction crew. Tier 1
                        opens trade terminals.
                      </p>
                      <div className="nation-research-progress">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={save.research > i ? "done" : ""}
                          >
                            {save.research > i ? <Check size={15} /> : i + 1}
                          </span>
                        ))}
                      </div>
                      <button
                        className="nation-primary"
                        disabled={
                          save.research >= 5 ||
                          save.cash < 2500 * (save.research + 1) ||
                          save.knowledge < 15 * (save.research + 1)
                        }
                        onClick={() => action(research)}
                      >
                        Research next tier <ArrowRight size={14} />
                      </button>
                      <p className="nation-muted">
                        Requires {2500 * (save.research + 1)} credits +{" "}
                        {15 * (save.research + 1)} points.
                      </p>
                      <hr />
                      <h3>A little help goes a long way.</h3>
                      <p className="nation-body">
                        A regional manager invests surplus funds every minute,
                        prioritizing shortages, clean air, and industry. Keeps a
                        2,500-credit reserve.
                      </p>
                      <button
                        className="nation-secondary"
                        disabled={save.research < 2}
                        onClick={() =>
                          action((s) => {
                            s.manager = !s.manager;
                            notify(
                              s,
                              s.manager
                                ? "Regional manager enabled. Surplus funds will be invested automatically."
                                : "Regional manager paused.",
                            );
                          })
                        }
                      >
                        {save.manager
                          ? "Pause manager"
                          : "Enable regional manager"}
                      </button>
                      <p className="nation-muted">
                        Unlocked at research tier 2.
                      </p>
                    </>
                  )}
                  {tab === "Policies" && (
                    <>
                      <h2>A balance worth finding.</h2>
                      <label className="nation-field">
                        Income tax · {Math.round(save.tax * 100)}%
                        <input
                          type="range"
                          min={10}
                          max={30}
                          step={1}
                          value={Math.round(save.tax * 100)}
                          onChange={(e) =>
                            action((s) => {
                              s.tax = Number(e.target.value) / 100;
                              notify(
                                s,
                                `Income tax set to ${Math.round(s.tax * 100)}%. Revenue and public satisfaction updated.`,
                              );
                            })
                          }
                        />
                      </label>
                      <p className="nation-body">
                        Higher taxes increase treasury income but reduce
                        satisfaction. Low satisfaction slows population growth
                        and tourism.
                      </p>
                      <label className="nation-policy-toggle">
                        <span>
                          Green investment
                          <small>−12 pollution · costs 18 credits/min</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={save.green}
                          onChange={(e) =>
                            action((s) => {
                              s.green = e.target.checked;
                              notify(
                                s,
                                s.green
                                  ? "Green investment enabled: cleaner air, with ongoing public expense."
                                  : "Green investment paused.",
                              );
                            })
                          }
                        />
                      </label>
                      <div className="nation-ledger">
                        <span>
                          Gross revenue
                          <strong>+{money(stats!.income)}/min</strong>
                        </span>
                        <span>
                          Public expenses
                          <strong>−{money(stats!.expenses)}/min</strong>
                        </span>
                        <span>
                          Industrial productivity
                          <strong>
                            {Math.round(stats!.efficiency * 100)}%
                          </strong>
                        </span>
                        <span>
                          Trade exports
                          <strong>{money(stats!.exports)}/min</strong>
                        </span>
                      </div>
                      <p className="nation-muted">
                        This is a fictional economy, not a forecast or real
                        country ranking.
                      </p>
                    </>
                  )}
                  {tab === "Goals" && (
                    <>
                      <h2>Good things take building.</h2>
                      <p className="nation-body">
                        Complete these national milestones for automatic
                        investment rewards.
                      </p>
                      {MILESTONES.map((m) => (
                        <div
                          className={`nation-goal ${save.claimed.includes(m.id) ? "complete" : ""}`}
                          key={m.id}
                        >
                          <span>
                            {save.claimed.includes(m.id) ? (
                              <Check size={16} />
                            ) : (
                              <Sparkles size={16} />
                            )}
                          </span>
                          <div>
                            <strong>{m.name}</strong>
                            <p>{m.description}</p>
                            <small>
                              Reward ◈ {money(m.reward)}{" "}
                              {save.claimed.includes(m.id) ? "· Claimed" : ""}
                            </small>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="nation-queue">
                  <span>
                    CONSTRUCTION · {queue.length}/{2 + save.research} CREWS
                  </span>
                  {queue.length ? (
                    queue.map((b) => (
                      <div key={b.id}>
                        <strong>{BUILDINGS[b.type].name}</strong>
                        <span>{Math.ceil(b.remaining)}s</span>
                        <i>
                          <b
                            style={{
                              width: `${(1 - b.remaining / b.total) * 100}%`,
                            }}
                          />
                        </i>
                      </div>
                    ))
                  ) : (
                    <p>Your crews are ready for the next chapter.</p>
                  )}
                </div>
              </aside>
            </section>
            <section className="nation-lower">
              <div className="nation-journal">
                <div className="eyebrow">
                  THE STORY SO FAR{" "}
                  <span>SIMULATION DAY {Math.floor(save.time / 120) + 1}</span>
                </div>
                {save.events.slice(0, 6).map((e) => (
                  <div key={e.id}>
                    <span className={e.kind === "milestone" ? "positive" : ""}>
                      {e.kind === "milestone"
                        ? "✦"
                        : e.kind === "warning"
                          ? "!"
                          : "↗"}
                    </span>
                    <p>{e.text}</p>
                    <small>{Math.floor(e.time / 60)}m</small>
                  </div>
                ))}
              </div>
              <div className="nation-save-panel">
                <div className="eyebrow">YOUR PROGRESS, YOURS TO KEEP</div>
                <h2>
                  Every chapter deserves
                  <br />
                  <em>a bookmark.</em>
                </h2>
                <p>
                  Autosaves every 5 seconds. Offline progress is capped at 4
                  hours. Keep a JSON backup to move your nation to another
                  device.
                </p>
                <div>
                  <button onClick={exportSave}>
                    <ArrowDownToLine size={14} /> Export campaign
                  </button>
                  <button onClick={() => file.current?.click()}>
                    <Upload size={14} /> Import
                  </button>
                </div>
                <label className="nation-field">
                  Explore another country
                  <select
                    value={country.properties.name}
                    disabled={recording}
                    onChange={(e) => {
                      const c = countries.find(
                        (c) => c.properties.name === e.target.value,
                      );
                      if (c) {
                        persist();
                        start(c);
                      }
                    }}
                  >
                    {countries.map((c) => (
                      <option key={c.properties.name} value={c.properties.name}>
                        {c.properties.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          </>
        )}
        <input
          type="file"
          ref={file}
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) void importSave(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <footer className="nation-footer">
          <span>
            nation rise <small>BY ORBIT STUDIO</small>
          </span>
          <span>Prosperity is a work in progress.</span>
          <span>Maps: Natural Earth · Public domain</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {offline && (
        <div className="nation-offline" role="status">
          <Sparkles size={22} />
          <h2>A little progress while you were away.</h2>
          <p>{offline}</p>
          <button className="nation-primary" onClick={() => setOffline("")}>
            Back to building <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
