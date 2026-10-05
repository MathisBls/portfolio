// Storyboard hero (docs/storyboards/hero.md §2), lignes p 0.5 et 0.6 : « Le mot 1 commence à se
// dissoudre (bords lumineux) », « Mot 2 se dissout ». Fenêtres : wordT (src/lib/hero.ts).
// Bruit procédural (fbm de value noise), balayage de gauche à droite (côté d'où vient la lumière),
// discard sous le seuil, bord émissif fin au-dessus de 1 (non tone-mappé) qui accroche le bloom.
import { Color, ShaderMaterial, type Texture, type Vector2 } from 'three'

export type DissolveUniforms = {
  /** Texte rasterisé : seul l'alpha est lu (couverture des glyphes). */
  uMap: { value: Texture }
  /** Couleur du texte (--fg), linéaire. */
  uColor: { value: Color }
  /** Bord de dissolution, HDR (> 1) pour passer le seuil du bloom. */
  uEdgeColor: { value: Color }
  /** 0 = mot entier, 1 = mot dissous. */
  uProgress: { value: number }
  /** Largeur du bord, en unités de bruit. */
  uEdge: { value: number }
  /** Taille du plan en unités monde : bruit isotrope, même grain pour tous les mots. */
  uSize: { value: Vector2 }
  uSeed: { value: number }
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform vec3 uEdgeColor;
uniform float uProgress;
uniform float uEdge;
uniform vec2 uSize;
uniform float uSeed;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v / 0.9375;
}

void main() {
  float alpha = texture2D(uMap, vUv).a;
  if (alpha < 0.004) discard;
  float n = fbm(vUv * uSize * 3.2 + uSeed);
  n = mix(n, vUv.x, 0.4);
  // p = 0 : seuil sous 0 (rien ne disparaît, pas de bord) ; p = 1 : seuil au-dessus de 1 (tout disparaît)
  float t = uProgress * (1.0 + 2.0 * uEdge) - uEdge;
  if (n < t) discard;
  float edge = 1.0 - smoothstep(t, t + uEdge, n);
  gl_FragColor = vec4(mix(uColor, uEdgeColor, edge), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export class DissolveMaterial extends ShaderMaterial {
  declare uniforms: DissolveUniforms

  constructor(map: Texture, color: Color, size: Vector2, seed: number) {
    const uniforms: DissolveUniforms = {
      uMap: { value: map },
      uColor: { value: color },
      uEdgeColor: { value: new Color(3.2, 2.7, 2.2) },
      uProgress: { value: 0 },
      uEdge: { value: 0.06 },
      uSize: { value: size },
      uSeed: { value: seed },
    }
    super({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  }
}
