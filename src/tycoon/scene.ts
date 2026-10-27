import Phaser from "phaser";
import { DEFS, DISTRICTS, PLOTS } from "./data";
import { route, isRoad } from "./logistics";
import { stats, status, slots } from "./engine";
import { useTycoon } from "./store";
const iso = (x: number, y: number) => ({
  x: (x - y) * 36 + 470,
  y: (x + y) * 18 + 100,
});
export class ValleyScene extends Phaser.Scene {
  private ground!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private lastDistrict = -1;
  private drag = false;
  private pressedWorld = false;
  private down = { x: 0, y: 0 };
  private pinch = 0;
  private lastPlot = "";
  private preview?: Phaser.GameObjects.Image;
  private frame = 0;
  constructor() {
    super("valley");
  }
  preload() {
    this.load.on("loaderror", () => this.game.events.emit("valley-error"));
    this.load.image("atlas", "/tycoon/buildings.png");
    this.load.image("upgrades", "/tycoon/upgrades.png");
  }
  create() {
    const texture = this.textures.get("atlas"),
      source = texture.getSourceImage() as HTMLImageElement;
    for (let i = 0; i < 16; i++) {
      const x = Math.round(((i % 4) * source.width) / 4),
        y = Math.round((Math.floor(i / 4) * source.height) / 4);
      texture.add(
        i,
        0,
        x,
        y,
        Math.round((((i % 4) + 1) * source.width) / 4) - x,
        Math.round(((Math.floor(i / 4) + 1) * source.height) / 4) - y,
      );
    }
    const upgrades = this.textures.get("upgrades"),
      img = upgrades.getSourceImage() as HTMLImageElement;
    for (let i = 0; i < 16; i++) {
      const x = Math.round(((i % 4) * img.width) / 4),
        y = Math.round((Math.floor(i / 4) * img.height) / 4);
      upgrades.add(
        i,
        0,
        x,
        y,
        Math.round((((i % 4) + 1) * img.width) / 4) - x,
        Math.round(((Math.floor(i / 4) + 1) * img.height) / 4) - y,
      );
    }
    this.cameras.main.setBackgroundColor("#a7d8cb");
    this.ground = this.add.graphics();
    this.effects = this.add.graphics().setDepth(4000);
    this.input.addPointer(1);
    this.cameras.main.setZoom(this.scale.width < 600 ? 1.02 : 1.48);
    this.cameras.main.centerOn(470, 365);
    this.scale.on("resize", () => this.cameras.main.centerOn(470, 365));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.event.target !== this.game.canvas) return;
      this.pressedWorld = true;
      this.down = { x: p.x, y: p.y };
      this.drag = false;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.pressedWorld) return;
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;
      if (Math.hypot(p.x - this.down.x, p.y - this.down.y) > 7)
        this.drag = true;
      if (this.drag) {
        this.cameras.main.scrollX -=
          (p.x - p.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -=
          (p.y - p.prevPosition.y) / this.cameras.main.zoom;
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.pressedWorld) return;
      this.pressedWorld = false;
      if (this.drag || this.pinch) {
        this.pinch = 0;
        return;
      }
      const object = this.input.hitTestPointer(p)[0];
      if (object?.getData("business")) {
        useTycoon.setState({
          selected: object.getData("business"),
          tab: "building",
          plot: null,
          placement: null,
        });
        return;
      }
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const plot = PLOTS.map((t, i) => ({
        i,
        d: Math.hypot(
          iso(t.x, t.y).x - world.x,
          (iso(t.x, t.y).y - world.y) * 1.7,
        ),
      })).sort((a, b) => a.d - b.d)[0];
      if (plot && plot.d < 70) {
        const state = useTycoon.getState(),
          b = state.save.buildings.find((b) => b.plot === plot.i);
        if (b)
          useTycoon.setState({
            selected: b.id,
            tab: "building",
            plot: null,
            placement: null,
          });
        else useTycoon.setState({ selected: null, plot: plot.i, tab: "Build" });
      }
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _x: number, y: number) =>
      this.cameras.main.setZoom(
        Phaser.Math.Clamp(this.cameras.main.zoom - y * 0.001, 0.45, 1.8),
      ),
    );
    this.preview = this.add
      .image(0, 0, "atlas", 1)
      .setOrigin(0.5, 0.88)
      .setDisplaySize(118, 118)
      .setDepth(3001)
      .setAlpha(0.55)
      .setVisible(false);
    this.game.events.emit("valley-ready");
  }
  private diamond(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    alpha = 1,
  ) {
    const p = iso(x, y);
    g.fillStyle(color, alpha);
    g.fillPoints(
      [
        { x: p.x, y: p.y - 18 },
        { x: p.x + 36, y: p.y },
        { x: p.x, y: p.y + 18 },
        { x: p.x - 36, y: p.y },
      ],
      true,
    );
  }
  private drawGround() {
    const state = useTycoon.getState(),
      s = state.save,
      g = this.ground;
    g.clear();
    for (let y = -5; y < 20; y++)
      for (let x = -5; x < 20; x++) {
        if (x > 14 || y > 14 || x < 0 || y < 0) {
          this.diamond(
            g,
            x,
            y,
            x > 15 ? 0x72bac6 : (x + y) % 3 ? 0x8fc86a : 0x9bd176,
          );
          continue;
        }
        this.diamond(
          g,
          x,
          y,
          isRoad(x, y) ? 0x899b91 : (x + y) % 3 ? 0x8bc569 : 0x9acf76,
        );
        if (isRoad(x, y)) {
          const p = iso(x, y);
          g.lineStyle(1, 0xe8e8cc, 0.65);
          g.beginPath();
          g.moveTo(p.x - 8, p.y);
          g.lineTo(p.x + 8, p.y);
          g.strokePath();
        }
      }
    for (let i = 0; i < PLOTS.length; i++) {
      const p = PLOTS[i];
      if (i >= slots(s)) {
        this.diamond(g, p.x, p.y, 0x38684b, 0.5);
      } else if (!s.buildings.some((b) => b.plot === i)) {
        this.diamond(g, p.x, p.y, 0xd7d39c, 0.8);
        const pt = iso(p.x, p.y);
        g.lineStyle(1, 0xfff4c7, 0.8);
        g.strokeRect(pt.x - 8, pt.y - 5, 16, 10);
      }
    }
    for (let i = 0; i < 75; i++) {
      const edge = i % 4;
      const x =
        edge === 0
          ? -1 - Math.floor(i / 20)
          : edge === 1
            ? 15 + (i % 3)
            : i % 15;
      const y = edge === 2 ? -1 - (i % 3) : edge === 3 ? 15 + (i % 2) : i % 15;
      const p = iso(x, y);
      g.fillStyle(0x315a40, 0.16);
      g.fillEllipse(p.x + 5, p.y + 9, 33, 12);
      g.fillStyle(0x896a43);
      g.fillRect(p.x - 2, p.y - 14, 4, 23);
      g.fillStyle(i % 3 ? 0x38804d : 0x52934b);
      g.fillEllipse(p.x, p.y - 20, 29, 38);
      g.fillStyle(i % 3 ? 0x62a45e : 0x7fb65c);
      g.fillEllipse(p.x - 5, p.y - 27, 18, 23);
    }
    this.lastDistrict = s.district;
  }
  update(time: number) {
    const state = useTycoon.getState(),
      s = state.save;
    if (!state.ready) return;
    const fingerprint = `${s.district}:${s.buildings.map((b) => b.plot).join(",")}`;
    if (fingerprint !== this.lastPlot) {
      this.drawGround();
      this.lastPlot = fingerprint;
    }
    const p1 = this.input.pointer1,
      p2 = this.input.pointer2;
    if (p1.isDown && p2.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.pinch)
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(
            (this.cameras.main.zoom * d) / this.pinch,
            0.45,
            1.8,
          ),
        );
      this.pinch = d;
      this.drag = true;
    } else this.pinch = 0;
    const t = state.reduced ? 0 : time / 1000;
    this.effects.clear();
    const g = this.effects;
    for (const b of s.buildings) {
      const tile = PLOTS[b.plot],
        p = iso(tile.x, tile.y);
      let image = this.sprites.get(b.id);
      if (!image) {
        image = this.add
          .image(p.x, p.y + 18, "atlas", DEFS[b.kind].frame)
          .setOrigin(0.5, 0.88)
          .setData("business", b.id)
          .setInteractive({ pixelPerfect: true, alphaTolerance: 50 });
        // Trim atlas-cell padding containing a neighboring roof tip.
        if (["power", "warehouse", "depot"].includes(b.kind))
          image.setCrop(0, 0, image.frame.width, image.frame.height - 32);
        this.sprites.set(b.id, image);
        const label = this.add
          .text(p.x, p.y + 30, "", {
            fontFamily: "Arial",
            fontSize: "10px",
            color: "#ffffff",
            backgroundColor: "#355b47cf",
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5, 0)
          .setDepth(3000);
        this.labels.set(b.id, label);
      }
      const stage = Math.min(3, Math.floor((b.level - 1) / 5));
      const row = (
        { house: 0, grocery: 1, farm: 2, factory: 3 } as Partial<
          Record<typeof b.kind, number>
        >
      )[b.kind];
      if (row !== undefined) image.setTexture("upgrades", row * 4 + stage);
      image.setDisplaySize(118 + stage * 9, 118 + stage * 15);
      image.setDepth(p.y + 100).setAlpha(b.build ? 0.55 : 1);
      image.setTint(stage > 1 ? 0xfff0c9 : 0xffffff);
      if (b.build) {
        g.lineStyle(2, 0xf2c45a);
        g.strokeRect(p.x - 30, p.y - 58, 60, 65);
        g.lineBetween(p.x - 30, p.y - 58, p.x + 37, p.y - 58);
        g.lineBetween(
          p.x + 23,
          p.y - 58,
          p.x + 23,
          p.y - 24 + Math.sin(t * 2) * 4,
        );
      }
      this.labels
        .get(b.id)!
        .setText(
          b.build
            ? `${Math.ceil(b.build)}s`
            : `${DEFS[b.kind].name} · ${b.level}`,
        )
        .setVisible(state.selected === b.id && !state.low);
      if (state.selected === b.id) {
        g.lineStyle(3, 0xffe27e);
        g.strokeEllipse(p.x, p.y + 10, 90, 38);
      }
      const st = status(s, b);
      if (
        st.startsWith("Waiting") ||
        st.includes("shortage") ||
        st.includes("workers")
      ) {
        g.fillStyle(0xf4bf58);
        g.fillCircle(p.x + 35, p.y - 65, 7);
      }
      if (DEFS[b.kind].cycle && !b.build) {
        const w = 54;
        g.fillStyle(0x244f3f, 0.7);
        g.fillRoundedRect(p.x - w / 2, p.y + 22, w, 4, 2);
        g.fillStyle(0xfbd370);
        g.fillRoundedRect(
          p.x - w / 2,
          p.y + 22,
          w * Math.min(1, b.progress / DEFS[b.kind].cycle),
          4,
          2,
        );
      }
      if (b.cycles && s.time % 8 < 2 && b.kind === "grocery") {
        g.fillStyle(0xffd35f);
        g.fillCircle(p.x, p.y - 55 - Math.sin(t * 3) * 6, 5);
      }
      if (b.kind === "power" || b.kind === "factory" || b.kind === "food") {
        for (let i = 0; i < (state.low ? 1 : 3); i++) {
          g.fillStyle(0xf5f4de, 0.18);
          g.fillCircle(
            p.x + 20 + Math.sin(t + i) * 4,
            p.y - 60 - ((t * 9 + i * 12) % 30),
            4 + i,
          );
        }
      }
    }
    for (const [id, sprite] of this.sprites)
      if (!s.buildings.some((b) => b.id === id)) {
        sprite.destroy();
        this.labels.get(id)?.destroy();
        this.sprites.delete(id);
        this.labels.delete(id);
      }
    this.preview?.setVisible(!!state.placement && state.plot !== null);
    if (state.placement && state.plot !== null) {
      const tile = PLOTS[state.plot],
        p = iso(tile.x, tile.y);
      this.preview
        ?.setTexture("atlas", DEFS[state.placement].frame)
        .setPosition(p.x, p.y + 18)
        .setDisplaySize(118, 118)
        .setTint(
          state.plot < slots(s) && s.money >= DEFS[state.placement].cost
            ? 0xffffff
            : 0xff8d7d,
        );
    }
    const preview = state.plot !== null ? PLOTS[state.plot] : null;
    if (preview) {
      const p = iso(preview.x, preview.y),
        valid = state.plot! < slots(s);
      this.diamond(g, preview.x, preview.y, valid ? 0xffdf75 : 0xeb785f, 0.65);
      if (state.placement) {
        g.lineStyle(2, valid ? 0xffef9a : 0xf79075);
        g.strokeEllipse(p.x, p.y, 85, 40);
      }
    }
    for (const trip of s.deliveries) {
      const from = s.buildings.find((b) => b.id === trip.from),
        to = s.buildings.find((b) => b.id === trip.to);
      if (!from || !to) continue;
      const path = route(from.plot, to.plot),
        fraction =
          Math.min(
            0.999,
            (trip.elapsed + (state.reduced ? 0 : (time % 1000) / 1000)) /
              trip.duration,
          ) *
          (path.length - 1),
        a = path[Math.floor(fraction)],
        b = path[Math.min(path.length - 1, Math.floor(fraction) + 1)],
        pos = iso(
          a.x + (b.x - a.x) * (fraction % 1),
          a.y + (b.y - a.y) * (fraction % 1),
        );
      g.fillStyle(0x315252, 0.3);
      g.fillEllipse(pos.x + 2, pos.y + 5, 23, 9);
      g.fillStyle(0xf8cf62);
      g.fillRoundedRect(pos.x - 9, pos.y - 7, 19, 11, 3);
      g.fillStyle(0xfff1ca);
      g.fillRect(pos.x - 5, pos.y - 5, 7, 5);
      g.fillStyle(0x355965);
      g.fillCircle(pos.x - 6, pos.y + 5, 3);
      g.fillCircle(pos.x + 7, pos.y + 5, 3);
    }
    if (!state.low)
      for (let i = 0; i < 12; i++) {
        const path = route(7, 12),
          f = ((t * 0.1 + i * 0.13) % 1) * (path.length - 1),
          a = path[Math.floor(f)],
          b = path[Math.min(path.length - 1, Math.floor(f) + 1)],
          p = iso(a.x + (b.x - a.x) * (f % 1), a.y + (b.y - a.y) * (f % 1));
        g.fillStyle([0xec9675, 0x6b96b5, 0xd6c279][i % 3]);
        g.fillRoundedRect(p.x - 2, p.y - 6, 4, 7, 2);
        g.fillStyle(0xf2ceaa);
        g.fillCircle(p.x, p.y - 8, 2);
      }
    if (!state.reduced) {
      const night = (Math.sin(s.time / 150) - 0.6) * 0.15;
      if (night > 0) {
        g.fillStyle(0x1f2959, night);
        g.fillRect(-500, -500, 2000, 1500);
      }
    }
    this.frame++;
  }
}
