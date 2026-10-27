import type { Weapon } from "./planet";
export class PlanetAudio {
  context: AudioContext | null = null;
  destination: MediaStreamAudioDestinationNode | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  async init() {
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.ratio.value = 5;
      this.master.connect(compressor);
      compressor.connect(context.destination);
      this.destination = context.createMediaStreamDestination();
      compressor.connect(this.destination);
      this.noise = context.createBuffer(
        1,
        context.sampleRate * 3,
        context.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    await this.context.resume();
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        value ? 0 : 0.55,
        this.context.currentTime,
        0.04,
      );
  }
  private tone(
    start: number,
    end: number,
    length: number,
    volume: number,
    type: OscillatorType = "sine",
    delay = 0,
  ) {
    if (!this.context || !this.master) return;
    const c = this.context,
      now = c.currentTime + delay,
      osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(15, end), now + length);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }
  private burst(length: number, frequency: number, volume: number) {
    if (!this.context || !this.master || !this.noise) return;
    const c = this.context,
      now = c.currentTime,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + length);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    source.stop(now + length);
  }
  launch(weapon: Weapon) {
    if (weapon === "laser") {
      this.tone(1400, 180, 0.48, 0.12, "sawtooth");
      this.tone(100, 42, 0.5, 0.18);
    } else if (weapon === "meteor") {
      this.burst(0.95, 1800, 0.18);
      this.tone(240, 65, 0.9, 0.12, "triangle");
    } else {
      this.tone(70, 420, 1.2, 0.16, "sine");
      this.tone(105, 630, 1.2, 0.07, "triangle");
    }
  }
  impact(weapon: Weapon, power: number) {
    this.burst(
      weapon === "antimatter" ? 1.8 : 1.1,
      weapon === "laser" ? 2000 : 3500,
      0.4 * power,
    );
    this.tone(weapon === "antimatter" ? 90 : 130, 22, 1.5, 0.5 * power);
    this.tone(250, 55, 0.5, 0.13, "triangle");
  }
  destroy() {
    this.burst(2.8, 4500, 0.8);
    this.tone(80, 18, 2.8, 0.7);
    this.tone(45, 20, 2.5, 0.4, "triangle", 0.15);
    this.tone(520, 80, 2, 0.12, "sine", 0.3);
  }
  close() {
    void this.context?.close();
  }
}
