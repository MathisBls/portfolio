// Interpolations pures, utilisées par la scène (CameraRig, objets) et testées (math.test.ts).

export type Vec3 = [number, number, number]

export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Ramène v de [inMin, inMax] vers [0, 1], borné. */
export const range = (v: number, inMin: number, inMax: number): number =>
  inMax === inMin ? (v >= inMax ? 1 : 0) : clamp((v - inMin) / (inMax - inMin))

export const easeInOut = (t: number): number => t * t * (3 - 2 * t)

export type CameraKey = { at: number; position: Vec3; lookAt: Vec3 }

/**
 * Échantillonne des keyframes triées par `at` (0 -> 1) et écrit le résultat dans `out`
 * (aucune allocation par frame). Avant la première clé : la première ; après la dernière : la dernière.
 */
export function sampleKeyframes(
  keys: readonly CameraKey[],
  t: number,
  out: { position: Vec3; lookAt: Vec3 },
): void {
  const first = keys[0]
  if (!first) return
  let a = first
  let b = first
  for (const key of keys) {
    b = key
    if (key.at >= t) break
    a = key
  }
  const k = easeInOut(range(t, a.at, b.at))
  for (let i = 0; i < 3; i++) {
    out.position[i] = lerp(a.position[i] ?? 0, b.position[i] ?? 0, k)
    out.lookAt[i] = lerp(a.lookAt[i] ?? 0, b.lookAt[i] ?? 0, k)
  }
}
