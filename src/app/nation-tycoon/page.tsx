import type { Metadata, Viewport } from "next";
import Game from "@/components/tycoon/Game";
import "../tycoon.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#a7d8cb",
};
export const metadata: Metadata = {
  title: "Nation Tycoon — From a Tiny Village to a Thriving Nation",
  description:
    "Build Green Valley in an original isometric idle tycoon game. Manage farms, factories, deliveries, workers, research, and an evolving village.",
};
export default function Page() {
  return <Game />;
}
