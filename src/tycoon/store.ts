import { create } from "zustand";
import { Kind } from "./data";
import { fresh, Save } from "./engine";
type State = {
  save: Save;
  ready: boolean;
  selected: number | null;
  plot: number | null;
  placement: Kind | null;
  tab: string | null;
  toast: string;
  low: boolean;
  reduced: boolean;
  sound: boolean;
  music: boolean;
  mutate: (fn: (s: Save) => string | null | void) => void;
};
export const useTycoon = create<State>((set, get) => ({
  save: fresh(),
  ready: false,
  selected: null,
  plot: null,
  placement: null,
  tab: null,
  toast: "",
  low: false,
  reduced: false,
  sound: true,
  music: false,
  mutate: (fn) => {
    const save = structuredClone(get().save),
      error = fn(save);
    set({ save, toast: error || get().toast });
  },
}));
