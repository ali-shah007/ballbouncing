"use client";
import { useEffect, useRef } from "react";
import {
  CONTRACTS,
  DEFS,
  DISTRICTS,
  Kind,
  RESOURCES,
  TECHS,
} from "@/tycoon/data";
import {
  assign,
  capacity,
  claim,
  construct,
  expand,
  manager,
  metric,
  slots,
  startCycle,
  stats,
  status,
  technology,
  upgrade,
  Save,
} from "@/tycoon/engine";
import { useTycoon } from "@/tycoon/store";
import { migrate, saveGame } from "@/tycoon/persistence";
import { chime, music } from "@/tycoon/audio";
import Art from "./Art";
const format = (v: number) => Math.floor(v).toLocaleString();
export function Panels() {
  const state = useTycoon(),
    s = state.save,
    st = stats(s),
    input = useRef<HTMLInputElement>(null),
    selected = s.buildings.find((b) => b.id === state.selected);
  useEffect(() => {
    if (!state.tab) return;
    const previous = document.activeElement as HTMLElement;
    const timer = setTimeout(
      () =>
        document
          .querySelector<HTMLButtonElement>(".ty-sheet header button")
          ?.focus(),
      0,
    );
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".ty-sheet button:not(:disabled),.ty-sheet input,.ty-sheet select",
        ),
      );
      if (!list.length) return;
      const first = list[0],
        last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [state.tab]);
  const close = () =>
    useTycoon.setState({
      tab: null,
      selected: null,
      placement: null,
      plot: null,
    });
  function act(fn: (s: Save) => string | null | void, major = false) {
    let good = true;
    state.mutate((s) => {
      const error = fn(s);
      if (error) good = false;
      return error;
    });
    if (good) chime(state.sound, major);
  }
  async function importFile(f: File) {
    try {
      if (f.size > 500000) throw Error("Backup is too large.");
      const value = migrate(JSON.parse(await f.text()));
      if (!value)
        throw Error(
          "Invalid or unsupported Tycoon save. Your current village was preserved.",
        );
      value.lastSaved = Date.now();
      await saveGame(value);
      useTycoon.setState({
        save: value,
        tab: null,
        selected: null,
        toast: "Village imported successfully.",
      });
    } catch (e) {
      useTycoon.setState({
        toast: e instanceof Error ? e.message : "Import failed.",
      });
    }
  }
  async function backup() {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } =
          await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const result = await Filesystem.writeFile({
          path: "green-valley-tycoon.json",
          data: JSON.stringify(s, null, 2),
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          url: result.uri,
          dialogTitle: "Save your Green Valley backup",
        });
        return;
      }
    } catch {
      useTycoon.setState({
        toast: "Could not export the native backup. Please retry.",
      });
      return;
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "green-valley-tycoon.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!state.tab) return null;
  return (
    <>
      <div className="ty-sheet-scrim" onClick={close} />
      <section
        className="ty-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={state.tab === "building" ? "Building details" : state.tab}
      >
        <div className="ty-sheet-handle" />
        <header>
          <div>
            <small>GREEN VALLEY DEVELOPMENT</small>
            <h2>
              {state.tab === "building" && selected
                ? DEFS[selected.kind].name
                : state.tab === "Build"
                  ? "Build something wonderful"
                  : state.tab === "Industry"
                    ? "Your working world"
                    : state.tab === "Trade"
                      ? "Deliver a little happiness"
                      : state.tab === "Research"
                        ? "Big ideas. Bright futures."
                        : "A nation to be proud of"}
            </h2>
          </div>
          <button aria-label="Close game panel" onClick={close}>
            ×
          </button>
        </header>
        <div className="ty-sheet-content">
          {state.tab === "building" && selected && (
            <>
              <div className="ty-building-hero">
                <Art kind={selected.kind} />
                <div>
                  <span className="ty-tag">LEVEL {selected.level} / 20</span>
                  <h3>
                    {selected.manager
                      ? "Managed & automated"
                      : "A personal touch"}
                  </h3>
                  <p>{DEFS[selected.kind].description}</p>
                </div>
              </div>
              <div className="ty-status">{status(s, selected)}</div>
              <div className="ty-detail-grid">
                <span>
                  Workers
                  <strong>
                    {selected.workers} / {DEFS[selected.kind].workers}
                  </strong>
                </span>
                <span>
                  Electricity
                  <strong>
                    {DEFS[selected.kind].power * selected.level} needed
                  </strong>
                </span>
                <span>
                  Storage
                  <strong>
                    {Object.values(selected.inventory).reduce(
                      (a, b) => a + (b || 0),
                      0,
                    )}{" "}
                    / {Math.floor(capacity(s, selected))}
                  </strong>
                </span>
                <span>
                  Lifetime sales<strong>◈ {format(selected.earned)}</strong>
                </span>
              </div>
              <div className="ty-inventory">
                {RESOURCES.map((r) => (
                  <span key={r}>
                    {r}
                    <b>{selected.inventory[r] || 0}</b>
                  </span>
                ))}
              </div>
              <h3>People make it possible.</h3>
              <div className="ty-action-row">
                <button
                  onClick={() =>
                    act((s) => assign(s, selectedById(s, selected.id), -1))
                  }
                  disabled={!selected.workers}
                >
                  − Worker
                </button>
                <span>{st.available} available</span>
                <button
                  onClick={() =>
                    act((s) => assign(s, selectedById(s, selected.id), 1))
                  }
                  disabled={!st.available}
                >
                  ＋ Worker
                </button>
              </div>
              {!!DEFS[selected.kind].cycle && (
                <>
                  <button
                    className="ty-primary"
                    disabled={!!selected.build || selected.running}
                    onClick={() =>
                      act((s) => startCycle(s, selectedById(s, selected.id)))
                    }
                  >
                    ▶ Start production cycle
                  </button>
                  <button
                    className="ty-secondary"
                    onClick={() =>
                      act((s) => manager(s, selectedById(s, selected.id)), true)
                    }
                  >
                    Hire / upgrade manager · ◈ {120 * (selected.manager + 1)}
                  </button>
                </>
              )}
              {selected.kind !== "hall" && (
                <button
                  className="ty-primary gold"
                  disabled={!!selected.build || selected.level >= 20}
                  onClick={() =>
                    act((s) => upgrade(s, selectedById(s, selected.id)), true)
                  }
                >
                  Upgrade · ◈{" "}
                  {Math.round(
                    DEFS[selected.kind].cost *
                      0.65 *
                      (1 + selected.level * 0.6),
                  )}
                  <small>
                    More storage, faster cycles. New visual stages at levels 6,
                    11, 16.
                  </small>
                </button>
              )}
            </>
          )}
          {state.tab === "Build" && (
            <>
              {state.plot !== null && (
                <div className="ty-status">
                  {state.plot < slots(s)
                    ? `Plot ${state.plot + 1}: road-connected & ready`
                    : "This plot needs a district expansion."}
                </div>
              )}
              {state.placement ? (
                <div className="ty-placement">
                  <Art kind={state.placement} />
                  <h3>{DEFS[state.placement].name}</h3>
                  <p>{DEFS[state.placement].description}</p>
                  <div className="ty-detail-grid">
                    <span>
                      Build cost<strong>◈ {DEFS[state.placement].cost}</strong>
                    </span>
                    <span>
                      Construction
                      <strong>{DEFS[state.placement].seconds}s</strong>
                    </span>
                    <span>
                      Staff needed
                      <strong>{DEFS[state.placement].workers}</strong>
                    </span>
                    <span>
                      Electricity<strong>{DEFS[state.placement].power}</strong>
                    </span>
                  </div>
                  {["factory", "export"].includes(state.placement) && (
                    <p>Also requires 3 planks at a building.</p>
                  )}
                  <label className="ty-label">
                    Building plot
                    <select
                      aria-label="Building plot"
                      value={state.plot ?? ""}
                      onChange={(e) =>
                        useTycoon.setState({ plot: Number(e.target.value) })
                      }
                    >
                      {Array.from({ length: slots(s) }, (_, i) => i)
                        .filter((i) => !s.buildings.some((b) => b.plot === i))
                        .map((i) => (
                          <option key={i} value={i}>
                            Plot {i + 1} · road-connected
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="ty-primary"
                    disabled={
                      state.plot === null ||
                      state.plot >= slots(s) ||
                      s.money < DEFS[state.placement].cost
                    }
                    onClick={() => {
                      const type = state.placement!,
                        plot = state.plot!;
                      act((s) => construct(s, type, plot), true);
                      const latest = useTycoon.getState();
                      if (latest.save.buildings.some((b) => b.plot === plot))
                        close();
                    }}
                  >
                    Confirm purchase · ◈ {DEFS[state.placement].cost}
                  </button>
                  <button
                    className="ty-secondary"
                    onClick={() => useTycoon.setState({ placement: null })}
                  >
                    Cancel placement
                  </button>
                </div>
              ) : (
                <div className="ty-catalog">
                  {(Object.keys(DEFS) as Kind[])
                    .filter((k) => k !== "hall")
                    .map((k) => (
                      <button
                        key={k}
                        aria-label={`Choose ${DEFS[k].name}`}
                        disabled={DEFS[k].unlock > s.district}
                        onClick={() =>
                          useTycoon.setState({
                            placement: k,
                            plot:
                              state.plot !== null &&
                              !s.buildings.some((b) => b.plot === state.plot)
                                ? state.plot
                                : (Array.from({ length: slots(s) }, (_, i) => i)
                                    .sort(
                                      (a, b) =>
                                        Math.abs(a - 12) - Math.abs(b - 12),
                                    )
                                    .find(
                                      (i) =>
                                        !s.buildings.some((b) => b.plot === i),
                                    ) ?? null),
                          })
                        }
                      >
                        <Art kind={k} />
                        <strong>{DEFS[k].name}</strong>
                        <small>
                          {DEFS[k].unlock > s.district
                            ? "Copper Ridge required"
                            : `◈ ${DEFS[k].cost} · ${DEFS[k].seconds}s`}
                        </small>
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
          {state.tab === "Industry" && (
            <>
              <div className="ty-advisor">
                <b>YOUR ECONOMY ADVISOR</b>
                <p>
                  {s.buildings.some((b) => status(s, b).includes("Electricity"))
                    ? "Your businesses need more electricity. Build a power station."
                    : s.buildings.some((b) => status(s, b).includes("workers"))
                      ? "Some businesses need staff. Assign workers or build more homes."
                      : s.buildings.some((b) =>
                            status(s, b).startsWith("Waiting"),
                          )
                        ? "A buyer is waiting for inputs. Check suppliers and truck capacity."
                        : "Your village is ready to grow. Complete contracts to fund the next chapter."}
                </p>
              </div>
              <div className="ty-chain">
                🌾 Wheat → Food factory → Grocery → ◈ Sales
              </div>
              {s.buildings.map((b) => (
                <button
                  key={b.id}
                  className="ty-business-row"
                  onClick={() =>
                    useTycoon.setState({ selected: b.id, tab: "building" })
                  }
                >
                  <Art kind={b.kind} />
                  <span>
                    <strong>
                      {DEFS[b.kind].name} · Lv.{b.level}
                    </strong>
                    <small>{status(s, b)}</small>
                  </span>
                  <b>›</b>
                </button>
              ))}
            </>
          )}
          {state.tab === "Trade" && (
            <>
              <div className="ty-chain">
                🚚 {s.deliveries.length}/{st.trucks} trucks active ·{" "}
                {s.deliveryCount} completed deliveries
              </div>
              {s.deliveries.map((d) => (
                <div className="ty-delivery" key={d.id}>
                  <strong>
                    {d.amount} {d.resource}
                  </strong>
                  <small>
                    {DEFS[s.buildings.find((b) => b.id === d.from)!.kind].name}{" "}
                    → {DEFS[s.buildings.find((b) => b.id === d.to)!.kind].name}
                  </small>
                  <progress value={d.elapsed} max={d.duration} />
                </div>
              ))}
              <h3>Orders worth working for.</h3>
              {CONTRACTS.map((c) => {
                const done = s.claimed.includes(c.id),
                  count = metric(s, c.metric);
                return (
                  <div className="ty-contract" key={c.id}>
                    <span>{done ? "✓" : "✦"}</span>
                    <div>
                      <h3>{c.name}</h3>
                      <p>
                        {c.text} · {Math.floor(Math.min(c.target, count))}/
                        {c.target}
                      </p>
                      <progress value={count} max={c.target} />
                      <small>
                        ◈ {c.reward} · {c.points} research{" "}
                        {c.permit ? `· ${c.permit} expansion permit` : ""}
                      </small>
                    </div>
                    <button
                      disabled={done || count < c.target}
                      onClick={() => act((s) => claim(s, c.id), true)}
                    >
                      {done ? "Claimed" : "Claim"}
                    </button>
                  </div>
                );
              })}
            </>
          )}
          {state.tab === "Research" && (
            <>
              <p className="ty-copy">
                Schools generate research. Contracts award points too. Every
                improvement affects the real economy.
              </p>
              {TECHS.map((t) => (
                <div className="ty-research" key={t}>
                  <span>✦</span>
                  <div>
                    <h3>
                      {t} · Tier {s.tech[t]}/5
                    </h3>
                    <p>
                      {t === "Logistics"
                        ? "Larger cargo loads, faster trucks, more storage."
                        : t === "Energy"
                          ? "More power supply from existing stations."
                          : t === "Commerce"
                            ? "Higher sales revenue for delivered goods."
                            : "Faster production at every business in this sector."}
                    </p>
                    <button
                      disabled={s.tech[t] >= 5}
                      onClick={() => act((s) => technology(s, t), true)}
                    >
                      Research · {8 * (s.tech[t] + 1)} points + ◈{" "}
                      {200 * (s.tech[t] + 1)}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
          {state.tab === "Nation" && (
            <>
              <div className="ty-detail-grid">
                <span>
                  People
                  <strong>
                    {Math.floor(s.population)} / {st.housing} homes
                  </strong>
                </span>
                <span>
                  Employment<strong>{st.employed} workers</strong>
                </span>
                <span>
                  Electricity
                  <strong>
                    {Math.round(st.power)} / {Math.round(st.demand)}
                  </strong>
                </span>
                <span>
                  Public happiness<strong>{Math.round(st.happy)}%</strong>
                </span>
                <span>
                  Skilled workers<strong>{st.skilled}</strong>
                </span>
                <span>
                  Operating expense
                  <strong>◈ {(st.expenses * 60).toFixed(1)}/min</strong>
                </span>
              </div>
              <h3>Room for a bigger tomorrow.</h3>
              {DISTRICTS.map((d, i) => (
                <div className="ty-district" key={d.name}>
                  <b>{i <= s.district ? "✓" : "🔒"}</b>
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {i === 0
                        ? "Agriculture & community"
                        : i === 1
                          ? "Timber, mining & industry"
                          : "Commerce & expanded development land"}
                    </small>
                  </span>
                  {i === s.district + 1 && (
                    <button onClick={() => act(expand, true)}>
                      Unlock
                      <br />◈ {d.cost} · {d.permit} permit
                    </button>
                  )}
                </div>
              ))}
              <h3>National priorities</h3>
              {(
                ["education", "health", "industry", "green", "trade"] as const
              ).map((p) => (
                <label className="ty-toggle" key={p}>
                  <span>
                    {p}
                    <small>
                      {p === "education"
                        ? "+10 skilled workers, faster research"
                        : p === "health"
                          ? "+7 happiness"
                          : p === "industry"
                            ? "+15% industrial speed, +20% energy demand"
                            : p === "green"
                              ? "−10 pollution"
                              : "+10% sales revenue"}{" "}
                      · ◈ 8.4/min
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={s.policies[p]}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      act((s) => {
                        s.policies[p] = checked;
                      });
                    }}
                  />
                </label>
              ))}
              <h3>Make yourself at home.</h3>
              <label className="ty-toggle">
                Sound effects
                <input
                  type="checkbox"
                  checked={state.sound}
                  onChange={(e) => {
                    useTycoon.setState({ sound: e.target.checked });
                    chime(e.target.checked);
                  }}
                />
              </label>
              <label className="ty-toggle">
                Ambient music
                <input
                  type="checkbox"
                  checked={state.music}
                  onChange={(e) => {
                    useTycoon.setState({ music: e.target.checked });
                    music(e.target.checked);
                  }}
                />
              </label>
              <label className="ty-toggle">
                Low graphics · 30 FPS
                <input
                  type="checkbox"
                  checked={state.low}
                  onChange={(e) =>
                    useTycoon.setState({ low: e.target.checked })
                  }
                />
              </label>
              <label className="ty-toggle">
                Reduced motion
                <input
                  type="checkbox"
                  checked={state.reduced}
                  onChange={(e) =>
                    useTycoon.setState({ reduced: e.target.checked })
                  }
                />
              </label>
              <button className="ty-secondary" onClick={backup}>
                Export village backup
              </button>
              <button
                className="ty-secondary"
                onClick={() => input.current?.click()}
              >
                Import backup
              </button>
              <input
                type="file"
                hidden
                ref={input}
                accept="application/json,.json"
                onChange={(e) => {
                  if (e.target.files?.[0]) void importFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <p className="ty-fine">
                Saved locally in IndexedDB. Offline simulation capped at 8
                hours. Import replaces this Tycoon village; Nation Rise is
                separate.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
function selectedById(s: Save, id: number) {
  return s.buildings.find((b) => b.id === id)!;
}
