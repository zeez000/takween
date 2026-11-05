/** Pure position-driven timeline. No clock, wheel interception or one-shot triggers. */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}
export function assemblyTimeline(progress: number) {
  const p = clamp01(progress);
  const explosion = p <= .2 ? 0 : p < .65 ? smoothstep((p - .2) / .45)
    : p <= .85 ? 1 : 1 - smoothstep((p - .85) / .15);
  const phase = p <= .2 ? "assembled" : p < .65 ? "explode" : p <= .85 ? "inspect" : p < .999 ? "reassemble" : "complete";
  return { progress: p, explosion, phase, interactive: p <= .2 || p >= .999 };
}
export type AssemblySignal = {
  progress: number;
  visible: boolean;
  interacting: boolean;
  paused: boolean;
  yaw: number;
  pitch: number;
  zoom: number;
  reset: number;
  invalidate: (() => void) | null;
};
export function createAssemblySignal(): AssemblySignal {
  return { progress: 0, visible: false, interacting: false, paused: false,
    yaw: 0, pitch: 0, zoom: 1, reset: 0, invalidate: null };
}
