import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export const alt = "Orbit Studio — Small balls. Endless possibilities.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f8f9f5",
        display: "flex",
        padding: 75,
        flexDirection: "column",
        justifyContent: "center",
        color: "#273324",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: 4,
          color: "#7f9367",
          marginBottom: 35,
        }}
      >
        ORBIT STUDIO
      </div>
      <div style={{ fontSize: 76, letterSpacing: -4 }}>Small balls.</div>
      <div style={{ fontSize: 76, color: "#75865f", letterSpacing: -4 }}>
        Endless possibilities.
      </div>
      <div style={{ fontSize: 23, color: "#929e87", marginTop: 35 }}>
        Create satisfying bouncing ball videos with sound.
      </div>
    </div>,
    size,
  );
}
