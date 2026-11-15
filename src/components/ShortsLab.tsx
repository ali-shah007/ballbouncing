"use client";
import { useEffect, useRef, useState } from "react";
import ModeSwitcher from "./ModeSwitcher";
import { World, MODES, Mode, Event } from "@/shorts/physics";
import { Episode, renderEnding, EPISODE_SECONDS } from "@/shorts/story";
import { isMaterial } from "@/shorts/material";
import { isReference } from "@/shorts/reference";
import { render } from "@/shorts/render";
import { captureVideo, VideoCapture } from "@/lib/video-export";
import { SoundEngine } from "@/lib/audio";
class ShortsAudio extends SoundEngine {
  event(e: Event, mode: Mode) {
    if (!this.context || !this.gain || this.muted) return;
    const now = this.context.currentTime;
    if (now - this.last < (e.kind === "hit" ? 0.035 : 0.08)) return;
    this.last = now;
    if (isMaterial(mode)) {
      const buffer = this.context.createBuffer(
          1,
          Math.floor(this.context.sampleRate * 0.16),
          this.context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.exp((-i / data.length) * 7);
      const noise = this.context.createBufferSource(),
        filter = this.context.createBiquadFilter(),
        gain = this.context.createGain();
      noise.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value =
        mode === "slime" || mode === "jelly" ? 650 : 3500;
      gain.gain.value = mode === "press" ? 0.5 : 0.23;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.gain);
      noise.start(now);
      return;
    }
    const o = this.context.createOscillator(),
      g = this.context.createGain();
    o.type = e.kind === "split" || isReference(mode) ? "triangle" : "sine";
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
    const f =
      e.kind === "fail"
        ? 180
        : e.kind === "win"
          ? 880
          : e.kind === "escape"
            ? 1046.5
            : notes[(e.id + (mode === "duel" ? 2 : 0)) % notes.length];
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(
      e.kind === "fail" ? 70 : f * 1.005,
      now + 0.22,
    );
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.4, now + 0.004);
    g.gain.exponentialRampToValueAtTime(
      0.001,
      now + (isReference(mode) ? 0.09 : 0.3),
    );
    o.connect(g);
    g.connect(this.gain);
    o.start(now);
    o.stop(now + 0.32);
  }
}
export default function ShortsLab() {
  const canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef<HTMLDivElement>(null),
    world = useRef(
      Object.assign(new World("bloom", 4, 30, 1024), { loop: true }),
    );
  const audio = useRef<ShortsAudio | null>(null),
    capture = useRef<VideoCapture | null>(null),
    mounted = useRef(true),
    running = useRef(false),
    titleRef = useRef(""),
    brandRef = useRef("ORBIT STUDIO"),
    episode = useRef<Episode | null>(null),
    captureStart = useRef(0),
    seed = useRef(2026),
    linkRef = useRef("");
  const [mode, setMode] = useState<Mode>("bloom"),
    [play, setPlay] = useState(false),
    [sound, setSound] = useState(true),
    [volume, setVolume] = useState(55),
    [duration] = useState(EPISODE_SECONDS),
    [limit, setLimit] = useState(4),
    [target, setTarget] = useState(30),
    [cap, setCap] = useState(180),
    [density, setDensity] = useState(1024),
    [loop] = useState(true),
    [title, setTitle] = useState(""),
    [brand, setBrand] = useState("ORBIT STUDIO"),
    [recording, setRecording] = useState(false),
    [preparing, setPreparing] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [download, setDownload] = useState<{
      url: string;
      name: string;
      blob: Blob;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    let raf = 0,
      last = 0,
      stamp = "";
    const draw = (ts: number) => {
      if (ts - last < 32) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (canvas.current) {
        const ctx = canvas.current.getContext("2d", {
          alpha: false,
          willReadFrequently: true,
        });
        if (running.current && !capture.current) {
          const events = episode.current
            ? episode.current.step(
                last ? Math.min((ts - last) / 1000, 0.25) : 0,
              )
            : world.current.step(last ? Math.min((ts - last) / 1000, 0.05) : 0);
          for (const e of events) audio.current?.event(e, world.current.mode);
        }
        const key = [
          world.current.mode,
          world.current.randomSeed,
          world.current.time,
          world.current.round,
          titleRef.current,
          brandRef.current,
          episode.current?.elapsed,
        ].join(":");
        const bounds = canvas.current.getBoundingClientRect();
        const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
        if (ctx && visible && (capture.current || key !== stamp)) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (capture.current)
            ctx.drawImage(capture.current.canvas, 0, 0, 540, 960);
          else {
            ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
            render(ctx, world.current, titleRef.current, brandRef.current);
            if (episode.current) renderEnding(ctx, episode.current);
          }
          stamp = key;
        }
      }
      last = ts;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const hidden = () => {
      if (document.hidden && capture.current) {
        capture.current.stop();
        setError(
          "Recording stopped when the tab was hidden. Your captured clip is being checked.",
        );
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      mounted.current = false;
      cancelAnimationFrame(raf);
      capture.current?.abort();
      audio.current?.close();
      if (linkRef.current) URL.revokeObjectURL(linkRef.current);
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(
      () =>
        setElapsed(
          Math.floor((performance.now() - captureStart.current) / 1000),
        ),
      250,
    );
    return () => clearInterval(t);
  }, [recording]);
  async function initAudio() {
    if (!audio.current) audio.current = new ShortsAudio();
    audio.current.muted = !sound;
    await audio.current.init();
    if (audio.current.gain)
      audio.current.gain.gain.value = (volume / 100) * 0.3;
  }
  function reset(m = mode) {
    world.current = Object.assign(
      new World(m, limit, target, isReference(m) ? density : cap, seed.current),
      { loop },
    );
    episode.current = new Episode(world.current);
  }
  async function toggle() {
    try {
      await initAudio();
      if (!episode.current || episode.current.finished) reset();
      running.current = !running.current;
      setPlay(running.current);
    } catch {
      setError("Audio could not start. Check your browser audio settings.");
    }
  }
  function stop() {
    capture.current?.stop();
    setPreparing(true);
  }
  async function record() {
    if (capture.current || preparing) return;
    setError("");
    if (linkRef.current) URL.revokeObjectURL(linkRef.current);
    linkRef.current = "";
    setDownload(null);
    setPreparing(true);
    try {
      await initAudio();
      reset();
      const recordingMode = mode;
      const c = captureVideo(
        (ctx, dt) => {
          for (const event of episode.current!.step(dt))
            audio.current?.event(event, world.current.mode);
          render(ctx, world.current, titleRef.current, brandRef.current);
          renderEnding(ctx, episode.current!);
        },
        audio.current?.destination?.stream.getAudioTracks() || [],
        duration,
      );
      capture.current = c;
      captureStart.current = performance.now();
      running.current = true;
      setPlay(true);
      setElapsed(0);
      setRecording(true);
      setPreparing(false);
      const blob = await c.done;
      if (!mounted.current) return;
      if (linkRef.current) URL.revokeObjectURL(linkRef.current);
      const url = URL.createObjectURL(blob);
      linkRef.current = url;
      setDownload({
        url,
        blob,
        name: `orbit-${recordingMode}-1080x1920-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`,
      });
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Could not record video.");
    } finally {
      capture.current = null;
      running.current = false;
      if (mounted.current) {
        setPlay(false);
        setRecording(false);
        setPreparing(false);
      }
    }
  }
  async function shareVideo() {
    if (!download) return;
    const file = new File([download.blob], download.name, {
      type: download.blob.type.split(";")[0],
    });
    try {
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file], title: "Orbit Studio video" });
      else
        setError(
          "Use Download your video below. File sharing is unavailable in this browser.",
        );
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError("Sharing failed. Use the download link instead.");
    }
  }
  return (
    <main className="shorts-shell">
      <header className="shorts-header">
        <a href="/">
          orbit <b>studio</b>
        </a>
        <span>SHORTS LAB / CREATOR WORKSPACE</span>
        <form action="/logout" method="post">
          <button>Sign out</button>
        </form>
      </header>
      <ModeSwitcher active="shorts" />
      <section className="shorts-intro">
        <p className="shorts-kicker">
          REFERENCE-INSPIRED PHYSICS. ENDLESS POSSIBILITIES.
        </p>
        <h1>
          Your next <em>“watch till the end.”</em>
        </h1>
        <p>Neon physics, musical impacts and a frame made for the feed.</p>
      </section>
      <div className="shorts-layout">
        <section className="shorts-preview">
          <div className="shorts-preview-label">
            <span>LIVE PREVIEW</span>
            <span>EXPORT 1080 × 1920 / 9:16 / 24 FPS</span>
          </div>
          <div className="shorts-frame" ref={frame}>
            <canvas
              ref={canvas}
              width={540}
              height={960}
              aria-label="Shorts simulation preview"
            />
          </div>
          <div className="shorts-transport">
            <button disabled={recording || preparing} onClick={toggle}>
              {play ? "Pause" : "Play with sound"}
            </button>
            <button disabled={recording || preparing} onClick={() => reset()}>
              Restart
            </button>
            <button
              onClick={() => {
                frame.current
                  ?.requestFullscreen()
                  .catch(() =>
                    setError("Fullscreen is unavailable on this browser."),
                  );
              }}
            >
              Fullscreen
            </button>
          </div>
        </section>
        <aside className="shorts-controls">
          <section>
            <p className="shorts-kicker">01 / CHOOSE YOUR EXPERIMENT</p>
            <button
              disabled={recording || preparing}
              onClick={() => {
                const values = crypto.getRandomValues(new Uint32Array(2));
                seed.current = values[0];
                const m = MODES[values[1] % MODES.length].id;
                setMode(m);
                setTitle("");
                titleRef.current = "";
                reset(m);
              }}
            >
              Surprise me · random simulation
            </button>
            <div className="shorts-modes">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  disabled={recording || preparing}
                  aria-pressed={mode === m.id}
                  onClick={() => {
                    setMode(m.id);
                    reset(m.id);
                  }}
                >
                  <span>0{i + 1}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <small>{m.description}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="shorts-kicker">02 / MAKE IT YOURS</p>
            <label>
              On-screen headline
              <input
                value={title}
                maxLength={100}
                placeholder={MODES.find((m) => m.id === mode)!.hook}
                disabled={recording || preparing}
                onChange={(e) => {
                  setTitle(e.target.value);
                  titleRef.current = e.target.value;
                }}
              />
            </label>
            <label>
              Your watermark
              <input
                value={brand}
                maxLength={45}
                disabled={recording || preparing}
                onChange={(e) => {
                  setBrand(e.target.value);
                  brandRef.current = e.target.value;
                }}
              />
            </label>
            {mode === "escape" && (
              <label>
                Escape time (seconds)
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={limit}
                  disabled={recording || preparing}
                  onChange={(e) => {
                    const v = Math.max(
                      1,
                      Math.min(20, Number(e.target.value) || 4),
                    );
                    setLimit(v);
                    world.current = new World(mode, v, target, cap);
                    episode.current = new Episode(world.current);
                  }}
                />
              </label>
            )}
            {mode === "duel" && (
              <label>
                Hits to win
                <input
                  type="number"
                  min={3}
                  max={100}
                  value={target}
                  disabled={recording || preparing}
                  onChange={(e) => {
                    const v = Math.max(
                      3,
                      Math.min(100, Number(e.target.value) || 30),
                    );
                    setTarget(v);
                    world.current = new World(mode, limit, v, cap);
                    episode.current = new Episode(world.current);
                  }}
                />
              </label>
            )}
            {mode === "overflow" && (
              <label>
                Ball capacity
                <select
                  value={cap}
                  disabled={recording || preparing}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCap(v);
                    world.current = Object.assign(
                      new World(mode, limit, target, v, seed.current),
                      { loop },
                    );
                    episode.current = new Episode(world.current);
                  }}
                >
                  <option value={80}>80 balls</option>
                  <option value={180}>180 balls</option>
                  <option value={300}>300 balls</option>
                </select>
              </label>
            )}
            {isReference(mode) && mode !== "mandala" && mode !== "vortex" && (
              <label>
                Population limit
                <select
                  value={density}
                  disabled={recording || preparing}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDensity(v);
                    world.current = Object.assign(
                      new World(mode, limit, target, v, seed.current),
                      { loop },
                    );
                    episode.current = new Episode(world.current);
                  }}
                >
                  {[256, 512, 1024, 2048, 4096].map((n) => (
                    <option value={n} key={n}>
                      {n.toLocaleString()} balls
                      {n > 1024 ? " · desktop recommended" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="shorts-check">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => {
                  setSound(e.target.checked);
                  if (audio.current) audio.current.muted = !e.target.checked;
                }}
              />{" "}
              Record sound effects
            </label>
            <label>
              Volume · {volume}%
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (audio.current?.gain)
                    audio.current.gain.gain.value = (v / 100) * 0.3;
                }}
              />
            </label>
          </section>
          <section>
            <p className="shorts-kicker">03 / CAPTURE THE MOMENT</p>
            <label>
              Episode duration
              <select value={45} disabled aria-label="Episode duration">
                <option value={45}>45 seconds · complete story</option>
              </select>
            </label>
            <p>
              Records the canvas and sound directly. Keep this tab visible;
              capture runs in real time. Every full take builds to a result in
              its final four seconds. MP4 is preferred for phone playback; WebM
              is used only when MP4 recording is unavailable. Every clip is
              checked for a decodable picture before download.
            </p>
            {recording ? (
              <button
                className="shorts-record is-recording"
                onClick={stop}
                disabled={preparing}
              >
                Stop recording · {elapsed}s / {duration}s
              </button>
            ) : (
              <button
                className="shorts-record"
                disabled={preparing}
                onClick={record}
              >
                {preparing ? "Checking video…" : "● Record Shorts video"}
              </button>
            )}
            {download && (
              <div className="shorts-result">
                <video
                  aria-label="Recorded video preview"
                  src={download.url}
                  controls
                  playsInline
                  preload="metadata"
                />
                <p>
                  {download.blob.type.includes("mp4")
                    ? "MP4 video · phone-friendly"
                    : "WebM video · preview here or upload to YouTube; some phone galleries cannot play WebM"}{" "}
                  · {(download.blob.size / 1048576).toFixed(1)} MB
                </p>
                <a
                  className="shorts-download"
                  style={{ visibility: recording ? "hidden" : "visible" }}
                  href={download.url}
                  download={download.name}
                >
                  Download your video ↗
                </a>
                <button onClick={shareVideo}>Share / Save video</button>
              </div>
            )}
            {error && (
              <p role="alert" className="shorts-error">
                {error}
              </p>
            )}
            <small>
              Original simulations inspired by your references. No third-party
              social interface, logos or music are copied.
            </small>
          </section>
        </aside>
      </div>
    </main>
  );
}
