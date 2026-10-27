import type { Metadata } from "next";
import NationStudio from "@/components/NationStudio";
import "../nation.css";
export const metadata: Metadata = {
  title: "Nation Rise — Idle Country Building Game",
  description:
    "Choose a country, build an animated economy, research new industries, and create prosperity. Save your progress and record your nation’s story.",
};
export default function Page() {
  return <NationStudio />;
}
