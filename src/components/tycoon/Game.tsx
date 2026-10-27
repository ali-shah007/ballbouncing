"use client";
import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2,
  Factory,
  Truck,
  FlaskConical,
  Flag,
  Coins,
  Users,
  Heart,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { useTycoon } from "@/tycoon/store";
import { stats, metric } from "@/tycoon/engine";
import { CONTRACTS } from "@/tycoon/data";
import { useGame } from "./useGame";
import { Panels } from "./Panels";
const World = dynamic(() => import("./World"), {
  ssr: false,
  loading: () => (
    <div className="ty-loading">Growing your little corner of the world…</div>
  ),
});
export default function Game() {
  const state = useTycoon(),
    s = state.save,
    st = stats(s),
    { report, dismiss } = useGame();
  const mission = CONTRACTS.find((c) => !s.claimed.includes(c.id));
  useEffect(() => {
    if (!state.toast) return;
    const id = setTimeout(() => useTycoon.setState({ toast: "" }), 5000);
    return () => clearTimeout(id);
  }, [state.toast]);
  return (
    <main className="ty-game">
      <World />
      <header className="ty-hud">
        <div className="ty-topline">
          <Link
            href="/nation-rise"
            aria-label="Return to Nation Rise"
            className="ty-back"
          >
            <ArrowLeft size={19} />
          </Link>
          <div className="ty-town">
            <small>NATION TYCOON</small>
            <strong>
              Green Valley <span>Lv. {1 + s.district}</span>
            </strong>
          </div>
          <button
            className="ty-settings"
            aria-label="Game settings"
            onClick={() => useTycoon.setState({ tab: "Nation" })}
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="ty-wallet">
          <div>
            <span className="ty-coin">
              <Coins size={20} />
            </span>
            <span>
              <strong data-testid="tycoon-money">
                {Math.floor(s.money).toLocaleString()}
              </strong>
              <small>Credits · {st.net.toFixed(0)}/min net avg.</small>
            </span>
          </div>
          <div>
            <Users size={18} />
            <span>
              <strong>{Math.floor(s.population)}</strong>
              <small>Residents</small>
            </span>
          </div>
          <div>
            <Heart size={17} />
            <span>
              <strong>{Math.round(st.happy)}%</strong>
              <small>Happy</small>
            </span>
          </div>
          <div>
            <FlaskConical size={17} />
            <span>
              <strong>{Math.floor(s.research)}</strong>
              <small>Research</small>
            </span>
          </div>
        </div>
      </header>
      {mission && (
        <button
          className="ty-mission"
          onClick={() => useTycoon.setState({ tab: "Trade" })}
        >
          <span>✦</span>
          <div>
            <small>YOUR NEXT LITTLE MILESTONE</small>
            <strong>{mission.name}</strong>
            <p>
              {mission.text} ·{" "}
              {Math.min(mission.target, Math.floor(metric(s, mission.metric)))}/
              {mission.target}
            </p>
            <progress value={metric(s, mission.metric)} max={mission.target} />
          </div>
          <b>›</b>
        </button>
      )}
      <div className="ty-valley-label">
        <span>✦ GREEN VALLEY ✦</span>
        <small>From a tiny village to a thriving nation</small>
      </div>
      <div className="ty-caption" role="status">
        <span>✦</span>
        <p>{s.message}</p>
      </div>
      <nav className="ty-bottom" aria-label="Tycoon navigation">
        {[
          { name: "Build", icon: Building2 },
          { name: "Industry", icon: Factory },
          { name: "Trade", icon: Truck },
          { name: "Research", icon: FlaskConical },
          { name: "Nation", icon: Flag },
        ].map(({ name, icon: Icon }) => (
          <button
            aria-label={`Open ${name}`}
            className={state.tab === name ? "active" : ""}
            key={name}
            onClick={() =>
              useTycoon.setState({
                tab: state.tab === name ? null : name,
                placement: null,
                selected: null,
              })
            }
          >
            <span>
              <Icon size={23} />
              {name === "Trade" &&
                CONTRACTS.some(
                  (c) =>
                    !s.claimed.includes(c.id) &&
                    metric(s, c.metric) >= c.target,
                ) && <i />}
            </span>
            <strong>{name}</strong>
          </button>
        ))}
      </nav>
      <Panels />
      {!state.ready && (
        <div className="ty-loading">Preparing Green Valley…</div>
      )}
      {state.toast && (
        <div className="ty-toast" role="alert">
          {state.toast}
          <button
            aria-label="Dismiss game notification"
            onClick={() => useTycoon.setState({ toast: "" })}
          >
            ×
          </button>
        </div>
      )}
      {report && (
        <div className="ty-offline-backdrop">
          <section
            className="ty-offline"
            role="dialog"
            aria-label="Offline progress"
          >
            <span className="ty-offline-icon">☀</span>
            <small>THINGS KEPT MOVING</small>
            <h2>
              Welcome home,
              <br />
              Mayor.
            </h2>
            <p>
              Your managed businesses kept working, within their supplies,
              power, staffing, and storage limits.
            </p>
            <div className="ty-detail-grid">
              <span>
                Time away<strong>{Math.floor(report.seconds / 60)} min</strong>
              </span>
              <span>
                Treasury change<strong>◈ {report.credits}</strong>
              </span>
              <span>
                Sales earned<strong>◈ {report.sold}</strong>
              </span>
              <span>
                Deliveries<strong>{report.deliveries}</strong>
              </span>
              <span>
                Units produced<strong>{report.resources}</strong>
              </span>
              <span>
                Simulation cap<strong>8 hours</strong>
              </span>
            </div>
            <button className="ty-primary" onClick={dismiss}>
              Let’s keep growing →
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
