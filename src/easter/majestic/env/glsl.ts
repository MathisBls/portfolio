// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7) : blocs GLSL
// partagés par l'environnement (D4), sans dépendance. Unités : mètres, repère de layout.ts (plaine y = 0,
// montagne à l'origine). Garde-fous contre les NaN (le bloom transforme un NaN en écran noir) : jamais de
// pow() sur une base négative, jamais de normalize() d'un vecteur possiblement nul, atan() protégé à
// l'origine, exposants bornés avant exp(). Chaque uniform n'est déclaré qu'une fois (UNIFORMS pour ceux
// que plusieurs blocs lisent) ; assembler les blocs dans l'ordre de ce fichier.
import { NOISE } from '../../park/glsl'

/** Bruit 2D (hachage, bruit de valeur, fbm) en plus du bruit 3D du parc, et petites aides sûres. */
export const NOISE2 = /* glsl */ `
${NOISE}
float sat(float x) { return clamp(x, 0.0, 1.0); }
float sq(float x) { return x * x; }
/** 1 avant a, 0 après b (a < b) : smoothstep à bornes inversées, indéfini en GLSL, évité. */
float fall(float a, float b, float x) { return 1.0 - smoothstep(a, b, x); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    sum += amp * vnoise2(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}
/** Angle polaire protégé (atan(0, 0) est indéfini en GLSL). */
float angleOf(vec2 v) {
  return dot(v, v) > 1e-8 ? atan(v.y, v.x) : 0.0;
}
/** Direction normalisée, ou repli si le vecteur est nul. */
vec3 safeNormalize(vec3 v, vec3 fallback) {
  float l = length(v);
  return l > 1e-6 ? v / l : fallback;
}
`

/** Uniforms lus par plusieurs blocs (déclarés une seule fois). */
export const UNIFORMS = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform float uCrackFront;
uniform float uCrackWidth;
uniform float uBloom;
uniform vec4 uMountainCone;
uniform vec3 uSunColor;
uniform vec3 uSkyAmbient;
`

/**
 * Voronoi « bords » (méthode des distances exactes au bord d'Inigo Quilez, ici deux passes 3×3) :
 * x = distance au bord le plus proche (unités du domaine), yz = normale du bord (de la cellule vers sa
 * voisine), w = hachage de la cellule. `period` > 0 : cellules périodiques en x (domaine polaire).
 */
export const VORONOI = /* glsl */ `
vec2 cellWrap(vec2 c, float period) {
  // max() : HLSL évalue les deux côtés du ternaire, jamais de mod(x, 0)
  return period > 0.0 ? vec2(mod(c.x, max(period, 1.0)), c.y) : c;
}
vec4 voronoiEdge(vec2 x, float period) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  vec2 mg = vec2(0.0);
  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = 0.15 + 0.7 * hash22(cellWrap(n + g, period));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        mr = r;
        mg = g;
      }
    }
  }
  md = 8.0;
  vec2 normal = vec2(1.0, 0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = 0.15 + 0.7 * hash22(cellWrap(n + g, period));
      vec2 r = g + o - f;
      vec2 diff = r - mr;
      float l2 = dot(diff, diff);
      if (l2 > 1e-5) {
        vec2 dir = diff * inversesqrt(l2);
        float d = dot(0.5 * (mr + r), dir);
        if (d < md) {
          md = d;
          normal = dir;
        }
      }
    }
  }
  return vec4(md, normal, hash12(cellWrap(n + mg, period) + 0.37));
}
`

/**
 * Atmosphère : diffusion simple de Rayleigh et de Mie (intégration le long du rayon de vue, profondeur
 * optique vers le soleil par l'approximation de la fonction de Chapman de C. Schüler, GPU Pro 3), planète
 * de 6360 km. `SKY_SAMPLES` : échantillons de vue (define). Sortie HDR linéaire ; `trans` reçoit la
 * transmittance du rayon de vue (lunes, anneau et soleil vus à travers l'air). Même calcul en TypeScript
 * dans atmosphere.ts (horizon, couleur du soleil, ambiance).
 */
export const ATMOSPHERE = /* glsl */ `
uniform vec3 uBetaR;
uniform vec3 uBetaA;
uniform float uBetaM;
uniform float uMieG;
uniform float uSunPower;
uniform float uViewHeight;
const float R_PLANET = 6360e3;
const float R_ATMO = 6420e3;
/** Hauteurs de demi-densité (m) : Rayleigh 8 km × ln 2, Mie 1.2 km × ln 2. */
const float H50_R = 5545.2;
const float H50_M = 831.8;

// Profondeur optique relative (en hauteurs de demi-densité) d'un point d'altitude h vers une direction
// d'angle zénithal chi ; X = rayon de la planète en hauteurs de demi-densité. Exposant borné.
float chapman(float X, float h, float coschi) {
  float c = sqrt(X + h);
  if (coschi >= 0.0) return c / (c * coschi + 1.0) * exp2(-h);
  float x0 = sqrt(max(1.0 - coschi * coschi, 0.0)) * (X + h);
  float c0 = sqrt(x0);
  return 2.0 * c0 * exp2(min(X - x0, 60.0)) - c / (1.0 - c * coschi) * exp2(-h);
}

float raySphereFar(vec3 ro, vec3 rd, float radius) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - radius * radius;
  float disc = max(b * b - c, 0.0);
  return max(-b + sqrt(disc), 0.0);
}

/** Direction relevée au-dessus de l'horizon (le sol couvre le dessous). */
vec3 skyDirection(vec3 dir) {
  return normalize(vec3(dir.x, max(dir.y, 0.0015), dir.z));
}

vec3 atmosphere(vec3 dirIn, out vec3 trans) {
  vec3 dir = skyDirection(dirIn);
  vec3 ro = vec3(0.0, R_PLANET + uViewHeight, 0.0);
  float tMax = raySphereFar(ro, dir, R_ATMO);
  float mu = dot(dir, uSunDir);
  float phaseR = 0.0596831 * (1.0 + mu * mu);
  float g = uMieG;
  float g2 = g * g;
  float phaseM = 0.1193662 * (1.0 - g2) * (1.0 + mu * mu)
    / ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
  vec3 sumR = vec3(0.0);
  vec3 sumM = vec3(0.0);
  float odR = 0.0;
  float odM = 0.0;
  float prev = 0.0;
  float XR = R_PLANET / H50_R;
  float XM = R_PLANET / H50_M;
  for (int i = 0; i < SKY_SAMPLES; i++) {
    // Pas quadratiques : serrés près de l'observateur, où l'air est dense
    float s = (float(i) + 1.0) / float(SKY_SAMPLES);
    float next = s * s * tMax;
    float ds = next - prev;
    vec3 p = ro + dir * (prev + 0.5 * ds);
    prev = next;
    float r = length(p);
    float h = max(r - R_PLANET, 0.0);
    float dR = exp2(-h / H50_R) * ds;
    float dM = exp2(-h / H50_M) * ds;
    odR += dR;
    odM += dM;
    float cosChi = dot(p, uSunDir) / r;
    float sunR = H50_R * chapman(XR, h / H50_R, cosChi);
    float sunM = H50_M * chapman(XM, h / H50_M, cosChi);
    vec3 tau = (uBetaR + uBetaA) * (odR - 0.5 * dR + sunR) + uBetaM * 1.1 * (odM - 0.5 * dM + sunM);
    vec3 att = exp(-min(tau, vec3(80.0)));
    sumR += dR * att;
    sumM += dM * att;
  }
  trans = exp(-min((uBetaR + uBetaA) * odR + uBetaM * 1.1 * odM, vec3(80.0)));
  return uSunPower * (sumR * uBetaR * phaseR + sumM * uBetaM * phaseM);
}
`

/**
 * Corps célestes, en coordonnées de la planète (rayon 1, observateur en (0, 1, 0), haut local = +Y) :
 * - anneau planétaire : intersection du rayon avec le plan équatorial (normale uRingAxis), bandes,
 *   division, ombre de la planète, face éclairée ou à contre-jour ;
 * - deux lunes : disques éclairés (phase selon le soleil), relief de la carte de la Lune du parc si
 *   chargée, bruit sinon ; bord antialiasé (`aa` : largeur du bord, fwidth en fragment).
 * Couleur prémultipliée et couverture. Utilisable en vertex shader (étoiles masquées).
 */
export const BODIES = /* glsl */ `
uniform vec3 uRingAxis;
uniform vec2 uRingRadii;
uniform vec3 uRingColor;
uniform float uRingGain;
uniform vec3 uMoonDirA;
uniform vec3 uMoonDirB;
uniform vec2 uMoonSize;
uniform sampler2D uMoonMap;
uniform float uHasMoonMap;
uniform vec3 uMoonTintA;
uniform vec3 uMoonTintB;
uniform vec3 uSunLight;

float ringDensity(float u, float du) {
  if (u <= 0.0 || u >= 1.0) return 0.0;
  // Annelets fins estompés quand ils deviennent plus fins qu'un pixel (du = fwidth(u))
  float fineFade = 1.0 - smoothstep(0.002, 0.01, du);
  float coarse = 0.55 + 0.45 * vnoise2(vec2(u * 17.0, 3.1));
  float fine = mix(0.8, 0.55 + 0.45 * vnoise2(vec2(u * 170.0, 7.7)), fineFade);
  float gap = 1.0 - 0.92 * exp(-sq((u - 0.62) / 0.022));
  float encke = 1.0 - 0.7 * exp(-sq((u - 0.885) / 0.007)) * fineFade;
  return coarse * fine * gap * encke * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.9, 1.0, u));
}

/** Position sur le plan des anneaux (rayons de la planète) et coordonnée radiale u, sans branche. */
float ringU(vec3 dir, out vec3 p) {
  vec3 o = vec3(0.0, 1.0, 0.0);
  float denom = dot(dir, uRingAxis);
  float safe = abs(denom) < 1e-4 ? 1e-4 : denom;
  float t = -dot(o, uRingAxis) / safe;
  p = o + dir * max(t, 0.0);
  float u = (length(p) - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
  return t > 0.0 && abs(denom) >= 1e-4 ? u : -1.0;
}

/** Anneau vu dans la direction dir : rgb prémultiplié, a couverture (du : fwidth(u), 0 en vertex). */
vec4 ring(vec3 dir, vec3 p, float u, float du) {
  float density = ringDensity(u, du);
  if (density <= 0.0) return vec4(0.0);
  // Ombre de la planète sur l'anneau (rayon vers le soleil qui coupe la sphère unité)
  float b = dot(p, uSunDir);
  float c = dot(p, p) - 1.0;
  float shadow = b < 0.0 ? smoothstep(-0.02, 0.06, c - b * b) : 1.0;
  // Face éclairée vue de l'observateur, ou lumière transmise (contre-jour)
  vec3 o = vec3(0.0, 1.0, 0.0);
  float sameSide = dot(uRingAxis, uSunDir) * dot(uRingAxis, o - p);
  float lit = sameSide > 0.0 ? 1.0 : 0.3 + 0.6 * (1.0 - density);
  float forward = pow(max(dot(dir, uSunDir), 0.0), 6.0);
  float alpha = density * 0.62 * smoothstep(0.0, 0.05, abs(dot(dir, uRingAxis)));
  vec3 color = uRingColor * uSunLight * (lit + forward * 1.5) * shadow * uRingGain;
  return vec4(color * alpha, alpha);
}

/** Anneau sans antialias des annelets (vertex shader, reflets). */
vec4 ringAt(vec3 dir) {
  vec3 p;
  float u = ringU(dir, p);
  return ring(dir, p, u, 0.004);
}

/** Une lune : couleur prémultipliée et couverture. */
vec4 moon(vec3 dir, vec3 center, float radius, vec3 tint, float seed, float aa) {
  float c = dot(dir, center);
  if (c < 0.9) return vec4(0.0);
  vec3 side = abs(center.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 right = normalize(cross(side, center));
  vec3 up = cross(center, right);
  vec2 q = vec2(dot(dir, right), dot(dir, up)) / sin(radius);
  float r2 = dot(q, q);
  float cover = 1.0 - smoothstep(1.0 - aa, 1.0, r2);
  if (cover <= 0.0) return vec4(0.0);
  vec3 n = q.x * right + q.y * up - sqrt(max(1.0 - r2, 0.0)) * center;
  // Texture : coordonnées sphériques de la normale (repère de la lune)
  float lon = atan(dot(n, right), 1e-4 - dot(n, center)) / 6.2831853 + 0.5 + seed;
  float lat = asin(clamp(dot(n, up), -1.0, 1.0)) / 3.1415927 + 0.5;
  float relief;
  if (uHasMoonMap > 0.5) {
    relief = dot(texture2D(uMoonMap, vec2(fract(lon), lat)).rgb, vec3(0.299, 0.587, 0.114)) * 1.3;
  } else {
    relief = 0.55 + 0.35 * fbm(n * 6.0 + seed * 10.0, 4);
  }
  float ndl = dot(n, uSunDir);
  float day = smoothstep(-0.04, 0.22, ndl);
  // Lueur cendrée : face nocturne à peine visible (lumière de l'anneau)
  vec3 color = tint * relief * (uSunLight * day * 1.4 + vec3(0.025, 0.02, 0.04));
  return vec4(color * cover, cover);
}
`

/**
 * Aurore : rideaux verticaux. Chaque couche (altitude croissante le long du rayon de vue) coupe les mêmes
 * lignes de rideau tracées au sol du ciel (courbes repliées par un fbm lent) : empilées, elles forment des
 * draperies verticales, bord bas net et vert, haut violet et magenta, stries le long du rideau. Départ des
 * couches décalé par pixel (`dither`) : pas de bandes. Teinte spectrale (le spectre du prisme qui s'y
 * change) selon uSpectral. `AURORA_STEPS` : couches (define). Dérive lente (uAuroraTime).
 */
export const AURORA = /* glsl */ `
uniform float uAurora;
uniform float uAuroraTime;
uniform float uSpectral;
vec3 spectrumHue(float h) {
  // Arc-en-ciel lisse (rouge -> violet), sans pow
  vec3 c = clamp(abs(fract(h * 0.83 + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return c * c * (3.0 - 2.0 * c);
}
vec3 aurora(vec3 dir, float dither) {
  if (uAurora <= 0.001 || dir.y <= 0.03) return vec3(0.0);
  // Sol du ciel (unités ≈ 100 km) ; l'ovale est centré vers −Z, au-dessus de la montagne
  vec2 base0 = dir.xz / dir.y * 0.5;
  // Bas du rideau ondulé le long du rideau (pas une ligne droite d'altitude constante)
  float lift = 0.3 * vnoise2(base0 * 0.35 + 3.0);
  // Repli des rideaux : une fois par pixel (les couches d'un même rayon en partagent la forme)
  vec2 p0 = base0 * (1.4 + lift);
  float oval = 1.0 - smoothstep(5.0, 9.0, length(p0 - vec2(0.0, -4.5)));
  if (oval <= 0.0) return vec3(0.0);
  float warp = fbm2(p0 * 0.2 + vec2(uAuroraTime * 0.012, 0.0), 3) - 0.5;
  float wave = uAuroraTime * 0.035;
  vec3 sum = vec3(0.0);
  float fade = smoothstep(0.03, 0.2, dir.y) * oval;
  for (int i = 0; i < AURORA_STEPS; i++) {
    float k = (float(i) + dither) / float(AURORA_STEPS);
    vec2 p = base0 * (1.0 + lift + k * 1.3);
    // Deux rideaux sinueux principaux et un troisième plus pâle (pas de bandes périodiques)
    float g = p.y + 4.2 + 0.9 * sin(p.x * 0.42 + wave) + warp * 2.6;
    float sheet = exp(-sq(g / 0.08)) + 0.65 * exp(-sq((g + 2.4) / 0.1)) + 0.4 * exp(-sq((g - 2.1) / 0.12));
    if (sheet < 0.002) continue;
    // Stries verticales fines le long du rideau
    float rays = smoothstep(0.25, 0.85, vnoise2(vec2(p.x * 13.0 + warp * 9.0, uAuroraTime * 0.1)));
    // Bord bas net et lumineux, haut qui s'éteint
    float profile = 1.3 * exp(-k * 7.0) + 0.75 * exp(-k * 1.9);
    float a = sheet * (0.25 + 0.75 * rays) * profile;
    vec3 base = mix(vec3(0.1, 1.0, 0.42), vec3(0.72, 0.16, 1.0), smoothstep(0.12, 0.8, k));
    vec3 spectral = spectrumHue(p.x * 0.07 + 0.5);
    sum += mix(base, spectral, uSpectral) * a;
  }
  return sum * (4.2 / float(AURORA_STEPS)) * uAurora * fade;
}
`

/**
 * Couche de nuages vue d'en dessous (dôme et reflet) : plan à mi-hauteur de la couche, même bruit que les
 * tranches (clouds.ts) ; dessous éclairé par le soleil couchant (plus haut, il l'éclaire encore quand la
 * plaine est dans l'ombre), liseré à contre-jour, cœur plus sombre, brume avec la distance.
 */
export const CLOUD_LAYER = /* glsl */ `
uniform float uCover;
uniform float uDomeClouds;
uniform vec2 uCloudWind;
uniform vec3 uCloudSun;
uniform vec3 uCloudTint;
uniform vec3 uCloudNight;
/** Densité de la couche ; detail (0 -> 1) : part des octaves fines (0 au loin, contre l'aliasing). */
float cloudDensity(vec2 xz, float profile, float detail) {
  vec2 p = xz / 2400.0 + uCloudWind * uTime;
  float threshold = 0.62 - 0.36 * uCover;
  // Deux octaves d'abord : loin du bord d'un nuage, ou trop loin, inutile de calculer le détail
  float n = fbm2(p, 2);
  if (n * profile - threshold < -0.2 || detail <= 0.0) return n * profile - threshold + 0.06 * (1.0 - detail);
  vec2 q = (p * 2.03 + vec2(1.7, 9.2)) * 2.03 + vec2(1.7, 9.2);
  float amp = 0.125;
  float fine = 0.0;
  for (int i = 2; i < CLOUD_OCTAVES; i++) {
    fine += amp * vnoise2(q);
    q = q * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  fine += (vnoise2(p * 5.3 + 11.0) - 0.5) * 0.12;
  // Sans détail, la moyenne des octaves fines (≈ 0.06) les remplace
  n += mix(0.06, fine, detail);
  return n * profile - threshold;
}
vec3 cloudLight(float d, vec3 view, float height) {
  float forward = pow(max(dot(view, uSunDir), 0.0), 7.0);
  float edge = 1.0 - smoothstep(0.0, 0.22, d);
  vec3 sun = uCloudSun * (0.35 + 0.65 * height) * (0.5 + 2.6 * forward * edge + 0.6 * edge);
  // La nuit : lunes, anneau et aurore éclairent le dessus de la couche
  vec3 color = uCloudTint * (uSkyAmbient * 3.0 + sun + uCloudNight * (0.35 + 0.65 * height));
  // Vu d'en dessous, les cœurs denses sont sombres ; vu d'au-dessus, ce sont les sommets éclairés
  float core = smoothstep(0.08, 0.35, d);
  float above = 1.0 - smoothstep(-0.3, 0.0, view.y);
  return color * mix(mix(1.0, 0.6, core), mix(0.65, 1.2, core), above);
}
/** Couche vue depuis origin (sous elle) dans la direction dir : couleur prémultipliée, couverture. */
vec4 cloudLayer(vec3 origin, vec3 dir, float altitude) {
  if (uDomeClouds <= 0.001 || dir.y <= 0.004 || origin.y >= altitude) return vec4(0.0);
  float t = (altitude - origin.y) / dir.y;
  vec2 xz = origin.xz + dir.xz * t;
  // Au loin (plan presque rasant), les octaves fines deviendraient plus fines qu'un pixel : estompées,
  // et la couche se fond dans l'horizon
  float detail = 1.0 - smoothstep(9000.0, 22000.0, t);
  float d = cloudDensity(xz, 1.0, detail);
  float alpha = smoothstep(0.0, 0.12, d) * uDomeClouds * (1.0 - smoothstep(20000.0, 45000.0, t));
  if (alpha <= 0.002) return vec4(0.0);
  vec3 color = cloudLight(d, dir, 0.2);
  float k = uHazeDensity * t * 0.55;
  color = mix(color, horizonColor(dir), 1.0 - exp(-k * k));
  return vec4(color * alpha, alpha);
}
`

/**
 * Sol : hauteur (dunes basses, dôme qui se soulève avant la montagne, bourrelet autour de sa base, ondes
 * du séisme, frémissement), même formule pour le sol, les cailloux et le sable.
 */
export const GROUND_HEIGHT = /* glsl */ `
uniform float uBulge;
uniform float uCollar;
uniform float uCollarRadius;
uniform float uWave;
uniform float uWaveFront;
uniform float uTremble;
float groundHeight(vec2 xz) {
  float r = length(xz);
  float dunes = (vnoise2(xz / 900.0) - 0.5) * 2.6 + (vnoise2(xz / 210.0 + 13.0) - 0.5) * 0.6;
  float bulge = uBulge * 46.0 * exp(-r * r / (uCollarRadius * uCollarRadius * 0.85));
  float c = (r - uCollarRadius) / 330.0;
  float collar = uCollar * 24.0 * exp(-c * c);
  // Ondes de surface qui partent de la montagne (≈ 210 m de longueur d'onde, 320 m/s)
  float envelope = fall(uWaveFront - 900.0, uWaveFront + 1.0, r) * smoothstep(400.0, 1400.0, r);
  float waves = uWave * envelope * (0.7 * sin(r * 0.03 - uTime * 9.6) + 0.3 * sin(r * 0.071 - uTime * 17.0 + 1.3));
  float tremble = uTremble * 0.09 * sin(uTime * 63.0 + r * 0.05) * fall(uCollarRadius, uCollarRadius + 3500.0, r);
  return dunes + bulge + collar + waves + tremble;
}
`

/**
 * Fissures : réseau de fractures qui court depuis la montagne. Voronoi en coordonnées polaires (angle,
 * log du rayon) étiré le long du rayon : fractures radiales et quelques arcs concentriques ; front qui
 * avance (uCrackFront, m) avec un retard par fracture ; largeur qui diminue loin de la base et s'affine
 * à la pointe. Renvoie x = distance au bord (m), y = demi-largeur (m), zw = direction du bord (monde xz).
 */
export const CRACKS = /* glsl */ `
const float CRACK_CELLS = 22.0;
const float CRACK_STRETCH = 2.6;
vec4 crackField(vec2 xz) {
  float r = length(xz);
  if (uCrackFront <= 1.0 || r > uCrackFront * 1.15 + 300.0) return vec4(1e4, 0.0, 1.0, 0.0);
  float theta = angleOf(xz);
  float lr = log(max(r, 60.0) / 60.0);
  vec2 q = vec2(theta, lr / CRACK_STRETCH) * (CRACK_CELLS / 6.2831853);
  q += (vec2(vnoise2(xz / 110.0), vnoise2(xz / 110.0 + 31.0)) - 0.5) * 0.32;
  q += (vec2(vnoise2(xz / 23.0 + 5.0), vnoise2(xz / 23.0 + 47.0)) - 0.5) * 0.06;
  vec4 v = voronoiEdge(q, CRACK_CELLS);
  float meters = v.x * max(r, 60.0) * 6.2831853 / CRACK_CELLS;
  float id = v.w;
  float front = uCrackFront * (0.62 + 0.5 * id);
  float tip = sat((front - r) / 220.0);
  float base = 0.5 + 1.6 * exp(-max(r - uMountainCone.x * 0.95, 0.0) / 1300.0);
  float width = uCrackWidth * (0.45 + 0.55 * fract(id * 7.31)) * base * tip;
  // Direction du bord en xz monde : x du domaine = tangentielle, y = radiale (étirée)
  vec2 radial = r > 1e-3 ? xz / r : vec2(1.0, 0.0);
  vec2 tangent = vec2(-radial.y, radial.x);
  vec2 n = v.y * tangent + (v.z / CRACK_STRETCH) * radial;
  float nl = length(n);
  n = nl > 1e-5 ? n / nl : radial;
  return vec4(meters, width, n);
}
`

/**
 * Brume de distance, même loi que le FogExp2 du plan (MAJESTIC_FOG de layout.ts) mais colorée par
 * l'horizon dans la direction de vue (texture 64×1 calculée par atmosphere.ts : plus chaude côté
 * soleil), plus la poussière levée (brume brune plus dense).
 */
export const HAZE = /* glsl */ `
uniform sampler2D uHorizon;
uniform float uHazeDensity;
uniform float uDustHaze;
uniform vec3 uDustColor;
vec3 horizonColor(vec3 dir) {
  float u = angleOf(dir.xz) / 6.2831853 + 0.5;
  return texture2D(uHorizon, vec2(u, 0.5)).rgb;
}
vec3 applyHaze(vec3 color, vec3 worldPos) {
  vec3 d = worldPos - cameraPosition;
  float dist = length(d);
  vec3 dir = dist > 1e-3 ? d / dist : vec3(0.0, 0.0, -1.0);
  float k = uHazeDensity * dist;
  float f = 1.0 - exp(-k * k);
  color = mix(color, horizonColor(dir), f);
  float dust = 1.0 - exp(-dist * uDustHaze);
  return mix(color, uDustColor, dust * 0.85);
}
/** Part de brume seule (objets additifs : on les éteint avec la distance). */
float hazeAmount(vec3 worldPos) {
  float dist = length(worldPos - cameraPosition);
  float k = uHazeDensity * dist;
  return 1.0 - exp(-k * k) * exp(-dist * uDustHaze);
}
`

/**
 * Finition. Sous bloom : HDR tel quel (le composer de D3 applique le tone mapping Neutral). Sans bloom
 * (mobile, reduced-motion : rendu direct à l'écran, sans tone mapping) : la même courbe Neutral (Khronos
 * PBR Neutral), pour un rendu identique. finishAdd : couches additives sans bloom, mélangées après
 * l'encodage sRGB de l'écran (et non en linéaire) : courbe qui ramène leur poids perçu à celui du bloom.
 */
export const FINISH = /* glsl */ `
vec3 neutralTone(vec3 color) {
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < 0.76) return color;
  float newPeak = 1.0 - 0.0576 / (peak - 0.52);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (0.15 * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
vec3 finish(vec3 c) {
  c = max(c, vec3(0.0));
  return uBloom > 0.5 ? c : neutralTone(c);
}
vec3 finishAdd(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 x = min(c, vec3(1.4));
  return uBloom > 0.5 ? c : x * x * 0.75;
}
`

/**
 * Montagne simplifiée (cône concave : x rayon de base, y hauteur, z enfoncement, w = 1 si dressée) :
 * ombre portée sur la plaine et silhouette dans le reflet du sel, par plus courte approche de l'axe.
 */
export const MOUNTAIN = /* glsl */ `
float mountainRadius(float localHeight) {
  return uMountainCone.x * pow(max(1.0 - localHeight / uMountainCone.y, 0.0), 1.25);
}
/** Le rayon p + t·l (l vers le haut) passe-t-il dans la montagne ? 0 dedans, 1 dégagé. */
float mountainClear(vec3 p, vec3 l) {
  if (uMountainCone.w < 0.5) return 1.0;
  float lh = length(l.xz);
  if (lh < 1e-4 || l.y <= 0.0) return 1.0;
  vec2 dirH = l.xz / lh;
  float t = -dot(p.xz, dirH);
  if (t <= 0.0) return 1.0;
  float closest = length(p.xz + dirH * t);
  float y = p.y + l.y * (t / lh) + uMountainCone.z;
  float radius = mountainRadius(y);
  return smoothstep(radius * 0.8, radius * 1.02 + 1.0, closest);
}
`

/**
 * Lumière d'une surface (cailloux, roches) : soleil (ombre de la montagne), ciel, sol, lueur rose des
 * fissures par en dessous (approximation radiale, sans Voronoi par pixel).
 */
export const SURFACE_LIGHT = /* glsl */ `
uniform vec3 uGroundAmbient;
uniform vec3 uCrackGlowColor;
uniform float uCrackGlow;
vec3 lightSurface(vec3 albedo, vec3 n, vec3 p) {
  float ndl = max(dot(n, uSunDir), 0.0);
  float wrap = max(dot(n, uSunDir) * 0.5 + 0.5, 0.0);
  vec3 c = albedo * uSunColor * (ndl * 0.85 + wrap * 0.15) * mountainClear(p, uSunDir);
  c += albedo * mix(uGroundAmbient, uSkyAmbient, n.y * 0.5 + 0.5);
  // Lueur des fissures par en dessous : seulement près du sol (pas sur les roches en haut des flancs)
  float r = length(p.xz);
  float under = sat(-n.y * 0.6 + 0.5) * fall(uCrackFront * 0.35, uCrackFront + 1.0, r);
  under *= exp(-max(p.y, 0.0) / 45.0);
  c += albedo * uCrackGlowColor * uCrackGlow * under * 0.6;
  return c;
}
`

/** Assemble des blocs (dans l'ordre de ce fichier). */
export function glsl(...chunks: string[]): string {
  return chunks.join('\n')
}
