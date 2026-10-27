import type { Metadata } from "next";
import "../planet.css";
import PlanetStudio from "@/components/PlanetStudio";
export const metadata: Metadata = {
  title: "Planet Destruction Simulator — Cinematic 3D Sandbox",
  description:
    "Explore procedural 3D planets with atmosphere, clouds, impact scars, explosive attacks, debris, and cinematic sound. Record your own planet destruction scenes.",
};
export default function PlanetDestructionPage() {
  return <PlanetStudio />;
}
