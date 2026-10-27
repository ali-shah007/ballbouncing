import type { Metadata } from "next";
import NationState from "@/components/state-sim/NationState";
import "../state.css";
export const metadata: Metadata = {
  title: "Nation State — Country Policy & Economic Simulation",
  description:
    "Manage a country’s budget, debt, infrastructure and diplomacy in an auditable monthly simulation. Historical GDP and population baselines, explicit model assumptions.",
};
export default function Page() {
  return <NationState />;
}
