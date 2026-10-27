import Link from "next/link";
import { CircleDot, Orbit, ArrowUpRight } from "lucide-react";
export default function ModeSwitcher({
  active = "balls",
}: {
  active?: "balls" | "planet" | "nation" | "tycoon" | "state";
}) {
  return (
    <nav
      className={`mode-switcher ${active === "planet" ? "mode-dark" : ""}`}
      aria-label="Simulation modes"
    >
      <span className="mode-label">PICK YOUR UNIVERSE</span>
      <div>
        <Link
          href="/"
          className={active === "balls" ? "active" : ""}
          aria-current={active === "balls" ? "page" : undefined}
        >
          <CircleDot size={15} /> Bouncing balls
        </Link>
        <Link
          href="/planet-destruction"
          className={active === "planet" ? "active" : ""}
          aria-current={active === "planet" ? "page" : undefined}
        >
          <Orbit size={16} /> Planet destruction{" "}
          <span className="mode-new">NEW</span>
        </Link>
        <Link
          href="/nation-rise"
          className={active === "nation" ? "active" : ""}
          aria-current={active === "nation" ? "page" : undefined}
        >
          <CircleDot size={15} /> Nation Rise{" "}
          <span className="mode-new">GAME</span>
        </Link>
        <Link
          href="/nation-tycoon"
          className={active === "tycoon" ? "active" : ""}
        >
          <Orbit size={16} /> Nation Tycoon{" "}
          <span className="mode-new">NEW</span>
        </Link>
        <Link
          href="/nation-state"
          className={active === "state" ? "active" : ""}
          aria-current={active === "state" ? "page" : undefined}
        >
          <CircleDot size={15} /> Nation State{" "}
          <span className="mode-new">SIM</span>
        </Link>
      </div>
      <span className="mode-caption">
        A whole new scale of satisfying. <ArrowUpRight size={13} />
      </span>
    </nav>
  );
}
