/** Sirene curta de emergência (6 tons alternados, ~3 s). Reaproveita o AudioContext já liberado, se houver. */
export function tocarSirene(existente?: AudioContext | null) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = existente ?? (Ctx ? new Ctx() : null);
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const tom = (freq: number, inicio: number) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.18, ctx.currentTime + inicio);
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + 0.35);
      osc.connect(ganho);
      ganho.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.35);
    };
    [0, 0.45, 0.9, 1.35, 1.8, 2.25].forEach((t, i) => tom(i % 2 ? 1000 : 700, t));
  } catch {
    // O som é reforço: o alerta já está visível e gravado.
  }
}
