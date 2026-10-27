"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Application, Graphics, Text, TextStyle } from "pixi.js";
import {
  CHARACTERS,
  Config,
  Simulation,
  Snapshot,
  Stats,
} from "@/lib/simulation";
import { SoundEngine } from "@/lib/audio";
export type CanvasHandle = {
  snapshot: () => Snapshot | undefined;
  restore: (s: Snapshot) => void;
  record: () => Promise<void>;
  stopRecording: () => void;
};
type Props = {
  config: Config;
  playing: boolean;
  muted: boolean;
  resetKey: number;
  portrait: boolean;
  episode: number;
  hook: string;
  teaser: string;
  onStats: (s: Stats) => void;
  onRecording: (v: boolean) => void;
  onError: (message: string) => void;
};
const SimulationCanvas = forwardRef<CanvasHandle, Props>(
  function SimulationCanvas(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      sim = useRef<Simulation | null>(null),
      app = useRef<Application | null>(null),
      sound = useRef<SoundEngine | null>(null),
      recorder = useRef<MediaRecorder | null>(null),
      latest = useRef(props);
    latest.current = props;
    useImperativeHandle(
      ref,
      () => ({
        snapshot: () => sim.current?.snapshot(),
        restore: (s) => sim.current?.restore(s),
        stopRecording: () => {
          if (recorder.current?.state === "recording") recorder.current.stop();
        },
        record: async () => {
          if (!app.current || !sound.current)
            throw Error("The canvas is still loading. Try again in a moment.");
          if (typeof MediaRecorder === "undefined")
            throw Error(
              "This browser does not support recording. Try a current version of Chrome or Firefox.",
            );
          await sound.current.init();
          const canvas = app.current.canvas as HTMLCanvasElement;
          if (!canvas.captureStream)
            throw Error("Canvas recording is unavailable in this browser.");
          if (recorder.current?.state === "recording") return;
          const stream = canvas.captureStream(60);
          const audio = sound.current.destination?.stream.getAudioTracks();
          if (audio) audio.forEach((t) => stream.addTrack(t));
          const mime = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4",
          ].find((t) => MediaRecorder.isTypeSupported(t));
          if (!mime)
            throw Error(
              "No supported video recording format was found in this browser.",
            );
          const recording = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: 8_000_000,
          });
          const chunks: BlobPart[] = [];
          recording.ondataavailable = (e) => {
            if (e.data.size) chunks.push(e.data);
          };
          recording.onstop = () => {
            latest.current.onRecording(false);
            stream.getVideoTracks().forEach((t) => t.stop());
            if (!chunks.length) return;
            const url = URL.createObjectURL(new Blob(chunks, { type: mime }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `orbit-episode-${latest.current.episode}.${mime.includes("mp4") ? "mp4" : "webm"}`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          };
          recording.onerror = () => {
            latest.current.onError(
              "Recording failed. Please retry in a supported browser.",
            );
            latest.current.onRecording(false);
          };
          recorder.current = recording;
          recording.start(1000);
          latest.current.onRecording(true);
        },
      }),
      [],
    );
    useEffect(() => {
      if (sim.current) sim.current.config = { ...props.config };
    }, [props.config]);
    useEffect(() => {
      sim.current = new Simulation(latest.current.config);
      latest.current.onStats(sim.current.stats());
    }, [props.resetKey]);
    useEffect(() => {
      if (sound.current) {
        sound.current.muted = props.muted;
        if (props.playing && !props.muted)
          void sound.current
            .init()
            .catch(() =>
              latest.current.onError(
                "Audio could not start. Click Play to try again.",
              ),
            );
      }
    }, [props.muted, props.playing]);
    useEffect(() => {
      let disposed = false;
      const a = new Application();
      sound.current = new SoundEngine();
      sim.current = new Simulation(latest.current.config);
      async function setup() {
        await a.init({
          width: 900,
          height: 1125,
          background: "#111714",
          antialias: true,
          resolution: 1,
          autoDensity: true,
          preference: "webgl",
          preserveDrawingBuffer: true,
        });
        if (disposed) {
          a.destroy(true);
          return;
        }
        app.current = a;
        host.current?.appendChild(a.canvas);
        const back = new Graphics(),
          art = new Graphics();
        a.stage.addChild(back, art);
        const label = new Text({
          text: "",
          style: new TextStyle({
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            fill: 0x9ca99f,
            letterSpacing: 3,
          }),
        });
        a.stage.addChild(label);
        const title = new Text({
          text: "",
          style: new TextStyle({
            fontFamily: "Georgia, serif",
            fontSize: 31,
            fill: 0xf0f0df,
            align: "center",
            wordWrap: true,
            wordWrapWidth: 720,
          }),
        });
        title.anchor.set(0.5);
        a.stage.addChild(title);
        const foot = new Text({
          text: "",
          style: new TextStyle({
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
            fill: 0x9ca99f,
            letterSpacing: 2,
            align: "center",
            wordWrap: true,
            wordWrapWidth: 700,
          }),
        });
        foot.anchor.set(0.5);
        a.stage.addChild(foot);
        const names = CHARACTERS.map((name) => {
          const text = new Text({
            text: name,
            style: new TextStyle({
              fontFamily: "Arial, sans-serif",
              fontSize: 12,
              fill: 0xc4d1b7,
              letterSpacing: 1,
            }),
          });
          text.anchor.set(0.5, 0);
          a.stage.addChild(text);
          return text;
        });
        let accumulator = 0,
          lastReport = 0,
          lastHeight = 0;
        a.ticker.add((ticker) => {
          const p = latest.current,
            s = sim.current!;
          s.onImpact = (_v, id) => sound.current?.tone(id);
          s.onEscape = () => sound.current?.tone(0, true);
          const height = p.portrait ? 1600 : 1125;
          if (height !== lastHeight) {
            a.renderer.resize(900, height);
            lastHeight = height;
          }
          if (p.playing) {
            accumulator += Math.min(ticker.deltaMS / 1000, 0.08);
            while (accumulator >= 1 / 120) {
              s.step(1 / 120);
              accumulator -= 1 / 120;
            }
          } else accumulator = 0;
          if (s.finished && recorder.current?.state === "recording")
            recorder.current.stop();
          lastReport += ticker.deltaMS;
          if (lastReport > 100) {
            p.onStats(s.stats());
            lastReport = 0;
          }
          const cx = 450,
            cy = height / 2 + 15,
            scale = 1.65;
          back.clear();
          for (let x = 32; x < 900; x += 36)
            for (let y = 32; y < height; y += 36)
              back.circle(x, y, 0.8).fill({ color: 0xacc8a8, alpha: 0.085 });
          back
            .circle(cx, cy, s.radius * scale + 37)
            .stroke({ color: 0x8faa85, width: 1, alpha: 0.07 });
          back
            .circle(cx, cy, s.radius * scale + 76)
            .stroke({ color: 0x8faa85, width: 1, alpha: 0.04 });
          art.clear();
          const start = s.angle + s.opening / 2,
            end = s.angle + Math.PI * 2 - s.opening / 2,
            r = s.radius * scale;
          for (const [width, alpha] of [
            [36, 0.016],
            [22, 0.035],
            [12, 0.09],
            [5, 0.6],
            [2, 0.9],
          ])
            art
              .arc(cx, cy, r, start, end)
              .stroke({ color: 0xc9dfb0, width, alpha });
          for (const angle of [start, end]) {
            const x = cx + Math.cos(angle) * r,
              y = cy + Math.sin(angle) * r;
            art.circle(x, y, 9).fill({ color: 0xd8f36a, alpha: 0.09 });
            art.circle(x, y, 3).fill(0xd8f36a);
          }
          for (const b of s.balls) {
            const x = cx + b.x * scale,
              y = cy + b.y * scale;
            for (let i = 0; i < b.trail.length; i++) {
              const t = b.trail[i];
              art
                .circle(
                  cx + t.x * scale,
                  cy + t.y * scale,
                  b.radius * scale * (i / b.trail.length) * 0.8,
                )
                .fill({ color: b.color, alpha: (i / b.trail.length) * 0.11 });
            }
            art
              .circle(x, y, b.radius * scale * 2.6)
              .fill({ color: b.color, alpha: 0.025 });
            art
              .circle(x, y, b.radius * scale * 1.5)
              .fill({ color: b.color, alpha: 0.07 });
            art.circle(x, y, b.radius * scale).fill(b.color);
            art
              .circle(x - b.radius * 0.35, y - b.radius * 0.45, b.radius * 0.28)
              .fill({ color: 0xffffff, alpha: 0.5 });
          }
          for (const z of s.sparks)
            art
              .circle(cx + z.x * scale, cy + z.y * scale, 2 * z.life)
              .fill({ color: z.color, alpha: z.life * 0.8 });
          names.forEach((text, id) => {
            const b = s.balls.find((ball) => ball.id === id);
            text.visible = p.config.captions && !!b;
            if (b)
              text.position.set(
                cx + b.x * scale,
                cy + (b.y + b.radius) * scale + 8,
              );
          });
          label.text = `ORBIT STUDIO    /    EPISODE ${String(p.episode).padStart(2, "0")}`;
          label.position.set(62, 65);
          title.visible = p.config.captions;
          foot.visible = p.config.captions;
          const ending = s.time >= p.config.duration - 2;
          title.text = ending ? "Every ending is another beginning." : p.hook;
          title.position.set(cx, p.portrait ? 260 : 170);
          foot.text = ending
            ? p.teaser
            : `${String(s.escapes).padStart(2, "0")} ESCAPED     ·     ${String(s.stats().balls).padStart(2, "0")} IN ORBIT`;
          foot.position.set(cx, height - (p.portrait ? 240 : 120));
        });
      }
      void setup().catch((error) =>
        latest.current.onError(
          `Graphics could not start: ${error instanceof Error ? error.message : "WebGL unavailable"}`,
        ),
      );
      return () => {
        disposed = true;
        if (recorder.current?.state === "recording") recorder.current.stop();
        sound.current?.close();
        if (app.current === a) {
          a.destroy(true, { children: true });
          app.current = null;
        }
      };
    }, []);
    return (
      <div
        className="canvas-host"
        ref={host}
        aria-label="Animated bouncing ball simulation"
        role="img"
      />
    );
  },
);
export default SimulationCanvas;
