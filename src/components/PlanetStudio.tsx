"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Crosshair,
  Expand,
  Flame,
  Globe2,
  Info,
  Maximize2,
  Minus,
  Orbit,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import ModeSwitcher from "./ModeSwitcher";
import type { PlanetHandle } from "./PlanetCanvas";
import { PlanetStats, Weapon, World, WEAPONS, WORLDS } from "@/lib/planet";
const PlanetCanvas = dynamic(() => import("./PlanetCanvas"), {
  ssr: false,
  loading: () => null,
});
const INITIAL: PlanetStats = {
  integrity: 100,
  impacts: 0,
  launched: 0,
  pending: 0,
  time: 0,
  destroyed: false,
};
export default function PlanetStudio() {
  const [world, setWorld] = useState<World>("oasis"),
    [weapon, setWeapon] = useState<Weapon>("laser"),
    [power, setPower] = useState(1),
    [playing, setPlaying] = useState(true),
    [auto, setAuto] = useState(false),
    [muted, setMuted] = useState(false),
    [zoom, setZoom] = useState(1),
    [quality, setQuality] = useState<"high" | "balanced">("high"),
    [shake, setShake] = useState(true),
    [recording, setRecording] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [stats, setStats] = useState(INITIAL),
    [cinema, setCinema] = useState(false),
    [help, setHelp] = useState(false);
  const scene = useRef<PlanetHandle>(null),
    viewport = useRef<HTMLDivElement>(null);
  const options = { world, weapon, power, playing, auto, zoom, quality, shake };
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(false);
      if (event.key !== "Tab") return;
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        ".planet-help button",
      );
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [help]);
  useEffect(() => {
    if (stats.destroyed) setAuto(false);
  }, [stats.destroyed]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return;
      if (event.key === "Escape") {
        setCinema(false);
        setHelp(false);
      }
      if (event.key === "1") setWeapon("laser");
      if (event.key === "2") setWeapon("meteor");
      if (event.key === "3") setWeapon("antimatter");
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function reset() {
    scene.current?.reset();
    setStats(INITIAL);
    setAuto(false);
    setPlaying(true);
  }
  async function fire() {
    try {
      await scene.current?.fire();
    } catch {
      setToast("Audio could not start. Try again or mute sound.");
    }
  }
  async function toggleAuto() {
    try {
      await scene.current?.enableAudio();
      setAuto((v) => !v);
      setPlaying(true);
    } catch {
      setToast("Sound could not start. Please try again.");
    }
  }
  async function record() {
    if (recording) {
      scene.current?.stopRecording();
      return;
    }
    try {
      setPlaying(true);
      await scene.current?.record();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Recording could not start.");
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (viewport.current?.requestFullscreen)
        await viewport.current.requestFullscreen();
      else setCinema((v) => !v);
    } catch {
      setCinema((v) => !v);
    }
  }
  const stage = stats.destroyed
    ? "WORLD LOST"
    : stats.integrity < 35
      ? "CORE UNSTABLE"
      : stats.integrity < 70
        ? "SURFACE FRACTURING"
        : "SYSTEM STABLE";
  return (
    <div className={`planet-page ${cinema ? "planet-cinema" : ""}`}>
      <header className="planet-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          orbit<span className="brand-light">studio</span>
          <span className="planet-lab-badge">PLANET LAB</span>
        </Link>
        <div className="planet-header-right">
          <span>
            <span className="planet-status-dot" /> REAL-TIME 3D
          </span>
          <Link href="/guides">
            The playbook <ArrowRight size={13} />
          </Link>
          <button
            onClick={() => setHelp((v) => !v)}
            aria-label="Planet lab help"
          >
            <Info size={17} />
          </button>
        </div>
      </header>
      <main className="planet-main">
        <ModeSwitcher active="planet" />
        <section className="planet-intro">
          <div>
            <div className="planet-eyebrow">
              <span /> A BEAUTIFUL WAY TO BREAK THINGS
            </div>
            <h1>
              Every world has
              <br className="mobile-break" /> <em>a breaking point.</em>
            </h1>
            <p>Choose a world. Leave your mark. Watch the universe respond.</p>
          </div>
          <div className="planet-intro-note">
            <Orbit size={23} />
            <span>
              Big worlds.
              <br />
              <strong>Bigger consequences.</strong>
            </span>
          </div>
        </section>
        <section
          className="planet-lab"
          aria-label="Planet destruction simulator"
        >
          <div className="planet-view" ref={viewport}>
            <PlanetCanvas
              ref={scene}
              options={options}
              muted={muted}
              onStats={setStats}
              onReady={() => setReady(true)}
              onError={setError}
              onRecording={setRecording}
            />
            {(!ready || error) && (
              <div className="planet-loading" role={error ? "alert" : "status"}>
                {error ? (
                  <>
                    <Globe2 size={32} />
                    <strong>We couldn’t open this universe.</strong>
                    <p>{error}</p>
                    <span>
                      Enable hardware acceleration or try a browser with WebGL 2
                      support.
                    </span>
                  </>
                ) : (
                  <>
                    <Orbit size={38} className="spin" />
                    <strong>Bringing a world to life…</strong>
                    <span>
                      Building terrain, clouds, and a little atmosphere.
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="planet-view-top">
              <div className="planet-feed">
                <span
                  className={
                    recording ? "planet-record-led" : "planet-status-dot"
                  }
                />
                {recording
                  ? "RECORDING · UP TO 30s"
                  : "ORBITAL OBSERVATION FEED"}
                <span className="feed-divider" /> SECTOR 07
              </div>
              <div className="planet-view-actions">
                <button
                  aria-label={
                    muted ? "Enable planet sound" : "Mute planet sound"
                  }
                  onClick={() => {
                    void scene.current?.enableAudio();
                    setMuted((v) => !v);
                  }}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  aria-label="Toggle cinema view"
                  aria-pressed={cinema}
                  onClick={() => setCinema((v) => !v)}
                >
                  {cinema ? <X size={17} /> : <Maximize2 size={16} />}
                </button>
                <button
                  aria-label="Fullscreen planet view"
                  onClick={fullscreen}
                >
                  <Expand size={16} />
                </button>
              </div>
            </div>
            <div className="world-ident">
              <span>
                SUBJECT {String(WORLDS[world].index + 1).padStart(2, "0")} /{" "}
                {WORLDS[world].label}
              </span>
              <h2>
                {WORLDS[world].name}
                <span>®</span>
              </h2>
              <p>{WORLDS[world].subtitle}</p>
              <div>
                <span
                  className={
                    stats.destroyed ? "warning-led" : "planet-status-dot"
                  }
                />
                {stage}
              </div>
            </div>
            <div className="planet-telemetry">
              <div className="telemetry-title">
                <Shield size={12} /> STRUCTURAL INTEGRITY
              </div>
              <div
                className={`integrity-value ${stats.integrity < 35 ? "critical" : ""}`}
              >
                <strong>{Math.ceil(stats.integrity)}</strong>
                <span>%</span>
              </div>
              <div className="integrity-track">
                <span
                  style={{
                    width: `${stats.integrity}%`,
                    background:
                      stats.integrity < 35
                        ? "#ff8967"
                        : stats.integrity < 70
                          ? "#edc58e"
                          : "#a9c8a6",
                  }}
                />
              </div>
              <dl>
                <div>
                  <dt>Confirmed impacts</dt>
                  <dd>{String(stats.impacts).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>Inbound</dt>
                  <dd>{String(stats.pending).padStart(2, "0")}</dd>
                </div>
              </dl>
              <span className="telemetry-coordinates">
                26° 14′ N &nbsp; 71° 32′ E<br />
                SIMULATED SECTOR · NOT TO SCALE
              </span>
            </div>
            <div className="planet-reticle" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <span />
            </div>
            {stats.destroyed && (
              <div className="planet-destroyed" role="status">
                <span>THE SIGNAL WENT QUIET.</span>
                <h3>Nothing lasts forever.</h3>
                <p>Another world. Another possibility.</p>
                <button onClick={reset}>
                  <RotateCcw size={14} /> Rebuild this world
                </button>
              </div>
            )}
            <div className="planet-view-bottom">
              <div className="planet-interaction-note">
                <Crosshair size={14} />
                <span>
                  {stats.destroyed
                    ? "The fragments tell the rest of the story."
                    : "Click the planet to strike · Drag to rotate"}
                </span>
              </div>
              <div className="planet-zoom">
                <button
                  disabled={recording || zoom <= 0.8}
                  onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                  aria-label="Zoom out"
                >
                  <Minus size={14} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  disabled={recording || zoom >= 1.5}
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                  aria-label="Zoom in"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="planet-command">
            <div className="weapon-heading">
              <span>
                <Target size={14} /> CHOOSE YOUR IMPACT
              </span>
              <small>THE UNIVERSE IS YOUR SANDBOX.</small>
            </div>
            <div className="planet-command-grid">
              <div className="weapon-options">
                {(Object.keys(WEAPONS) as Weapon[]).map((w) => (
                  <button
                    key={w}
                    className={`weapon-card ${weapon === w ? "active" : ""}`}
                    aria-label={`${WEAPONS[w].name} ${WEAPONS[w].short}`}
                    aria-pressed={weapon === w}
                    onClick={() => setWeapon(w)}
                    style={
                      {
                        "--weapon-color": WEAPONS[w].color,
                      } as React.CSSProperties
                    }
                  >
                    <span className="weapon-icon">
                      {w === "laser" ? (
                        <Zap size={23} />
                      ) : w === "meteor" ? (
                        <Flame size={23} />
                      ) : (
                        <Orbit size={25} />
                      )}
                    </span>
                    <span>
                      <strong>{WEAPONS[w].name}</strong>
                      <small>{WEAPONS[w].short}</small>
                    </span>
                    <kbd>{WEAPONS[w].key}</kbd>
                    {weapon === w && (
                      <span className="weapon-selected">
                        <Check size={10} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="launch-controls">
                <label className="planet-power">
                  <span>
                    Impact power <strong>{power.toFixed(1)}×</strong>
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={power}
                    onChange={(e) => setPower(Number(e.target.value))}
                  />
                </label>
                <button
                  className="planet-launch"
                  disabled={
                    !ready ||
                    !!error ||
                    stats.destroyed ||
                    !playing ||
                    stats.pending >= 8
                  }
                  onClick={fire}
                >
                  <Crosshair size={17} /> Launch attack <ArrowUpRightIcon />
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="planet-settings" aria-label="Scene controls">
          <div className="planet-world-control">
            <Globe2 size={16} />
            <label htmlFor="planet-world">WORLD</label>
            <select
              id="planet-world"
              value={world}
              disabled={recording || !ready}
              onChange={(e) => {
                setWorld(e.target.value as World);
                reset();
              }}
            >
              {(Object.keys(WORLDS) as World[]).map((w) => (
                <option key={w} value={w}>
                  {WORLDS[w].name} · {WORLDS[w].label.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="planet-settings-divider" />
          <button
            className={auto ? "auto-active" : ""}
            disabled={!ready || !!error || stats.destroyed}
            onClick={toggleAuto}
          >
            <Radio size={15} />
            {auto ? "Barrage active" : "Auto barrage"}
            <span className={`planet-mini-toggle ${auto ? "on" : ""}`} />
          </button>
          <button
            disabled={!ready || !!error}
            onClick={() => setPlaying((v) => !v)}
            aria-label={
              playing ? "Pause planet simulation" : "Resume planet simulation"
            }
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? "Pause" : "Resume"}</span>
          </button>
          <button onClick={reset} disabled={recording || !ready || !!error}>
            <RotateCcw size={14} /> Reset
          </button>
          <div className="planet-settings-spacer" />
          <button
            className="planet-record-button"
            onClick={record}
            disabled={!ready || !!error}
          >
            {recording ? (
              <span className="planet-record-led" />
            ) : (
              <ArrowDownToLine size={15} />
            )}{" "}
            {recording ? "Stop & download" : "Record scene"}
          </button>
        </section>
        <section className="planet-bottom">
          <div>
            <span className="planet-fine">
              <Sparkles size={12} /> Procedural worlds. Real-time consequences.
              Endless do-overs.
            </span>
            <span className="planet-fine subtle">
              Fictional visual simulation · Sound starts with your first
              interaction.
            </span>
          </div>
          <div className="planet-quality">
            <label>
              <span>Camera shake</span>
              <input
                type="checkbox"
                checked={shake}
                onChange={(e) => setShake(e.target.checked)}
              />
            </label>
            <label>
              <Settings2 size={13} />
              <select
                aria-label="Graphics quality"
                value={quality}
                disabled={recording}
                onChange={(e) =>
                  setQuality(e.target.value as "high" | "balanced")
                }
              >
                <option value="high">High quality</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>
          </div>
        </section>
        <section className="planet-editorial">
          <span className="planet-eyebrow">A DIFFERENT KIND OF SATISFYING</span>
          <div>
            <h2>
              Creation. Destruction.
              <br />
              <em>And everything in between.</em>
            </h2>
            <p>
              A procedural 3D planet, lit by a distant star. Every impact leaves
              a glowing scar. Keep going and the crust gives way to a cloud of
              fragments. Switch worlds, change your approach, and capture the
              moment it all falls apart.
            </p>
            <Link href="/">
              Back to the smaller things <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <footer className="planet-footer">
          <span>
            orbit studio <small>PLANET LAB / EXPERIMENT 02</small>
          </span>
          <span>Nothing here is permanent. That’s the point.</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {help && (
        <div
          className="planet-help"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planet-help-title"
        >
          <button
            className="planet-help-close"
            autoFocus
            onClick={() => setHelp(false)}
            aria-label="Close planet help"
          >
            <X size={18} />
          </button>
          <span className="planet-eyebrow">
            A FIELD GUIDE TO THE END OF WORLDS
          </span>
          <h2 id="planet-help-title">Big view. Bigger possibilities.</h2>
          <p>
            Choose an attack and click a point on the planet, or use Launch
            attack for a random visible target. Drag the globe to rotate it.
            Keys 1, 2, and 3 switch weapons; Space pauses the scene.
          </p>
          <p>
            Impacts weaken the crust. At zero integrity, the planet fragments.
            Reset rebuilds it. Auto barrage launches a strike every 1.65
            simulation seconds.
          </p>
          <p>
            Record scene captures the 3D canvas with sound for up to 30 seconds.
            Keep the tab visible; the download format depends on your browser.
            HUD controls are excluded from the recording. Choose Balanced
            quality on slower devices.
          </p>
          <button className="planet-launch" onClick={() => setHelp(false)}>
            Understood. Let’s experiment. <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
