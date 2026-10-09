# Part de pizza napolitaine réaliste de Meme Rina (agents B4 puis motion-3d, 2026-10-09 ; demande de Mathis :
# « une part de pizza beaucoup plus réaliste »). Remplace la part low-poly de pizza.glb (Dough, Sauce, Cheese,
# Crust, Pep*, Basil*) et sert aussi au diorama de la page /realisations/meme-rina/.
#
# Usage :
#   "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_pizza_real.py
#       -- [--preview <dossier>] [--poster] [--quick] [--only slice|landing]
#   --quick : saute la cuisson si les cartes existent déjà (node_modules/.cache/pizza) ;
#   --only slice : site principal seulement ; --only landing : diorama seulement (la part est reconstruite,
#     pizza.glb n'est pas réexporté) ;
#   --preview : rendus Cycles de contrôle des GLB réimportés (part : 4 vues sur fond sombre ; diorama : vue
#     de la visionneuse sans --poster, deux gros plans) ;
#   --poster : public/posters/pizza.webp (cadrage de scripts/blender/posters.py) et
#     public/posters/landing/pizza.webp (vue de départ de la visionneuse, src/scene/landing/views.ts).
#   Durée : ~1 min complet (RTX), ~25 s en --quick.
#
# Sorties :
#   public/models/pizza.glb          site principal (~190 Ko) : Pizza_Slice_Root > Pizza_Slice (cartes cuites
#                                    1024), Pizza_Basil0..2, Pizza_CheeseStrand0..3 (origine au point
#                                    d'accroche, animés par src/scene/objects/Pizza.tsx), et le navigateur
#                                    Pizza_Browser_* repris tel quel de blender/portfolio_models.blend ;
#   public/models/landing/pizza.glb  diorama (~720 Ko) : Pizza_Board (planche d'olivier), Pizza_Rest (pizza
#                                    moins une part), Pizza_LiftedSlice, Pizza_RestBasil*, Pizza_LiftBasil*,
#                                    Pizza_Pull (filaments tendus entre la part et la pizza) ;
#   public/posters/pizza.webp, public/posters/landing/pizza.webp, blender/pizza_real.blend.
#
# Méthode : la pizza est un balayage d'un profil fermé (dessous, cornicione gonflé, dessus nappé) autour de
# l'axe vertical, entre deux plans de coupe. Toute la matière (bulles du cornicione, taches léopard, flaques
# de mozzarella et leurs bulles dorées, sauce, farine, mie alvéolée des coupes) est un champ calculé en numpy
# à partir de la position monde : on évalue ces champs sur un maillage haute définition (couleur et
# rugosité par sommet, relief en géométrie), puis Cycles cuit couleur, rugosité et normales sur le maillage
# léger (« selected to active »). Comme les champs dépendent de la position monde, la part et le reste de
# la pizza se raccordent exactement au niveau des coupes.
#
# Repère : monde Y-up (celui du site), unités du site : pointe de la part à l'origine, part le long de +x
# (croûte à x ≈ 1.62), coupes à ±22.5° autour de +x, dessous à y = 0.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landing_common import *  # noqa: E402,F401,F403

import numpy as np  # noqa: E402

ARGS = cli_args()
BAKE_DIR = os.path.join(ROOT, 'node_modules', '.cache', 'pizza')
GLB_MAIN = os.path.join(ROOT, 'public', 'models', 'pizza.glb')
GLB_LANDING = os.path.join(MODELS, 'pizza.glb')
POSTER = os.path.join(POSTERS, 'pizza.webp')
BLEND = os.path.join(BLEND_DIR, 'pizza_real.blend')
PORTFOLIO_BLEND = os.path.join(BLEND_DIR, 'portfolio_models.blend')
SCRATCH = ARGS.get('preview')

A = math.radians(22.5)        # demi-angle de la part (8 parts)
R_TIP = 0.012                 # la pointe est un minuscule méplat (pas de sommet dégénéré)
TEX = 1024                    # côté des textures livrées (couleur, normales ; rugosité : TEX / 2)

# =============================================================================== bruits (numpy)
_rng = np.random.RandomState(20261009)
PERM = np.concatenate([_rng.permutation(256)] * 2).astype(np.int64)
_G = np.array([(1, 1, 0), (-1, 1, 0), (1, -1, 0), (-1, -1, 0), (1, 0, 1), (-1, 0, 1), (1, 0, -1), (-1, 0, -1),
               (0, 1, 1), (0, -1, 1), (0, 1, -1), (0, -1, -1), (1, 1, 0), (-1, 1, 0), (0, -1, 1), (0, -1, -1)],
              np.float32)
GX, GY, GZ = _G[:, 0], _G[:, 1], _G[:, 2]
_ROT = []
for _k in range(12):
    _a, _b = 0.61 + 0.37 * _k, 1.13 + 0.29 * _k
    _rz = np.array([[math.cos(_a), -math.sin(_a), 0], [math.sin(_a), math.cos(_a), 0], [0, 0, 1]])
    _rx = np.array([[1, 0, 0], [0, math.cos(_b), -math.sin(_b)], [0, math.sin(_b), math.cos(_b)]])
    _ROT.append((_rz @ _rx).astype(np.float32))


def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def perlin(p):
    f = np.floor(p)
    q = p - f
    i = f.astype(np.int64) & 255
    X, Y, Z = i[:, 0], i[:, 1], i[:, 2]
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    u, v, w = _fade(x), _fade(y), _fade(z)
    A_ = PERM[X] + Y
    B_ = PERM[X + 1] + Y
    AA, AB, BA, BB = PERM[A_] + Z, PERM[A_ + 1] + Z, PERM[B_] + Z, PERM[B_ + 1] + Z

    def g(h, a, b, c):
        h = PERM[h] & 15
        return GX[h] * a + GY[h] * b + GZ[h] * c

    x1, y1, z1 = x - 1, y - 1, z - 1
    l1 = g(AA, x, y, z) + u * (g(BA, x1, y, z) - g(AA, x, y, z))
    l2 = g(AB, x, y1, z) + u * (g(BB, x1, y1, z) - g(AB, x, y1, z))
    l3 = g(AA + 1, x, y, z1) + u * (g(BA + 1, x1, y, z1) - g(AA + 1, x, y, z1))
    l4 = g(AB + 1, x, y1, z1) + u * (g(BB + 1, x1, y1, z1) - g(AB + 1, x, y1, z1))
    m1 = l1 + v * (l2 - l1)
    m2 = l3 + v * (l4 - l3)
    return m1 + w * (m2 - m1)


def fbm(p, freq, octaves=4, seed=0, gain=0.5, lac=2.03):
    """fBm ~[-1, 1] de la position monde p (n, 3) à la fréquence de base `freq` (cycles par unité)."""
    p = np.asarray(p, np.float32) * np.float32(freq) + np.float32(seed * 37.17)
    out = np.zeros(len(p), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        out += np.float32(amp) * perlin(p)
        norm += amp
        amp *= gain
        p = (p @ _ROT[(o + seed) % 12]) * np.float32(lac) + np.float32(11.3)
    return out / np.float32(norm * 0.7)


def hash01(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ (seed * 2654435761)
    h = h & 0xFFFFFFFF
    h = ((h ^ (h >> 15)) * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 3266489917) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(np.float32) / np.float32(0xFFFFFF)


def spots(p, cell, seed, radius, prob, halo=2.2, dims=3):
    """Taches aléatoires (grille jitterée) : renvoie (cœur, halo, hauteur de dôme normalisée, id) dans [0, 1].
    radius(u) -> rayon (unités) ; prob : probabilité d'activation (scalaire ou tableau par point)."""
    q = np.asarray(p, np.float32) / np.float32(cell)
    base = np.floor(q).astype(np.int64)
    core = np.zeros(len(p), np.float32)
    hal = np.zeros(len(p), np.float32)
    dome = np.zeros(len(p), np.float32)
    ident = np.zeros(len(p), np.float32)
    rng3 = (-1, 0, 1)
    offs = [(a, b, c) for a in rng3 for b in (rng3 if dims == 3 else (0,)) for c in rng3]
    for ox, oy, oz in offs:
        cx, cy, cz = base[:, 0] + ox, base[:, 1] + oy, base[:, 2] + oz
        fx = cx + 0.15 + 0.7 * hash01(cx, cy, cz, seed)
        fy = cy + (0.15 + 0.7 * hash01(cx, cy, cz, seed + 1) if dims == 3 else q[:, 1] - cy)
        fz = cz + 0.15 + 0.7 * hash01(cx, cy, cz, seed + 2)
        d = np.sqrt((q[:, 0] - fx) ** 2 + (q[:, 1] - fy) ** 2 + (q[:, 2] - fz) ** 2) * cell
        u = hash01(cx, cy, cz, seed + 3)
        act = hash01(cx, cy, cz, seed + 4) < prob
        rad = radius(u)
        c = np.where(act, 1 - smooth(0.55 * rad, rad, d), 0)
        hh = np.where(act, 1 - smooth(rad, halo * rad, d), 0)
        dm = np.where(act & (d < rad), np.sqrt(np.clip(1 - (d / rad) ** 2, 0, 1)), 0)
        take = c > core
        ident = np.where(take, hash01(cx, cy, cz, seed + 5), ident)
        core = np.maximum(core, c)
        hal = np.maximum(hal, hh)
        dome = np.maximum(dome, dm)
    return core, hal, dome, ident


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = np.asarray(t, np.float32)[..., None]
    return a * (1 - t) + np.asarray(b, np.float32) * t


def srgb_to_lin(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# =============================================================================== profil (r, y)
# Profil fermé, dans le sens trigonométrique : couture sur le dessous près du bord, cornicione, dessus
# nappé jusqu'à la pointe, méplat de la pointe, dessous jusqu'à la couture. Unités du site (~9.4 cm).
CTRL = [
    (1.45, 0.004), (1.535, 0.020), (1.598, 0.062), (1.624, 0.118), (1.615, 0.174), (1.586, 0.222),
    (1.532, 0.254), (1.462, 0.267), (1.392, 0.255), (1.335, 0.218), (1.298, 0.163), (1.272, 0.108),
    (1.246, 0.074), (1.19, 0.058), (0.9, 0.049), (0.5, 0.043), (0.12, 0.038), (R_TIP, 0.036),
    (R_TIP, 0.006), (0.12, 0.0035), (0.6, 0.0015), (1.2, 0.0),
]
I_TIP_BOTTOM = 18             # index de (R_TIP, 0.006) : limite des îlots A (dessus) et B (dessous)


def catmull(pts, per=60):
    """Catmull-Rom centripète fermée ; renvoie les points denses et l'index dense de chaque contrôle."""
    P = np.array(pts, float)
    n = len(P)
    out, idx = [], []
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]

        def tj(ti, a, b):
            return ti + max(np.linalg.norm(b - a), 1e-6) ** 0.5

        t0 = 0.0
        t1 = tj(t0, p0, p1)
        t2 = tj(t1, p1, p2)
        t3 = tj(t2, p2, p3)
        idx.append(len(out))
        for k in range(per):
            t = t1 + (t2 - t1) * k / per
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    out = np.array(out)
    out[:, 0] = np.maximum(out[:, 0], R_TIP * 0.6)
    out[:, 1] = np.maximum(out[:, 1], 0.0)
    return out, idx


DENSE, DIDX = catmull(CTRL)


def density(r, y):
    """Densité d'échantillonnage du profil : serré sur le cornicione, lâche sur le dessous."""
    rim = smooth(1.18, 1.3, r) * (y > 0.012)
    return 0.55 + 0.45 * (y > 0.02) + 1.8 * rim


def sample_profile(n_a, n_b):
    """Échantillons du profil : îlot A (couture -> pointe-dessous, inclus), îlot B (dessous, sans bouts).
    Renvoie r, y, nr, ny, s_a (abscisse dans A ou -1), s_b (abscisse dans B ou -1)."""
    D = DENSE
    m = len(D)
    seg = np.roll(D, -1, axis=0) - D
    ln = np.linalg.norm(seg, axis=1)
    w = density(D[:, 0], D[:, 1]) * ln
    i_b = DIDX[I_TIP_BOTTOM]

    def pick(i0, i1, count, endpoint):
        ids = np.arange(i0, i1) % m
        cw = np.concatenate([[0], np.cumsum(w[ids])])
        cl = np.concatenate([[0], np.cumsum(ln[ids])])
        targets = np.linspace(0, cw[-1], count + 1 if not endpoint else count)
        if not endpoint:
            targets = targets[1:-1] if count > 1 else targets[1:2]
        pts, sl = [], []
        for t in targets:
            k = min(np.searchsorted(cw, t, side='right') - 1, len(ids) - 1)
            f = 0 if cw[k + 1] == cw[k] else (t - cw[k]) / (cw[k + 1] - cw[k])
            a = D[ids[k]]
            b = D[(ids[k] + 1) % m]
            pts.append(a + (b - a) * f)
            sl.append(cl[k] + (cl[k + 1] - cl[k]) * f)
        return np.array(pts), np.array(sl)

    pa, sa = pick(0, i_b + 1, n_a, True)          # couture (index 0) -> pointe-dessous
    pb, sb = pick(i_b, m + 1, n_b + 1, False)     # pointe-dessous -> couture, bouts exclus
    sb_full = sb
    pts = np.concatenate([pa, pb])
    s_a = np.concatenate([sa, -np.ones(len(pb))])
    s_b = np.concatenate([-np.ones(len(pa)), sb_full])
    s_b[len(pa) - 1] = 0.0                         # pointe-dessous : début de B
    # Normale extérieure (sens trigo : tangente tournée de -90°), lissée
    t = np.roll(pts, -1, axis=0) - np.roll(pts, 1, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    nr, ny = t[:, 1], -t[:, 0]
    return pts[:, 0], pts[:, 1], nr, ny, s_a, s_b, (sa[-1], sb[-1] if len(sb) else 0.0)


# =============================================================================== matière (champs monde)
def cheese_blobs():
    """Morceaux de fior di latte fondus : (x, z, rayon). Quatre composés à la main sur la part
    (-22.5°..22.5° autour de +x ; le troisième déborde sur la coupe +22.5°, d'où part le filament), le reste
    en disque de Poisson sur toute la pizza. Chaque morceau reçoit 2 ou 3 lobes : flaque irrégulière."""
    blobs = [(0.42, 0.035, 0.15), (0.80, -0.15, 0.20), (0.96, 0.27, 0.18), (1.12, -0.02, 0.11)]
    rng = np.random.RandomState(7)
    tries = 0
    while tries < 4000 and len(blobs) < 26:
        tries += 1
        r = 1.18 * math.sqrt(rng.uniform(0.02, 1))
        th = rng.uniform(0, 2 * math.pi)
        x, z = r * math.cos(th), r * math.sin(th)
        if abs(math.atan2(z, x)) < A + 0.18:
            continue
        rad = rng.uniform(0.13, 0.22)
        if r + rad * 0.6 > 1.24:
            continue
        if all(math.hypot(x - bx, z - bz) > (rad + br) * 0.95 for bx, bz, br in blobs):
            blobs.append((x, z, rad))
    rng = np.random.RandomState(17)
    out = []
    for bx, bz, br in blobs:
        out.append((bx, bz, br))
        for _ in range(rng.randint(2, 4)):
            a = rng.uniform(0, 2 * math.pi)
            d = br * rng.uniform(0.5, 0.85)
            r2 = br * rng.uniform(0.3, 0.52)
            sx, sz = bx + d * math.cos(a), bz + d * math.sin(a)
            if math.hypot(sx, sz) + r2 * 0.6 > 1.22:
                continue
            out.append((sx, sz, r2))
    return np.array(out, np.float32)


BLOBS = cheese_blobs()


def blisters():
    """Grosses bulles du cornicione : (x, y, z) sur le profil de base, rayon, hauteur, carbonisée ?"""
    rng = np.random.RandomState(11)
    out = []
    i0, i1 = DIDX[2], DIDX[11]                     # du bas du bord extérieur au bas de la pente intérieure
    for _ in range(230):
        k = rng.randint(i0, i1)
        r, y = DENSE[k]
        th = rng.uniform(-math.pi, math.pi)
        rad = rng.uniform(0.022, 0.07) * (1 if rng.rand() < 0.8 else 1.4)
        out.append((r * math.cos(th), y, r * math.sin(th), rad, rad * rng.uniform(0.25, 0.52),
                    1.0 if rng.rand() < 0.5 else 0.0))
    return np.array(out, np.float32)


BLISTERS = blisters()


def cheese_mask(x, z, warp):
    M = np.full(len(x), -1.0, np.float32)
    for bx, bz, br in BLOBS:
        d = np.sqrt((x - bx) ** 2 + (z - bz) ** 2) / br
        M = np.maximum(M, 1 - d * (1 + warp))
    return M


def cheese_layer(P):
    """Mozzarella au point (x, z) de P : masque M (> 0 dans une flaque, 1 au centre) et épaisseur.
    Évalué à y = 0 : la surface balayée et les coupes lisent exactement la même couche."""
    Pf = (np.asarray(P, np.float32) * np.array((1, 0, 1), np.float32)).astype(np.float32)
    x, z = Pf[:, 0], Pf[:, 2]
    r = np.sqrt(x * x + z * z)
    warp = 0.38 * fbm(Pf, 4.0, 3, seed=5) + 0.12 * fbm(Pf, 12, 2, seed=25)
    M = np.where(r < 1.3, cheese_mask(x, z, warp), -1.0).astype(np.float32)
    thick = 0.024 * smooth(-0.04, 0.45, M) ** 0.75 + 0.003 * fbm(Pf, 11, 2, seed=6) * smooth(0.0, 0.3, M)
    return M, thick.astype(np.float32), Pf


def blister_field(P):
    h = np.zeros(len(P), np.float32)
    char = np.zeros(len(P), np.float32)
    for bx, by, bz, rad, hb, ch in BLISTERS:
        d2 = ((P[:, 0] - bx) ** 2 + (P[:, 1] - by) ** 2 + (P[:, 2] - bz) ** 2) / (rad * rad)
        near = d2 < 1
        if not near.any():
            continue
        f = np.where(near, (1 - d2) ** 2, 0)
        h = np.maximum(h, hb * f)
        if ch:
            char = np.maximum(char, smooth(0.3, 0.8, f) * min(1.0, hb / 0.018))
    return h, char


def warped(P, amp, freq, seed):
    """P déplacé par un bruit vectoriel : taches aux contours irréguliers."""
    w = np.stack([fbm(P, freq, 2, seed=seed), fbm(P, freq, 2, seed=seed + 1), fbm(P, freq, 2, seed=seed + 2)], 1)
    return (P + np.float32(amp) * w).astype(np.float32)


CRUST_PALE = np.array((0.88, 0.74, 0.52), np.float32)
CRUST_GOLD = np.array((0.79, 0.55, 0.28), np.float32)
CRUST_BROWN = np.array((0.55, 0.32, 0.14), np.float32)
CHAR_HALO = np.array((0.29, 0.16, 0.085), np.float32)
CHAR_CORE = np.array((0.075, 0.055, 0.045), np.float32)
FLOUR = np.array((0.94, 0.90, 0.82), np.float32)
SAUCE = np.array((0.60, 0.065, 0.03), np.float32)
SAUCE_DARK = np.array((0.42, 0.035, 0.02), np.float32)
SAUCE_BRIGHT = np.array((0.72, 0.14, 0.045), np.float32)
SAUCE_DRY = np.array((0.44, 0.13, 0.06), np.float32)
SAUCE_THIN = np.array((0.64, 0.22, 0.09), np.float32)
CHEESE = np.array((0.965, 0.94, 0.875), np.float32)
CHEESE_WARM = np.array((0.96, 0.90, 0.77), np.float32)
CHEESE_GOLD = np.array((0.88, 0.70, 0.42), np.float32)
CHEESE_BROWN = np.array((0.74, 0.50, 0.24), np.float32)
CHEESE_EDGE = np.array((0.92, 0.64, 0.47), np.float32)
FAT = np.array((0.90, 0.56, 0.18), np.float32)
CRUMB = np.array((0.93, 0.85, 0.67), np.float32)
CRUMB_HOLE = np.array((0.60, 0.47, 0.30), np.float32)


def surface_fields(P0, r, y, nr, ny):
    """Champs de la surface balayée. P0 : points du profil de base (monde), (r, y, nr, ny) : profil.
    Renvoie (déplacement le long de la normale du profil, couleur sRGB, rugosité, hauteur du dessus,
    épaisseur de mozzarella)."""
    n = len(P0)
    wb = smooth(-0.35, -0.85, ny)                                  # dessous
    r_s = 1.262 + 0.03 * fbm(P0, 3.5, 3, seed=1)                   # limite de la sauce sur le cornicione
    ms = (1 - smooth(r_s - 0.014, r_s + 0.014, r)) * (1 - wb)      # nappé (sauce + mozzarella)
    wc = (1 - ms) * (1 - wb)                                       # pâte à nu
    cz = smooth(1.19, 1.33, r) * (1 - 0.75 * wb)                   # zone du cornicione (relief)

    # --- relief
    puff = 0.03 * fbm(P0, 2.2, 4, seed=2) + 0.01 * fbm(P0, 6.5, 3, seed=3)
    bl_h, bl_char = blister_field(P0)
    D = cz * (puff + bl_h)
    D += wc * 0.0013 * fbm(P0, 42, 2, seed=4)
    M, thick, Pf = cheese_layer(P0)
    cm = smooth(-0.025, 0.06, M)                                   # couverture (couleur)
    b_core, b_halo, b_dome, b_id = spots(Pf, 0.07, 31, lambda u: 0.012 + 0.016 * u,
                                         0.4 * smooth(0.12, 0.4, M), halo=1.8, dims=2)
    ch = thick + 0.005 * b_dome * smooth(0.1, 0.35, M)
    sv = fbm(P0, 9, 3, seed=14)
    sv2 = fbm(P0, 2.6, 2, seed=22)                                 # épaisseur de la sauce (étalée à la louche)
    pulp, _, pulp_dome, _ = spots(Pf, 0.03, 71, lambda u: 0.004 + 0.007 * u, 0.25, dims=2)
    sauce_rel = 0.0017 * fbm(P0, 26, 3, seed=7) + 0.0022 * sv2 + 0.0016 * pulp_dome
    D += ms * (sauce_rel + ch)
    D += wb * 0.0012 * fbm(P0, 20, 2, seed=8)

    # --- croûte
    up = np.clip(ny, 0, 1)
    out = np.clip(nr, 0, 1)
    height = smooth(0.05, 0.25, y)
    bake = np.clip(0.28 + 0.45 * height + 0.15 * out + 0.3 * fbm(P0, 3.0, 3, seed=9)
                   + 0.22 * fbm(P0, 1.4, 2, seed=24) + 0.6 * bl_h / 0.03, 0, 1)
    col = mix(np.broadcast_to(CRUST_PALE, (n, 3)), CRUST_GOLD, smooth(0.0, 0.6, bake))
    col = mix(col, CRUST_BROWN, smooth(0.5, 1.0, bake) * 0.85)
    flour = smooth(0.25, 0.85, fbm(P0, 8, 3, seed=10)) * (0.25 + 0.6 * (1 - height)) * (1 - 0.5 * up)
    col = mix(col, FLOUR, flour * 0.45)
    prop = np.clip(0.05 + 0.4 * height * (0.4 + 0.6 * np.maximum(up, out)) + 0.25 * fbm(P0, 2.5, 2, seed=11),
                   0, 0.65)
    Pw = warped(P0, 0.012, 14, 44)                                 # taches léopard aux bords irréguliers
    c_core, c_halo, _, _ = spots(Pw, 0.075, 41, lambda u: 0.008 + 0.022 * u * u, prop, halo=2.1)
    c_core2, c_halo2, _, _ = spots(Pw, 0.024, 43, lambda u: 0.003 + 0.004 * u, prop * 0.6, halo=2.0)
    halo = np.maximum(c_halo * 0.85, c_halo2 * 0.55)
    core = np.maximum(np.maximum(c_core, c_core2 * 0.9), bl_char)
    col = mix(col, CHAR_HALO, halo * 0.7)
    col = mix(col, CHAR_CORE, core * 0.93)
    rough_c = 0.66 + 0.16 * flour + 0.14 * core

    # --- dessous (sole) : marbré, taches de cuisson, semoule
    bot = mix(np.broadcast_to(CRUST_GOLD, (n, 3)), CRUST_BROWN, np.clip(0.35 + 0.45 * fbm(P0, 4, 3, seed=12), 0, 1))
    s_core, s_halo, _, _ = spots(Pw, 0.07, 51, lambda u: 0.007 + 0.02 * u, 0.35, halo=2.4)
    bot = mix(bot, CHAR_HALO, s_halo * 0.7)
    bot = mix(bot, CHAR_CORE, s_core * 0.85)
    sem_core, _, _, _ = spots(P0, 0.012, 61, lambda u: 0.0016 + 0.0016 * u, 0.35, halo=1.2)
    bot = mix(bot, FLOUR, np.maximum(sem_core, smooth(0.3, 0.9, fbm(P0, 7, 3, seed=13)) * 0.45))
    col = mix(col, bot, wb)
    rough_c = rough_c * (1 - wb) + 0.82 * wb

    # --- sauce : rouge profond, plus claire et orangée là où elle est mince, pulpe, gras orangé par plaques
    sauce = mix(np.broadcast_to(SAUCE, (n, 3)), SAUCE_DARK, smooth(0.1, 0.8, sv) * 0.85)
    sauce = mix(sauce, SAUCE_BRIGHT, smooth(-0.2, -0.8, sv) * 0.6)
    sauce = mix(sauce, SAUCE_THIN, smooth(-0.25, -0.75, sv2) * 0.45)
    sauce = mix(sauce, SAUCE_BRIGHT * 1.04, pulp * 0.25)
    edge = smooth(r_s - 0.08, r_s, r)                              # sauce cuite, plus sombre contre la croûte
    sauce = mix(sauce, SAUCE_DRY, edge * 0.7)
    fat = smooth(-0.08, -0.005, M) * (1 - smooth(-0.005, 0.04, M)) * smooth(-0.3, 0.35, fbm(Pf, 7, 2, seed=21))
    sauce = mix(sauce, FAT, fat * 0.5)
    oil = smooth(0.3, 0.7, fbm(Pf, 5, 2, seed=23))                 # filet d'huile d'olive : plaques brillantes
    rough_s = 0.3 + 0.08 * sv + 0.28 * edge - 0.06 * fat - 0.08 * oil

    # --- mozzarella : blanc laiteux, bord fin translucide (sauce et gras dessous), quelques cloques dorées
    cv = fbm(Pf, 6, 3, seed=15)
    chee = mix(np.broadcast_to(CHEESE, (n, 3)), CHEESE_WARM, np.clip(0.2 + 0.3 * cv, 0, 1))
    thin = 1 - smooth(0.0, 0.24, M)                               # bord fin translucide : la sauce rosit
    chee = mix(chee, CHEESE_EDGE, thin * (0.3 + 0.35 * smooth(-0.4, 0.3, fbm(Pf, 9, 2, seed=26))))
    brown = smooth(0.25, 1.0, b_dome) * smooth(0.35, 0.9, b_id)
    chee = mix(chee, CHEESE_GOLD, brown * 0.6)
    chee = mix(chee, CHEESE_BROWN, smooth(0.6, 1.0, b_dome) * smooth(0.8, 1.0, b_id) * 0.45)
    rough_m = 0.22 + 0.08 * cv + 0.22 * brown - 0.06 * oil

    top = mix(sauce, chee, cm)
    rough_t = rough_s * (1 - cm) + rough_m * cm
    band = ms * (1 - ms) * 4                                       # liseré sec sauce / croûte
    top = mix(top, SAUCE_DRY, band * 0.4 * (1 - cm))
    col = mix(col, top, ms)
    rough = np.clip(rough_c * (1 - ms) + rough_t * ms, 0.1, 0.95)
    top_h = ms * (sauce_rel + ch)
    return D.astype(np.float32), col.astype(np.float32), rough.astype(np.float32), top_h, ch * ms


# =============================================================================== maillages
def sweep_grid(n_a, n_b, thetas):
    """Grille (profil x angle) de la surface balayée : positions déplacées (monde Y-up) et données."""
    r, y, nr, ny, s_a, s_b, lens = sample_profile(n_a, n_b)
    Ns, Nt = len(r), len(thetas)
    th = np.repeat(thetas[None, :], Ns, axis=0).ravel()
    R = np.repeat(r, Nt)
    Y = np.repeat(y, Nt)
    NR = np.repeat(nr, Nt)
    NY = np.repeat(ny, Nt)
    c, s = np.cos(th), np.sin(th)
    P0 = np.stack([R * c, Y, R * s], 1).astype(np.float32)
    N0 = np.stack([NR * c, NY, NR * s], 1).astype(np.float32)
    D, col, rough, _, _ = surface_fields(P0, R, Y, NR, NY)
    P = P0 + N0 * D[:, None]
    return dict(P=P, N=N0, col=col, rough=rough, r=r, y=y, s_a=s_a, s_b=s_b, lens=lens, Ns=Ns, Nt=Nt,
                thetas=thetas)


def orient_faces(P, faces, N):
    """Remet chaque face dans le sens de la normale attendue N (par sommet, ou (3,) constante), Y-up.
    Sans ça, la cuisson des normales (tangent space) sort retournée : surface noire au rendu."""
    f = np.asarray(faces, np.int64)
    a, b, c = P[f[:, 0]], P[f[:, 1]], P[f[:, 2]]
    fn = np.cross(b - a, c - a)
    ref = N[f[:, 0]] if np.ndim(N) == 2 else np.broadcast_to(N, fn.shape)
    flip = (fn * ref).sum(1) < 0
    f[flip] = f[flip][:, ::-1]
    print(f'  orientation : {int(flip.sum())} / {len(f)} faces retournées')
    return f


def mesh_from_arrays(name, verts_yup, faces, coll, smooth_shading=True):
    """Maillage rapide (foreach_set) ; faces : (F, 3) ou (F, 4) d'indices."""
    v = np.asarray(verts_yup, np.float32)
    vb = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)                # Y-up -> Blender Z-up
    f = np.asarray(faces, np.int64)
    k = f.shape[1]
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(vb))
    me.vertices.foreach_set('co', vb.ravel())
    me.loops.add(f.size)
    me.loops.foreach_set('vertex_index', f.ravel().astype(np.int32))
    me.polygons.add(len(f))
    me.polygons.foreach_set('loop_start', (np.arange(len(f)) * k).astype(np.int32))
    me.update(calc_edges=True)
    me.validate()
    if smooth_shading:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def grid_faces(Ns, Nt, closed_s=True):
    i = np.arange(Ns if closed_s else Ns - 1)
    j = np.arange(Nt - 1)
    I, J = np.meshgrid(i, j, indexing='ij')
    I, J = I.ravel(), J.ravel()
    i1 = (I + 1) % Ns
    # sens : normale extérieure (vérifiée par recalc ensuite)
    return np.stack([I * Nt + J, I * Nt + J + 1, i1 * Nt + J + 1, i1 * Nt + J], 1)


def set_point_colors(ob, col_srgb, rough):
    me = ob.data
    lin_c = srgb_to_lin(col_srgb)
    rgba = np.concatenate([lin_c, np.ones((len(lin_c), 1), np.float32)], 1)
    ca = me.color_attributes.new('col', 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set('color', rgba.ravel())
    ra = me.attributes.new('rough', 'FLOAT', 'POINT')
    ra.data.foreach_set('value', rough.astype(np.float32))


def boundary_of(grid, j):
    """Contour (r, y) d'une coupe : colonne j de la grille (dans le plan de coupe)."""
    P = grid['P'].reshape(grid['Ns'], grid['Nt'], 3)[:, j]
    th = grid['thetas'][j]
    rr = P[:, 0] * math.cos(th) + P[:, 2] * math.sin(th)
    return np.stack([rr, P[:, 1]], 1)


def cap_columns(poly, step):
    """Intervalle vertical [bas, haut] du contour à chaque abscisse r (le contour est y-monotone en r)."""
    r0, r1 = poly[:, 0].min() + 1e-4, poly[:, 0].max() - 1e-4
    rs = np.arange(r0, r1, step)
    lo, hi = np.full(len(rs), np.inf), np.full(len(rs), -np.inf)
    a, b = poly, np.roll(poly, -1, axis=0)
    for k in range(len(rs)):
        x = rs[k]
        m = (a[:, 0] - x) * (b[:, 0] - x) <= 0
        m &= a[:, 0] != b[:, 0]
        t = (x - a[m, 0]) / (b[m, 0] - a[m, 0])
        yy = a[m, 1] + t * (b[m, 1] - a[m, 1])
        if len(yy):
            lo[k], hi[k] = yy.min(), yy.max()
    ok = np.isfinite(lo) & (hi - lo > 1e-4)
    return rs[ok], lo[ok], hi[ok]


def cap_fields(theta, rr, yy, top_y, bot_y, poly):
    """Coupe de la pâte : mozzarella, sauce, mie dense (centre) ou alvéolée (cornicione), peau dorée."""
    n = len(rr)
    P = np.stack([rr * math.cos(theta), yy, rr * math.sin(theta)], 1).astype(np.float32)
    # épaisseur de mozzarella au bord supérieur de la coupe
    Ptop = np.stack([rr * math.cos(theta), top_y, rr * math.sin(theta)], 1).astype(np.float32)
    _, ch, _ = cheese_layer(Ptop)
    depth = top_y - yy
    inner = 1 - smooth(1.2, 1.27, rr)
    # distance au contour (peau)
    dmin = np.full(n, np.inf, np.float32)
    chunk = 4000
    for s0 in range(0, n, chunk):
        q = np.stack([rr[s0:s0 + chunk], yy[s0:s0 + chunk]], 1)[:, None, :]
        d = np.sqrt(((q - poly[None, :, :]) ** 2).sum(-1)).min(1)
        dmin[s0:s0 + chunk] = d
    # mie : alvéoles (grandes dans le cornicione, petites au centre)
    q2 = np.stack([rr / 1.35, np.zeros(n), yy], 1).astype(np.float32)   # spots(dims=2) : plan (x, z)
    h_core, h_halo, h_dome, _ = spots(q2, 0.02, 81, lambda u: 0.0035 + 0.007 * u, 0.55 * (1 - inner) + 0.15,
                                      halo=1.5, dims=2)
    h2, _, _, _ = spots(q2, 0.008, 83, lambda u: 0.0013 + 0.0018 * u, 0.4, halo=1.4, dims=2)
    hole = np.maximum(h_core, h2 * 0.8)
    crumb = mix(np.broadcast_to(CRUMB, (n, 3)), CRUMB_HOLE, hole * 0.85)
    crumb = mix(crumb, CRUST_PALE, np.clip(0.25 + 0.2 * fbm(P, 20, 2, seed=84), 0, 1))
    skin = 1 - smooth(0.0025, 0.0065, dmin)
    # couleur de la peau = croûte voisine (dorée), cuite plus foncée en haut du cornicione
    skin_col = mix(np.broadcast_to(CRUST_GOLD, (n, 3)), CRUST_BROWN, smooth(0.12, 0.26, yy) * 0.7)
    col = mix(crumb, skin_col, skin)
    # couches du centre
    sauce_t = 0.0038
    is_cheese = (depth < ch) & (inner > 0.5)
    is_sauce = (depth >= ch) & (depth < ch + sauce_t) & (inner > 0.5)
    col = np.where(is_cheese[:, None], CHEESE_WARM * 0.98, col)
    col = np.where(is_sauce[:, None], SAUCE, col)
    bottom_skin = (yy - bot_y) < 0.0035
    col = np.where((bottom_skin & (inner > 0.5))[:, None], CRUST_BROWN, col)
    rough = np.where(is_cheese, 0.3, np.where(is_sauce, 0.4, 0.86 - 0.1 * skin)).astype(np.float32)
    recess = -0.0045 * h_dome * (1 - skin) * (~is_cheese) * (~is_sauce)
    return col.astype(np.float32), rough, recess.astype(np.float32)


def build_cap_hi(grid, j, theta, coll, name, rows=180, step=0.0012, side=None):
    """Coupe HD au plan θ = theta. side : +1 si la matière est du côté θ < theta (normale vers +θ), -1 sinon
    (par défaut : signe de theta, cas de la part centrée sur +x)."""
    poly = boundary_of(grid, j)
    rs, lo, hi = cap_columns(poly, step)
    t = np.linspace(0, 1, rows)
    RR = np.repeat(rs, rows)
    YY = (lo[:, None] + (hi - lo)[:, None] * t[None, :]).ravel()
    TOP = np.repeat(hi, rows)
    BOT = np.repeat(lo, rows)
    col, rough, recess = cap_fields(theta, RR, YY, TOP, BOT, poly)
    if side is None:
        side = 1 if theta > 0 else -1
    nrm = np.array((-math.sin(theta), 0, math.cos(theta)), np.float32) * side
    P = np.stack([RR * math.cos(theta), YY, RR * math.sin(theta)], 1).astype(np.float32)
    P += nrm[None, :] * recess[:, None]
    faces = orient_faces(P, grid_faces(len(rs), rows, closed_s=False), nrm)
    ob = mesh_from_arrays(name, P, faces, coll)
    set_point_colors(ob, col, rough)
    return ob


def low_slice(n_a, n_b, n_t, coll, name, uv_layout):
    """Part légère : grille balayée + deux coupes planes, UV en atlas (îlots A, B, coupes)."""
    thetas = np.linspace(-A, A, n_t)
    g = sweep_grid(n_a, n_b, thetas)
    Ns, Nt = g['Ns'], g['Nt']
    P = g['P']
    bm = bmesh.new()
    vs = [bm.verts.new((float(p[0]), float(p[1]), float(p[2]))) for p in P]
    bm.verts.ensure_lookup_table()
    uvl = bm.loops.layers.uv.new('UVMap')
    n_a_pts = int((g['s_a'] >= 0).sum())
    r, y = g['r'], g['y']
    lay = uv_layout
    ka, kb, kc = lay['ka'], lay['kb'], lay['kc']
    faces = grid_faces(Ns, Nt)
    for f in faces:
        i0 = f[0] // Nt
        island_a = i0 < n_a_pts - 1
        try:
            face = bm.faces.new([vs[k] for k in f])
        except ValueError:
            continue
        for loop, k in zip(face.loops, f):
            i, j = k // Nt, k % Nt
            th = thetas[j]
            if island_a:
                s = g['s_a'][i]
                u = lay['a0'][0] + s * ka
                v = lay['a0'][1] + r[i] * th * ka
            else:
                s = g['s_b'][i] if g['s_b'][i] >= 0 else g['lens'][1] + (0 if i < n_a_pts else 0)
                if i == 0:
                    s = g['lens'][1]
                u = lay['b0'][0] + s * kb
                v = lay['b0'][1] + r[i] * th * kb
            loop[uvl].uv = (u, v)
    # coupes : contour, rempli, UV planes (r, y)
    caps = []
    for j, key in ((0, 'c0'), (Nt - 1, 'c1')):
        ring = [vs[i * Nt + j] for i in range(Ns)]
        face = bm.faces.new(ring)
        caps.append(face)
        th = thetas[j]
        for loop in face.loops:
            p = loop.vert.co
            rr = p.x * math.cos(th) + p.z * math.sin(th)
            loop[uvl].uv = (lay[key][0] + rr * kc, lay[key][1] + p.y * kc)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.triangulate(bm, faces=caps, quad_method='BEAUTY', ngon_method='BEAUTY')
    ob = bm_obj(bm, name, [], coll, sharp=None)
    me = ob.data
    # arête vive entre coupe et surface balayée
    me.set_sharp_from_angle(angle=math.radians(50))
    return ob, g


def uv_layout_slice():
    """Atlas de la part (2048²) : îlot A (dessus + cornicione, densité k), îlot B (dessous, 0.55 k),
    coupes (0.8 k). Vérifie que tout tient dans [0, 1]."""
    k = 1 / 2.42
    _, _, _, _, s_a, s_b, lens = sample_profile(200, 60)
    la, lb = lens
    half = 1.64 * A
    lay = {'ka': k, 'kb': 0.55 * k, 'kc': 0.8 * k}
    lay['a0'] = (0.012, 0.988 - half * k)
    lay['b0'] = (0.012, 0.012 + half * 0.55 * k)
    lay['c0'] = (0.012 + lb * 0.55 * k + 0.02, 0.27)
    lay['c1'] = (0.012 + lb * 0.55 * k + 0.02, 0.14)
    a_box = (lay['a0'][0], lay['a0'][1] - half * k, lay['a0'][0] + la * k, lay['a0'][1] + half * k)
    b_box = (lay['b0'][0], lay['b0'][1] - half * 0.55 * k, lay['b0'][0] + lb * 0.55 * k, lay['b0'][1] + half * 0.55 * k)
    c_w, c_h = 1.66 * lay['kc'], 0.29 * lay['kc']
    print(f'UV  A {tuple(round(v, 3) for v in a_box)}  B {tuple(round(v, 3) for v in b_box)}  '
          f'coupes {round(lay["c0"][0], 3)}..{round(lay["c0"][0] + c_w, 3)} h {round(c_h, 3)}  la {la:.3f} lb {lb:.3f}')
    assert a_box[2] < 1 and a_box[1] > b_box[3] and lay['c0'][0] + c_w < 1 and lay['c0'][1] + c_h < a_box[1]
    return lay


# =============================================================================== matériaux de cuisson
def attr_material(name):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = 'col'
    nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
    r = nt.nodes.new('ShaderNodeAttribute')
    r.attribute_name = 'rough'
    nt.links.new(r.outputs['Fac'], p.inputs['Roughness'])
    return m


def new_image(name, size, non_color):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if non_color else 'sRGB'
    return img


def bake(low, highs, mat, images, extrusion=0.012, ray=0.03, samples=8):
    """Cuisson « selected to active » de couleur, rugosité et normales des highs vers low."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = extrusion
    sc.render.bake.max_ray_distance = ray
    sc.render.bake.margin = 12
    nt = mat.node_tree
    bpy.ops.object.select_all(action='DESELECT')
    for h in highs:
        h.hide_render = False
        h.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    for kind, img in images.items():
        node = next(n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image == img)
        nt.nodes.active = node
        if kind == 'color':
            bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                                cage_extrusion=extrusion, max_ray_distance=ray, margin=12)
        elif kind == 'rough':
            bpy.ops.object.bake(type='ROUGHNESS', use_selected_to_active=True, cage_extrusion=extrusion,
                                max_ray_distance=ray, margin=12)
        else:
            bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', use_selected_to_active=True,
                                cage_extrusion=extrusion, max_ray_distance=ray, margin=12)
        print('BAKE', low.name, kind)


def save_png(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()


def deliver(img, size):
    """Carte livrée à sa taille finale. L'export glTF relit le fichier de l'image : on l'écrit à part
    (<nom>-<taille>.png), le cache de cuisson (pleine taille) reste intact pour --quick."""
    if img.size[0] != size:
        img.scale(size, size)
    save_png(img, os.path.join(BAKE_DIR, f'{img.name}-{size}.png'))


# =============================================================================== basilic
def basil_texture(size=512):
    """Feuille de basilic frais (UV : u en travers, v le long de la nervure), couleur + normales."""
    u = (np.arange(size) + 0.5) / size
    U, V = np.meshgrid(u, u)
    w = U * 2 - 1                                                  # -1..1 en travers
    t = V                                                          # 0 (pétiole) -> 1 (pointe)
    P = np.stack([U.ravel() * 3, V.ravel() * 3, np.zeros(U.size)], 1).astype(np.float32)
    n1 = fbm(P, 2.2, 3, seed=91).reshape(size, size)
    n2 = fbm(P, 9, 2, seed=92).reshape(size, size)
    # nervures secondaires : courbes qui partent de la nervure vers le bord, en remontant vers la pointe
    phase = (t * 7.5 - np.abs(w) ** 1.25 * 1.6) * math.pi
    sec = (np.cos(phase) ** 2) ** 22 * smooth(0.05, 0.25, np.abs(w)) * (1 - smooth(0.85, 1.0, np.abs(w)))
    mid = np.exp(-(w / 0.035) ** 2) * (1 - 0.7 * t)
    h = -0.6 * mid - 0.35 * sec + 0.12 * n2 + 0.25 * np.cos(phase) ** 2 * 0.3
    base = np.array((0.085, 0.28, 0.06), np.float32)
    light = np.array((0.19, 0.45, 0.11), np.float32)
    col = base[None, None] * (1 - (0.35 + 0.3 * n1)[..., None]) + light[None, None] * (0.35 + 0.3 * n1)[..., None]
    col = col * (1 - 0.25 * mid[..., None]) + np.array((0.45, 0.66, 0.30)) * 0.25 * mid[..., None]
    col = col * (1 - 0.12 * sec[..., None]) + np.array((0.30, 0.55, 0.18)) * 0.12 * sec[..., None]
    edge = smooth(0.82, 1.0, np.abs(w))
    col = col * (1 - 0.3 * edge[..., None]) + np.array((0.07, 0.2, 0.05)) * 0.3 * edge[..., None]
    gy, gx = np.gradient(h)
    k = 9.0
    nrm = np.stack([-gx * k, -gy * k, np.ones_like(h)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    return np.clip(col, 0, 1).astype(np.float32), (nrm * 0.5 + 0.5).astype(np.float32)


def np_image(name, arr, non_color):
    hgt, wid = arr.shape[:2]
    img = bpy.data.images.new(name, wid, hgt, alpha=False)
    img.colorspace_settings.name = 'Non-Color' if non_color else 'sRGB'
    a = np.concatenate([arr, np.ones((hgt, wid, 1), np.float32)], -1)
    if not non_color:
        a[..., :3] = a[..., :3]        # octets sRGB : Blender stocke les pixels tels quels pour un octet sRGB
    img.pixels.foreach_set(a.ravel())
    return img


def leaf_mesh(L, Wmax, cup, droop, n_t=22, n_w=11, seed=0):
    """Feuille (repère local : x le long de la nervure, y vers le haut, z en travers), UV (u travers, v long)."""
    rng = np.random.RandomState(seed)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    ts = np.linspace(0, 1, n_t)
    ws = np.linspace(-1, 1, n_w)
    grid = []
    for t in ts:
        half = Wmax * (t ** 0.55) * ((1 - t) ** 0.85) / (0.39 ** 0.55 * 0.61 ** 0.85)
        half = max(half, 0.004)
        row = []
        for w in ws:
            z = w * half
            x = t * L
            yy = cup * (abs(z) / Wmax) ** 1.6 * Wmax - droop * t * t * L + 0.004 * math.sin(9 * t + 3 * w + seed) * abs(w)
            yy += 0.003 * rng.uniform(-1, 1) * abs(w)
            row.append(bm.verts.new((x, yy, z)))
        grid.append(row)
    for a in range(n_t - 1):
        for b in range(n_w - 1):
            f = bm.faces.new([grid[a][b], grid[a][b + 1], grid[a + 1][b + 1], grid[a + 1][b]])
            for loop, (aa, bb) in zip(f.loops, ((a, b), (a, b + 1), (a + 1, b + 1), (a + 1, b))):
                loop[uvl].uv = ((ws[bb] + 1) / 2, ts[aa])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:                          # face supérieure vers +y
        if f.normal.y < 0:
            f.normal_flip()
    return bm


def top_height_fn():
    """Hauteur du dessus nappé (base du profil + sauce/mozzarella) en (x, z), pour poser les garnitures."""
    top = DENSE[DIDX[12]:DIDX[17] + 1]
    top = top[np.argsort(top[:, 0])]

    def f(x, z):
        x = np.atleast_1d(np.asarray(x, np.float32))
        z = np.atleast_1d(np.asarray(z, np.float32))
        r = np.sqrt(x * x + z * z)
        yb = np.interp(r, top[:, 0], top[:, 1]).astype(np.float32)
        P0 = np.stack([x, yb, z], 1).astype(np.float32)
        n = len(x)
        D, _, _, _, _ = surface_fields(P0, r, yb, np.zeros(n, np.float32), np.ones(n, np.float32))
        return yb + D
    return f


# =============================================================================== construction
def build_slice(coll, quick):
    lay = uv_layout_slice()
    low, g_low = low_slice(150, 26, 57, coll, 'Pizza_Slice', lay)
    print('  part légère', len(low.data.polygons), 'faces')
    paths = {k: os.path.join(BAKE_DIR, f'slice-{k}.png') for k in ('color', 'rough', 'normal')}
    have = all(os.path.exists(p) for p in paths.values())
    mat = None
    if quick and have:
        imgs = {k: load_image(p, k != 'color', name=f'slice-{k}') for k, p in paths.items()}
    else:
        imgs = {'color': new_image('slice-color', 2048, False), 'rough': new_image('slice-rough', 1024, True),
                'normal': new_image('slice-normal', 2048, True)}
    mat = pbr('PizzaSlice', color_map=imgs['color'], rough_map=imgs['rough'], normal_map=imgs['normal'])
    mat.use_backface_culling = True               # volume fermé : glTF doubleSided false
    low.data.materials.append(mat)
    if not (quick and have):
        H = new_coll('bake_hi')
        g = sweep_grid(1250, 220, np.linspace(-A - 0.0, A + 0.0, 451))
        hi = mesh_from_arrays('slice_hi', g['P'], orient_faces(g['P'], grid_faces(g['Ns'], g['Nt']), g['N']), H)
        set_point_colors(hi, g['col'], g['rough'])
        caps = [build_cap_hi(g, 0, -A, H, 'cap_hi0'), build_cap_hi(g, g['Nt'] - 1, A, H, 'cap_hi1')]
        am = attr_material('bake_attr')
        for o in [hi] + caps:
            o.data.materials.append(am)
        print('  part HD', len(hi.data.vertices), 'sommets')
        bake(low, [hi] + caps, mat, imgs)
        for k, img in imgs.items():
            save_png(img, paths[k])
        for o in list(H.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(H)
    # Cuites en 2048 (anticrénelage), livrées en TEX (budget du GLB)
    for k, img in imgs.items():
        deliver(img, TEX if k != 'rough' else TEX // 2)
    return low


def basil_material():
    col, nrm = basil_texture()
    path_c, path_n = os.path.join(BAKE_DIR, 'basil-color.png'), os.path.join(BAKE_DIR, 'basil-normal.png')
    ic = np_image('basil-color', col, False)
    inn = np_image('basil-normal', nrm, True)
    save_png(ic, path_c)
    save_png(inn, path_n)
    m = pbr('PizzaBasil', color_map=ic, normal_map=inn, rough=0.38, normal=0.8, sheen=('#9be07a', 0.4))
    m.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value = 0.15
    return m


def build_basil(coll, top_h, leaves, m=None):
    m = m or basil_material()
    out = []
    for k, (name, x, z, yaw, L, Wm, cup, droop, roll) in enumerate(leaves):
        bm = leaf_mesh(L, Wm, cup, droop, seed=k + 3)
        # centre de la feuille à l'origine locale
        for v in bm.verts:
            v.co.x -= L * 0.45
        rot = Matrix.Rotation(yaw, 4, 'Y') @ Matrix.Rotation(roll, 4, 'X')
        bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
        # pose sur la surface : chaque sommet au-dessus du dessus nappé local
        xs = np.array([v.co.x + x for v in bm.verts], np.float32)
        zs = np.array([v.co.z + z for v in bm.verts], np.float32)
        hs = top_h(xs, zs)
        lift = max(float(np.max(hs - np.array([v.co.y for v in bm.verts]))), 0) + 0.0025
        base_y = float(np.max(hs[np.abs(np.array([v.co.z for v in bm.verts])) < 0.02])) if len(hs) else 0
        for v, h in zip(bm.verts, hs):
            # la feuille épouse le dessus (gravité), tout en gardant sa forme creusée
            v.co.y = max(v.co.y + base_y, h + 0.0025) * 0.55 + (v.co.y + lift) * 0.45
        ob = bm_obj(bm, name, m, coll, sharp=None)
        ob.data.transform(Matrix.Translation(Vector((x, -z, 0))))
        out.append(ob)
    return out


def strand(bm, path, radii, ring=10, flat=None, twist=0.0):
    """Tube le long de `path` (n, 3) avec rayons (n,) ; flat (n,) : aplatissement (largeur / épaisseur),
    largeur portée par l'axe a (perpendiculaire à la tangente et à y), qui tourne de `twist` rad au total."""
    n = len(path)
    tang = np.gradient(path, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    ref = np.array((0, 1, 0), float)
    rows = []
    for i in range(n):
        t = tang[i]
        a = np.cross(t, ref)
        if np.linalg.norm(a) < 1e-3:
            a = np.cross(t, (1, 0, 0))
        a /= np.linalg.norm(a)
        b = np.cross(t, a)
        tw = twist * i / max(n - 1, 1)
        a, b = a * math.cos(tw) + b * math.sin(tw), b * math.cos(tw) - a * math.sin(tw)
        f = 1.0 if flat is None else flat[i]
        row = []
        for k in range(ring):
            ang = 2 * math.pi * k / ring
            p = path[i] + radii[i] * (math.cos(ang) * a * f ** 0.5 + math.sin(ang) * b / max(f, 1e-3) ** 0.5)
            row.append(bm.verts.new(p.tolist()))
        rows.append(row)
    for i in range(n - 1):
        for k in range(ring):
            bm.faces.new([rows[i][k], rows[i][(k + 1) % ring], rows[i + 1][(k + 1) % ring], rows[i + 1][k]])
    # bouts fermés
    for row in (rows[0], rows[-1]):
        c = bm.verts.new(tuple(np.mean([v.co for v in row], 0)))
        for k in range(ring):
            try:
                bm.faces.new([row[k], row[(k + 1) % ring], c])
            except ValueError:
                pass


def cheese_material():
    # Légère émission : la lumière qui traverse la mozzarella (pas de diffusion sous la surface en glTF)
    m = pbr('PizzaCheese', color='#f7efdf', rough=0.32, sss=0.25, sss_radius=(0.4, 0.3, 0.15),
            emit='#f4e4c6', strength=0.16)
    m.use_backface_culling = True
    return m


# Brins de mozzarella (site principal) : décalage le long de la coupe, longueur au repos, rayon du brin,
# renflement de la goutte du bout, dérive le long de la coupe, écart à la coupe au bout.
STRANDS = [
    (-0.10, 0.22, 0.019, 0.45, -0.02, 0.032),
    (-0.045, 0.34, 0.023, 0.25, 0.01, 0.042),
    (0.02, 0.27, 0.018, 0.35, 0.022, 0.036),
    (0.075, 0.14, 0.016, 0.5, 0.004, 0.028),
]
PULL_R = 0.98                     # milieu du bord de coupe +22.5° d'où pend la mozzarella (morceau n° 3)


def build_pull(coll, top_h):
    """Mozzarella qui pend du bord de coupe +22.5° : un objet par brin (Pizza_CheeseStrand<k>), origine au
    point d'accroche sur le dessus de la coupe. Chaque brin part en ruban plat posé sur le fromage, passe
    l'arête, pend vers -y en s'affinant (étranglements) et finit en goutte. Le code l'étire en y autour de
    son origine (et l'affine en x/z) pour suivre le scroll."""
    rng = np.random.RandomState(3)
    th = A
    nrm = np.array((-math.sin(th), 0, math.cos(th)))
    along = np.array((math.cos(th), 0, math.sin(th)))
    mat = cheese_material()
    out = []
    for k, (off, L, rad, bulge, drift, gap) in enumerate(STRANDS):
        r = PULL_R + off
        edge = along * r
        y_top = float(top_h(np.array([edge[0]]), np.array([edge[2]]))[0])
        origin = edge + np.array((0, y_top, 0))
        start = origin - nrm * 0.014 + np.array((0, -0.005, 0))         # sous la mozzarella, au bord
        c1 = origin + nrm * 0.03 + np.array((0, 0.006, 0))
        end = origin + nrm * gap + along * drift + np.array((0, -L, 0))
        c2 = end + np.array((0, L * 0.7, 0)) - along * drift * 0.5
        ts = np.linspace(0, 1, 64)
        T = ts[:, None]
        path = ((1 - T) ** 3) * start + 3 * ((1 - T) ** 2) * T * c1 + 3 * (1 - T) * T * T * c2 + T ** 3 * end
        path += np.sin(ts * 6 + k * 1.7)[:, None] * 0.004 * smooth(0.2, 0.6, ts)[:, None] * along
        neck = 0.75 + 0.25 * np.sin(ts * (9 + 2 * k) + k) ** 2               # étranglements
        base = rad * (1 + 0.7 * (1 - smooth(0.0, 0.3, ts))) * neck
        base = base * (1 - 0.4 * smooth(0.45, 0.8, ts)) * (1 + bulge * smooth(0.78, 0.95, ts))
        u = np.clip((ts - 0.93) / 0.07, 0, 1)                                 # bout arrondi
        radii = base * np.sqrt(np.clip(1 - u * u, 0, 1)) + 0.0006
        flat = 1.7 + 1.6 * (1 - smooth(0.05, 0.4, ts))                        # ruban, plus plat à l'arête
        bm = bmesh.new()
        strand(bm, path, radii, ring=10, flat=flat, twist=rng.uniform(-0.6, 0.6))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        ob = bm_obj(bm, f'Pizza_CheeseStrand{k}', mat, coll, sharp=None)
        o = W(*origin)
        ob.data.transform(Matrix.Translation(-o))
        ob.location = o
        out.append(ob)
        print(f'BRIN {k} accroche (Y-up) {tuple(round(float(v), 3) for v in origin)}  longueur {L}')
    return out


def import_browser(coll):
    """Navigateur Pizza_Browser_* repris tel quel de portfolio_models.blend (collection 'pizza', offset)."""
    names = ['Pizza_Browser_Root', 'Pizza_BrowserFrame', 'Pizza_BrowserBar', 'Pizza_Site', 'Pizza_Dot0',
             'Pizza_Dot1', 'Pizza_Dot2']
    with bpy.data.libraries.load(PORTFOLIO_BLEND, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in names]
    objs = [o for o in dst.objects if o is not None]
    for o in objs:
        coll.objects.link(o)
    root = next(o for o in objs if o.name == 'Pizza_Browser_Root')
    root.location.x -= 30.0                      # offset de la collection 'pizza' dans portfolio_models.blend
    return objs


# =============================================================================== diorama (page d'atterrissage)
# Pizza entière moins une part, posée sur une planche d'olivier ; la part (même maillage et mêmes cartes
# que le site principal) est soulevée par la croûte, fléchit vers la pointe (pâte napolitaine souple) et la
# mozzarella file entre ses coupes et celles de la pizza. Repère de construction : centre de la pizza à
# l'origine, dessous de la pizza à y = 0, part soulevée vers +x ; tout est ensuite tourné de LANDING_YAW
# autour de y (vue de départ de la visionneuse, src/scene/landing/views.ts : yaw 0, caméra en +z).
REST_CHUNKS = 7
BOARD_R = 1.9
BOARD_TOP = -0.004                # sous la sole (pas de z-fighting avec le dessous de la pizza)
BOARD_H = 0.085
LIFT = {'droop': 0.16, 'hold': 1.3, 'tilt': 0.2, 'move': (0.46, 0.36, 0.0)}
LANDING_YAW = math.radians(-35)
LANDING_VIEW = {'yaw': 0.0, 'size': 4.6, 'eye': (0.0, 2.8, 6.6), 'target': (0.0, -0.1, 0.0), 'fov': 30.0}
# Feuilles sur le reste de la pizza : (r, θ en degrés, lacet en degrés, longueur, largeur, creux, retombée)
REST_LEAVES = [(0.62, 70, 30, 0.36, 0.1, 0.36, 0.05), (0.98, 115, -50, 0.3, 0.085, 0.4, 0.04),
               (0.42, 160, 100, 0.27, 0.08, 0.42, 0.05), (0.92, 205, 10, 0.34, 0.095, 0.36, 0.05),
               (0.62, 252, -70, 0.32, 0.09, 0.4, 0.05), (0.98, 292, 60, 0.28, 0.08, 0.38, 0.04)]


def lift_points(P):
    """Part soulevée : la pointe fléchit (part tenue par la croûte), bascule autour de z, translation."""
    P = np.array(P, np.float32, copy=True)
    t = np.clip((LIFT['hold'] - P[:, 0]) / LIFT['hold'], 0, 1)
    P[:, 1] -= LIFT['droop'] * t * t
    c, s = math.cos(LIFT['tilt']), math.sin(LIFT['tilt'])
    x, y = P[:, 0].copy(), P[:, 1].copy()
    P[:, 0] = c * x - s * y
    P[:, 1] = s * x + c * y
    return P + np.array(LIFT['move'], np.float32)


def yaw_points(P, a=LANDING_YAW):
    """Rotation autour de y qui fait croître θ (x vers z) de a."""
    P = np.array(P, np.float32, copy=True)
    x, z = P[:, 0].copy(), P[:, 2].copy()
    P[:, 0] = x * math.cos(a) - z * math.sin(a)
    P[:, 2] = x * math.sin(a) + z * math.cos(a)
    return P


def mesh_apply(ob, fn):
    """Applique fn (points monde Y-up -> Y-up) aux sommets d'un maillage sans transformation d'objet."""
    me = ob.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    Q = fn(np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1))
    me.vertices.foreach_set('co', np.stack([Q[:, 0], -Q[:, 2], Q[:, 1]], 1).astype(np.float32).ravel())
    me.update()


def pack(rects, margin=0.006):
    """Rangement en étagères (hauteurs décroissantes) de rectangles (w, h) en unités : plus grande échelle k
    (UV par unité) pour que tout tienne dans [0, 1]², et coin bas-gauche de chaque rectangle."""
    order = sorted(range(len(rects)), key=lambda i: -rects[i][1])

    def place(k):
        x = y = margin
        shelf = 0.0
        pos = [None] * len(rects)
        for i in order:
            w, h = rects[i][0] * k, rects[i][1] * k
            if x + w + margin > 1:
                x, y, shelf = margin, y + shelf + margin, 0.0
            pos[i] = (x, y)
            x += w + margin
            shelf = max(shelf, h)
        return y + shelf + margin <= 1, pos

    lo, hi = 0.01, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if place(mid)[0] else (lo, mid)
    return lo, place(lo)[1]


def low_rest(n_a, n_b, per, coll, name):
    """Reste de la pizza (θ de A à 2π - A) : un seul balayage ; sept îlots A (dessus) et B (dessous) de 45°
    chacun et les deux coupes exposées, rangés dans un atlas (pack)."""
    nck = REST_CHUNKS
    thetas = np.linspace(A, 2 * math.pi - A, nck * (per - 1) + 1)
    g = sweep_grid(n_a, n_b, thetas)
    Ns, Nt = g['Ns'], g['Nt']
    la, lb = g['lens']
    hgt = 3.4 * A                                   # v = r θ local, |θ| ≤ A, r ≤ 1.7
    kb, kc = 0.55, 0.8
    rects = [(la, hgt)] * nck + [(lb * kb, hgt * kb)] * nck + [(1.7 * kc, 0.34 * kc)] * 2
    k, pos = pack(rects)
    print(f'  atlas du reste : {k:.4f} UV par unité')
    r = g['r']
    # Méplat de la pointe (r ≈ R_TIP) ramené sur l'axe : sinon un puits de 2 R_TIP reste au centre
    P = g['P'].reshape(Ns, Nt, 3).copy()
    tip = r <= R_TIP * 1.5                          # les deux échantillons du méplat (r ≈ 0.013, 0.016)
    P[tip, :, 0] = 0.0
    P[tip, :, 2] = 0.0
    P = P.reshape(-1, 3)
    bm = bmesh.new()
    vs = [bm.verts.new((float(p[0]), float(p[1]), float(p[2]))) for p in P]
    bm.verts.ensure_lookup_table()
    uvl = bm.loops.layers.uv.new('UVMap')
    n_a_pts = int((g['s_a'] >= 0).sum())
    for f in grid_faces(Ns, Nt):
        i0, j0 = f[0] // Nt, f[0] % Nt
        c = min(j0 // (per - 1), nck - 1)
        th_c = A + (2 * c + 1) * A
        island_a = i0 < n_a_pts - 1
        try:
            face = bm.faces.new([vs[q] for q in f])
        except ValueError:
            continue
        for loop, q in zip(face.loops, f):
            i, j = q // Nt, q % Nt
            tl = thetas[j] - th_c
            if island_a:
                ox, oy = pos[c]
                u, v = ox + g['s_a'][i] * k, oy + (r[i] * tl + hgt / 2) * k
            else:
                ox, oy = pos[nck + c]
                sb = g['s_b'][i] if g['s_b'][i] >= 0 else lb
                if i == 0:
                    sb = lb
                u, v = ox + sb * k * kb, oy + (r[i] * tl + hgt / 2) * k * kb
            loop[uvl].uv = (u, v)
    caps = []
    for j, slot in ((0, 2 * nck), (Nt - 1, 2 * nck + 1)):
        face = bm.faces.new([vs[i * Nt + j] for i in range(Ns)])
        caps.append(face)
        th = thetas[j]
        ox, oy = pos[slot]
        for loop in face.loops:
            p = loop.vert.co
            rr = p.x * math.cos(th) + p.z * math.sin(th)
            loop[uvl].uv = (ox + rr * k * kc, oy + p.y * k * kc)
    bmesh.ops.triangulate(bm, faces=caps, quad_method='BEAUTY', ngon_method='BEAUTY')
    axis = [v for v in bm.verts if abs(v.co.x) < 1e-7 and abs(v.co.z) < 1e-7]
    bmesh.ops.remove_doubles(bm, verts=axis, dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    print(f'  pointe soudée sur l’axe : {len(axis)} sommets')
    ob = bm_obj(bm, name, [], coll, sharp=None)
    ob.data.set_sharp_from_angle(angle=math.radians(50))
    return ob


def build_rest(coll, quick):
    low = low_rest(110, 18, 37, coll, 'Pizza_Rest')
    print('  reste léger', len(low.data.polygons), 'faces')
    paths = {k: os.path.join(BAKE_DIR, f'rest-{k}.png') for k in ('color', 'rough', 'normal')}
    have = all(os.path.exists(p) for p in paths.values())
    if quick and have:
        imgs = {k: load_image(p, k != 'color', name=f'rest-{k}') for k, p in paths.items()}
    else:
        imgs = {'color': new_image('rest-color', 2048, False), 'rough': new_image('rest-rough', 1024, True),
                'normal': new_image('rest-normal', 2048, True)}
    mat = pbr('PizzaRest', color_map=imgs['color'], rough_map=imgs['rough'], normal_map=imgs['normal'])
    mat.use_backface_culling = True
    low.data.materials.append(mat)
    if not (quick and have):
        H = new_coll('bake_hi_rest')
        g = sweep_grid(560, 100, np.linspace(A, 2 * math.pi - A, REST_CHUNKS * 160 + 1))
        hi = mesh_from_arrays('rest_hi', g['P'], orient_faces(g['P'], grid_faces(g['Ns'], g['Nt']), g['N']), H)
        set_point_colors(hi, g['col'], g['rough'])
        caps = [build_cap_hi(g, 0, A, H, 'rest_cap0', rows=120, step=0.0018, side=-1),
                build_cap_hi(g, g['Nt'] - 1, 2 * math.pi - A, H, 'rest_cap1', rows=120, step=0.0018, side=1)]
        am = attr_material('bake_attr_rest')
        for o in [hi] + caps:
            o.data.materials.append(am)
        print('  reste HD', len(hi.data.vertices), 'sommets')
        bake(low, [hi] + caps, mat, imgs, extrusion=0.02, ray=0.05)
        for k, img in imgs.items():
            save_png(img, paths[k])
        for o in list(H.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(H)
    for k, img in imgs.items():
        deliver(img, {'color': 2048, 'normal': 1024, 'rough': 512}[k])
    return low


def board_textures(size=1024):
    """Planche d'olivier huilée vue de dessus (UV uniques sur le disque, [-R, R]² -> [0, 1]²) : placage Poly
    Haven réchauffé, farine et semoule autour de la pizza, bord usé ; normales tirées du fil du bois."""
    img = bpy.data.images.load(ph_map('olive_veneer', 'Diffuse', '1k'), check_existing=True)
    if tuple(img.size) != (size, size):
        img.scale(size, size)
    px = np.empty(size * size * 4, np.float32)
    img.pixels.foreach_get(px)                      # octets sRGB tels quels (image 8 bits)
    wood = px.reshape(size, size, 4)[..., :3].copy()
    bpy.data.images.remove(img)
    lum = wood.mean(-1, keepdims=True)
    wood = np.clip(lum.mean() + (wood - lum.mean()) * 1.6, 0, 1)            # fil plus contrasté
    wood = wood ** 1.12 * np.array((1.0, 0.9, 0.72), np.float32)             # huilé, ton miel clair
    u = (np.arange(size) + 0.5) / size
    U, V = np.meshgrid(u, u)
    X, Z = (U * 2 - 1) * BOARD_R, (V * 2 - 1) * BOARD_R
    P = np.stack([X.ravel(), np.zeros(X.size), Z.ravel()], 1).astype(np.float32)
    R = np.sqrt(X * X + Z * Z)
    tone = fbm(P, 0.8, 2, seed=101).reshape(size, size)
    wood = wood * (0.92 + 0.08 * tone[..., None])
    rim = smooth(BOARD_R - 0.12, BOARD_R, R)
    wood = wood * (1 - 0.18 * rim[..., None])
    # farine en voile autour de la pizza, semoule en grains, quelques grains brûlés
    ring = smooth(1.58, 1.7, R) * (1 - smooth(1.78, 1.88, R))
    veil = smooth(0.0, 0.6, fbm(P, 3.0, 3, seed=102).reshape(size, size)) * ring
    sem, _, _, _ = spots(P, 0.02, 103, lambda q: 0.0025 + 0.003 * q, 0.5 * ring.ravel(), halo=1.3, dims=2)
    burnt, _, _, _ = spots(P, 0.05, 104, lambda q: 0.002 + 0.003 * q, 0.25 * ring.ravel(), halo=1.2, dims=2)
    sem, burnt = sem.reshape(size, size), burnt.reshape(size, size)
    col = wood * (1 - 0.55 * veil[..., None]) + np.array((0.93, 0.9, 0.84)) * 0.55 * veil[..., None]
    col = col * (1 - 0.8 * sem[..., None]) + np.array((0.93, 0.82, 0.55)) * 0.8 * sem[..., None]
    col = col * (1 - 0.9 * burnt[..., None]) + np.array((0.2, 0.12, 0.07)) * 0.9 * burnt[..., None]
    h = wood.mean(-1) * 0.6 + 0.4 * sem
    gy, gx = np.gradient(h)
    nrm = np.stack([-gx * 6, -gy * 6, np.ones_like(h)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    return np.clip(col, 0, 1).astype(np.float32), (nrm * 0.5 + 0.5).astype(np.float32)


def build_board(coll):
    """Planche ronde (tour), bord arrondi, UV planes (x, z) sur tout le disque."""
    col, nrm = board_textures()
    n2 = nrm.reshape(512, 2, 512, 2, 3).mean((1, 3)) * 2 - 1     # fil du bois discret : 512 suffit
    n2 = n2 / np.linalg.norm(n2, axis=-1, keepdims=True) * 0.5 + 0.5
    ic = np_image('board-color', col, False)
    inn = np_image('board-normal', n2.astype(np.float32), True)
    save_png(ic, os.path.join(BAKE_DIR, 'board-color.png'))
    save_png(inn, os.path.join(BAKE_DIR, 'board-normal.png'))
    m = pbr('PizzaBoard', color_map=ic, normal_map=inn, rough=0.52, normal=0.5)
    m.use_backface_culling = True
    top, bot, rb = BOARD_TOP, BOARD_TOP - BOARD_H, 0.03
    prof = [(0.0, top)]
    prof += [(BOARD_R - rb + rb * math.sin(a), top - rb + rb * math.cos(a))
             for a in np.linspace(0, math.pi / 2, 7)]
    prof += [(BOARD_R, bot + 0.015), (BOARD_R - 0.015, bot), (0.0, bot)]
    seg = 160
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    rings = []
    for (r, y) in prof:
        if r == 0:
            rings.append([bm.verts.new((0.0, y, 0.0))])
            continue
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / seg), y, r * math.sin(2 * math.pi * k / seg)))
                      for k in range(seg)])
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(seg):
            if len(a) == 1:
                vs = [a[0], b[(k + 1) % seg], b[k]]
            elif len(b) == 1:
                vs = [a[k], a[(k + 1) % seg], b[0]]
            else:
                vs = [a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]]
            f = bm.faces.new(vs)
            for loop in f.loops:
                p = loop.vert.co
                loop[uvl].uv = (p.x / (2 * BOARD_R) + 0.5, p.z / (2 * BOARD_R) + 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm_obj(bm, 'Pizza_Board', m, coll, sharp=40)


def cut_cheese(theta, n=240):
    """Rayons où la coupe θ traverse une flaque de mozzarella (M > 0.06), espacés d'au moins 0.045."""
    rs = np.linspace(0.16, 1.16, n)
    P = np.stack([rs * math.cos(theta), np.zeros(n), rs * math.sin(theta)], 1).astype(np.float32)
    M, _, _ = cheese_layer(P)
    picks = []
    for i in np.argsort(-M):
        if M[i] < 0.06 or len(picks) >= 6:
            break
        if all(abs(rs[i] - q) > 0.045 for q in picks):
            picks.append(float(rs[i]))
    return sorted(picks)


def build_landing_pull(coll, top_h, mat):
    """Filaments tendus entre les coupes de la part soulevée et celles de la pizza (même point d'origine
    avant le soulèvement), plus deux gouttes qui pendent de la part."""
    rng = np.random.RandomState(21)
    bm = bmesh.new()
    count = 0
    for th, side in ((A, 1), (-A, -1)):
        nrm = np.array((-math.sin(th), 0, math.cos(th))) * side             # normale de la coupe de la part
        for q, r in enumerate(cut_cheese(th)):
            x, z = r * math.cos(th), r * math.sin(th)
            y = float(top_h(np.array([x]), np.array([z]))[0]) - 0.006
            p0 = np.array((x, y, z))
            S = lift_points((p0 - nrm * 0.012 - np.array((0, 0.004, 0)))[None])[0].astype(float)
            E = p0 + nrm * 0.02 - np.array((0, 0.008, 0))                    # bouts noyés dans la mozzarella
            L = float(np.linalg.norm(S - E))
            along = np.array((math.cos(th), 0, math.sin(th)))
            # Courbe de Bézier cubique : le fil quitte la part vers le bas, s'incurve dans l'écart, se pose
            C1 = S + np.array((0, -0.3 * L, 0)) + nrm * rng.uniform(0.02, 0.07) + along * rng.uniform(-0.04, 0.04)
            C2 = E + np.array((0, 0.25 * L, 0)) + nrm * rng.uniform(0.0, 0.05) + along * rng.uniform(-0.05, 0.05)
            ts = np.linspace(0, 1, 52)[:, None]
            path = (1 - ts) ** 3 * S + 3 * (1 - ts) ** 2 * ts * C1 + 3 * (1 - ts) * ts * ts * C2 + ts ** 3 * E
            t = ts[:, 0]
            ends = (1 - np.sin(math.pi * t)) ** 3
            sheet = rng.rand() < 0.35                                     # ruban large plutôt que fil
            re, rm = rng.uniform(0.018, 0.026), rng.uniform(0.006, 0.011) * (1.3 if sheet else 1)
            radii = (rm + (re - rm) * ends) * (0.78 + 0.22 * np.sin(t * (11 + q) + q) ** 2)
            flat = (1.4 + 1.0 * ends) * (1.8 if sheet else 1.0)
            strand(bm, path, radii, ring=8, flat=flat, twist=rng.uniform(-1.2, 1.2))
            count += 1
    # gouttes qui pendent de la coupe -A de la part
    for r, L in ((0.5, 0.1), (0.62, 0.16)):
        th = -A
        nrm = np.array((math.sin(A), 0, -math.cos(A)))
        x, z = r * math.cos(th), r * math.sin(th)
        y = float(top_h(np.array([x]), np.array([z]))[0]) - 0.004
        S = lift_points(np.array([(x, y, z)]) - nrm * 0.01)[0].astype(float)
        E = S + nrm * 0.03 + np.array((0, -L, 0))
        C = S + nrm * 0.035 + np.array((0, -0.01, 0))
        ts = np.linspace(0, 1, 30)[:, None]
        path = (1 - ts) ** 2 * S + 2 * (1 - ts) * ts * C + ts ** 2 * E
        t = ts[:, 0]
        radii = 0.012 * (1 - 0.35 * smooth(0.2, 0.7, t)) * (1 + 0.4 * smooth(0.75, 0.92, t))
        radii = radii * np.sqrt(np.clip(1 - np.clip((t - 0.9) / 0.1, 0, 1) ** 2, 0, 1)) + 0.0006
        strand(bm, path, radii, ring=8, flat=1.6 + 1.2 * (1 - smooth(0.0, 0.4, t)))
        count += 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    print(f'  filaments : {count}')
    return bm_obj(bm, 'Pizza_Pull', mat, coll, sharp=None)


def build_landing(slice_ob, top_h, quick, basil_mat, cheese_mat):
    L = new_coll('pizza_landing')
    board = build_board(L)
    rest = build_rest(L, quick)
    lifted = bpy.data.objects.new('Pizza_LiftedSlice', slice_ob.data.copy())
    L.objects.link(lifted)
    mesh_apply(lifted, lift_points)
    leaves = []
    for k, (r, th, yaw, ln, wm, cup, droop) in enumerate(REST_LEAVES):
        a = math.radians(th)
        leaves.append((f'Pizza_RestBasil{k}', r * math.cos(a), r * math.sin(a), math.radians(yaw), ln, wm, cup,
                       droop, 0.0))
    basil_rest = build_basil(L, top_h, leaves, basil_mat)
    basil_lift = build_basil(L, top_h, [(n.replace('Pizza_Basil', 'Pizza_LiftBasil'), *v) for n, *v in SLICE_LEAVES],
                             basil_mat)
    for o in basil_lift:
        mesh_apply(o, lift_points)
    pull = build_landing_pull(L, top_h, cheese_mat)
    objs = [board, rest, lifted] + basil_rest + basil_lift + [pull]
    for o in objs:
        mesh_apply(o, yaw_points)
    print('PIZZA (diorama)')
    report(objs)
    return objs


def studio_landing(coll, objs):
    """Éclairage de la visionneuse (src/scene/landing/Studio.tsx), comme model_landing_smartphone.py :
    Lightformers = plans émissifs invisibles à la caméra (environmentIntensity 0.85), deux soleils."""
    v = LANDING_VIEW
    lo, hi = bbox_yup(objs)
    w, h, d = (hi[0] - lo[0]), (hi[1] - lo[1]), (hi[2] - lo[2])
    s = v['size'] / max(h, math.hypot(w, d))
    c = [(lo[k] + hi[k]) / 2 for k in range(3)]

    def to_model(p, vec=False):
        x, y, z = p[0] / s, p[1] / s, p[2] / s
        cy, sy = math.cos(-v['yaw']), math.sin(-v['yaw'])
        o = (0, 0, 0) if vec else c
        return (o[0] + cy * x + sy * z, o[1] + y, o[2] - sy * x + cy * z)

    wd = bpy.data.worlds.new('World')
    bpy.context.scene.world = wd
    bgn = next(n for n in wd.node_tree.nodes if n.type == 'BACKGROUND')
    bgn.inputs['Color'].default_value = (0, 0, 0, 1)
    bgn.inputs['Strength'].default_value = 0.0
    forms = [((0, 6, 2), (8, 5), 2.4, '#ffffff'), ((-6, 1.5, -2), (1.2, 7), 5.0, '#dbe6ff'),
             ((6, 0.5, -1), (1.2, 6), 3.0, '#ffe2c4'), ((0, 0.5, 8), (8, 3), 0.5, '#ffffff')]
    for k, (pos, (sx, sy), inten, col) in enumerate(forms):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        me = bpy.data.meshes.new(f'Former{k}')
        bm.to_mesh(me)
        bm.free()
        mat = bpy.data.materials.new(f'FormerMat{k}')
        nt = mat.node_tree
        for n in list(nt.nodes):
            if n.type != 'OUTPUT_MATERIAL':
                nt.nodes.remove(n)
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (*lin(col), 1)
        em.inputs['Strength'].default_value = inten * 0.85
        nt.links.new(em.outputs[0], next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL').inputs[0])
        me.materials.append(mat)
        ob = bpy.data.objects.new(f'Former{k}', me)
        coll.objects.link(ob)
        ob.location = W(*to_model(pos))
        ob.scale = (sx / s, sy / s, 1)
        ob.rotation_euler = (W(*to_model((0, 0, 0))) - ob.location).to_track_quat('-Z', 'Y').to_euler()
        ob.visible_camera = False
        ob.visible_shadow = False
    for k, (pos, inten, col) in enumerate((((3.5, 5, 4), 1.5, '#ffffff'), ((-4, 2.5, -5), 1.1, '#c9d6ff'))):
        dl = bpy.data.lights.new(f'Sun{k}', 'SUN')
        dl.energy = inten
        dl.color = lin(col)
        dl.angle = math.radians(3)
        o = bpy.data.objects.new(f'Sun{k}', dl)
        coll.objects.link(o)
        o.rotation_euler = (-W(*to_model(pos, vec=True))).to_track_quat('-Z', 'Y').to_euler()
    return lo


def render_landing(objs, png, samples, res):
    sc = setup_cycles(samples=samples, res=res, transparent=True)
    sc.cycles.use_adaptive_sampling = True
    rig = new_coll('Rig')
    lo = studio_landing(rig, objs)
    v = LANDING_VIEW
    viewer_camera(rig, objs, v['yaw'], v['size'], eye=v['eye'], target=v['target'], fov=v['fov'])
    shadow_catcher(rig, y=lo[1])
    return render_png(png)


# Feuilles de basilic de la part : nom, x, z, lacet, longueur, largeur, creux, retombée, roulis
SLICE_LEAVES = [
    ('Pizza_Basil0', 0.70, 0.02, math.radians(-12), 0.30, 0.085, 0.35, 0.05, 0.05),
    ('Pizza_Basil1', 1.02, -0.27, math.radians(38), 0.22, 0.065, 0.4, 0.04, -0.06),
    ('Pizza_Basil2', 0.36, -0.05, math.radians(160), 0.17, 0.05, 0.42, 0.06, 0.0),
]


# =============================================================================== principal
def main():
    os.makedirs(BAKE_DIR, exist_ok=True)
    clean_scene()
    quick = bool(ARGS.get('quick'))
    only = ARGS.get('only')
    S = new_coll('pizza_slice')
    slice_ob = build_slice(S, quick)
    top_h = top_height_fn()
    basil_mat = basil_material()
    basil = build_basil(S, top_h, SLICE_LEAVES, basil_mat)
    strands = build_pull(S, top_h)
    root = empty('Pizza_Slice_Root', S)
    parts = [slice_ob] + basil + strands
    for o in parts:
        parent_keep(o, root)
    B = new_coll('pizza_browser')
    browser = import_browser(B)
    print('PIZZA (site principal)')
    report(parts)
    if only != 'landing':
        export_glb([root] + parts + browser, GLB_MAIN, webp_quality=84)
    landing = []
    if only != 'slice':
        objs = build_landing(slice_ob, top_h, quick, basil_mat, bpy.data.materials['PizzaCheese'])
        export_glb(objs, GLB_LANDING, webp_quality=84)
        landing = [o.name for o in objs]
    os.makedirs(BLEND_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    # Contrôles sur les GLB livrés (réimportés), pas sur la scène de construction
    if (SCRATCH or ARGS.get('poster')) and only != 'landing':
        slice_names = [o.name for o in parts]
        browser_names = [o.name for o in browser if o.type == 'MESH']
        clean_scene()
        bpy.ops.import_scene.gltf(filepath=GLB_MAIN)
        objs = [bpy.data.objects[n] for n in slice_names]
        for ob in bpy.data.objects:
            if ob.name not in slice_names and ob.type == 'MESH':
                ob.hide_render = True
        if ARGS.get('poster'):
            # Le poster montre aussi le navigateur et son écran, comme la 3D du chapitre (retour de Mathis
            # du 2026-10-09 : « y'a pas les écrans Meme Rina sur mobile »)
            shown = [bpy.data.objects[n] for n in browser_names if n in bpy.data.objects]
            for ob in shown:
                ob.hide_render = False
            site_screen(bpy.data.objects.get('Pizza_Site'))
            poster_main(objs + shown)
            for ob in shown:
                ob.hide_render = True
        if SCRATCH:
            preview(SCRATCH)
    if (SCRATCH or ARGS.get('poster')) and landing:
        clean_scene()
        bpy.ops.import_scene.gltf(filepath=GLB_LANDING)
        objs = [bpy.data.objects[n] for n in landing]
        if ARGS.get('poster'):
            png = os.path.join(BAKE_DIR, 'poster-landing.png')
            render_landing(objs, png, 160, 1200)
            png_to_webp(png, POSTER, max_kb=120)
        if SCRATCH:
            if not ARGS.get('poster'):
                render_landing(objs, os.path.join(SCRATCH, 'landing_view.png'), 64, 800)
            cam = bpy.context.scene.camera
            # repère de construction (part vers +x), tourné comme le diorama
            for name, eye, target in (('landing_close', (0.2, 1.7, 2.7), (0.8, 0.3, 0.0)),
                                      ('landing_pull', (0.55, 0.75, 1.55), (0.85, 0.28, 0.3))):
                eye, target = (tuple(float(c) for c in yaw_points(np.array([q]))[0]) for q in (eye, target))
                cam.location = W(*eye)
                cam.rotation_euler = (W(*target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
                cam.data.angle_y = math.radians(30)
                cam.data.shift_x = cam.data.shift_y = 0
                render_png(os.path.join(SCRATCH, f'{name}.png'))


def preview(out):
    """Rendus de contrôle sur fond sombre (celui du site) ; sol abaissé sous les brins de mozzarella."""
    P = new_coll('preview')
    sc = setup_cycles(samples=96, res=900, transparent=False)
    sc.render.film_transparent = False
    world_hdri(ph_hdri('studio_small_09'), 0.35, 40, bg='#0e0e10')
    area_light('key', P, (-1.2, 2.6, 2.2), (0.8, 0.05, 0), 260, '#ffe6c8', 1.6)
    area_light('rim', P, (2.6, 1.0, -2.2), (0.8, 0.1, 0), 380, '#ffd2a0', 1.2)
    area_light('fill', P, (2.4, 1.4, 2.4), (0.8, 0.1, 0), 60, '#bfe8ff', 2.0)
    shadow_catcher(P, -0.6)
    camera(P, (2.4, 1.5, 2.5), (0.82, -0.05, 0.0), 50)
    render_png(os.path.join(out, 'slice_34.png'))
    camera(P, (0.8, 2.6, 0.9), (0.8, 0.0, 0.0), 50)
    render_png(os.path.join(out, 'slice_top.png'))
    camera(P, (0.62, 0.32, 1.62), (0.95, -0.1, 0.33), 55)
    render_png(os.path.join(out, 'slice_cut.png'))
    camera(P, (0.8, 1.6, 2.6), (0.8, -0.05, 0.0), 45)
    render_png(os.path.join(out, 'slice_site.png'))


POSTER_MAIN = os.path.join(ROOT, 'public', 'posters', 'pizza.webp')
SITE_CAPTURE = os.path.join(ROOT, 'public', 'textures', 'memerina', 'site-1.webp')


def site_screen(ob):
    """Écran du navigateur pour le poster : première capture du site (sur le site, Pizza.tsx l'applique en
    code, useScreenCycle), sans éclairage et légèrement sous le blanc pur (tint 0.9)."""
    if ob is None:
        return
    m = bpy.data.materials.new('PosterSite')
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(SITE_CAPTURE)
    emit = nodes.new('ShaderNodeEmission')
    emit.inputs['Strength'].default_value = 0.9
    out = nodes.new('ShaderNodeOutputMaterial')
    links.new(tex.outputs['Color'], emit.inputs['Color'])
    links.new(emit.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear()
    ob.data.materials.append(m)


def poster_main(objs):
    """Poster du chapitre (mobile, reduced-motion, avant le montage de la scène) : même cadrage que
    scripts/blender/posters.py (800², azimut 35°, élévation 24°, fov 30°, 84 % du cadre, trois soleils)."""
    P = new_coll('poster')
    sc = setup_cycles(samples=128, res=800, transparent=True)
    w = bpy.data.worlds.new('poster_world')
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.03, 0.03, 0.035, 1)
    sc.world = w

    def sun(name, energy, az, el, color=(1, 1, 1)):
        d = bpy.data.lights.new(name, 'SUN')
        d.energy, d.color, d.angle = energy, color, math.radians(8)
        o = bpy.data.objects.new(name, d)
        P.objects.link(o)
        o.rotation_euler = (math.radians(90) - el, 0, az + math.radians(90))

    sun('key', 3.2, math.radians(40), math.radians(50))
    sun('fill', 0.9, math.radians(-130), math.radians(20), (0.8, 0.9, 1))
    sun('rim', 2.2, math.radians(200), math.radians(35))
    AZ, EL, FOV, FILL = math.radians(35), math.radians(24), math.radians(30), 0.84
    cd = bpy.data.cameras.new('poster_cam')
    cd.angle = FOV
    cam = bpy.data.objects.new('poster_cam', cd)
    P.objects.link(cam)
    sc.camera = cam
    half = math.tan(FOV / 2)
    direction = Vector((math.sin(AZ) * math.cos(EL), -math.cos(AZ) * math.cos(EL), math.sin(EL)))
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        ev = o.evaluated_get(dg)
        pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    lo = Vector([min(p[k] for p in pts) for k in range(3)])
    hi = Vector([max(p[k] for p in pts) for k in range(3)])
    center = (lo + hi) / 2
    dist = max((p - center).length for p in pts) / math.sin(FOV / 2)
    for _ in range(4):
        cam.location = center + direction * dist
        cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        cs = [inv @ p for p in pts]
        xs = [c.x / -c.z for c in cs]
        ys = [c.y / -c.z for c in cs]
        ext = max(max(xs) - min(xs), max(ys) - min(ys)) / 2
        cd.shift_x = (max(xs) + min(xs)) / 2 / (2 * half)
        cd.shift_y = (max(ys) + min(ys)) / 2 / (2 * half)
        dist *= ext / (half * FILL)
    cam.location = center + direction * dist
    png = os.path.join(BAKE_DIR, 'poster-main.png')
    render_png(png)
    png_to_webp(png, POSTER_MAIN, max_kb=60)


if IN_BLENDER:
    main()
