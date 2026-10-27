import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "Orbit Studio — Bouncing Ball Simulator & Satisfying Video Maker",
    template: "%s | Orbit Studio",
  },
  description:
    "Create oddly satisfying bouncing ball videos with musical sound effects. Customize gravity, rotating rings, escape rules, and ongoing stories in your browser. Free, no sign-up.",
  openGraph: {
    type: "website",
    siteName: "Orbit Studio",
    title: "Small balls. Endless possibilities.",
    description:
      "Your little corner of chaos. Create satisfying ball videos with sound.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
