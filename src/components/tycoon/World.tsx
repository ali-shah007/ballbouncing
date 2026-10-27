"use client";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { ValleyScene } from "@/tycoon/scene";
import { useTycoon } from "@/tycoon/store";
export default function World() {
  const host = useRef<HTMLDivElement>(null),
    game = useRef<Phaser.Game | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false,
      g: Phaser.Game | undefined,
      unsub: (() => void) | undefined;
    const visibility = () => {
      if (!g) return;
      if (document.hidden) g.loop.sleep();
      else g.loop.wake();
    };
    const frame = requestAnimationFrame(() => {
      if (cancelled || !host.current) return;
      try {
        g = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host.current,
          backgroundColor: "#a7d8cb",
          scale: {
            mode: Phaser.Scale.RESIZE,
            width: host.current.clientWidth,
            height: host.current.clientHeight,
          },
          scene: [ValleyScene],
          input: { activePointers: 3 },
          render: { antialias: true, pixelArt: false },
          fps: { target: 60, limit: 60 },
          audio: { noAudio: true },
        });
        game.current = g;
        g.events.once("valley-ready", () => {
          requestAnimationFrame(() => {
            if (!cancelled) setReady(true);
          });
        });
        g.events.on("valley-error", () =>
          setError("Could not load the settlement artwork. Please reload."),
        );
        document.addEventListener("visibilitychange", visibility);
        unsub = useTycoon.subscribe((state) => {
          if (g) g.loop.fpsLimit = state.low ? 30 : 60;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Graphics unavailable");
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      unsub?.();
      document.removeEventListener("visibilitychange", visibility);
      g?.destroy(true);
      game.current = null;
    };
  }, []);
  function zoom(delta: number) {
    const scene = game.current?.scene.getScene("valley");
    if (scene?.cameras.main)
      scene.cameras.main.setZoom(
        Math.min(1.8, Math.max(0.45, scene.cameras.main.zoom + delta)),
      );
  }
  return (
    <>
      <div
        className="ty-world"
        ref={host}
        aria-label="Green Valley interactive isometric settlement"
      />
      {!ready && !error && (
        <div className="ty-loading">Bringing Green Valley to life…</div>
      )}
      {error && (
        <div className="ty-render-error" role="alert">
          {error}
        </div>
      )}
      <div className="ty-camera">
        <button aria-label="Zoom in settlement" onClick={() => zoom(0.15)}>
          ＋
        </button>
        <button aria-label="Zoom out settlement" onClick={() => zoom(-0.15)}>
          −
        </button>
        <button
          aria-label="Center settlement"
          onClick={() =>
            game.current?.scene
              .getScene("valley")
              .cameras.main.centerOn(470, 365)
          }
        >
          ⌖
        </button>
      </div>
    </>
  );
}
