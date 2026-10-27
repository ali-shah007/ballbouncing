import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Studio from "@/components/Studio";
import { PRESETS } from "@/lib/simulation";
export function generateStaticParams() {
  return PRESETS.map((p) => ({ slug: p.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = PRESETS.find((p) => p.id === slug);
  if (!p) return {};
  return {
    title: `${p.name} — Bouncing Ball Video Preset`,
    description: p.description,
  };
}
export default async function PresetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = PRESETS.find((p) => p.id === slug);
  if (!p) notFound();
  return (
    <>
      <Studio initialPreset={p.id} />
      <article className="article">
        <div className="eyebrow">THE {p.name.toUpperCase()} EXPERIMENT</div>
        <h2>{p.tag}</h2>
        <p>{p.description}</p>
        <p>
          {p.id === "population-explosion"
            ? "This preset adds three balls whenever one escapes. The population grows in bursts rather than all at once. Keep the opening wide for frequent escapes, or narrow it to build anticipation."
            : p.id === "musical-rain"
              ? "With gentle downward gravity and a slow ring, this preset gives each impact room to sound. One new ball replaces each escape, keeping the active population steady for an unhurried composition."
              : p.id === "gravity-dance"
                ? "Gravity changes direction continuously while the ring rotates the other way. Balls that settle into a familiar route are pulled into new paths, creating evolving patterns without increasing speed."
                : p.id === "escape-race"
                  ? "A narrow opening and faster simulation create a short escape challenge. Compare escape totals using the same seed, then change one rule to see how much it affects the outcome."
                  : "The opening expands and contracts over time. Three new balls join for every escape, so moments of release create a sudden burst of activity. Try lowering gravity if the scene becomes too crowded."}
        </p>
        <p>
          Open Rules to adjust this experiment, or use Story to save its ending
          and continue in the next episode. Record in portrait or 4:5 with
          synchronized sound.
        </p>
      </article>
    </>
  );
}
