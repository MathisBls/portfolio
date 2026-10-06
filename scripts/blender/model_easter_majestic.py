# Second easter egg, « Le Sanctuaire » (docs/storyboards/easter-majestic.md, agent B2, 2026-10-06) : la
# montagne sacrée kilométrique et son B sculpté, le colosse du chœur, les débris rocheux, le prisme du
# sommet et les deux moitiés de la pointe qui s'ouvrent. Tout est modélisé ici, depuis une scène vide.
#
# Deux modes, dans cet ordre :
#   1. python scripts/blender/model_easter_majestic.py
#      (Python 3.11 + Pillow + numpy) télécharge les PBR Poly Haven (CC0) dans le cache, écrit les textures
#      répétées (WebP) de public/textures/easter/majestic/ et les sources réduites du pré-calcul (.npy).
#   2. "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_easter_majestic.py
#      ... -- --render <dossier> [--shots dusk,choir,...]  (vignettes EEVEE de contrôle, après l'export)
#      modélise, cuit les cartes de la montagne (couleur + normales en espace objet) dans le cache, sauve
#      blender/easter_majestic.blend et exporte public/models/easter/majestic.glb (Draco 6, Y-up, sans
#      animation, sans image).
#   3. Relancer 1 : les cartes cuites de la montagne passent en WebP (2K et -1k).
#
# Montagne : surface paramétrée (azimut, abscisse le long du méridien), profil de pic à arêtes, contreforts,
# grande paroi plane en façade (+Z) où le panneau du B est taillé. Le relief fin (arêtes secondaires,
# ravines, strates, diaclases) est un déplacement le long d'une normale lissée, évalué deux fois : en
# moyenne définition pour le maillage (décimé à ~55 k triangles) et en haute définition (4096 × 1024)
# pour la carte de normales, cuite directement depuis la surface HD (même paramétrage, pas de lancer de
# rayons). UV de la montagne et de la pointe : projection polaire du paramétrage (disque inscrit, centre
# = sommet, bord = pied), sans couture. Plateau du sommet : coin bas-gauche de l'atlas.
#
# Repère : coordonnées « monde » Y-up (x à droite, y en haut, +z vers le spectateur), en mètres, puis
# rotation +90° sur X (Blender Z-up) ; l'export glTF Y-up rend les coordonnées d'origine.
import json
import math
import os
import random
import re
import sys
import time
from math import atan2, cos, hypot, pi, radians, sin, sqrt, tan

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLEND = os.path.join(ROOT, 'blender', 'easter_majestic.blend')
GLB = os.path.join(ROOT, 'public', 'models', 'easter', 'majestic.glb')
TEX = os.path.join(ROOT, 'public', 'textures', 'easter', 'majestic')
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'polyhaven')
BAKE = os.path.join(ROOT, 'node_modules', '.cache', 'majestic')
LOGO_SVG = 'C:/Users/Asuki/Documents/perso/BoulardTV_models/btv_logo.svg'

try:
    import bpy  # noqa: F401
    IN_BLENDER = True
except ImportError:
    IN_BLENDER = False

# =============================================================================== cotes (mètres, Y-up)
H_PEAK = 1200.0          # pointe du sommet (haut des coques)
Y_CUT = 1010.0           # plateau du sommet : pied du prisme, joint montagne / coques
Y_SKIRT = -40.0          # jupe sous le sol (le pied visible est à y = 0)
# Rayon des arêtes principales selon la hauteur (pic en corne : tablier évasé, flancs raides, pointe fine)
RIDGE_Y = [-40, 0, 50, 140, 280, 450, 640, 820, 960, 1010, 1080, 1150, 1200]
RIDGE_R = [960, 885, 790, 690, 585, 475, 365, 268, 204, 181, 132, 62, 0]
# Arêtes : azimut (degrés, 0 = façade +Z, 90 = +X), facteur de rayon, torsion (degrés sur la hauteur).
# Section = polygone dont les sommets sont les arêtes et dont les côtés (les faces) sont creusés.
# Dernier champ : épaule / antécime / brèche (hauteur, amplitude relative, demi-épaisseur).
ARETES = sorted([(-47, 1.00, -7, (770, 0.10, 70)), (-99, 0.80, 5, (705, 0.24, 85)), (-146, 0.99, -9, (500, 0.11, 80)),
                 (179, 0.90, 4, (300, 0.08, 70)), (148, 0.95, 12, (925, 0.17, 45)), (99, 0.77, -6, (470, 0.22, 95)),
                 (51, 1.03, 6, (865, -0.08, 30))])
# Creux des faces (cirques glaciaires) selon la hauteur ; la façade du B est plus plane
CONCAVE_Y = [-40, 0, 200, 450, 750, 1000, 1200]
CONCAVE = [0.10, 0.10, 0.20, 0.17, 0.12, 0.07, 0.03]
FRONT_CONCAVE = 0.45
# Contreforts bas : azimut, amplitude relative, largeur (degrés), hauteur où ils meurent
SPURS = [(24, 0.09, 6, 330), (-27, 0.10, 6, 300), (76, 0.12, 7, 480), (-74, 0.12, 8, 440), (122, 0.11, 6, 420),
         (-124, 0.10, 7, 380), (163, 0.12, 7, 520), (-166, 0.10, 6, 380)]
# Tablier d'éboulis (pied quasi rond) : rayon au sol, hauteur où il rejoint les faces
APRON_R, APRON_H = 900.0, 270.0
# Axe incliné : le pied est décalé de (x, z) par rapport à la pointe (façade plus raide que le dos)
LEAN = (28.0, -95.0)
# Façade (+Z) : plan du B, ajusté sur la face entre les deux arêtes avant
WALL_YB = 545.0          # centre du B
WALL_BULGE = 1600.0      # rayon de courbure horizontal de la paroi
B_HEIGHT = 340.0         # hauteur du B sculpté
B_RECESS = 16.0          # profondeur du fond de la niche taillée autour du B
NICHE_MARGIN = 22.0      # la niche suit le B à cette distance (bords taillés irréguliers)
# Prisme du sommet
PRISM_H = 120.0
PRISM_W = 2 * PRISM_H / sqrt(3)
PRISM_D = 56.0
# Colosse du chœur
CHOIR_H = 80.0


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def pchip(xk, yk, x):
    """Interpolation cubique monotone (Fritsch-Carlson) : pas de pli aux nœuds du profil."""
    xk = np.asarray(xk, float)
    yk = np.asarray(yk, float)
    h = np.diff(xk)
    d = np.diff(yk) / h
    m = np.zeros_like(yk)
    w1 = 2 * h[1:] + h[:-1]
    w2 = h[1:] + 2 * h[:-1]
    with np.errstate(divide='ignore', invalid='ignore'):
        mm = (w1 + w2) / (w1 / d[:-1] + w2 / d[1:])
    m[1:-1] = np.where(d[:-1] * d[1:] > 0, mm, 0.0)
    m[0], m[-1] = d[0], d[-1]
    x = np.asarray(x, float)
    i = np.clip(np.searchsorted(xk, x) - 1, 0, len(xk) - 2)
    t = (x - xk[i]) / h[i]
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * yk[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * yk[i + 1]
            + (t3 - t2) * h[i] * m[i + 1])


# =============================================================================== bruits (numpy)
_rng = np.random.RandomState(20261006)
PERM = np.concatenate([_rng.permutation(256)] * 2).astype(np.int64)
_G = np.array([(1, 1, 0), (-1, 1, 0), (1, -1, 0), (-1, -1, 0), (1, 0, 1), (-1, 0, 1), (1, 0, -1), (-1, 0, -1),
               (0, 1, 1), (0, -1, 1), (0, 1, -1), (0, -1, -1), (1, 1, 0), (-1, 1, 0), (0, -1, 1), (0, -1, -1)],
              np.float32)
GX, GY, GZ = _G[:, 0], _G[:, 1], _G[:, 2]
# Rotations entre octaves (casse l'alignement sur les axes)
_ROT = []
for _k in range(12):
    _a, _b = 0.61 + 0.37 * _k, 1.13 + 0.29 * _k
    _rz = np.array([[cos(_a), -sin(_a), 0], [sin(_a), cos(_a), 0], [0, 0, 1]])
    _rx = np.array([[1, 0, 0], [0, cos(_b), -sin(_b)], [0, sin(_b), cos(_b)]])
    _ROT.append((_rz @ _rx).astype(np.float32))


def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def perlin(p):
    """Bruit de gradient 3D (Perlin amélioré), p : (n, 3) float32 -> (n,) dans [-1, 1] environ."""
    f = np.floor(p)
    q = p - f
    i = f.astype(np.int64) & 255
    X, Y, Z = i[:, 0], i[:, 1], i[:, 2]
    x, y, z = q[:, 0], q[:, 1], q[:, 2]
    u, v, w = _fade(x), _fade(y), _fade(z)
    A = PERM[X] + Y
    B = PERM[X + 1] + Y
    AA, AB, BA, BB = PERM[A] + Z, PERM[A + 1] + Z, PERM[B] + Z, PERM[B + 1] + Z

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


def fbm(p, octaves, gain=0.5, lac=2.03, seed=0, min_oct=0):
    out = np.zeros(len(p), np.float32)
    amp, norm = 1.0, 0.0
    q = p + np.float32(seed * 37.17)
    for o in range(octaves):
        if o >= min_oct:
            out += np.float32(amp) * perlin(q)
        norm += amp
        amp *= gain
        q = (q @ _ROT[o % 12]) * np.float32(lac) + np.float32(11.3)
    return out / np.float32(norm * 0.7)


def ridged(p, octaves, seed=0, gain=0.5, lac=2.07):
    """Multifractal « ridged » (crêtes vives), ~[0, 1]."""
    out = np.zeros(len(p), np.float32)
    weight = np.ones(len(p), np.float32)
    amp, norm = 1.0, 0.0
    q = p + np.float32(seed * 53.71)
    for o in range(octaves):
        n = 1.0 - np.abs(perlin(q))
        n = n * n * weight
        weight = np.clip(n * 2.0, 0, 1)
        out += n * np.float32(amp)
        norm += amp
        amp *= gain
        q = (q @ _ROT[(o + 5) % 12]) * np.float32(lac) + np.float32(7.7)
    return out / np.float32(norm)


def _hash(cx, cy, cz):
    h = (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return h & 0x3FFFFFFF


def cellular(p):
    """Voronoi 3D : (F1, F2, identifiant de cellule dans [0, 1))."""
    f = np.floor(p).astype(np.int64)
    F1 = np.full(len(p), 9.0, np.float32)
    F2 = np.full(len(p), 9.0, np.float32)
    ID = np.zeros(len(p), np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx, cy, cz = f[:, 0] + dx, f[:, 1] + dy, f[:, 2] + dz
                h = _hash(cx, cy, cz)
                jx = (h & 1023) / 1023.0
                jy = ((h >> 10) & 1023) / 1023.0
                jz = ((h >> 20) & 1023) / 1023.0
                d = ((cx + jx - p[:, 0]) ** 2 + (cy + jy - p[:, 1]) ** 2 + (cz + jz - p[:, 2]) ** 2).astype(np.float32)
                closer = d < F1
                F2 = np.where(closer, F1, np.minimum(F2, d))
                ID = np.where(closer, ((h >> 7) & 4095) / 4096.0, ID).astype(np.float32)
                F1 = np.where(closer, d, F1)
    return np.sqrt(F1), np.sqrt(F2), ID


def facets(p):
    """Facettes de roche : un plan incliné au hasard par cellule de Voronoi (continu dans la cellule, ressaut
    net à la frontière) ; rend la valeur du plan (unités de p)."""
    f = np.floor(p).astype(np.int64)
    best = np.full(len(p), 9.0, np.float32)
    val = np.zeros(len(p), np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                cx, cy, cz = f[:, 0] + dx, f[:, 1] + dy, f[:, 2] + dz
                h = _hash(cx, cy, cz)
                ox = (cx + (h & 1023) / 1023.0 - p[:, 0]).astype(np.float32)
                oy = (cy + ((h >> 10) & 1023) / 1023.0 - p[:, 1]).astype(np.float32)
                oz = (cz + ((h >> 20) & 1023) / 1023.0 - p[:, 2]).astype(np.float32)
                d = ox * ox + oy * oy + oz * oz
                rx = ((h >> 3) & 255) / 127.5 - 1.0
                ry = ((h >> 11) & 255) / 127.5 - 1.0
                rz = ((h >> 19) & 255) / 127.5 - 1.0
                plane = -(ox * rx + oy * ry + oz * rz)
                closer = d < best
                val = np.where(closer, plane, val).astype(np.float32)
                best = np.where(closer, d, best)
    return val


# =============================================================================== logo du B (btv_logo.svg)
def svg_shapes(path, steps=16):
    """Chemins d'un SVG simple (M, L, C, Z absolus) -> [(couleur, [polygones])], y vers le haut."""
    txt = open(path, encoding='utf-8').read()
    shapes = []
    for m in re.finditer(r'<path[^>]*?\sd="([^"]+)"[^>]*?fill="([^"]+)"', txt):
        toks = re.findall(r'[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?', m.group(1))
        polys, cur, pts, cmd, i = [], (0.0, 0.0), [], None, 0
        while i < len(toks):
            tk = toks[i]
            if tk.isalpha():
                cmd = tk
                i += 1
                if cmd in 'Zz':
                    if pts:
                        polys.append(pts)
                    pts = []
                continue
            if cmd == 'M':
                cur = (float(toks[i]), float(toks[i + 1]))
                pts = [cur]
                i += 2
                cmd = 'L'
            elif cmd == 'L':
                cur = (float(toks[i]), float(toks[i + 1]))
                pts.append(cur)
                i += 2
            elif cmd == 'C':
                f = [float(x) for x in toks[i:i + 6]]
                p0, p1, p2, p3 = cur, (f[0], f[1]), (f[2], f[3]), (f[4], f[5])
                for kk in range(1, steps + 1):
                    u = kk / steps
                    a, b, c, d = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u * u, u ** 3
                    pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
                cur = p3
                i += 6
            else:
                raise SystemExit(f'commande SVG non gérée : {cmd}')
        if pts:
            polys.append(pts)
        clean = []
        for p in polys:
            if len(p) > 2 and hypot(p[0][0] - p[-1][0], p[0][1] - p[-1][1]) < 1e-4:
                p = p[:-1]
            clean.append([(x, -y) for x, y in p])
        shapes.append((m.group(2).lower(), clean))
    return shapes


LOGO = svg_shapes(LOGO_SVG)
_LX = [x for _, polys in LOGO for p in polys for x, _y in p]
_LY = [y for _, polys in LOGO for p in polys for _x, y in p]
LOGO_BOX = (min(_LX), max(_LX), min(_LY), max(_LY))
B_SCALE = B_HEIGHT / (LOGO_BOX[3] - LOGO_BOX[2])
B_CENTER = ((LOGO_BOX[0] + LOGO_BOX[1]) / 2, (LOGO_BOX[2] + LOGO_BOX[3]) / 2)


def logo_to_plane(x, y):
    return ((x - B_CENTER[0]) * B_SCALE, (y - B_CENTER[1]) * B_SCALE)


B_POLYS_PLANE = [[logo_to_plane(x, y) for x, y in p] for _, polys in LOGO for p in polys]


def point_in_poly(px, py, poly):
    inside = np.zeros(len(px), bool)
    P_ = np.asarray(poly)
    for (a, b), (c, d) in zip(P_, np.roll(P_, -1, 0)):
        cond = (b > py) != (d > py)
        with np.errstate(divide='ignore', invalid='ignore'):
            xint = (c - a) * (py - b) / (d - b) + a
        inside ^= cond & (px < xint)
    return inside


def b_sdf(pu, pv):
    """Distance signée (m) au B (union des trois tracés du logo), négative dedans, repère du panneau."""
    d2 = np.full(len(pu), 1e18)
    inside = np.zeros(len(pu), bool)
    for poly in B_POLYS_PLANE:
        inside |= point_in_poly(pu, pv, poly)
        P_ = np.asarray(poly)
        for (ax, ay), (bx, by) in zip(P_, np.roll(P_, -1, 0)):
            ex, ey = bx - ax, by - ay
            t = np.clip(((pu - ax) * ex + (pv - ay) * ey) / (ex * ex + ey * ey), 0, 1)
            dx, dy = pu - ax - t * ex, pv - ay - t * ey
            d2 = np.minimum(d2, dx * dx + dy * dy)
    d = np.sqrt(d2)
    return np.where(inside, -d, d)


# =============================================================================== montagne : surface de base
def _wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def lean(y):
    k = np.clip(1 - np.asarray(y, float) / H_PEAK, 0, 1.05)
    return LEAN[0] * k, LEAN[1] * k


def smax(a, b, k):
    return 0.5 * (a + b + np.sqrt((a - b) ** 2 + k * k))


_GY = np.linspace(-60, 1220, 2561)
_GEND = []
for _k in range(len(ARETES)):
    _p1 = np.stack([_GY / 70.0, np.full_like(_GY, 13.7 * _k + 0.5), np.full_like(_GY, 3.1 * _k)], -1)
    _p2 = np.stack([_GY / 46.0, np.full_like(_GY, 7.3 * _k + 0.2), np.full_like(_GY, 5.9 * _k)], -1)
    _GEND.append(0.06 * perlin(_p1.astype(np.float32)) + 0.05 * perlin(_p2.astype(np.float32)))


def pyramid_radius(phi, y):
    """Section en polygone à côtés creusés : sommets = arêtes (avec gendarmes), faces = cirques."""
    R = pchip(RIDGE_Y, RIDGE_R, y)
    conc = pchip(CONCAVE_Y, CONCAVE, y)
    n = len(ARETES)
    ang, rad = [], []
    for k, (az, f, tw, (ysh, ash, wsh)) in enumerate(ARETES):
        ang.append(radians(az) + radians(tw) * (y / H_PEAK))
        bump = 1 + ash * np.exp(-((y - ysh) / wsh) ** 2)
        rad.append(R * f * bump)
    dx, dz = np.sin(phi), np.cos(phi)
    out = np.zeros_like(phi)
    for k in range(n):
        k2 = (k + 1) % n
        a0, a1 = ang[k], ang[k2]
        span = (a1 - a0) % (2 * np.pi)
        inside = ((phi - a0) % (2 * np.pi)) < span
        ax, az = rad[k] * np.sin(a0), rad[k] * np.cos(a0)
        ex, ez = rad[k2] * np.sin(a1) - ax, rad[k2] * np.cos(a1) - az
        den = dx * ez - dz * ex
        den = np.where(np.abs(den) < 1e-9, 1e-9, den)
        t = (ax * ez - az * ex) / den
        u = np.clip((ax * dz - az * dx) / den, 0, 1)
        front = ARETES[k][0] < 0 < ARETES[k2][0]
        c = conc * (FRONT_CONCAVE if front else 1.0)
        out = np.where(inside, t * (1 - c * 4 * u * (1 - u)), out)
    # Gendarmes et brèches : localisés sur l'arête (sinon toute la face ondule en bandes horizontales)
    for k in range(n):
        g = np.interp(y, _GY, _GEND[k]) * smoothstep(-40, 200, y)
        out = out + rad[k] * g * np.exp(-np.abs(_wrap(phi - ang[k])) / radians(4))
    return out


def base_radius(phi, y, wall=True):
    """Rayon de la surface de base (repère local, avant l'inclinaison de l'axe)."""
    r = pyramid_radius(phi, y)
    R = pchip(RIDGE_Y, RIDGE_R, y)
    for az, amp, wd, ytop in SPURS:
        d = _wrap(phi - radians(az))
        e = smoothstep(-40, 60, y) * (1 - smoothstep(ytop * 0.5, ytop, y))
        r = r + R * amp * e * np.exp(-np.sqrt(d * d + 0.0004) / radians(wd))
    if wall and WALL is not None:
        o, U, V, N = WALL
        tilt = atan2(N[1], N[2])
        ox, oz = lean(y)
        zw = o[2] - (y - WALL_YB) * tan(tilt) - oz
        sq = np.sin(phi) ** 2 / (2 * WALL_BULGE)
        c = np.cos(phi)
        disc = np.maximum(c * c + 4 * sq * zw, 0)
        rw = np.where(sq > 1e-9, (-c + np.sqrt(disc)) / (2 * np.maximum(sq, 1e-12)), zw / np.maximum(c, 1e-3))
        m = (1 - smoothstep(radians(26), radians(40), np.abs(_wrap(phi)))) * smoothstep(290, 380, y) \
            * (1 - smoothstep(740, 840, y))
        r = r * (1 - m) + rw * m
    ang = 1 + 0.06 * np.sin(3 * phi + 1.0) + 0.04 * np.sin(5 * phi + 2.0)
    apron = APRON_R * ang * np.clip(1 - y / APRON_H, 0, None) ** 1.3
    return smax(r, apron, 45.0)


def wall_frame():
    """Plan de la façade au centre du B (ajusté sur la face entre les arêtes avant, 6 m en saillie) :
    origine, axes U (droite), V (haut, dans le plan), N (normale, inclinée vers le ciel)."""
    ys = np.array([WALL_YB - 150.0, WALL_YB + 150.0])
    r = base_radius(np.zeros(2), ys, wall=False)
    zs = r + lean(ys)[1]
    tilt = atan2(zs[0] - zs[1], 300.0)
    z0 = float(zs.mean()) + 6.0
    o = np.array([0.0, WALL_YB, z0])
    U = np.array([1.0, 0.0, 0.0])
    V = np.array([0.0, cos(tilt), -sin(tilt)])
    N = np.array([0.0, sin(tilt), cos(tilt)])
    return o, U, V, N


WALL = None
WALL = wall_frame()


def base_grid(n_phi, n_t, n_y=2400):
    """Surface de base échantillonnée : azimut régulier, abscisse curviligne du méridien régulière.
    Rend (P (n_t, n_phi, 3), t (n_t,), phi (n_phi,)). Dernière ligne = pointe (rayon nul)."""
    phi = np.arange(n_phi) * (2 * np.pi / n_phi)
    ys = np.linspace(Y_SKIRT, H_PEAK, n_y)
    t = np.linspace(0.0, 1.0, n_t)
    P = np.zeros((n_t, n_phi, 3), np.float64)
    step = 256
    for a in range(0, n_phi, step):
        ph = phi[a:a + step]
        PH, YS = np.meshgrid(ph, ys)          # (n_y, k)
        r = base_radius(PH, YS)
        dr = np.diff(r, axis=0)
        dy = np.diff(ys)[:, None]
        s = np.concatenate([np.zeros((1, len(ph))), np.cumsum(np.sqrt(dr * dr + dy * dy), axis=0)], axis=0)
        s /= s[-1:]
        for k in range(len(ph)):
            yk = np.interp(t, s[:, k], ys)
            rk = np.interp(t, s[:, k], r[:, k])
            ox, oz = lean(yk)
            P[:, a + k, 0] = rk * np.sin(ph[k]) + ox
            P[:, a + k, 1] = yk
            P[:, a + k, 2] = rk * np.cos(ph[k]) + oz
    return P, t, phi


def grid_normals(P):
    """Normales sortantes d'une grille (n_t, n_phi, 3) enroulée en azimut."""
    dphi = np.roll(P, -1, axis=1) - np.roll(P, 1, axis=1)
    dt = np.zeros_like(P)
    dt[1:-1] = P[2:] - P[:-2]
    dt[0] = P[1] - P[0]
    dt[-1] = P[-1] - P[-2]
    n = np.cross(dphi, dt)
    ln = np.linalg.norm(n, axis=-1, keepdims=True)
    n = n / np.maximum(ln, 1e-9)
    n[-1] = (0, 1, 0)
    return n


def blur_grid(A, s_t, s_phi):
    """Flou séparable (boîte répétée 3 fois) en indices de grille, enroulé en azimut."""
    out = A.copy()
    for _ in range(3):
        if s_phi > 0:
            acc = np.zeros_like(out)
            for k in range(-s_phi, s_phi + 1):
                acc += np.roll(out, k, axis=1)
            out = acc / (2 * s_phi + 1)
        if s_t > 0:
            pad = np.concatenate([np.repeat(out[:1], s_t, 0), out, np.repeat(out[-1:], s_t, 0)], 0)
            acc = np.zeros_like(out)
            for k in range(0, 2 * s_t + 1):
                acc += pad[k:k + len(out)]
            out = acc / (2 * s_t + 1)
    return out


def panel_coords(P):
    o, U, V, N = WALL
    d = P - o
    return d @ U, d @ V, d @ N


def niche_sdf(pu, pv):
    """Contour de la niche taillée : le B dilaté fondu dans un écusson arrondi, bords irréguliers."""
    db = b_sdf(pu, pv) - NICHE_MARGIN
    qx = np.abs(pu) - 124.0
    qy = np.abs(pv + 4.0) - 178.0
    rr = np.hypot(np.maximum(qx + 55, 0), np.maximum(qy + 55, 0)) + np.minimum(np.maximum(qx + 55, qy + 55), 0) - 55
    h = np.clip(0.5 + 0.5 * (rr - db) / 30.0, 0, 1)
    d = rr * (1 - h) + db * h - 30.0 * h * (1 - h)
    rough = fbm(np.stack([pu / 38.0, pv / 38.0, np.full_like(pu, 4.2)], -1).astype(np.float32), 3, seed=31)
    return d + 5.0 * rough


def displacement(P0, steep, hd):
    """Déplacement (m) le long de la normale lissée. hd : octaves fines (carte de normales) en plus.
    Rend (d, champs utiles à la cuisson)."""
    n = len(P0)
    p = P0.astype(np.float32)
    y = p[:, 1]
    # Distorsion du domaine (formes organiques)
    warp = np.stack([fbm(p / 700, 3, seed=1), fbm(p / 700, 3, seed=2), fbm(p / 700, 3, seed=3)], 1) * 60
    pw = p + warp.astype(np.float32)
    # 1) grandes masses : épaules, éperons (discret : la forme vient des arêtes)
    macro = ridged(pw / 560, 5 if hd else 4, seed=4)
    d = 34 * (macro - 0.45)
    # 2) grands couloirs (rares, profonds, dans la pente)
    g = fbm(pw * np.array([1 / 130, 1 / 560, 1 / 130], np.float32), 3, seed=5)
    couloir = 1 - smoothstep(0.0, 0.11, np.abs(g))
    d -= 30 * couloir * steep
    # 3) cannelures : côtes et ravines serrées, étirées dans la pente
    q = pw * np.array([1 / 34, 1 / 240, 1 / 34], np.float32)
    rib = ridged(q, 4 if hd else 2, seed=9)
    d += 19 * (rib - 0.45) * steep
    # 3 bis) dalles et ressauts : facettes planes à arêtes vives (roche fracturée)
    d += 4.5 * facets(pw * np.array([1 / 44, 1 / 75, 1 / 44], np.float32)) * steep
    # 4) strates inclinées (pendage ~9°), épaisseurs variables : bancs durs en saillie, lits fins
    dip = pw[:, 1] + 0.15 * pw[:, 0] - 0.06 * pw[:, 2] + 55 * fbm(pw / 420, 3, seed=6)
    sb = dip / 52.0
    f = sb - np.floor(sb)
    hard = smoothstep(0.15, 0.40, f) * (1 - smoothstep(0.62, 0.95, f))
    smask = smoothstep(0.35, 0.75, steep) * smoothstep(-0.3, 0.3, fbm(pw / 460, 2, seed=7))
    d += 2.4 * (hard - 0.5) * smask
    s2 = dip / 17.0 + 0.3 * fbm(pw / 90, 2, seed=10)
    thin = np.abs((s2 - np.floor(s2)) - 0.5) * 2
    d -= (0.8 if hd else 0.0) * smoothstep(0.75, 1.0, thin) * smask
    joints = np.zeros(n, np.float32)
    if hd:
        # 5) diaclases : dalles de Voronoi étirées en hauteur, fissures fines ; grain
        F1, F2, cid = cellular(pw * np.array([1 / 30, 1 / 150, 1 / 30], np.float32))
        crack = 1 - smoothstep(0.0, 0.05, F2 - F1)
        d += 2.6 * (cid - 0.5) * steep
        d -= 1.6 * crack * steep
        joints = crack * steep
        d += 1.6 * fbm(pw / 16, 5, seed=8)
    else:
        d += 1.6 * fbm(pw / 16, 1, seed=8)
    # Éboulis (pentes faibles) : relief adouci mais bosselé de blocs ; pied adouci, pointe préservée
    d *= (0.28 + 0.72 * steep) * (0.45 + 0.55 * smoothstep(0, 220, y)) * (1 - 0.6 * smoothstep(1150, 1200, y))
    d += (1 - steep) * (2.2 * fbm(pw / 26, 4 if hd else 2, seed=12) + 1.2) * smoothstep(-20, 30, y)
    # Niche taillée autour du B : fond lisse (traces d'outil), deux gradins aux bords irréguliers
    pu, pv, pn = panel_coords(P0)
    near = (np.abs(pn) < 140) & (np.abs(pu) < 260) & (np.abs(pv) < 300)
    floor = np.zeros(n, np.float32)
    step2 = np.zeros(n, np.float32)
    if near.any():
        sd = niche_sdf(pu[near], pv[near])
        floor[near] = 1 - smoothstep(-3.0, 3.0, sd)
        step2[near] = 1 - smoothstep(9.0, 15.0, sd)
    calm = np.maximum(floor, step2 * 0.7)
    d *= (1 - calm)
    tool = 0.45 * np.sin(pv * (2 * np.pi / 7.0)) if hd else 0.0
    d -= (5.0 * step2 + (B_RECESS - 5.0) * floor - tool * floor).astype(np.float32)
    fields = {'couloir': couloir, 'hard': hard * smask, 'joints': joints, 'macro': macro, 'rib': rib,
              'panel': np.maximum(floor, step2).astype(np.float32)}
    return d.astype(np.float32), fields


def mountain_surface(n_phi, n_t, hd):
    """Surface déplacée : (P, P0, t, phi, champs)."""
    t0 = time.time()
    P0, t, phi = base_grid(n_phi, n_t)
    N0 = grid_normals(P0)
    # Direction de déplacement : normale lissée (~45 m), sinon les arêtes vives se replient
    sp = max(1, int(round(n_phi / 2400 * 45 / 1.0 / 2.6)))
    st = max(1, int(round(n_t / 1500 * 45 / 2.6)))
    Nd = blur_grid(N0, st, sp)
    Nd /= np.maximum(np.linalg.norm(Nd, axis=-1, keepdims=True), 1e-9)
    steep = np.clip(1 - np.abs(N0[..., 1]), 0, 1).reshape(-1)
    steep = smoothstep(0.25, 0.75, steep).astype(np.float32)
    flat = P0.reshape(-1, 3)
    D = np.zeros(len(flat), np.float32)
    fields = {}
    chunk = 400000
    for a in range(0, len(flat), chunk):
        d, fl = displacement(flat[a:a + chunk], steep[a:a + chunk], hd)
        D[a:a + chunk] = d
        for k, v in fl.items():
            fields.setdefault(k, np.zeros(len(flat), np.float32))[a:a + chunk] = v
    D = D.reshape(n_t, n_phi)
    D[-1] = 0.0
    P = P0 + Nd * D[..., None]
    for k in fields:
        fields[k] = fields[k].reshape(n_t, n_phi)
    fields['D'] = D
    fields['steep'] = steep.reshape(n_t, n_phi)
    print(f'  surface {n_phi}x{n_t} ({"HD" if hd else "MD"}) : {time.time() - t0:.1f} s')
    return P, P0, t, phi, fields


ATLAS_POW = 1.5          # t^1.5 : le tablier (bas du méridien) prend moins de place dans l'atlas


def polar_uv(t, phi):
    """Atlas de la montagne : disque inscrit, rayon 0.5 au pied (t = 0), centre à la pointe (t = 1)."""
    rho = 0.5 * (1 - t ** ATLAS_POW)
    return 0.5 + rho * np.sin(phi), 0.5 + rho * np.cos(phi)


def atlas_t(rho):
    """Inverse de polar_uv : abscisse du méridien pour un rayon d'atlas."""
    return np.clip(1 - 2 * rho, 0, 1) ** (1 / ATLAS_POW)


PLATEAU_UV = (0.075, 0.075, 0.135 / 2 / 230.0)   # centre (u, v) et échelle (UV par mètre) du plateau


# =============================================================================== mode textures (Python système)
PH_API = 'https://api.polyhaven.com/files/'
UA = {'User-Agent': 'portfolio-mathis-boulais/majestic-textures'}
STONE = 'rock_surface'
# nom de sortie -> (asset Poly Haven, carte, tailles [(suffixe, côté)], qualité WebP, traitement)
JOBS = [
    ('cliff-color', 'dark_rock_02', 'Diffuse', [('', 1024)], 80, None),
    ('cliff-normal', 'dark_rock_02', 'nor_gl', [('', 1024)], 80, None),
    ('cliff-arm', 'dark_rock_02', 'arm', [('', 1024)], 76, None),
    ('sand-color', 'coast_sand_05', 'Diffuse', [('', 2048), ('-1k', 1024)], 80, 'black'),
    ('sand-normal', 'coast_sand_05', 'nor_gl', [('', 1024)], 80, None),
    ('stone-color', STONE, 'Diffuse', [('', 1024)], 80, 'gray'),
    ('stone-normal', STONE, 'nor_gl', [('', 1024)], 80, None),
    ('stone-arm', STONE, 'arm', [('', 1024)], 76, None),
]
# Sources réduites pour la cuisson de la couleur de la montagne (.npy, sRGB 0..1)
BAKE_SOURCES = [('src-cliff', 'dark_rock_02'), ('src-scree', 'quarry_wall'), ('src-sand', 'coast_sand_05'),
                ('src-stone', STONE)]
# Cartes cuites de la montagne (cache BAKE -> WebP)
BAKED = [('mountain-color', 82), ('mountain-normal', 84)]


def ph_fetch(url, path):
    import urllib.request
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    return path


def ph_source(asset, kind):
    meta = os.path.join(CACHE, asset + '.json')
    ph_fetch(PH_API + asset, meta)
    with open(meta, encoding='utf-8') as f:
        info = json.load(f)[kind]['2k']['jpg']
    return ph_fetch(info['url'], os.path.join(CACHE, asset, os.path.basename(info['url'])))


def textures_main():
    from PIL import Image
    import io
    os.makedirs(TEX, exist_ok=True)
    os.makedirs(BAKE, exist_ok=True)

    def to_gray(img, mean, contrast, tint):
        a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255
        yv = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        yv = np.clip((yv - yv.mean()) * contrast + mean, 0, 1)
        rgb = np.clip(yv[..., None] * np.array(tint, np.float32), 0, 1)
        return Image.fromarray((rgb * 255 + 0.5).astype(np.uint8))

    total = 0.0

    def save(img, name, quality):
        nonlocal total
        buf = io.BytesIO()
        img.save(buf, 'WEBP', quality=quality, method=6)
        with open(os.path.join(TEX, name + '.webp'), 'wb') as f:
            f.write(buf.getvalue())
        kb = len(buf.getvalue()) / 1024
        total += kb
        print(f'{name}.webp  {img.size[0]}px  q{quality}  {kb:.0f} Ko')

    for name, asset, kind, sizes, quality, treat in JOBS:
        img = Image.open(ph_source(asset, kind)).convert('RGB')
        if treat == 'black':      # sable volcanique : gris très sombre, froid
            img = to_gray(img, 0.30, 1.5, (0.94, 0.95, 1.0))
        elif treat == 'gray':     # pierre : niveaux de gris (teinte en code)
            img = to_gray(img, 0.62, 1.6, (1.0, 1.0, 1.0))
        for suffix, side in sizes:
            out = img if img.size == (side, side) else img.resize((side, side), Image.LANCZOS)
            save(out, name + suffix, quality)
    for name, asset in BAKE_SOURCES:
        img = Image.open(ph_source(asset, 'Diffuse')).convert('RGB')
        for side in (256, 128):
            a = np.asarray(img.resize((side, side), Image.LANCZOS), dtype=np.float32) / 255
            np.save(os.path.join(BAKE, f'{name}-{side}.npy'), a[::-1].copy())   # lignes de bas en haut
    for name, quality in BAKED:
        src = os.path.join(BAKE, name + '.npy')
        if not os.path.exists(src):
            print(f'{name} : pas encore cuite (lancer Blender, puis ce script)')
            continue
        a = np.load(src)[::-1]       # bas en haut (Blender) -> haut en bas (image, UV glTF sans flipY)
        img = Image.fromarray(a)
        save(img, name, quality)
        save(img.resize((1024, 1024), Image.LANCZOS), name + '-1k', quality)
    print(f'total {total:.0f} Ko')


if not IN_BLENDER:
    textures_main()
    sys.exit(0)

# ############################################################################### Blender
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = ARGS[ARGS.index('--render') + 1] if '--render' in ARGS else None
SHOTS = ARGS[ARGS.index('--shots') + 1].split(',') if '--shots' in ARGS else None
QUICK = '--quick' in ARGS          # itération : pas de cuisson HD (cartes en cache réutilisées)
BAKE_SIZE = 2048

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(2026)
T_START = time.time()


# =============================================================================== matériaux
def lin(c):
    if not isinstance(c, str):
        return tuple(c)
    h = c.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in s)


MAT = {}


def _inp(node, name):
    return next(i for i in node.inputs if i.name == name)


def mat(name, col, rough=0.5, metal=0.0, emit=None, strength=1.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = lin(col)
    p.inputs['Base Color'].default_value = (*c, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if transmission:
        p.inputs['Transmission Weight'].default_value = transmission
        p.inputs['IOR'].default_value = 1.5
    if emit:
        p.inputs['Emission Color'].default_value = (*lin(emit), 1)
        p.inputs['Emission Strength'].default_value = strength
    m.diffuse_color = (*c, 1)
    MAT[name] = m
    return m


PINK = '#ff2d78'
# Noms = contrat avec le code (src/easter/majestic/types.ts) ; tous remplacés ou réglés en code.
mat('MountainRock', '#8a8580', 0.92)                      # couleur et normales cuites (mountain-*.webp)
mat('MountainB', '#9a928a', 0.8, emit=PINK, strength=1.0)  # le B : pierre, émissif rose piloté en code
mat('SummitInner', '#3a3440', 0.55)                       # intérieur des coques (géode)
mat('SummitCrystal', '#b58cff', 0.12, emit='#b46bff', strength=0.6)
mat('SummitGlass', '#ffffff', 0.02, transmission=1.0)     # remplacé par MeshTransmissionMaterial
mat('ChoirStone', '#8c867f', 0.85)
mat('ChoirGlow', '#fff1d6', 0.4, emit='#ffd9a0', strength=4.0)
mat('RockDebris', '#5e5853', 0.9)


# =============================================================================== maths et assemblage
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(radians(deg), 4, axis)


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


YUP = R('X', 90)


def W(x, y, z):
    return Vector((x, -z, y))


COLLS = {}
EXPORT = []


def new_coll(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    COLLS[name] = c
    return c


def bm_to_object(bm, name, coll, mats, origin=(0.0, 0.0, 0.0), sharp=None, smooth=True, export=True):
    """bmesh (Y-up, coordonnées monde) -> objet Blender dont l'origine est `origin` (monde Y-up)."""
    ox, oy, oz = origin
    bmesh.ops.translate(bm, vec=Vector((-ox, -oy, -oz)), verts=bm.verts)
    for f in bm.faces:
        f.smooth = smooth
    me = bpy.data.meshes.new(name + '_Mesh')
    bm.to_mesh(me)
    bm.free()
    for n in mats:
        me.materials.append(MAT[n])
    me.transform(YUP)
    if sharp is not None:
        me.set_sharp_from_angle(angle=radians(sharp))
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    ob.location = W(ox, oy, oz)
    assert ob.name == name, f'nom en double : {ob.name}'
    if export:
        EXPORT.append(ob)
    print(f'  {name:18s} {len(me.vertices):7d} sommets  {sum(len(p.vertices) - 2 for p in me.polygons):7d} tri  '
          f'{[m.name for m in me.materials]}')
    return ob


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def box_uv(bm, uvl, scale, faces=None):
    """UV par projection selon l'axe dominant de la normale de chaque face (unités : mètres / scale)."""
    for f in (faces if faces is not None else bm.faces):
        n = f.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        for l in f.loops:
            co = l.vert.co
            a, b = ((co.z, co.y), (co.x, co.z), (co.x, co.y))[ax]
            if ax == 0 and n.x < 0:
                a = -a
            if ax == 2 and n.z < 0:
                a = -a
            l[uvl].uv = (a / scale, b / scale)


# =============================================================================== montagne
def grid_bmesh(P, U, V, close_top=True):
    """Grille (n_t, n_phi, 3) enroulée en azimut, dernière ligne = pôle. UV par sommet (U, V)."""
    n_t, n_phi, _ = P.shape
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    rows = []
    for i in range(n_t - 1):
        rows.append([bm.verts.new(P[i, j]) for j in range(n_phi)])
    pole = bm.verts.new(P[-1, 0])
    uv_of = {}
    for i in range(n_t - 1):
        for j in range(n_phi):
            uv_of[rows[i][j]] = (U[i, j], V[i, j])
    uv_of[pole] = (U[-1, 0], V[-1, 0])
    for i in range(n_t - 2):
        A, B = rows[i], rows[i + 1]
        for j in range(n_phi):
            j2 = (j + 1) % n_phi
            bm.faces.new((A[j], A[j2], B[j2], B[j]))
    if close_top:
        A = rows[-1]
        for j in range(n_phi):
            bm.faces.new((A[j], A[(j + 1) % n_phi], pole))
    for f in bm.faces:
        for l in f.loops:
            l[uvl].uv = uv_of[l.vert]
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    # Normales sortantes : la première face doit pointer vers l'extérieur
    f0 = bm.faces[len(bm.faces) // 3]
    c = f0.calc_center_median()
    if f0.normal.dot(Vector((c.x, 0, c.z))) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def decimate(bm, target_tris):
    me = bpy.data.meshes.new('tmp_dec')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('tmp_dec', me)
    bpy.context.scene.collection.objects.link(ob)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    mod = ob.modifiers.new('dec', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = min(1.0, target_tris / tris)
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    out = bmesh.new()
    out.from_mesh(ev.to_mesh())
    ev.to_mesh_clear()
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    print(f'  décimation : {tris} -> {len(out.faces)} tri')
    return out


def split_by(bm, keep):
    """Copie d'un bmesh ne gardant que les faces dont le centre vérifie keep(c)."""
    out = bm.copy()
    kill = [f for f in out.faces if not keep(f.calc_center_median())]
    bmesh.ops.delete(out, geom=kill, context='FACES')
    loose = [v for v in out.verts if not v.link_faces]
    bmesh.ops.delete(out, geom=loose, context='VERTS')
    return out


def solid_shell(bm, thickness, inner_mat, uv_scale=20.0):
    """Épaissit une surface ouverte vers l'intérieur (épaisseur variable), avec flancs de coupe."""
    uvl = bm.loops.layers.uv.active
    bm.normal_update()
    outer = list(bm.faces)
    vmap = {}
    for v in list(bm.verts):
        nv = bm.verts.new(v.co - v.normal * thickness(v.co))
        vmap[v] = nv
    inner = []
    for f in outer:
        nf = bm.faces.new([vmap[v] for v in reversed(f.verts)])
        nf.material_index = inner_mat
        inner.append(nf)
    rim = []
    for e in [e for e in bm.edges if e.is_boundary and e.link_faces and e.link_faces[0] in outer]:
        a, b = e.verts
        try:
            nf = bm.faces.new((a, b, vmap[b], vmap[a]))
        except ValueError:
            continue
        nf.material_index = inner_mat
        rim.append(nf)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    box_uv(bm, uvl, uv_scale, inner + rim)
    return inner, rim


def in_prism(p, margin):
    """Point (Y-up) dans le volume du prisme posé sur le plateau, avec une marge."""
    h = p.y - Y_CUT
    if h < -margin or h > PRISM_H + margin or abs(p.z) > PRISM_D / 2 + margin:
        return False
    return abs(p.x) < (PRISM_W / 2 + margin) * max(0.0, 1 - h / (PRISM_H + margin))


def add_crystals(bm, faces, rng, clusters, mat_index):
    """Grappes de cristaux hexagonaux plantées sur les faces intérieures (géode), pointe vers la cavité."""
    from bisect import bisect
    from itertools import accumulate
    faces = [f for f in faces if f.is_valid and f.calc_center_median().y < Y_CUT + 105
             and f.normal.dot(Vector((-f.calc_center_median().x, 0, -f.calc_center_median().z))) > 0
             and abs(f.calc_center_median().x) > 25]
    cum = list(accumulate(f.calc_area() for f in faces))
    count = 0
    for _ in range(clusters):
        f = faces[min(bisect(cum, rng.random() * cum[-1]), len(faces) - 1)]
        vs = [v.co for v in f.verts]
        a, b = rng.random(), rng.random()
        if a + b > 1:
            a, b = 1 - a, 1 - b
        c0 = vs[0] + (vs[1] - vs[0]) * a + (vs[2] - vs[0]) * b
        nrm = f.normal.copy()
        t1 = nrm.orthogonal().normalized()
        t2 = nrm.cross(t1)
        for j in range(rng.randint(3, 7)):
            ang = rng.uniform(0, 2 * pi)
            off = rng.uniform(0, 9.0) if j else 0.0
            p = c0 + (t1 * cos(ang) + t2 * sin(ang)) * off
            dvec = (nrm + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.5).normalized()
            if dvec.dot(nrm) < 0.35:
                continue
            side = 1.0 if c0.x > 0 else -1.0
            radial = hypot(p.x, p.z)
            L = min(rng.uniform(9.0, 24.0) * (1.3 if j == 0 else 1.0), 0.55 * radial)

            def bad(q):
                return (in_prism(q, 5.0) or in_prism(p + (q - p) * 0.5, 4.0) or q.y < Y_CUT + 3.0
                        or q.x * side < 4.0 or hypot(q.x, q.z) > radial - 2.0)
            while L > 3.0 and bad(p + dvec * L):
                L *= 0.8
            if L <= 3.0:
                continue
            r = L * rng.uniform(0.13, 0.2)
            e1 = dvec.orthogonal().normalized()
            e2 = dvec.cross(e1)
            rot = rng.uniform(0, pi)
            ring0, ring1 = [], []
            for q in range(6):
                aa = rot + q * pi / 3
                w = e1 * cos(aa) + e2 * sin(aa)
                ring0.append(bm.verts.new(p - dvec * 2.0 + w * r))
                ring1.append(bm.verts.new(p + dvec * (L * 0.76) + w * r * 0.92))
            tip = bm.verts.new(p + dvec * L)
            for q in range(6):
                q2 = (q + 1) % 6
                fa = bm.faces.new((ring0[q], ring0[q2], ring1[q2], ring1[q]))
                fb = bm.faces.new((ring1[q], ring1[q2], tip))
                for ff in (fa, fb):
                    ff.material_index = mat_index
                    ff.smooth = False
                    ctr = ff.calc_center_median()
                    axis = p + dvec * dvec.dot(ctr - p)
                    orient(ff, (ctr - axis).normalized() if (ctr - axis).length > 1e-6 else dvec)
            count += 1
    uvl = bm.loops.layers.uv.active
    for f in bm.faces:
        if f.material_index == mat_index:
            for l in f.loops:
                l[uvl].uv = (0.5, 0.5)
    return count


def build_mountain():
    C = new_coll('Mountain')
    # ---------------------------------------------------------------- maillage (définition moyenne)
    P, P0, t, phi, F = mountain_surface(900, 360, hd=False)
    TT, PH = np.meshgrid(t, phi, indexing='ij')
    U, V = polar_uv(TT, PH)
    bm = grid_bmesh(P, U, V)
    bm = decimate(bm, 64000)
    uvl = bm.loops.layers.uv.active
    # ---------------------------------------------------------------- coupe du plateau (y = Y_CUT)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, dist=0.01, plane_co=(0, Y_CUT, 0), plane_no=(0, 1, 0))
    low = split_by(bm, lambda c: c.y < Y_CUT)
    up = split_by(bm, lambda c: c.y > Y_CUT)
    bm.free()
    # Plateau : remplissage du trou, UV dans le coin bas-gauche de l'atlas (normale cuite vers le haut)
    luv = low.loops.layers.uv.active
    cut = [e for e in low.edges if e.is_boundary and all(abs(v.co.y - Y_CUT) < 0.05 for v in e.verts)]
    ring = {v for e in cut for v in e.verts}
    cx = sum(v.co.x for v in ring) / len(ring)
    cz = sum(v.co.z for v in ring) / len(ring)
    rmin = min(hypot(v.co.x, v.co.z) for v in ring)
    res = bmesh.ops.triangle_fill(low, use_beauty=True, use_dissolve=False, edges=cut, normal=(0, 1, 0))
    cap = [g for g in res['geom'] if isinstance(g, bmesh.types.BMFace)]
    for f in cap:
        f.normal_update()
        if f.normal.y < 0:
            f.normal_flip()
    pu0, pv0, k = PLATEAU_UV
    for f in cap:
        for l in f.loops:
            l[luv].uv = (pu0 + l.vert.co.x * k, pv0 + l.vert.co.z * k)
    print(f'  plateau : anneau de {len(ring)} sommets, centre ({cx:.1f}, {cz:.1f}), rayon mini {rmin:.1f} m')
    mountain = bm_to_object(low, 'Mountain', C, ['MountainRock'])
    # ---------------------------------------------------------------- pointe : deux coques
    geom = up.verts[:] + up.edges[:] + up.faces[:]
    bmesh.ops.bisect_plane(up, geom=geom, dist=0.01, plane_co=(0, 0, 0), plane_no=(1, 0, 0))
    shells = {}
    for side, keep in (('L', lambda c: c.x < 0), ('R', lambda c: c.x > 0)):
        sh = split_by(up, keep)
        ring_x = [v.co.x for v in sh.verts if abs(v.co.y - Y_CUT) < 0.05]
        hx = min(ring_x) if side == 'L' else max(ring_x)

        def thick(co):
            return float(np.clip(0.30 * hypot(co.x, co.z), 3.0, 22.0))
        inner, _rim = solid_shell(sh, thick, 1)
        n = add_crystals(sh, inner, random.Random(77 if side == 'L' else 91), 30, 2)
        print(f'  géode {side} : {n} cristaux')
        shells[side] = (sh, hx)
    up.free()
    out = {}
    for side, (sh, hx) in shells.items():
        out[side] = bm_to_object(sh, f'Summit_Shell_{side}', C, ['MountainRock', 'SummitInner', 'SummitCrystal'],
                                 origin=(hx, Y_CUT, 0.0))
        print(f'  charnière {side} : x = {hx:.1f} m, y = {Y_CUT}')
    return mountain, out


# =============================================================================== cuisson des cartes de la montagne
def bilinear_grid(A, ti, fi):
    """Échantillonne A (n_t, n_phi, ...) aux indices flottants (ti, fi), enroulé en azimut."""
    n_t, n_phi = A.shape[:2]
    t0 = np.clip(np.floor(ti).astype(np.int64), 0, n_t - 2)
    ft = np.clip(ti - t0, 0, 1)
    f0 = np.floor(fi).astype(np.int64)
    ff = fi - f0
    f0 %= n_phi
    f1 = (f0 + 1) % n_phi
    if A.ndim == 3:
        ft = ft[:, None]
        ff = ff[:, None]
    a = A[t0, f0] * (1 - ff) + A[t0, f1] * ff
    b = A[t0 + 1, f0] * (1 - ff) + A[t0 + 1, f1] * ff
    return a * (1 - ft) + b * ft


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def tex_sample(img, u, v):
    """Échantillonnage bilinéaire répété d'une image (h, w, 3), u et v en tuiles."""
    h, w = img.shape[:2]
    x = (u * w) % w
    y = (v * h) % h
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = (x - x0)[:, None]
    fy = (y - y0)[:, None]
    x1 = (x0 + 1) % w
    y1 = (y0 + 1) % h
    return (img[y0, x0] * (1 - fx) + img[y0, x1] * fx) * (1 - fy) + (img[y1, x0] * (1 - fx) + img[y1, x1] * fx) * fy


def triplanar(img, P, N, scale, sharp=4.0):
    w = np.abs(N) ** sharp
    w /= w.sum(1, keepdims=True)
    cx = tex_sample(img, P[:, 2] / scale, P[:, 1] / scale)
    cy = tex_sample(img, P[:, 0] / scale, P[:, 2] / scale)
    cz = tex_sample(img, P[:, 0] / scale, P[:, 1] / scale)
    return cx * w[:, :1] + cy * w[:, 1:2] + cz * w[:, 2:3]


def bake_mountain():
    """Cartes de la montagne en espace texture (polaire) : couleur sRGB et normales en espace objet."""
    t0 = time.time()
    n_phi, n_t = 4096, 1024
    P, P0, t, phi, F = mountain_surface(n_phi, n_t, hd=True)
    Nn = grid_normals(P)
    # Occlusion : creux à petite et grande échelle (déplacement moins sa moyenne locale)
    D = F['D']
    cav_s = D - blur_grid(D, 3, 8)
    cav_l = D - blur_grid(D, 14, 40)
    S_ = BAKE_SIZE
    jj, ii = np.meshgrid(np.arange(S_), np.arange(S_), indexing='ij')   # jj : ligne (v), ii : colonne (u)
    u = (ii.reshape(-1) + 0.5) / S_
    v = (jj.reshape(-1) + 0.5) / S_
    du, dv = u - 0.5, v - 0.5
    rho = np.hypot(du, dv)
    tt = atlas_t(rho)
    ph = np.arctan2(du, dv) % (2 * np.pi)
    ti = tt * (n_t - 1)
    fi = ph / (2 * np.pi) * n_phi
    Pt = bilinear_grid(P, ti, fi)
    Nt = bilinear_grid(Nn, ti, fi)
    Nt /= np.maximum(np.linalg.norm(Nt, axis=1, keepdims=True), 1e-9)
    f = {k: bilinear_grid(F[k], ti, fi) for k in ('couloir', 'hard', 'joints', 'macro', 'rib', 'panel', 'steep')}
    cs = bilinear_grid(cav_s, ti, fi)
    cl = bilinear_grid(cav_l, ti, fi)
    # ---------------------------------------------------------------- plateau (coin bas-gauche de l'atlas)
    # Pierre taillée, normale vers le haut, gravures : cercles, 12 rayons (le chœur), cadre autour du prisme
    pu0, pv0, k = PLATEAU_UV
    plat = (u < pu0 + 0.07) & (v < pv0 + 0.07) & (rho > 0.5)
    n_c = int(np.ceil((pu0 + 0.07) * S_))
    gx = ((np.arange(n_c) + 0.5) / S_ - pu0) / k
    GX, GZ = np.meshgrid(gx, gx)                 # lignes : v (z), colonnes : u (x)
    rr = np.hypot(GX, GZ)
    aa = np.arctan2(GX, GZ)

    def groove(dist, w=1.1):
        return 1 - smoothstep(0.5 * w, 1.5 * w, dist)

    gro = np.zeros_like(rr)
    for r0 in (88.0, 100.0, 146.0, 154.0):
        gro = np.maximum(gro, groove(np.abs(rr - r0)))
    for i in range(12):
        a0 = radians(15 + 30 * i)
        dd = np.abs(_wrap(aa - a0)) * rr
        gro = np.maximum(gro, groove(dd) * (rr > 100) * (rr < 146))
    rect = np.maximum(np.abs(GX) - PRISM_W / 2 - 9.0, np.abs(GZ) - PRISM_D / 2 - 9.0)
    gro = np.maximum(gro, groove(np.abs(rect)))
    hgt = -0.9 * gro
    dhz, dhx = np.gradient(hgt, gx, gx)
    pn_ = np.stack([-dhx, np.ones_like(hgt), -dhz], -1)
    pn_ /= np.linalg.norm(pn_, axis=-1, keepdims=True)
    jj_p = (v[plat] * S_).astype(np.int64)
    ii_p = (u[plat] * S_).astype(np.int64)
    Pt[plat, 0] = gx[ii_p]
    Pt[plat, 2] = gx[jj_p]
    Pt[plat, 1] = Y_CUT
    Nt[plat] = pn_[jj_p, ii_p]
    # ---------------------------------------------------------------- couleur (albédo linéaire)
    LUM = np.array([0.2126, 0.7152, 0.0722])
    src = {name: srgb_to_lin(np.load(os.path.join(BAKE, f'{name}-128.npy'))) for name, _ in BAKE_SOURCES}

    def norm_to(c, mean):
        return c / max(float((c @ LUM).mean()), 1e-6) * mean

    cliff = triplanar(src['src-cliff'], Pt, Nt, 70.0) * 0.55 + triplanar(src['src-cliff'], Pt, Nt, 240.0) * 0.45
    cliff = norm_to(cliff * 0.3 + (cliff @ LUM)[:, None] * 0.7, 0.085) * np.array([0.93, 0.95, 1.0])
    scree = triplanar(src['src-scree'], Pt, Nt, 52.0)
    scree = norm_to(scree * 0.25 + (scree @ LUM)[:, None] * 0.75, 0.13) * np.array([1.0, 0.97, 0.93])
    sand = tex_sample(src['src-sand'], Pt[:, 0] / 36.0, Pt[:, 2] / 36.0) @ LUM
    sand = norm_to(sand[:, None] * np.ones(3), 0.045) * np.array([0.93, 0.95, 1.0])
    stone = triplanar(src['src-stone'], Pt, Nt, 34.0) @ LUM
    stone = norm_to(stone[:, None] * np.ones(3), 0.2) * np.array([1.0, 0.96, 0.92])
    up = Nt[:, 1]
    y = Pt[:, 1]
    st = f['steep']
    # Replats et vires : éboulis plus clairs (poussière) ; tablier : sable noir
    flat = smoothstep(0.55, 0.85, up)
    col = cliff * (1 - flat[:, None] * 0.85) + scree * (flat[:, None] * 0.85)
    apron = 1 - smoothstep(40, 240, y)
    sandw = np.clip(apron * 0.92 + flat * 0.2 * (1 - smoothstep(250, 800, y)), 0, 1) * smoothstep(0.3, 0.7, up)
    col = col * (1 - sandw[:, None]) + sand * sandw[:, None]
    # Bancs durs plus clairs et ocrés ; crêtes des cannelures claires, couloirs et coulures sombres
    col *= (1 + 0.22 * f['hard'])[:, None] * (np.array([1.0, 0.95, 0.89]) ** f['hard'][:, None])
    col *= (0.82 + 0.36 * np.clip(f['rib'], 0, 1) * st)[:, None]
    streak = fbm(np.stack([Pt[:, 0] / 16, Pt[:, 1] / 170, Pt[:, 2] / 16], 1).astype(np.float32), 3, seed=21)
    col *= (1 - 0.32 * smoothstep(0.05, 0.55, streak) * st)[:, None]
    col *= (1 - 0.4 * f['couloir'] * st)[:, None]
    # Teinte à grande échelle : gris violacé / ocre sombre
    hue = fbm((Pt / 460).astype(np.float32), 3, seed=22)
    col *= (1 + 0.12 * hue[:, None] * np.array([1.0, 0.3, -0.7]))
    # Occlusion : creux sombres, arêtes usées claires, pied dans l'ombre de la plaine
    ao = np.clip(1 + 0.05 * cs, 0.35, 1.2) * np.clip(1 + 0.011 * cl, 0.45, 1.15)
    ao *= 1 - 0.18 * f['joints']
    ao *= 0.7 + 0.3 * smoothstep(-40, 360, y)
    col *= ao[:, None]
    # Niche du B : pierre taillée claire, ombre de contact au pied du relief
    pan = np.clip(f['panel'], 0, 1)
    pu, pv, pn = panel_coords(Pt)
    occl = np.ones(len(u))
    sel = pan > 0.01
    if sel.any():
        sd = b_sdf(pu[sel], pv[sel])
        occl[sel] = 1 - 0.6 * np.exp(-np.maximum(sd, 0) / 5.0) - 0.25 * np.exp(-np.maximum(sd, 0) / 18.0)
    col = col * (1 - pan[:, None]) + stone * pan[:, None] * occl[:, None]
    # Plateau : dalle polie sombre au centre, couronne claire, gravures sombres
    pp = col[plat]
    rp = np.hypot(Pt[plat, 0], Pt[plat, 2])
    base_p = stone[plat] * (0.55 + 0.35 * smoothstep(96, 104, rp))[:, None]
    col[plat] = base_p * (1 - 0.55 * gro[jj_p, ii_p])[:, None] + pp * 0.0
    srgb = lin_to_srgb(col)
    color = (srgb.reshape(S_, S_, 3) * 255 + 0.5).astype(np.uint8)
    # ---------------------------------------------------------------- normales (espace objet glTF, Y-up)
    nrm = ((Nt * 0.5 + 0.5).reshape(S_, S_, 3) * 255 + 0.5).astype(np.uint8)
    os.makedirs(BAKE, exist_ok=True)
    np.save(os.path.join(BAKE, 'mountain-color.npy'), color)
    np.save(os.path.join(BAKE, 'mountain-normal.npy'), nrm)
    print(f'  cuisson {S_}² : {time.time() - t0:.1f} s')


def baked_images():
    """Images Blender (vignettes) depuis les cartes cuites : couleur, normales converties en Z-up."""
    color = np.load(os.path.join(BAKE, 'mountain-color.npy'))
    nrm = np.load(os.path.join(BAKE, 'mountain-normal.npy')).astype(np.float32) / 255 * 2 - 1
    nb = np.stack([nrm[..., 0], -nrm[..., 2], nrm[..., 1]], -1)   # Y-up -> Blender Z-up
    out = {}
    for name, arr, cs in (('mountain-color', color.astype(np.float32) / 255, 'sRGB'),
                          ('mountain-normal-b', nb * 0.5 + 0.5, 'Non-Color')):
        h, w = arr.shape[:2]
        img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=False)
        img.colorspace_settings.name = cs
        px = np.ones((h, w, 4), np.float32)
        px[..., :3] = arr
        img.pixels.foreach_set(px.reshape(-1))
        img.pack()
        out[name] = img
    return out


def wire_mountain_material(imgs):
    m = MAT['MountainRock']
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexImage')
    tc.image = imgs['mountain-color']
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = imgs['mountain-normal-b']
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.space = 'OBJECT'
    nt.links.new(tc.outputs['Color'], p.inputs['Base Color'])
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])


# =============================================================================== B sculpté
def curve_fill(polys, depth, bevel, res=3):
    cu = bpy.data.curves.new('tmp_fill', 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = res
    cu.offset = -bevel * 0.0
    for poly in polys:
        sp = cu.splines.new('POLY')
        sp.points.add(len(poly) - 1)
        for p, (x, y) in zip(sp.points, poly):
            p.co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    ob = bpy.data.objects.new('tmp_curve', cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    ev.to_mesh_clear()
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    return bm


def build_b():
    C = COLLS['Mountain']
    o, U, V, N = WALL
    # Fond du panneau : paroi (origine o) reculée de B_RECESS le long de N. Le B part 3 m sous le fond.
    back = o - N * B_RECESS
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    # Relief : fût le plus saillant, panses ensuite (pas de faces coplanaires qui se chevauchent)
    reliefs = {'white': 17.0, '#eea499': 14.5}
    for k, (colr, polys) in enumerate(LOGO):
        depth = reliefs.get(colr, 14.5) - 0.6 * k + 3.0
        for poly in polys:
            pts = [logo_to_plane(x, y) for x, y in poly]
            part = curve_fill([pts], depth, 0.0, 0)
            # Le remplissage est centré en z : on le pose de -3 m (enfoui) à depth - 3 m
            bmesh.ops.translate(part, vec=Vector((0, 0, depth / 2 - 3.0)), verts=part.verts)
            # Arête avant arrondie (bmesh, avec clamp : pas d'épines aux pointes très aiguës du logo)
            ztop = depth - 3.0
            part.normal_update()
            edges = [e for e in part.edges if all(abs(v.co.z - ztop) < 1e-3 for v in e.verts)
                     and any(abs(f.normal.z) < 0.5 for f in e.link_faces)]
            bmesh.ops.bevel(part, geom=edges, offset=4.0, offset_type='OFFSET', segments=3, profile=0.5,
                            affect='EDGES', clamp_overlap=True)
            M = Matrix(((U[0], V[0], N[0], back[0]), (U[1], V[1], N[1], back[1]), (U[2], V[2], N[2], back[2]),
                        (0, 0, 0, 1)))
            bmesh.ops.transform(part, matrix=M, verts=part.verts)
            me = bpy.data.meshes.new('tmp')
            part.to_mesh(me)
            part.free()
            bm.from_mesh(me)
            bpy.data.meshes.remove(me)
    uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
    bm.normal_update()
    # UV : plan du panneau, 1 tuile = 24 m
    for f in bm.faces:
        for l in f.loops:
            d = Vector(l.vert.co) - Vector(back)
            l[uvl].uv = (d.dot(Vector(U)) / 24.0, d.dot(Vector(V)) / 24.0)
    center = back + N * 6.0
    ob = bm_to_object(bm, 'Mountain_B', C, ['MountainB'], origin=tuple(center), sharp=50)
    return ob


# =============================================================================== prisme
def rounded_triangle(w, h, r, n=5):
    pts3 = [(-w / 2, 0.0), (w / 2, 0.0), (0.0, h)]
    out = []
    for i in range(3):
        p = Vector(pts3[i])
        a = Vector(pts3[i - 1])
        b = Vector(pts3[(i + 1) % 3])
        da = (a - p).normalized()
        db = (b - p).normalized()
        ang = math.acos(max(-1, min(1, da.dot(db))))
        dist = r / tan(ang / 2)
        bis = (da + db).normalized()
        c = p + bis * (r / sin(ang / 2))
        p1 = p + da * dist
        p2 = p + db * dist
        a1 = atan2(p1.y - c.y, p1.x - c.x)
        a2 = atan2(p2.y - c.y, p2.x - c.x)
        while a2 > a1:
            a2 -= 2 * pi
        for k in range(n + 1):
            aa = a1 + (a2 - a1) * k / n
            out.append((c.x + r * cos(aa), c.y + r * sin(aa)))
    # Sens trigonométrique
    area = sum(out[i][0] * out[(i + 1) % len(out)][1] - out[(i + 1) % len(out)][0] * out[i][1]
               for i in range(len(out)))
    return out if area > 0 else out[::-1]


def build_prism():
    C = COLLS['Mountain']
    tri = rounded_triangle(PRISM_W, PRISM_H, 2.5, 4)
    bm = bmesh.new()
    rings = []
    ch = 1.2
    for z, inset in ((-PRISM_D / 2, ch), (-PRISM_D / 2 + ch, 0.0), (PRISM_D / 2 - ch, 0.0), (PRISM_D / 2, ch)):
        # Retrait du chanfrein : homothétie vers le centre du triangle
        cy = PRISM_H / 3
        rings.append([bm.verts.new((x * (1 - inset / 40), cy + (y - cy) * (1 - inset / 40) + 0.0, z))
                      for x, y in tri])
    n = len(tri)
    for A, B in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((A[i], A[j], B[j], B[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # Base posée à y = 0 (le chanfrein relève légèrement le bas), hauteur ramenée à PRISM_H
    ymin = min(v.co.y for v in bm.verts)
    ymax = max(v.co.y for v in bm.verts)
    k = PRISM_H / (ymax - ymin)
    bmesh.ops.translate(bm, vec=Vector((0, -ymin, 0)), verts=bm.verts)
    bmesh.ops.scale(bm, vec=Vector((k, k, 1.0)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, Y_CUT, 0)), verts=bm.verts)
    return bm_to_object(bm, 'Summit_Prism', C, ['SummitGlass'], origin=(0.0, Y_CUT, 0.0), sharp=30)


# =============================================================================== rochers
def build_rock(name, size, seed, coll):
    rng = random.Random(seed)
    bm = bmesh.new()
    ax = (1.0, 0.62 + 0.2 * rng.random(), 0.78 + 0.2 * rng.random())
    vs = []
    for _ in range(40):
        z = rng.uniform(-1, 1)
        a = rng.uniform(0, 2 * pi)
        r = sqrt(1 - z * z)
        k = 0.78 + 0.22 * rng.random()
        vs.append(bm.verts.new((r * cos(a) * ax[0] * k * size / 2, z * ax[1] * k * size / 2,
                                r * sin(a) * ax[2] * k * size / 2)))
    res = bmesh.ops.convex_hull(bm, input=vs)
    bmesh.ops.delete(bm, geom=list({g for g in res["geom_interior"] + res["geom_unused"]
                               if isinstance(g, bmesh.types.BMVert)}), context="VERTS")
    # Cassures : plans qui tranchent des éclats
    for _ in range(3):
        nrm = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        co = nrm * size * 0.5 * rng.uniform(0.55, 0.75)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r2 = bmesh.ops.bisect_plane(bm, geom=geom, dist=0.001, plane_co=co, plane_no=nrm, clear_outer=True)
        edges = [e for e in r2['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    pts = np.array([v.co[:] for v in bm.verts], np.float32)
    nz = fbm(pts / (size * 0.45) + seed, 3, seed=seed)
    for v, d in zip(bm.verts, nz):
        v.co += v.co.normalized() * float(d) * size * 0.07
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    c = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    bmesh.ops.translate(bm, vec=-c, verts=bm.verts)
    bm.normal_update()
    uvl = bm.loops.layers.uv.new('UVMap')
    box_uv(bm, uvl, 4.0)
    return bm_to_object(bm, name, coll, ['RockDebris'], sharp=38)


# =============================================================================== colosse du chœur
def loft(rings, bm, cap_bottom=False, cap_top=False):
    """Peau entre des boucles fermées de même taille (sens croissant = normales sortantes)."""
    rows = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rows[0])
    faces = []
    for A, B in zip(rows, rows[1:]):
        for i in range(n):
            j = (i + 1) % n
            faces.append(bm.faces.new((A[i], A[j], B[j], B[i])))
    if cap_bottom:
        faces.append(bm.faces.new(rows[0][::-1]))
    if cap_top:
        faces.append(bm.faces.new(rows[-1]))
    return rows, faces


def interp_table(table, y):
    table = sorted(table)
    ys = [r[0] for r in table]
    return [float(pchip(ys, [r[k] for r in table], np.array([y]))[0]) for k in range(1, len(table[0]))]


def sm(e0, e1, x):
    return float(smoothstep(e0, e1, np.array([x]))[0])


def catmull(pts, n=6):
    P = [Vector(p) for p in pts]
    m = len(P)
    out = []
    for i in range(m - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1].copy())
    return out


def frames_along(path, up):
    n = len(path)
    out = []
    for i in range(n):
        t = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        t.normalize()
        u = Vector(up)
        nn = u - t * u.dot(t)
        nn.normalize()
        out.append((t, nn, t.cross(nn)))
    return out


def orient(f, expected):
    f.normal_update()
    if f.normal.dot(expected) < 0:
        f.normal_flip()


def robe_folds(phi, y):
    """Plis profonds de la robe (m) : crêtes vives, creux ronds, plus amples vers l'ourlet."""
    a = (1 - smoothstep(2, 52, y)) * 1.1 + 0.45
    front = 0.6 + 0.4 * np.cos(phi) ** 2
    s1 = np.cos(13 * phi + 0.3 * np.sin(y / 11.0) + 0.4)
    s2 = np.cos(26 * phi + 0.5 * np.sin(y / 7.0 + 1.0) + 1.3)
    s3 = np.cos(5 * phi + 0.2 * np.sin(y / 17.0) + 2.1)
    f = 1.7 * np.sign(s1) * np.abs(s1) ** 0.35 + 0.45 * s2 + 0.6 * s3
    # Cascade de plis sous les mains : creux central profond entre deux crêtes
    pw_ = (phi + np.pi) % (2 * np.pi) - np.pi
    cascade = (-2.2 * np.exp(-(pw_ / 0.07) ** 2) + 1.1 * np.exp(-((np.abs(pw_) - 0.17) / 0.07) ** 2))         * (1 - smoothstep(30, 50, y))
    return f * a * front + cascade


FACE_C = Vector((0.0, 70.2, 1.7))
FACE_W, FACE_H = 2.75, 4.1


def face_z(u, v):
    z = 2.6 * sqrt(max(0.0, 1 - 0.85 * u * u - 0.55 * v * v))
    z += 0.6 * math.exp(-(u / 0.13) ** 2) * math.exp(-((v + 0.02) / 0.32) ** 2)          # nez
    z += 0.32 * math.exp(-((v - 0.36) / 0.11) ** 2) * (1 - u * u)                      # arcade
    z -= 0.3 * math.exp(-((abs(u) - 0.40) / 0.15) ** 2) * math.exp(-((v - 0.2) / 0.12) ** 2)  # orbites
    z += 0.22 * math.exp(-((abs(u) - 0.5) / 0.2) ** 2) * math.exp(-((v + 0.12) / 0.18) ** 2)  # pommettes
    z -= 0.25 * math.exp(-(u / 0.22) ** 2) * math.exp(-((v + 0.47) / 0.16) ** 2)         # bouche ouverte
    return z


def face_pt(u, v, off=0.0):
    return FACE_C + Vector((u * FACE_W, v * FACE_H, face_z(u, v) + off))


def build_statue():
    C = new_coll('Choir')
    NP = 120
    phis = np.linspace(0, 2 * np.pi, NP, endpoint=False)
    bm = bmesh.new()
    # ------------------------------------------------------------ robe : (y, demi-largeur, demi-profondeur, z du centre)
    BODY = [(0.0, 15.6, 12.2, 0.5), (1.2, 14.9, 11.6, 0.5), (4.0, 13.8, 10.6, 0.4), (12, 12.7, 9.5, 0.3),
            (24, 11.8, 8.7, 0.2), (36, 11.2, 8.1, 0.1), (44, 10.6, 7.6, 0.0), (50, 10.9, 7.6, 0.2),
            (56, 11.2, 7.5, 0.3), (60, 11.0, 7.0, 0.2), (63, 9.6, 6.4, 0.0), (65.5, 7.0, 5.6, -0.2),
            (67, 4.5, 4.4, -0.3)]
    rings = []
    for y in list(np.linspace(0, 4, 6)) + list(np.linspace(5, 67, 56)):
        hx, hz, zc = interp_table(BODY, y)
        f = robe_folds(phis, y) * (1 - sm(52, 62, y))
        f = f - 0.55 * math.exp(-((y - 44.0) / 1.3) ** 2) + 0.6 * math.exp(-((y - 45.7) / 0.55) ** 2)
        hem = 1.6 * math.exp(-((y - 0.4) / 1.0) ** 2)
        rx, rz = hx + f + hem, hz + f + hem
        rings.append([(float(rx[i] * sin(phis[i])), float(y), float(zc + rz[i] * cos(phis[i]))) for i in range(NP)])
    loft(rings, bm, cap_bottom=True)
    # ------------------------------------------------------------ pèlerine sur les épaules (ourlet relevé devant)
    MANT = [(68.5, 6.4, 5.8, -0.6), (66, 9.9, 7.2, -0.4), (63, 12.9, 8.6, -0.2), (60, 13.8, 9.1, 0.0),
            (56, 14.1, 9.4, 0.2), (51, 14.0, 9.4, 0.2)]
    rings = []
    for y in np.linspace(68.5, 51, 18):
        hx, hz, zc = interp_table(MANT, y)
        f = (0.6 * np.cos(11 * phis + 0.3) + 0.28 * np.cos(23 * phis + 1.0)) * sm(67, 57, y)
        rings.append([(float((hx + f[i]) * sin(phis[i])), float(y), float(zc + (hz + f[i]) * cos(phis[i])))
                      for i in range(NP)])
    rows, faces = loft(rings, bm)
    for k, row in enumerate(rows[-6:]):
        w = (k + 1) / 6
        for i, v in enumerate(row):
            fr = max(0.0, cos(phis[i])) ** 1.4
            v.co.y += 5.5 * fr * w ** 1.5
    for f in faces:          # anneaux en y décroissant : normales à retourner vers l'extérieur
        c = f.calc_center_median()
        orient(f, Vector((c.x, 0, c.z)).normalized())
    inner = [bm.verts.new((v.co.x * 0.94, v.co.y + 0.15, v.co.z * 0.94)) for v in rows[-1]]
    for i in range(NP):
        j = (i + 1) % NP
        orient(bm.faces.new((rows[-1][j], rows[-1][i], inner[i], inner[j])), Vector((0, -1, 0)))
    # ------------------------------------------------------------ capuche, ouverture creusée devant (visage dans l'ombre)
    HOOD = [(63.0, 7.3, 7.3, 0.5), (66, 7.6, 8.0, 0.8), (70, 7.4, 8.3, 0.6), (74, 6.7, 7.9, 0.0),
            (77, 5.4, 6.7, -0.9), (79, 3.3, 4.5, -2.0), (80.2, 0.9, 1.6, -3.0)]
    rings = []
    for y in np.linspace(63, 80.2, 34):
        hx, hz, zc = interp_table(HOOD, y)
        ey = (y - 70.4) / 7.4
        ring = []
        for a in phis:
            aw = (a + pi) % (2 * pi) - pi
            e = (aw / radians(50)) ** 2 + ey ** 2
            dent = 6.2 * sm(1.0, 0.70, e)
            roll = 0.6 * math.exp(-((e - 1.05) / 0.08) ** 2)
            fold = 0.32 * cos(9 * a + y / 5.0) * sm(radians(55), radians(75), abs(aw))
            rx = hx + roll + fold - dent
            rz = hz + roll + fold - dent
            ring.append((rx * sin(a), y, zc + rz * cos(a)))
        rings.append(ring)
    loft(rings, bm, cap_top=True)
    # ------------------------------------------------------------ visage (pierre), dans le creux de la capuche
    NU, NV = 18, 14
    grid = [[bm.verts.new(face_pt(-1 + 2 * i / NU, -1 + 2 * k / NV)) for i in range(NU + 1)] for k in range(NV + 1)]
    for k in range(NV):
        for i in range(NU):
            orient(bm.faces.new((grid[k][i], grid[k][i + 1], grid[k + 1][i + 1], grid[k + 1][i])), Vector((0, 0, 1)))
    # ------------------------------------------------------------ manches (cloches tombantes jusqu'aux mains)
    for s in (1, -1):
        ctrl = [(10.2, 61.5, -0.6), (12.4, 55.2, 0.5), (12.2, 48.6, 3.0), (9.6, 46.6, 6.6), (5.9, 48.4, 9.0),
                (3.5, 50.0, 10.1)]
        path = catmull([(s * x, y, z) for x, y, z in ctrl], 6)
        fr = frames_along(path, (0, 0, 1))
        NA = 44
        rings = []
        for k, (p, (tg, nn, bb)) in enumerate(zip(path, fr)):
            tk = k / (len(path) - 1)
            r = float(pchip([0, 0.3, 0.55, 0.8, 1.0], [3.0, 3.2, 3.4, 3.9, 4.6], np.array([tk]))[0])
            ring = []
            for q in range(NA):
                a = -2 * pi * q / NA
                d = bb * cos(a) + nn * sin(a)
                rr = r * (1 + 0.07 * cos(7 * a + 3 * tk) + 0.09 * cos(4 * a + 1) * math.exp(-((tk - 0.45) / 0.12) ** 2))
                pt = p + d * rr
                pt.y -= 15.0 * sm(0.3, 1.0, tk) ** 1.3 * max(0.0, -d.y) ** 0.9
                ring.append(pt)
            rings.append(ring)
        rows, faces = loft(rings, bm)
        for f, k in zip(faces, [k for k in range(len(rings) - 1) for _ in range(NA)]):
            orient(f, (f.calc_center_median() - path[k]).normalized())
        end = rows[-1]
        tg = fr[-1][0]
        cen = sum((v.co for v in end), Vector()) / len(end)
        lip = [bm.verts.new(cen + (v.co - cen) * 0.84 - tg * 0.5) for v in end]
        deep = [bm.verts.new(cen + (v.co - cen) * 0.6 - tg * 3.5) for v in end]
        for i in range(NA):
            j = (i + 1) % NA
            orient(bm.faces.new((end[i], end[j], lip[j], lip[i])), tg)
            mid = (lip[i].co + lip[j].co) / 2
            orient(bm.faces.new((lip[i], lip[j], deep[j], deep[i])), (cen - mid).normalized())
        orient(bm.faces.new(deep), tg)
    # ------------------------------------------------------------ UV : cylindrique autour du colosse (1 tuile = 8 m)
    uvl = bm.loops.layers.uv.new('UVMap')
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        if abs(f.normal.y) > 0.82:
            for l in f.loops:
                l[uvl].uv = (l.vert.co.x / 8.0, l.vert.co.z / 8.0)
            continue
        ac = atan2(c.x, c.z)
        for l in f.loops:
            a = atan2(l.vert.co.x, l.vert.co.z)
            if a - ac > pi:
                a -= 2 * pi
            elif ac - a > pi:
                a += 2 * pi
            l[uvl].uv = (a * 10.0 / 8.0, l.vert.co.y / 8.0)
    statue = bm_to_object(bm, 'Choir_Statue', C, ['ChoirStone'], sharp=60)
    # ------------------------------------------------------------ lueurs : mains jointes, yeux clos, bouche ouverte
    g = bmesh.new()
    for s in (1, -1):
        base = Vector((s * 0.30, 50.2, 9.6))
        tip = Vector((s * 0.06, 59.6, 12.8))
        ax = (tip - base).normalized()
        L = (tip - base).length
        side = Vector((s, 0, 0))
        side = (side - ax * side.dot(ax)).normalized()
        wd = ax.cross(side).normalized()
        K, NA = 22, 28
        rings = []
        for k in range(K + 1):
            tt = k / K
            wid = float(pchip([0, 0.15, 0.4, 0.62, 0.82, 0.95, 1.0], [1.15, 1.55, 1.72, 1.6, 1.2, 0.6, 0.08],
                              np.array([tt]))[0])
            th = float(pchip([0, 0.3, 0.6, 0.9, 1.0], [0.78, 0.74, 0.62, 0.42, 0.08], np.array([tt]))[0])
            ring = []
            for q in range(NA):
                a = 2 * pi * q / NA
                c, sn = cos(a), sin(a)
                cc = c if c > 0 else c * 0.3
                groove = 0.13 * th * cos(4 * pi * sn) * sm(0.55, 0.7, tt) * max(0.0, c)
                ring.append(base + ax * (L * tt) + side * (cc * th + groove) + wd * (sn * wid))
            rings.append(ring)
        rows, faces = loft(rings, g, cap_bottom=True, cap_top=True)
        for f in faces:
            c = f.calc_center_median()
            axis_pt = base + ax * ax.dot(c - base)
            orient(f, (c - axis_pt).normalized() if (c - axis_pt).length > 1e-4 else ax)
    for su in (1, -1):        # yeux : fentes fines en croissant (paupières closes)
        top, bot = [], []
        for i in range(11):
            w = -1 + 2 * i / 10
            u = su * 0.40 + w * 0.21
            top.append(g.verts.new(face_pt(u, 0.21 + 0.02 * (1 - w * w), 0.07)))
            bot.append(g.verts.new(face_pt(u, 0.21 - 0.07 * (1 - w * w), 0.07)))
        for i in range(10):
            orient(g.faces.new((top[i], top[i + 1], bot[i + 1], bot[i])), Vector((0, 0, 1)))
    ring = []
    for q in range(24):       # bouche : « O » chanté
        a = 2 * pi * q / 24
        ring.append(g.verts.new(face_pt(0.25 * cos(a), -0.47 + 0.2 * sin(a), 0.05)))
    cen = g.verts.new(face_pt(0.0, -0.47, -0.25))
    for q in range(24):
        orient(g.faces.new((ring[q], ring[(q + 1) % 24], cen)), Vector((0, 0, 1)))
    uvl = g.loops.layers.uv.new('UVMap')
    box_uv(g, uvl, 4.0)
    glow = bm_to_object(g, 'Choir_Glow', C, ['ChoirGlow'], sharp=70)
    glow.parent = statue
    return statue, glow


# =============================================================================== construction + export
print('MAJESTIC : construction')
mountain, shells = build_mountain()
mb = build_b()
prism = build_prism()
RC = new_coll('Rocks')
rocks = [build_rock('Rock_A', 3.6, 11, RC), build_rock('Rock_B', 7.5, 23, RC), build_rock('Rock_C', 14.0, 37, RC)]
statue, glow = build_statue()

if not QUICK or not os.path.exists(os.path.join(BAKE, 'mountain-normal.npy')):
    bake_mountain()
wire_mountain_material(baked_images())

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
os.makedirs(os.path.dirname(GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.object.select_all(action='DESELECT')
for o in EXPORT:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
    export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_cameras=False,
    export_lights=False, export_extras=True, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6, export_draco_texcoord_quantization=14)
total = sum(tri_count(o) for o in EXPORT)
print(f'MAJESTIC EXPORT {len(EXPORT)} nœuds, {total} triangles, {os.path.getsize(GLB) / 1024:.0f} Ko')


def bbox_world(ob):
    """Boîte englobante en coordonnées Y-up (mètres)."""
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    ys = [(p.x, p.z, -p.y) for p in pts]
    return [round(min(c[k] for c in ys), 1) for k in range(3)], [round(max(c[k] for c in ys), 1) for k in range(3)]


for o in EXPORT:
    lo, hi = bbox_world(o)
    loc = o.matrix_world.translation
    print(f'  {o.name:16s} origine ({loc.x:.1f}, {loc.z:.1f}, {-loc.y:.1f})  boîte {lo} -> {hi}')
o_, U_, V_, N_ = WALL
print(f'  paroi : origine {np.round(o_, 1)}  normale {np.round(N_, 3)}  inclinaison {math.degrees(atan2(N_[1], N_[2])):.1f}°')


# =============================================================================== vignettes de contrôle
def render_previews(out):
    os.makedirs(out, exist_ok=True)
    scene = bpy.context.scene
    try:
        scene.render.engine = 'BLENDER_EEVEE'
    except TypeError as e:
        print('moteur :', e)
    scene.eevee.taa_render_samples = 32
    scene.eevee.volumetric_end = 14000
    scene.eevee.volumetric_tile_size = '8'
    scene.eevee.use_shadows = True
    try:
        scene.eevee.use_raytracing = True
    except Exception:
        pass
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    for vt in ('AgX', 'Khronos PBR Neutral'):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            pass
    world = bpy.data.worlds.new('dusk')
    scene.world = world
    nt = world.node_tree
    bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (*lin('#ff8a6a'), 1)
    cr.elements[1].position = 0.55
    cr.elements[1].color = (*lin('#0b0f2a'), 1)
    e = cr.elements.new(0.06)
    e.color = (*lin('#c25a8a'), 1)
    e = cr.elements.new(0.2)
    e.color = (*lin('#4a3a8c'), 1)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.4
    P = new_coll('Preview')
    # Brume (perspective aérienne) : volume d'objet (un volume de monde absorbe le ciel dans EEVEE)
    hm = bpy.data.materials.new('PreviewHaze')
    hn = hm.node_tree
    for n in list(hn.nodes):
        if n.type == 'BSDF_PRINCIPLED':
            hn.nodes.remove(n)
    vol = hn.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = 0.00007
    vol.inputs['Color'].default_value = (*lin('#d6b0e0'), 1)
    mo = next(n for n in hn.nodes if n.type == 'OUTPUT_MATERIAL')
    hn.links.new(vol.outputs[0], mo.inputs['Volume'])
    hb = bmesh.new()
    bmesh.ops.create_cube(hb, size=1.0, matrix=S(16000, 16000, 2400) @ T(0, 0, 0.5))
    hme = bpy.data.meshes.new('haze')
    hb.to_mesh(hme)
    hb.free()
    hme.materials.append(hm)
    haze = bpy.data.objects.new('haze', hme)
    P.objects.link(haze)
    # Soleil couchant, rasant, à gauche de la façade
    sd = bpy.data.lights.new('sun', 'SUN')
    sd.energy = 4.5
    sd.color = lin('#ffb38a')
    sd.angle = radians(1.5)
    sun = bpy.data.objects.new('sun', sd)
    P.objects.link(sun)
    az, el = radians(-38), radians(8)
    to_sun = Vector((sin(az) * cos(el), sin(el), cos(az) * cos(el)))
    sun.rotation_euler = W(*(-to_sun)).to_track_quat('-Z', 'Y').to_euler()
    # Sol de sable noir
    gm = bpy.data.materials.new('PreviewSand')
    gp = next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    ti = gm.node_tree.nodes.new('ShaderNodeTexImage')
    ti.image = bpy.data.images.load(os.path.join(TEX, 'sand-color-1k.webp'))
    tcg = gm.node_tree.nodes.new('ShaderNodeTexCoord')
    mp = gm.node_tree.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 30, 1 / 30, 1 / 30)
    gm.node_tree.links.new(tcg.outputs['Object'], mp.inputs['Vector'])
    gm.node_tree.links.new(mp.outputs['Vector'], ti.inputs['Vector'])
    gm.node_tree.links.new(ti.outputs['Color'], gp.inputs['Base Color'])
    gp.inputs['Roughness'].default_value = 0.6
    gme = bpy.data.meshes.new('ground')
    gb = bmesh.new()
    bmesh.ops.create_circle(gb, cap_ends=True, segments=96, radius=20000)
    gb.to_mesh(gme)
    gb.free()
    gme.materials.append(gm)
    ground = bpy.data.objects.new('ground', gme)
    P.objects.link(ground)
    ground.location = (0, 0, 0.5)
    # Chœur : 12 colosses (doublons liés), face à la montagne
    choir = []
    for k in range(12):
        a = 2 * pi * k / 12 + pi / 12
        pos = (1180 * sin(a), 0.0, 1180 * cos(a))
        for src in (statue, glow):
            d = bpy.data.objects.new(f'{src.name}_dup{k}', src.data)
            P.objects.link(d)
            d.location = W(*pos)
            d.rotation_euler = (0, 0, a + pi)
            choir.append(d)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    P.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.clip_start, cam.data.clip_end = 1.0, 40000

    def shot(name, eye, target, vfov=40, hide=()):
        if SHOTS and name not in SHOTS:
            return
        for o in hide:
            o.hide_render = True
        cam.location = W(*eye)
        cam.rotation_euler = (W(*target) - W(*eye)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.angle_y = radians(vfov)
        scene.render.filepath = os.path.join(out, name + '.png')
        bpy.ops.render.render(write_still=True)
        for o in hide:
            o.hide_render = False
        print('RENDER', name)

    def b_glow(strength):
        p = next(n for n in MAT['MountainB'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        p.inputs['Emission Strength'].default_value = strength

    b_glow(0.0)
    shot('dusk', (420, 4, 2900), (0, 560, 0), 38, hide=choir)
    shot('b', (-180, 330, 1500), (0, 560, 300), 32, hide=choir)
    shot('choir', (1500, 330, 2900), (0, 330, 0), 42)
    # Gros plan : un colosse face caméra, la montagne derrière
    solo = []
    for src in (statue, glow):
        d = bpy.data.objects.new(f'{src.name}_solo', src.data)
        P.objects.link(d)
        d.location = W(0, 0, 1500)
        solo.append(d)
    rng = random.Random(5)
    for i in range(40):       # débris au sol autour du colosse (contrôle des rochers)
        src = rocks[i % 3]
        d = bpy.data.objects.new(f'{src.name}_dbg{i}', src.data)
        P.objects.link(d)
        a, rr = rng.uniform(0, 2 * pi), rng.uniform(24, 70)
        d.location = W(rr * sin(a), 1.0, 1500 + rr * cos(a))
        d.rotation_euler = (rng.uniform(0, pi), rng.uniform(0, pi), rng.uniform(0, pi))
        solo.append(d)
    shot('colossus', (-70, 26, 1640), (0, 50, 1500), 50, hide=choir)
    shot('colossus_side', (95, 60, 1585), (0, 52, 1500), 45, hide=choir)
    for o in solo:
        o.hide_render = True
    # Sommet ouvert
    ang = radians(72)
    shells['L'].rotation_euler = (0, -ang, 0)
    shells['R'].rotation_euler = (0, ang, 0)
    b_glow(3.0)
    shot('summit', (300, 1150, 760), (0, 1060, 0), 42, hide=choir)
    shot('summit_far', (900, 700, 2400), (0, 950, 0), 30, hide=choir)
    shells['L'].rotation_euler = (0, 0, 0)
    shells['R'].rotation_euler = (0, 0, 0)


if RENDER:
    render_previews(RENDER)
print(f'MAJESTIC OK ({time.time() - T_START:.0f} s)')
