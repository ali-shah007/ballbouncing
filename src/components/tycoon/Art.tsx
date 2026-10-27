import { DEFS, Kind } from "@/tycoon/data";
export default function Art({
  kind,
  className = "",
}: {
  kind: Kind;
  className?: string;
}) {
  const i = DEFS[kind].frame;
  return (
    <span
      aria-hidden="true"
      className={`ty-art ${className}`}
      style={{
        backgroundImage: "url(/tycoon/buildings.png)",
        backgroundSize: "400% 400%",
        backgroundPosition: `${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 3) * 100}%`,
      }}
    />
  );
}
