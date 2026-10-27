import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  PlanetModel,
  WEAPONS,
  WORLDS,
  Weapon,
  World,
  Attack,
  Point3,
} from "./planet";
import { createTerrainData } from "./planet-texture";
import {
  planetVertex,
  planetFragment,
  atmosphereVertex,
  atmosphereFragment,
} from "./planet-shaders";
export type PlanetOptions = {
  world: World;
  weapon: Weapon;
  power: number;
  playing: boolean;
  auto: boolean;
  zoom: number;
  quality: "high" | "balanced";
  shake: boolean;
};
type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
};
type Wave = {
  mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  age: number;
  duration: number;
  size: number;
};
type Flight = {
  group: THREE.Group;
  orb: THREE.Sprite;
  trail: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  start: THREE.Vector3;
  target: THREE.Vector3;
  attack: Attack;
};
export class PlanetRenderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  model = new PlanetModel();
  planetGroup = new THREE.Group();
  planet: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  atmosphere: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  options: PlanetOptions;
  private terrain: THREE.DataTexture;
  private earthMap: THREE.Texture;
  private earthSpecular: THREE.Texture;
  private glow: THREE.CanvasTexture;
  private particles: Particle[] = [];
  private waves: Wave[] = [];
  private flights = new Map<number, Flight>();
  private debris: THREE.InstancedMesh;
  private debrisMotion: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    size: number;
  }[] = [];
  private debrisAge = 0;
  private particleGeometry = new THREE.BufferGeometry();
  private particlePositions = new Float32Array(1600 * 3);
  private particleColors = new Float32Array(1600 * 3);
  private particlePoints: THREE.Points;
  private raycaster = new THREE.Raycaster();
  private hits: THREE.Vector4[] = Array.from(
    { length: 12 },
    () => new THREE.Vector4(),
  );
  private hitAges = Array(12).fill(0);
  private moon: THREE.Mesh;
  private shakeAmount = 0;
  private autoTimer = 0;
  private userRotation = { x: 0.15, y: 0 };
  private reducedMotion = false;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private output: OutputPass;
  private flares: {
    sprite: THREE.Sprite;
    age: number;
    duration: number;
    size: number;
  }[] = [];
  onLaunch?: (weapon: Weapon) => void;
  onImpact?: (weapon: Weapon, power: number) => void;
  onDestroy?: () => void;
  constructor(options: PlanetOptions) {
    this.options = options;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x03060d);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, options.quality === "high" ? 1.5 : 1),
    );
    this.camera.position.set(0, 0.18, 8.3);
    this.camera.lookAt(0, 0, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1000, 600),
      0.65,
      0.65,
      0.9,
    );
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.terrain = new THREE.DataTexture(
      createTerrainData(),
      768,
      384,
      THREE.RGBAFormat,
    );
    this.terrain.wrapS = THREE.RepeatWrapping;
    this.terrain.minFilter = THREE.LinearFilter;
    this.terrain.magFilter = THREE.LinearFilter;
    this.terrain.needsUpdate = true;
    this.glow = this.createGlow();
    const loader = new THREE.TextureLoader();
    let earthLoaded = 0;
    const markLoaded = () => {
      earthLoaded++;
      if (earthLoaded === 2)
        this.planet.material.uniforms.uEarthReady.value = 1;
    };
    this.earthMap = loader.load(
      "/textures/earth-day.jpg",
      markLoaded,
      undefined,
      () => {},
    );
    this.earthMap.colorSpace = THREE.SRGBColorSpace;
    this.earthSpecular = loader.load(
      "/textures/earth-specular.jpg",
      markLoaded,
      undefined,
      () => {},
    );
    this.earthMap.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const material = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      uniforms: {
        uTerrain: { value: this.terrain },
        uEarthMap: { value: this.earthMap },
        uEarthSpecular: { value: this.earthSpecular },
        uEarthReady: { value: 0 },
        uTime: { value: 0 },
        uDamage: { value: 0 },
        uWorld: { value: WORLDS[options.world].index },
        uHits: { value: this.hits },
        uHitAges: { value: this.hitAges },
      },
    });
    this.planet = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 96, 64),
      material,
    );
    this.planetGroup.add(this.planet);
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.735, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uDamage: { value: 0 },
          uColor: { value: new THREE.Color("#438dff") },
        },
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.planetGroup.add(this.atmosphere);
    this.scene.add(this.planetGroup);
    const sun = new THREE.DirectionalLight(0xd8e5ff, 2.5);
    sun.position.set(-4, 3, 4);
    this.scene.add(sun, new THREE.AmbientLight(0x375580, 0.15));
    this.moon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 3),
      new THREE.MeshStandardMaterial({
        color: 0x8e9bab,
        roughness: 1,
        flatShading: true,
      }),
    );
    this.moon.position.set(3.3, 1.4, -2.5);
    this.scene.add(this.moon);
    this.addStars();
    this.addNebula();
    this.particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3),
    );
    this.particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.particleColors, 3),
    );
    this.particleGeometry.setDrawRange(0, 0);
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({
        size: 0.075,
        map: this.glow,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      }),
    );
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);
    this.debris = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x37322e,
        roughness: 0.95,
        emissive: 0x4b1204,
        emissiveIntensity: 0.3,
        flatShading: true,
      }),
      180,
    );
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.scene.add(this.debris);
    this.model.onEvent = (event) => {
      if (event.kind === "launch") {
        this.addFlight(event.attack);
        this.onLaunch?.(event.attack.weapon);
      }
      if (event.kind === "impact") {
        this.impact(event.attack);
        this.onImpact?.(event.attack.weapon, event.attack.power);
      }
      if (event.kind === "destroyed") {
        this.destroyPlanet();
        this.onDestroy?.();
      }
    };
  }
  private createGlow() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.14, "rgba(255,255,255,.9)");
    gradient.addColorStop(0.4, "rgba(255,255,255,.18)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  private addStars() {
    const positions = [],
      colors = [],
      color = new THREE.Color();
    let seed = 90210;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1800; i++) {
      const a = random() * Math.PI * 2,
        z = random() * 2 - 1,
        r = 24 + random() * 15;
      positions.push(
        Math.sqrt(1 - z * z) * Math.cos(a) * r,
        Math.sqrt(1 - z * z) * Math.sin(a) * r,
        z * r,
      );
      color.setHSL(
        0.55 + random() * 0.15,
        0.1 + random() * 0.3,
        0.3 + random() * 0.5,
      );
      colors.push(color.r, color.g, color.b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    this.scene.add(
      new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size: 0.065,
          map: this.glow,
          transparent: true,
          vertexColors: true,
          depthWrite: false,
          opacity: 0.9,
        }),
      ),
    );
  }
  private addNebula() {
    for (const [color, x, y, scale, opacity] of [
      [0x192b66, -6, 3, 28, 0.28],
      [0x45214c, 8, -3, 24, 0.22],
      [0x0e4149, -9, -4, 21, 0.17],
    ]) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.glow,
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(x, y, -13);
      sprite.scale.set(scale, scale * 0.65, 1);
      this.scene.add(sprite);
    }
  }
  resize(width: number, height: number) {
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        this.options.quality === "high" ? 1.5 : 1,
      ),
    );
    const dpr = this.renderer.getPixelRatio();
    const ratio = Math.min(1, 1920 / (width * dpr), 1080 / (height * dpr));
    this.renderer.setSize(
      Math.round(width * ratio),
      Math.round(height * ratio),
      false,
    );
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(
      Math.round(width * ratio),
      Math.round(height * ratio),
    );
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  private addFlight(attack: Attack) {
    const target = new THREE.Vector3(
      attack.target.x,
      attack.target.y,
      attack.target.z,
    );
    const start = target
      .clone()
      .add(new THREE.Vector3(attack.id % 2 ? -6 : 6, 4.5, 3));
    const group = new THREE.Group(),
      color = WEAPONS[attack.weapon].color;
    const orb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glow,
        color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    orb.scale.setScalar(attack.weapon === "antimatter" ? 0.7 : 0.35);
    group.add(orb);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.045, 1, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(trail);
    this.scene.add(group);
    this.flights.set(attack.id, { group, orb, trail, start, target, attack });
  }
  private removeFlight(id: number) {
    const flight = this.flights.get(id);
    if (!flight) return;
    this.scene.remove(flight.group);
    flight.trail.geometry.dispose();
    flight.trail.material.dispose();
    (flight.orb.material as THREE.SpriteMaterial).dispose();
    this.flights.delete(id);
  }
  private orientBeam(
    mesh: Flight["trail"],
    from: THREE.Vector3,
    to: THREE.Vector3,
  ) {
    const direction = to.clone().sub(from),
      length = direction.length();
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.scale.y = length;
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
  }
  fireAt(x?: number, y?: number) {
    if (this.model.destroyed) return false;
    let target: THREE.Vector3;
    if (x !== undefined && y !== undefined) {
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
      const hits = this.raycaster.intersectObject(this.planet);
      if (!hits.length) return false;
      target = hits[0].point;
    } else {
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * 0.8;
      target = new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r,
        Math.sqrt(1 - r * r),
      ).multiplyScalar(1.7);
    }
    return this.model.fire(this.options.weapon, this.options.power, target);
  }
  private impact(attack: Attack) {
    const point = new THREE.Vector3(
      attack.target.x,
      attack.target.y,
      attack.target.z,
    );
    const local = this.planetGroup.worldToLocal(point.clone()).normalize();
    this.hits.pop();
    this.hits.unshift(
      new THREE.Vector4(local.x, local.y, local.z, attack.power),
    );
    this.hitAges.pop();
    this.hitAges.unshift(0);
    this.emit(
      point,
      attack.weapon === "antimatter" ? 160 : 90,
      WEAPONS[attack.weapon].color,
      attack.power * 1.1,
      1.8,
    );
    this.emit(point, 45, "#ff7238", attack.power * 0.7, 2.4);
    this.wave(point, WEAPONS[attack.weapon].color, attack.power, 0.9);
    this.flare(point, WEAPONS[attack.weapon].color, attack.power * 1.7, 0.65);
    this.shakeAmount = Math.max(this.shakeAmount, 0.08 * attack.power);
  }
  private wave(
    point: THREE.Vector3,
    color: string,
    size: number,
    duration: number,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.0012, 6, 100),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    mesh.position.copy(point);
    mesh.lookAt(point.clone().multiplyScalar(2));
    this.scene.add(mesh);
    this.waves.push({ mesh, age: 0, duration, size });
  }
  private emit(
    origin: THREE.Vector3,
    count: number,
    color: string,
    speed: number,
    life: number,
  ) {
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      this.particles.push({
        position: origin.clone(),
        velocity: direction
          .multiplyScalar((0.3 + Math.random() * 1.5) * speed)
          .add(origin.clone().normalize().multiplyScalar(0.3)),
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color: base.clone().multiplyScalar(0.7 + Math.random() * 0.8),
      });
    }
    if (this.particles.length > 1600)
      this.particles.splice(0, this.particles.length - 1600);
  }
  private flare(
    point: THREE.Vector3,
    color: string,
    size: number,
    duration: number,
  ) {
    const material = new THREE.SpriteMaterial({
      map: this.glow,
      color: new THREE.Color(color).multiplyScalar(3),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(point);
    sprite.scale.setScalar(size * 0.3);
    this.scene.add(sprite);
    this.flares.push({ sprite, age: 0, duration, size });
  }
  private destroyPlanet() {
    this.planet.visible = false;
    this.atmosphere.visible = false;
    this.emit(new THREE.Vector3(), 650, "#ff9c56", 3.5, 5);
    this.emit(new THREE.Vector3(), 200, "#d3e8ff", 4.5, 3.5);
    this.wave(new THREE.Vector3(0, 0, 0.2), "#ffb074", 5, 3);
    this.wave(new THREE.Vector3(0, 0, 0.1), "#a5bdff", 7, 4);
    this.flare(new THREE.Vector3(0, 0, 1), "#ffe0ac", 10, 1.7);
    this.shakeAmount = 0.36;
    this.debrisAge = 0;
    this.debrisMotion = Array.from({ length: 180 }, () => {
      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      return {
        position: direction.clone().multiplyScalar(1.3 + Math.random() * 0.3),
        velocity: direction.multiplyScalar(0.3 + Math.random() * 1.3),
        rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        size: 0.025 + Math.random() * 0.12,
      };
    });
    this.debris.count = this.debrisMotion.length;
  }
  rotate(dx: number, dy: number) {
    this.userRotation.y += dx * 0.006;
    this.userRotation.x = Math.max(
      -0.9,
      Math.min(0.9, this.userRotation.x + dy * 0.005),
    );
  }
  reset() {
    this.model.reset();
    this.particles = [];
    for (const flare of this.flares) {
      this.scene.remove(flare.sprite);
      (flare.sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.flares = [];
    for (const wave of this.waves) {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      wave.mesh.material.dispose();
    }
    this.waves = [];
    for (const id of this.flights.keys()) this.removeFlight(id);
    this.hits.forEach((hit) => hit.set(0, 0, 0, 0));
    this.hitAges.fill(0);
    this.debris.count = 0;
    this.debrisMotion = [];
    this.planet.visible = true;
    this.atmosphere.visible = true;
    this.userRotation = { x: 0.15, y: 0 };
    this.shakeAmount = 0;
    this.autoTimer = 0;
  }
  update(delta: number) {
    const dt = Math.min(delta, 0.05),
      opts = this.options;
    if (opts.playing) {
      this.model.step(dt);
      if (opts.auto && !this.model.destroyed) {
        this.autoTimer -= dt;
        if (this.autoTimer <= 0) {
          this.fireAt();
          this.autoTimer = 1.65;
        }
      }
      this.planetGroup.rotation.set(
        this.userRotation.x,
        this.userRotation.y + this.model.time * 0.045,
        0,
      );
      this.moon.position.x = 3.5 * Math.cos(this.model.time * 0.04);
      this.moon.position.z = -2.5 - Math.sin(this.model.time * 0.04);
      this.hitAges.forEach((age, i) => (this.hitAges[i] = age + dt));
      for (const [id, flight] of this.flights) {
        const a = flight.attack,
          progress = Math.min(1, a.elapsed / WEAPONS[a.weapon].delay),
          tip = flight.start.clone().lerp(flight.target, progress * progress);
        flight.orb.position.copy(tip);
        if (a.weapon === "laser") {
          this.orientBeam(flight.trail, flight.start, flight.target);
          flight.trail.material.opacity = Math.max(
            0,
            1 - Math.abs(a.elapsed - 0.3) * 2,
          );
          flight.trail.scale.x = flight.trail.scale.z =
            0.7 + Math.sin(a.elapsed * 50) * 0.2;
          flight.orb.position.copy(flight.target);
          flight.orb.scale.setScalar(
            0.15 + Math.sin(Math.min(1, progress) * Math.PI) * 0.8,
          );
        } else {
          this.orientBeam(
            flight.trail,
            tip.clone().lerp(flight.start, 0.14),
            tip,
          );
          flight.orb.scale.setScalar(
            (a.weapon === "antimatter" ? 0.9 : 0.5) *
              (1 + Math.sin(a.elapsed * 30) * 0.12),
          );
          if (!a.impacted && this.particles.length < 1400)
            this.emit(tip, 2, WEAPONS[a.weapon].color, 0.18, 0.45);
        }
        flight.group.visible =
          !a.impacted || a.elapsed < WEAPONS[a.weapon].delay + 0.15;
        if (!this.model.attacks.some((v) => v.id === id)) this.removeFlight(id);
      }
      for (const particle of this.particles) {
        particle.life -= dt;
        particle.position.addScaledVector(particle.velocity, dt);
        particle.velocity.multiplyScalar(1 - dt * 0.18);
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const wave of this.waves) {
        wave.age += dt;
        const p = wave.age / wave.duration;
        wave.mesh.scale.setScalar(0.4 + p * 10 * wave.size);
        wave.mesh.material.opacity = Math.max(0, (1 - p) * 0.8);
      }
      for (const wave of this.waves.filter((w) => w.age >= w.duration)) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
      }
      this.waves = this.waves.filter((w) => w.age < w.duration);
      this.debrisAge += dt;
      const dummy = new THREE.Object3D();
      this.debrisMotion.forEach((piece, i) => {
        piece.position.addScaledVector(piece.velocity, dt);
        piece.rotation.x += dt * 0.3;
        piece.rotation.y += dt * 0.5;
        dummy.position.copy(piece.position);
        dummy.rotation.copy(piece.rotation);
        dummy.scale.setScalar(
          piece.size * Math.max(0, 1 - this.debrisAge / 22),
        );
        dummy.updateMatrix();
        this.debris.setMatrixAt(i, dummy.matrix);
      });
      if (this.debris.count) this.debris.instanceMatrix.needsUpdate = true;
      for (const flare of this.flares) {
        flare.age += dt;
        const progress = flare.age / flare.duration;
        flare.sprite.scale.setScalar(flare.size * (0.2 + progress * 1.2));
        (flare.sprite.material as THREE.SpriteMaterial).opacity = Math.max(
          0,
          (1 - progress) ** 2,
        );
      }
      for (const flare of this.flares.filter((f) => f.age >= f.duration)) {
        this.scene.remove(flare.sprite);
        (flare.sprite.material as THREE.SpriteMaterial).dispose();
      }
      this.flares = this.flares.filter((f) => f.age < f.duration);
      this.shakeAmount *= Math.exp(-dt * 5);
    }
    this.planet.material.uniforms.uTime.value = this.model.time;
    this.planet.material.uniforms.uDamage.value =
      1 - this.model.integrity / 100;
    this.planet.material.uniforms.uWorld.value = WORLDS[opts.world].index;
    this.planet.material.uniforms.uHits.value = this.hits;
    this.planet.material.uniforms.uHitAges.value = this.hitAges;
    this.atmosphere.material.uniforms.uDamage.value =
      1 - this.model.integrity / 100;
    this.atmosphere.material.uniforms.uColor.value.set(
      opts.world === "ember"
        ? "#ff772a"
        : opts.world === "nix"
          ? "#9ab8ff"
          : "#438dff",
    );
    const shake = opts.shake && !this.reducedMotion ? this.shakeAmount : 0;
    this.camera.position.set(
      Math.sin(this.model.time * 83) * shake,
      0.18 + Math.cos(this.model.time * 71) * shake,
      (8.3 / opts.zoom) * Math.max(1, 0.78 / this.camera.aspect),
    );
    this.camera.lookAt(0, 0, 0);
    this.particles.forEach((p, i) => {
      this.particlePositions.set(
        [p.position.x, p.position.y, p.position.z],
        i * 3,
      );
      const fade = Math.min(1, (p.life / p.maxLife) * 2);
      this.particleColors.set(
        [p.color.r * fade, p.color.g * fade, p.color.b * fade],
        i * 3,
      );
    });
    this.particleGeometry.setDrawRange(0, this.particles.length);
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    if (opts.quality === "high") this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((m) => materials.add(m));
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.glow.dispose();
    this.terrain.dispose();
    this.earthMap.dispose();
    this.earthSpecular.dispose();
    this.bloom.dispose();
    this.output.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
