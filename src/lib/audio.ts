export class SoundEngine {
  context: AudioContext | null = null;
  gain: GainNode | null = null;
  destination: MediaStreamAudioDestinationNode | null = null;
  muted = false;
  last = 0;
  async init() {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.18;
      this.gain.connect(this.context.destination);
      this.destination = this.context.createMediaStreamDestination();
      this.gain.connect(this.destination);
    }
    await this.context.resume();
  }
  tone(id: number, escape = false) {
    if (!this.context || !this.gain || this.muted) return;
    const now = this.context.currentTime;
    if (!escape && now - this.last < 0.045) return;
    this.last = now;
    const notes = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    const oscillator = this.context.createOscillator(),
      envelope = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = escape ? 783.99 : notes[id % notes.length];
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(escape ? 0.35 : 0.2, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    oscillator.connect(envelope);
    envelope.connect(this.gain);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }
  close() {
    void this.context?.close();
  }
}
