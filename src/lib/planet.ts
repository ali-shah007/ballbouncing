export type Weapon = "laser" | "meteor" | "antimatter";
export type World = "oasis" | "ember" | "nix";
export type Point3 = { x: number; y: number; z: number };
export const WEAPONS = {
  laser: {
    name: "Orbital laser",
    short: "Precision, at light speed.",
    damage: 12,
    delay: 0.45,
    color: "#78d9ff",
    key: "1",
  },
  meteor: {
    name: "Meteor strike",
    short: "A visitor from the void.",
    damage: 22,
    delay: 1.05,
    color: "#ffad6b",
    key: "2",
  },
  antimatter: {
    name: "Antimatter",
    short: "Beautifully catastrophic.",
    damage: 38,
    delay: 1.25,
    color: "#c6a2ff",
    key: "3",
  },
} as const;
export const WORLDS = {
  oasis: {
    name: "Oasis",
    label: "TERRESTRIAL WORLD",
    subtitle: "An ocean of possibilities.",
    color: "#7bb9da",
    index: 0,
  },
  ember: {
    name: "Ember",
    label: "VOLCANIC WORLD",
    subtitle: "Already living on the edge.",
    color: "#e7a078",
    index: 1,
  },
  nix: {
    name: "Nix",
    label: "FROZEN WORLD",
    subtitle: "Even the quiet worlds break.",
    color: "#c4d7f0",
    index: 2,
  },
} as const;
export type Attack = {
  id: number;
  weapon: Weapon;
  target: Point3;
  elapsed: number;
  power: number;
  impacted: boolean;
};
export type PlanetStats = {
  integrity: number;
  impacts: number;
  launched: number;
  pending: number;
  time: number;
  destroyed: boolean;
};
export type PlanetEvent = {
  kind: "launch" | "impact" | "destroyed";
  attack: Attack;
};
export class PlanetModel {
  integrity = 100;
  impacts = 0;
  launched = 0;
  time = 0;
  attacks: Attack[] = [];
  onEvent?: (event: PlanetEvent) => void;
  get destroyed() {
    return this.integrity <= 0;
  }
  fire(weapon: Weapon, power: number, target: Point3) {
    if (this.destroyed || this.attacks.filter((a) => !a.impacted).length >= 8)
      return false;
    const length = Math.hypot(target.x, target.y, target.z);
    if (!Number.isFinite(length) || length < 0.001 || !Number.isFinite(power))
      return false;
    const attack: Attack = {
      id: ++this.launched,
      weapon,
      target: {
        x: (target.x / length) * 1.7,
        y: (target.y / length) * 1.7,
        z: (target.z / length) * 1.7,
      },
      elapsed: 0,
      power: Math.min(2, Math.max(0.5, power)),
      impacted: false,
    };
    this.attacks.push(attack);
    this.onEvent?.({ kind: "launch", attack });
    return true;
  }
  step(delta: number) {
    const dt = Math.max(0, Math.min(delta, 0.1));
    this.time += dt;
    for (const attack of this.attacks) {
      attack.elapsed += dt;
      if (!attack.impacted && attack.elapsed >= WEAPONS[attack.weapon].delay) {
        attack.impacted = true;
        if (this.destroyed) continue;
        this.integrity = Math.max(
          0,
          this.integrity - WEAPONS[attack.weapon].damage * attack.power,
        );
        this.impacts++;
        this.onEvent?.({ kind: "impact", attack });
        if (this.destroyed) this.onEvent?.({ kind: "destroyed", attack });
      }
    }
    this.attacks = this.attacks.filter(
      (a) => a.elapsed < WEAPONS[a.weapon].delay + 0.8,
    );
  }
  reset() {
    this.integrity = 100;
    this.impacts = 0;
    this.launched = 0;
    this.time = 0;
    this.attacks = [];
  }
  stats(): PlanetStats {
    return {
      integrity: this.integrity,
      impacts: this.impacts,
      launched: this.launched,
      pending: this.attacks.filter((a) => !a.impacted).length,
      time: this.time,
      destroyed: this.destroyed,
    };
  }
}
