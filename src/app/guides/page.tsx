import Link from "next/link";
import { ArrowRight } from "lucide-react";
export const metadata = {
  title: "How to Make Satisfying Bouncing Ball Videos",
  description:
    "A practical guide to creating musical bouncing ball videos, choosing escape rules, recording clips, and building an ongoing story.",
};
export default function Guides() {
  return (
    <>
      <nav className="article-nav">
        <Link className="brand" href="/">
          orbit<span className="brand-light">studio</span>
        </Link>
        <Link href="/">Back to the studio ↗</Link>
      </nav>
      <article className="article">
        <div className="eyebrow">THE CREATOR’S PLAYBOOK</div>
        <h1>
          A little physics.
          <br />A story worth watching.
        </h1>
        <p>
          The best satisfying videos give a simple action room to become
          surprising. Start with a few balls, a rotating ring, and a question:
          what happens when one escapes?
        </p>
        <Link className="primary" href="/">
          Open the free video maker <ArrowRight size={16} />
        </Link>
        <h2>1. Choose a rhythm before adding chaos</h2>
        <p>
          Start with Musical Rain for slower motion, or Population Explosion for
          a scene that grows with every escape. Press Play to begin the
          simulation and unlock audio. Watch a full cycle before changing
          anything; the ring’s opening needs time to travel around.
        </p>
        <div className="article-grid">
          <section className="article-card">
            <h2>For a calming loop</h2>
            <p>
              Lower gravity and rotation. Spawn one ball per escape to keep the
              population steady. Ocean colors and trails give the movement a
              soft finish.
            </p>
            <Link href="/presets/musical-rain">
              Try Musical Rain <ArrowRight size={14} />
            </Link>
          </section>
          <section className="article-card">
            <h2>For growing suspense</h2>
            <p>
              Set three new balls per escape, narrow the opening, and use a
              short duration. The maximum ball count keeps the scene bounded as
              it gets busier.
            </p>
            <Link href="/presets/pressure-cooker">
              Try Pressure Cooker <ArrowRight size={14} />
            </Link>
          </section>
        </div>
        <h2>2. Let the sound support the motion</h2>
        <p>
          Ring impacts play notes from a pentatonic scale. Escapes play a higher
          chime. A limit on simultaneous note triggers keeps dense scenes from
          becoming overwhelming. Use the speaker control to mute the simulation;
          recordings include the generated sound when enabled.
        </p>
        <h2>3. Turn a moment into an episode</h2>
        <p>
          Open Story and write a short hook such as “Five little balls. One way
          out.” Give the episode one challenge, and let the simulation resolve
          it. Save a checkpoint to preserve the balls, random state, ring angle,
          and rules. Choose Continue story to begin a new timed episode from
          that exact ending.
        </p>
        <p>
          Change one rule in the next episode. A smaller opening or rotating
          gravity creates a visible progression. Use the teaser to name that
          next challenge instead of promising an outcome the simulation might
          not produce.
        </p>
        <h2>4. Record a clean take</h2>
        <p>
          Select 9:16 for a portrait video or 4:5 for a shorter feed
          composition. Restart for a fresh take, then press Record video.
          Recording runs in real time and stops at your chosen duration, or you
          can stop it early. The download includes the canvas and its generated
          audio, without the editor controls.
        </p>
        <div className="article-note">
          Keep the tab visible during recording. Browser support determines the
          output format, typically WebM. The current portrait resolution is 900
          × 1600; fixed-frame-rate 1080p and universal MP4 export are not part
          of this version.
        </div>
        <h2>5. Keep your story safe</h2>
        <p>
          Episodes are saved locally in this browser, not in an online account.
          Export your story as JSON for a backup or to import it on another
          device. Clearing browser data removes local episodes. A seed recreates
          the starting scene; a saved checkpoint preserves the scene’s progress.
        </p>
        <Link className="primary" href="/">
          Make your first little universe <ArrowRight size={16} />
        </Link>
      </article>
    </>
  );
}
