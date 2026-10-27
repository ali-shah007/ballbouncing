"use client";
import { useEffect, useRef, useState } from "react";
import { createWorld, World } from "@/state-sim/model";
import { Code } from "@/state-sim/scenarios";
import { loadWorld, saveWorld, validWorld } from "@/state-sim/persistence";
export function useMandate() {
  const [world, setWorld] = useState<World | null>(null),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("");
  const ref = useRef(world);
  ref.current = world;
  useEffect(() => {
    let live = true;
    loadWorld()
      .then((r) => {
        if (!live) return;
        if (r.world) setWorld(r.world);
        if (r.recovered)
          setNotice(
            "A damaged save was detected. The previous valid backup was restored where available.",
          );
        setReady(true);
      })
      .catch(() => {
        if (live) {
          setReady(true);
          setNotice(
            "Storage is unavailable. Use JSON export to keep your mandate.",
          );
        }
      });
    const timer = setInterval(() => {
      if (ref.current)
        void saveWorld(structuredClone(ref.current)).catch(() =>
          setNotice("Autosave failed. Export a backup to keep your progress."),
        );
    }, 5000);
    const save = () => {
      if (ref.current)
        void saveWorld(structuredClone(ref.current)).catch(() => {});
    };
    window.addEventListener("pagehide", save);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, []);
  function update(fn: (w: World) => string | null | void) {
    if (!ref.current) return;
    const next = structuredClone(ref.current);
    try {
      const error = fn(next);
      if (error) {
        setNotice(error);
        return;
      }
      if (!validWorld(next)) {
        setNotice(
          "The change failed model validation. Your previous state was preserved.",
        );
        return;
      }
      ref.current = next;
      setWorld(next);
      void saveWorld(structuredClone(next)).catch(() =>
        setNotice("Autosave failed. Export a backup."),
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "The change could not be applied.",
      );
    }
  }
  function start(code: Code) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const next = createWorld(code, seed);
    ref.current = next;
    setWorld(next);
    void saveWorld(next).catch(() =>
      setNotice("Storage unavailable. Export a backup."),
    );
  }
  function exportFile() {
    if (!ref.current) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(ref.current, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `nation-state-${ref.current.player}-month-${ref.current.month}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(f: File) {
    try {
      if (f.size > 3000000) throw Error("Backup exceeds 3 MB.");
      const value: unknown = JSON.parse(await f.text());
      if (!validWorld(value))
        throw Error(
          "This is not a valid balanced Nation State save. Your current mandate was preserved.",
        );
      ref.current = value;
      setWorld(value);
      await saveWorld(value);
      setNotice("Mandate imported. No offline months have been simulated.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not import this file.");
    }
  }
  return {
    world,
    ready,
    notice,
    setNotice,
    update,
    start,
    exportFile,
    importFile,
  };
}
