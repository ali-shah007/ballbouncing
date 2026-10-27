"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { PlanetRenderer, PlanetOptions } from "@/lib/planet-renderer";
import { PlanetAudio } from "@/lib/planet-audio";
import type { PlanetStats } from "@/lib/planet";
export type PlanetHandle = {
  fire: () => Promise<void>;
  reset: () => void;
  enableAudio: () => Promise<void>;
  record: () => Promise<void>;
  stopRecording: () => void;
};
type Props = {
  options: PlanetOptions;
  muted: boolean;
  onStats: (stats: PlanetStats) => void;
  onError: (message: string) => void;
  onReady: () => void;
  onRecording: (active: boolean) => void;
};
const PlanetCanvas = forwardRef<PlanetHandle, Props>(
  function PlanetCanvas(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      engine = useRef<PlanetRenderer | null>(null),
      audio = useRef<PlanetAudio | null>(null),
      latest = useRef(props),
      recording = useRef<MediaRecorder | null>(null),
      stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    latest.current = props;
    async function enableAudio() {
      await audio.current?.init();
    }
    async function fire() {
      if (!engine.current || !latest.current.options.playing) return;
      await enableAudio();
      engine.current.fireAt();
    }
    useImperativeHandle(ref, () => ({
      fire,
      enableAudio,
      reset: () => {
        engine.current?.reset();
        if (engine.current)
          latest.current.onStats(engine.current.model.stats());
      },
      stopRecording: () => {
        if (recording.current?.state === "recording") recording.current.stop();
      },
      record: async () => {
        const canvas = engine.current?.renderer.domElement;
        if (
          !canvas ||
          !canvas.captureStream ||
          typeof MediaRecorder === "undefined"
        )
          throw Error(
            "Video recording is unavailable. Try a current desktop Chrome or Firefox.",
          );
        if (recording.current?.state === "recording") return;
        await enableAudio();
        const mime = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ].find((type) => MediaRecorder.isTypeSupported(type));
        if (!mime)
          throw Error("This browser has no supported recording format.");
        const stream = canvas.captureStream(60);
        audio.current?.destination?.stream
          .getAudioTracks()
          .forEach((track) => stream.addTrack(track));
        const recorder = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: 10_000_000,
          }),
          chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onstop = () => {
          if (stopTimer.current) clearTimeout(stopTimer.current);
          stream.getVideoTracks().forEach((t) => t.stop());
          latest.current.onRecording(false);
          if (!chunks.length) return;
          const url = URL.createObjectURL(new Blob(chunks, { type: mime }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `orbit-planet-${latest.current.options.world}.${mime.includes("mp4") ? "mp4" : "webm"}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        };
        recorder.onerror = () =>
          latest.current.onError(
            "Recording failed. Please retry in a supported browser.",
          );
        recording.current = recorder;
        recorder.start(500);
        latest.current.onRecording(true);
        stopTimer.current = setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, 30000);
      },
    }));
    useEffect(() => {
      if (engine.current) engine.current.options = props.options;
    }, [props.options]);
    useEffect(() => audio.current?.setMuted(props.muted), [props.muted]);
    useEffect(() => {
      if (!host.current) return;
      let animation = 0;
      let observer: ResizeObserver | undefined;
      const audioEngine = new PlanetAudio();
      audio.current = audioEngine;
      audioEngine.setMuted(latest.current.muted);
      let renderer: PlanetRenderer;
      try {
        renderer = new PlanetRenderer(latest.current.options);
        engine.current = renderer;
        host.current.appendChild(renderer.renderer.domElement);
        renderer.onLaunch = (w) => audioEngine.launch(w);
        renderer.onImpact = (w, p) => audioEngine.impact(w, p);
        renderer.onDestroy = () => audioEngine.destroy();
        const canvas = renderer.renderer.domElement;
        const resize = () => {
          if (recording.current?.state === "recording") return;
          const rect = host.current?.getBoundingClientRect();
          if (rect && rect.width && rect.height)
            renderer.resize(rect.width, rect.height);
        };
        resize();
        observer = new ResizeObserver(resize);
        observer.observe(host.current);
        let pointer: {
          x: number;
          y: number;
          lastX: number;
          lastY: number;
          dragged: boolean;
        } | null = null;
        const down = (event: PointerEvent) => {
          if (event.button !== 0) return;
          pointer = {
            x: event.clientX,
            y: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            dragged: false,
          };
          canvas.setPointerCapture(event.pointerId);
        };
        const move = (event: PointerEvent) => {
          if (!pointer) return;
          if (
            Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5
          )
            pointer.dragged = true;
          if (pointer.dragged)
            renderer.rotate(
              event.clientX - pointer.lastX,
              event.clientY - pointer.lastY,
            );
          pointer.lastX = event.clientX;
          pointer.lastY = event.clientY;
        };
        const up = (event: PointerEvent) => {
          const was = pointer;
          pointer = null;
          if (!was || was.dragged || !latest.current.options.playing) return;
          const rect = canvas.getBoundingClientRect(),
            x = ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y = (-(event.clientY - rect.top) / rect.height) * 2 + 1;
          void audioEngine
            .init()
            .then(() => renderer.fireAt(x, y))
            .catch(() =>
              latest.current.onError(
                "Sound could not start. Try enabling it with the sound button.",
              ),
            );
        };
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", () => {
          pointer = null;
        });
        let previous = performance.now(),
          report = 0;
        const frame = (time: number) => {
          const delta = (time - previous) / 1000;
          previous = time;
          try {
            renderer.update(delta);
          } catch (error) {
            latest.current.onError(
              error instanceof Error ? error.message : "The renderer stopped.",
            );
            return;
          }
          report += delta;
          if (report > 0.12) {
            latest.current.onStats(renderer.model.stats());
            report = 0;
          }
          animation = requestAnimationFrame(frame);
        };
        animation = requestAnimationFrame(frame);
        latest.current.onReady();
      } catch (error) {
        latest.current.onError(
          `3D graphics could not start. ${error instanceof Error ? error.message : "WebGL is unavailable."}`,
        );
      }
      return () => {
        cancelAnimationFrame(animation);
        observer?.disconnect();
        if (recording.current?.state === "recording") recording.current.stop();
        if (stopTimer.current) clearTimeout(stopTimer.current);
        audioEngine.close();
        renderer?.dispose();
        engine.current = null;
      };
    }, []);
    useEffect(() => {
      const el = host.current;
      if (!el || !engine.current || recording.current?.state === "recording")
        return;
      engine.current.resize(el.clientWidth, el.clientHeight);
    }, [props.options.quality]);
    return (
      <div
        ref={host}
        className="planet-canvas"
        role="img"
        aria-label="Interactive three-dimensional planet. Drag to rotate or click to launch an attack."
      />
    );
  },
);
export default PlanetCanvas;
