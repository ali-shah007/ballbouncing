"use client";
import { useEffect, useState } from "react";
import { useTycoon } from "@/tycoon/store";
import { advance, offline, Save } from "@/tycoon/engine";
import { loadGame, saveGame } from "@/tycoon/persistence";
import { resumeAudio, suspendAudio } from "@/tycoon/audio";
export function useGame() {
  const [report, setReport] = useState<ReturnType<typeof offline> | null>(null);
  useEffect(() => {
    let alive = true,
      last = Date.now(),
      carry = 0,
      saving = false;
    async function persist() {
      if (!useTycoon.getState().ready || saving) return;
      saving = true;
      try {
        await saveGame(structuredClone(useTycoon.getState().save));
      } catch {
        useTycoon.setState({
          toast: "Storage unavailable. Export a backup from Nation settings.",
        });
      } finally {
        saving = false;
      }
    }
    loadGame()
      .then((result) => {
        if (!alive) return;
        const r = offline(result.save);
        useTycoon.setState({
          save: result.save,
          ready: true,
          reduced: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
          toast: result.recovered
            ? "Damaged save recovered from backup, or a fresh village was created."
            : "",
        });
        if (r.seconds > 30) setReport(r);
        last = Date.now();
      })
      .catch(() => {
        if (alive)
          useTycoon.setState({
            ready: true,
            toast:
              "Local storage unavailable. Export backups to protect your progress.",
          });
      });
    const tick = setInterval(() => {
      if (!useTycoon.getState().ready || document.hidden) return;
      const now = Date.now();
      carry += (now - last) / 1000;
      last = now;
      const seconds = Math.floor(carry);
      carry -= seconds;
      if (seconds > 0) {
        useTycoon.getState().mutate((s) => {
          advance(s, Math.min(seconds, 30));
          s.lastSaved = now;
        });
      }
    }, 250);
    const savingTimer = setInterval(() => void persist(), 5000);
    const activity = (active: boolean) => {
      if (!useTycoon.getState().ready) return;
      if (!active) {
        void persist();
        suspendAudio();
      } else {
        resumeAudio();
        const state = structuredClone(useTycoon.getState().save),
          r = offline(state);
        useTycoon.setState({ save: state });
        if (r.seconds > 30) setReport(r);
        last = Date.now();
        carry = 0;
      }
    };
    const visibility = () => activity(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", persist);
    const back = () =>
      useTycoon.setState({
        tab: null,
        selected: null,
        placement: null,
        plot: null,
      });
    let nativeRemove: (() => void) | undefined;
    void import("@capacitor/core")
      .then(async ({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          const { App } = await import("@capacitor/app");
          const handle = await App.addListener("backButton", () => {
            if (useTycoon.getState().tab) back();
            else void App.minimizeApp();
          });
          const appState = await App.addListener(
            "appStateChange",
            ({ isActive }) => activity(isActive),
          );
          if (alive)
            nativeRemove = () => {
              void handle.remove();
              void appState.remove();
            };
          else {
            void handle.remove();
            void appState.remove();
          }
        }
      })
      .catch(() => {});
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(savingTimer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("keydown", keyboard);
      nativeRemove?.();
      void persist();
      suspendAudio();
    };
  }, []);
  return { report, dismiss: () => setReport(null) };
}
