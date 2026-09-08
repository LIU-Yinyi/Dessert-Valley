export function startAudioLevelMeter(
  stream: MediaStream,
  onLevel: (level: number) => void
) {
  const context = new AudioContext();
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode;
  try {
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
  } catch (error) {
    source?.disconnect();
    void context.close().catch(() => {});
    throw error;
  }
  const samples = new Uint8Array(analyser.fftSize);
  let frame = 0;
  let lastUpdate = 0;
  let level = 0;
  let stopped = false;
  const sample = (time: number) => {
    if (stopped) return;
    if (time - lastUpdate >= 80) {
      analyser.getByteTimeDomainData(samples);
      const energy = samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0);
      const measured = Math.min(1, Math.sqrt(energy / samples.length) * 7);
      level = Math.max(measured, level * 0.65);
      onLevel(level);
      lastUpdate = time;
    }
    frame = requestAnimationFrame(sample);
  };
  frame = requestAnimationFrame(sample);
  void context.resume().catch(() => {});

  return () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    source?.disconnect();
    analyser.disconnect();
    void context.close().catch(() => {});
  };
}
