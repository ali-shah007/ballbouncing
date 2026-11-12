"use client";
import { useEffect, useRef, useState } from "react";
import ModeSwitcher from "./ModeSwitcher";
import { World, MODES, Mode, Event } from "@/shorts/physics";
import { render } from "@/shorts/render";
import { SoundEngine } from "@/lib/audio";
class ShortsAudio extends SoundEngine {
  event(e: Event, mode: Mode) {
    if (!this.context || !this.gain || this.muted) return;
    const now = this.context.currentTime;
    if (now - this.last < (e.kind === "hit" ? 0.035 : 0.08)) return;
    this.last = now;
    const o = this.context.createOscillator(),
      g = this.context.createGain();
    o.type = e.kind === "split" ? "triangle" : "sine";
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
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o.connect(g);
    g.connect(this.gain);
    o.start(now);
    o.stop(now + 0.32);
  }
}
export default function ShortsLab() {
  const canvas = useRef<HTMLCanvasElement>(null),
    frame = useRef<HTMLDivElement>(null),
    world = useRef(new World("collision"));
  const audio = useRef<ShortsAudio | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true),
    running = useRef(false),
    titleRef = useRef(""),
    brandRef = useRef("ORBIT STUDIO"),
    captureStart = useRef(0),
    linkRef = useRef("");
  const [mode, setMode] = useState<Mode>("collision"),
    [play, setPlay] = useState(false),
    [sound, setSound] = useState(true),
    [volume, setVolume] = useState(55),
    [duration, setDuration] = useState(30),
    [limit, setLimit] = useState(4),
    [target, setTarget] = useState(30),
    [cap, setCap] = useState(180),
    [title, setTitle] = useState(""),
    [brand, setBrand] = useState("ORBIT STUDIO"),
    [recording, setRecording] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [download, setDownload] = useState<{ url: string; name: string } | null>(
      null,
    ),
    [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    let raf = 0,
      last = 0;
    const draw = (ts: number) => {
      if (canvas.current) {
        const ctx = canvas.current.getContext("2d");
        if (running.current) {
          const events = world.current.step(
            last ? Math.min((ts - last) / 1000, 0.05) : 0,
          );
          for (const e of events) audio.current?.event(e, world.current.mode);
        }
        if (ctx) render(ctx, world.current, titleRef.current, brandRef.current);
      }
      last = ts;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      mounted.current = false;
      cancelAnimationFrame(raf);
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
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
    world.current = new World(m, limit, target, cap);
  }
  async function toggle() {
    try {
      await initAudio();
      running.current = !running.current;
      setPlay(running.current);
    } catch {
      setError("Audio could not start. Check your browser audio settings.");
    }
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function record() {
    if (!canvas.current) return;
    setError("");
    if (typeof MediaRecorder === "undefined" || !canvas.current.captureStream) {
      setError(
        "This browser cannot record canvas video. Use current Chrome, Edge or Safari.",
      );
      return;
    }
    try {
      await initAudio();
      const mime = [
        "video/mp4;codecs=avc1.424028,mp4a.40.2",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/mp4",
        "video/webm",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) throw Error("No supported video encoder was found.");
      reset();
      render(
        canvas.current.getContext("2d")!,
        world.current,
        titleRef.current,
        brandRef.current,
      );
      const video = canvas.current.captureStream(30);
      const tracks = audio.current?.destination?.stream.getAudioTracks() || [];
      // Clone the audio track so ending one recording keeps future recordings audible.
      const capture = new MediaStream([
        ...video.getVideoTracks(),
        ...tracks.map((t) => t.clone()),
      ]);
      stream.current = capture;
      const rec = new MediaRecorder(capture, {
        mimeType: mime,
        videoBitsPerSecond: 10000000,
        audioBitsPerSecond: 192000,
      });
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        capture.getTracks().forEach((t) => t.stop());
        running.current = false;
        if (!mounted.current) return;
        setRecording(false);
        setPlay(false);
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size) {
          if (linkRef.current) URL.revokeObjectURL(linkRef.current);
          const url = URL.createObjectURL(blob);
          linkRef.current = url;
          setDownload({
            url,
            name: `orbit-${mode}-1080x1920-${Date.now()}.${rec.mimeType.includes("mp4") ? "mp4" : "webm"}`,
          });
        } else
          setError(
            "The browser returned an empty recording. Please try Chrome.",
          );
      };
      rec.onerror = () => {
        setError(
          "Recording failed in this browser. Try a shorter duration or Chrome.",
        );
        stop();
      };
      rec.start(1000);
      captureStart.current = performance.now();
      running.current = true;
      setPlay(true);
      setElapsed(0);
      setRecording(true);
      timer.current = setTimeout(stop, duration * 1000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : "Could not start recording.");
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
          FIVE EXPERIMENTS. ENDLESS POSSIBILITIES.
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
            <span>1080 × 1920 / 9:16 / 30 FPS</span>
          </div>
          <div className="shorts-frame" ref={frame}>
            <canvas
              ref={canvas}
              width={1080}
              height={1920}
              aria-label="Shorts simulation preview"
            />
          </div>
          <div className="shorts-transport">
            <button disabled={recording} onClick={toggle}>
              {play ? "Pause" : "Play with sound"}
            </button>
            <button disabled={recording} onClick={() => reset()}>
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
            <div className="shorts-modes">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  disabled={recording}
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
                disabled={recording}
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
                disabled={recording}
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
                  disabled={recording}
                  onChange={(e) => {
                    const v = Math.max(
                      1,
                      Math.min(20, Number(e.target.value) || 4),
                    );
                    setLimit(v);
                    world.current = new World(mode, v, target, cap);
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
                  disabled={recording}
                  onChange={(e) => {
                    const v = Math.max(
                      3,
                      Math.min(100, Number(e.target.value) || 30),
                    );
                    setTarget(v);
                    world.current = new World(mode, limit, v, cap);
                  }}
                />
              </label>
            )}
            {mode === "overflow" && (
              <label>
                Ball capacity
                <select
                  value={cap}
                  disabled={recording}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCap(v);
                    world.current = new World(mode, limit, target, v);
                  }}
                >
                  <option value={80}>80 balls</option>
                  <option value={180}>180 balls</option>
                  <option value={300}>300 balls</option>
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
              <select
                value={duration}
                disabled={recording}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[15, 30, 60, 90, 180].map((n) => (
                  <option key={n} value={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </label>
            <p>
              Records the canvas and sound directly. Keep this tab visible;
              capture runs in real time. MP4 where supported, otherwise
              WebM—both accepted by YouTube.
            </p>
            {recording ? (
              <button className="shorts-record is-recording" onClick={stop}>
                Stop recording · {elapsed}s / {duration}s
              </button>
            ) : (
              <button className="shorts-record" onClick={record}>
                ● Record Shorts video
              </button>
            )}
            {download && (
              <a
                className="shorts-download"
                href={download.url}
                download={download.name}
              >
                Download your video ↗
              </a>
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
