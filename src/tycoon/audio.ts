let context: AudioContext | undefined,
  background: OscillatorNode | undefined,
  musicGain: GainNode | undefined;
export function chime(enabled: boolean, major = false) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const now = context.currentTime;
    [major ? 523 : 392, major ? 659 : 523, major ? 784 : 659].forEach(
      (f, i) => {
        const o = context!.createOscillator(),
          g = context!.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.06, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.08);
        o.connect(g);
        g.connect(context!.destination);
        o.start(now + i * 0.08);
        o.stop(now + 0.4 + i * 0.08);
      },
    );
  } catch {}
}
export function music(enabled: boolean) {
  if (!enabled) {
    if (musicGain && context)
      musicGain.gain.setTargetAtTime(0, context.currentTime, 0.2);
    return;
  }
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    if (!background) {
      background = context.createOscillator();
      background.type = "sine";
      background.frequency.value = 130.81;
      musicGain = context.createGain();
      background.connect(musicGain);
      musicGain.connect(context.destination);
      background.start();
    }
    musicGain!.gain.setTargetAtTime(0.014, context.currentTime, 0.3);
  } catch {}
}
export function suspendAudio() {
  void context?.suspend();
}
export function resumeAudio() {
  void context?.resume().catch(() => {});
}
