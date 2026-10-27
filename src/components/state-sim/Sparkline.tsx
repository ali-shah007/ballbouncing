export default function Sparkline({
  values,
  color = "#709b8c",
  label,
}: {
  values: number[];
  color?: string;
  label: string;
}) {
  const data =
    values.length > 1
      ? values
      : [...(values.length ? values : [0]), ...(values.length ? values : [0])];
  const lo = Math.min(...data),
    hi = Math.max(...data),
    span = hi - lo || 1;
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * 240},${48 - ((v - lo) / span) * 38}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 240 55"
      role="img"
      aria-label={label}
      className="ns-sparkline"
    >
      <polyline
        points={points}
        stroke={color}
        strokeWidth="2"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <line x1="0" y1="54" x2="240" y2="54" stroke="#dce4df" />
    </svg>
  );
}
