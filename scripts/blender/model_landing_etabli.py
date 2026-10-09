# Établi d'artisan de la page d'atterrissage /site-internet-artisan/ (src/content/seo/site-internet-artisan.ts,
# visual.model = 'etabli' ; agent B4 le 2026-10-09, refait le 2026-10-10 : « un modèle original, et ça doit être
# bien fait »). Diorama photoréaliste : un tronçon de plateau d'établi massif en chêne lamellé-collé (bois de
# bout sur les chants, trous de valet, traces d'usage), sa presse avant (mâchoire en chêne, moyeu et barre en
# hêtre) et, posés dessus, un rabot à corne (hêtre, fer, contre-fer et coin) avec son copeau, un marteau de
# menuisier (manche en frêne, tête forgée), une équerre (talon en noyer), un mètre ruban sans marque accroché au
# chant avant, un crayon de menuisier, des copeaux et, debout sur un support en noyer, un smartphone sans
# marque qui affiche le site fictif d'un ébéniste (« Atelier Sorbier »). Tout est modélisé ici (bmesh).
#
# Deux modes :
#   1. python scripts/blender/model_landing_etabli.py
#      (Python 3.11 + Pillow + numpy) télécharge les PBR Poly Haven (CC0) dans le cache et compose les
#      textures : atlas du plateau (chêne en lames, bois de bout procédural, usure), essences des outils
#      (hêtre, frêne, noyer, chêne : fil + bois de bout), copeaux, graduations du mètre, acier forgé et écran
#      du téléphone (aussi public/textures/landing/etabli/site-default.webp).
#      Le mode Blender le lance tout seul si les textures manquent (ou avec --textures).
#   2. "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_landing_etabli.py
#      -- [--textures] [--poster] [--preview <dossier>] [--samples N] [--yaw R] [--size S]
#      modélise, cuit l'occlusion ambiante du plateau (ombres de contact des outils, visibles aussi dans
#      three.js qui n'a pas d'ombres portées), sauve blender/landing_etabli.blend, exporte
#      public/models/landing/etabli.glb (Draco, textures WebP intégrées) ; --poster rend
#      public/posters/landing/etabli.webp (1200², fond transparent) ; --preview rend des aperçus.
#
# Poster = image de départ de la visionneuse (src/scene/landing) : même cadrage (viewer_camera, entrée
# `etabli` de src/scene/landing/views.ts, recopiée dans VIEW ci-dessous), même éclairage (Lightformers et
# directionnelles de src/scene/landing/Studio.tsx, sans ombres portées comme dans three.js), même tone mapping
# (ACES Filmic de three.js appliqué à un rendu linéaire) et même ombre au sol (ContactShadows de drei émulé :
# empreinte vue de dessus, flou gaussien, opacité 0.75). Le fondu poster → 3D ne doit pas sauter.
#
# Repère : « monde » Y-up (x à droite, y en haut, +z vers le spectateur). Cotes écrites en cm puis multipliées
# par U (1 cm = 1/30 d'unité : plateau 60 × 40 × 9 cm). Dessous du plateau à y = 0, centré en X/Z. Chaque
# outil est construit dans son repère local (posé à plat) puis placé par la transformation de son objet
# (position + lacet). Nœuds : Bench_Root > Bench_Top, Bench_Vise, Bench_Hammer, Bench_Plane, Bench_Tape,
# Bench_Pencil, Bench_Square, Bench_Stand, Bench_Shaving0..N, Bench_Phone > Bench_Screen (UV 0→1 = image).
import math
import os
import random
import subprocess
import sys
from math import atan2, cos, hypot, pi, radians, sin, sqrt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landing_common import *  # noqa: E402,F401,F403
from landing_common import CACHE, MODELS, POSTERS, TEXTURES, BLEND_DIR, IN_BLENDER, ph_map, lin  # noqa

NAME = 'etabli'
GEN = os.path.join(CACHE, '_gen', NAME)          # textures composées (intermédiaires, régénérables)
PUB = os.path.join(TEXTURES, NAME)                # public/textures/landing/etabli
U = 1.0 / 30.0                                    # unités-scène par cm
TOP_L, TOP_D, TOP_H = 60.0, 40.0, 9.0             # plateau (cm)
BEV = 0.45                                        # arrondi des arêtes du plateau (cm)
DOG_HOLES = [(-1.0, -15.8), (22.0, -15.8)]        # trous de valet (x, z), Ø 2 cm
DOG_R = 1.0

# Atlas du plateau (2048², 26 px/cm) : dessus, bouts (tournés d'un quart de tour, à droite du dessus), chants
# avant et arrière, intérieur des trous, dessous (jamais vu, à part pour que la cuisson de l'AO ne l'écrase pas).
ATLAS = 2048
PXCM = 26.0
_TW, _TD, _TH = round(TOP_L * PXCM), round(TOP_D * PXCM), round(TOP_H * PXCM)    # 1560, 1040, 234
GUT = 8                                                                            # gouttières
R_TOP = (0, 0, _TW, _TD)                                                           # (x0, y0, x1, y1) px
R_END_R = (_TW + GUT, 0, _TW + GUT + _TH, _TD)
R_END_L = (R_END_R[2] + GUT, 0, R_END_R[2] + GUT + _TH, _TD)
R_FRONT = (0, _TD + GUT, _TW, _TD + GUT + _TH)
R_BACK = (0, R_FRONT[3] + GUT, _TW, R_FRONT[3] + GUT + _TH)
R_HOLE = (0, R_BACK[3] + GUT, 1024, R_BACK[3] + GUT + 200)
R_BOTTOM = (_TW + GUT, _TD + GUT, ATLAS - GUT, ATLAS - GUT)

SCREEN_W, SCREEN_H = 720, 1560                    # image de l'écran (ratio 6,6 × 14,3 cm)
TAPE_CM = 40.0                                    # longueur couverte par la texture du ruban
SHAVING_CM = 16.0                                 # longueur couverte par la texture des copeaux
WOOD_CM, END_CM = 15.0, 6.0                       # couverture des textures de fil et de bois de bout
OAK_MEAN = (160, 117, 76)                         # couleur moyenne visée du dessus du plateau (sRGB)

# Essences : source Poly Haven du fil, rotation (fil vertical dans la source), couleur moyenne visée (sRGB),
# contraste du fil, patine (taches sombres périodiques, la texture reste raccordable)
WOODS = {
    'beech': ('oak_veneer_05', False, (138, 98, 66), 1.9, 0.16),    # hêtre patiné (rabot, moyeu, barre)
    'ash': ('ash_veneer', False, (192, 156, 112), 1.5, 0.05),       # frêne verni (manche du marteau)
    'walnut': ('walnut_veneer', True, (90, 61, 44), 1.25, 0.06),    # noyer huilé (support, talon d'équerre)
    'oak': ('oak_veneer_01', True, (128, 88, 58), 1.2, 0.08),       # chêne (mâchoire de la presse)
}


# =============================================================================== textures (Pillow + numpy)
def textures_main():
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont

    os.makedirs(GEN, exist_ok=True)
    os.makedirs(PUB, exist_ok=True)
    rng = np.random.default_rng(1977)
    FONTS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                         'public', 'fonts')

    def font(name, size, weight=None):
        f = ImageFont.truetype(os.path.join(FONTS, name), size)
        if weight is not None:
            f.set_variation_by_axes([weight])
        return f

    def F(img):
        return np.asarray(img).astype(np.float32) / 255.0

    def to_img(a, mode=None):
        return Image.fromarray(np.clip(a * 255.0 + 0.5, 0, 255).astype(np.uint8), mode)

    def smoothstep(e0, e1, x):
        t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
        return t * t * (3 - 2 * t)

    def noise(h, w, cell, seed_rng=None, wrap_x=False):
        """Bruit de valeur lissé (bicubique), cellule ≈ `cell` px, valeurs ~[0, 1]."""
        r = seed_rng or rng
        gh, gw = int(h / cell) + 3, int(w / cell) + 3
        g = r.random((gh, gw)).astype(np.float32)
        if wrap_x:
            gw = max(2, round(w / cell))
            g = r.random((gh, gw)).astype(np.float32)
            g = np.concatenate([g, g[:, :3]], axis=1)
            im = Image.fromarray(g, 'F').resize((round((gw + 3) * w / gw), round(gh * cell)), Image.BICUBIC)
            return np.asarray(im)[:h, :w]
        im = Image.fromarray(g, 'F').resize((round(gw * cell), round(gh * cell)), Image.BICUBIC)
        return np.asarray(im)[:h, :w]

    def fbm(h, w, cell, octaves=4, wrap_x=False):
        out = np.zeros((h, w), np.float32)
        a, tot = 1.0, 0.0
        for _ in range(octaves):
            out += a * noise(h, w, max(cell, 1.5), wrap_x=wrap_x)
            tot += a
            a *= 0.5
            cell /= 2.0
        return out / tot

    def blur(a, s):
        """Flou ~gaussien (trois flous en boîte, numpy seul), rayon ≈ s px."""
        r = max(1, int(round(s)))
        a = a.astype(np.float32)
        for ax in (0, 1):
            for _ in range(3):
                pad = [(0, 0)] * a.ndim
                pad[ax] = (r + 1, r)
                c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax)
                n = a.shape[ax]
                a = (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=ax)
                     - np.take(c, range(0, n), axis=ax)) / (2 * r + 1)
        return a

    def height_to_normal(hgt, strength):
        """Hauteur (px) -> perturbation de normale (dx, dy) en espace tangent (OpenGL : y vers le haut)."""
        gy, gx = np.gradient(hgt)
        return -gx * strength, gy * strength

    def end_grain(Wpx, Hpx, pxcm, base, seed, sp=(0.2, 0.34), center=None):
        """Bois de bout (Wpx × Hpx, pxcm px/cm) : cernes autour d'une moelle hors champ, gros pores du bois de
        printemps, rayons ligneux, traits de scie, gerce éventuelle. Retourne (couleur, relief)."""
        r_ = np.random.default_rng(seed)
        yy, xx = np.mgrid[0:Hpx, 0:Wpx].astype(np.float32)
        w_cm, h_cm = Wpx / pxcm, Hpx / pxcm
        X, Y = xx / pxcm, (Hpx - yy) / pxcm
        if center is None:
            cx = r_.uniform(-0.4, 1.4) * w_cm
            cy = -r_.uniform(5, 22) if r_.random() < 0.6 else h_cm + r_.uniform(5, 22)
        else:
            cx, cy = center
        k = pxcm / PXCM
        wob = (noise(Hpx, Wpx, 160 * k, r_) * 0.5 + noise(Hpx, Wpx, 40 * k, r_) * 0.06
               + noise(Hpx, Wpx, 8 * k, r_) * 0.012)
        rad = np.hypot(X - cx, Y - cy) + wob
        ring = (rad / r_.uniform(*sp)) % 1.0
        early = smoothstep(0.0, 0.08, ring) * (1 - smoothstep(0.22, 0.4, ring))
        late = smoothstep(0.5, 0.95, ring)
        phi = np.arctan2(Y - cy, X - cx)
        nr = r_.uniform(260, 420) * max(1.0, hypot(cx, cy) / 15.0)
        rj = noise(Hpx, Wpx, 30 * k, r_)
        ray = ((phi * nr / (2 * pi) + rj * 0.8) % 1.0)
        ray = (1 - smoothstep(0.0, 0.05, np.minimum(ray, 1 - ray))) * smoothstep(0.45, 0.75,
                                                                               noise(Hpx, Wpx, 12 * k, r_))
        pores = (r_.random((Hpx, Wpx)) > 0.86).astype(np.float32)
        pores = blur(pores, 0.6) * early
        c = np.ones((Hpx, Wpx, 3), np.float32) * np.asarray(base, np.float32)
        c *= (1 - 0.12 * early[..., None]) * (1 + 0.08 * late[..., None])
        c *= (1 - 0.45 * np.clip(pores * 2.0, 0, 1)[..., None])
        c = c * (1 - 0.3 * ray[..., None]) + (np.asarray(base) * 1.35) * (0.3 * ray[..., None])
        saw = 0.5 + 0.5 * np.sin(Y * 2 * pi / 0.32 + noise(Hpx, Wpx, 30 * k, r_) * 5)
        c *= (0.96 + 0.04 * saw[..., None])
        c *= (0.86 + 0.18 * noise(Hpx, Wpx, 50 * k, r_))[..., None]
        h = -1.0 * pores - 0.25 * early + 0.3 * ray + 0.25 * saw
        if r_.random() < 0.3:   # gerce (fente de bout), fine et qui s'amincit
            ax = r_.uniform(0.25, 0.75) * Wpx
            L = r_.uniform(0.25, 0.55) * Hpx
            taper = np.clip(1 - yy / L, 0, 1)
            crack = np.exp(-((xx - ax - (yy * 0.12)) ** 2) / (0.3 + 0.8 * taper)) * taper
            c *= (1 - 0.45 * crack[..., None])
            h -= 1.5 * crack
        return c, h

    # ------------------------------------------------------------------ plateau : sources Poly Haven (CC0)
    src_c = np.asarray(Image.open(ph_map('oak_wood_planks', 'Diffuse', '4k')).convert('RGB'))
    src_n = np.asarray(Image.open(ph_map('oak_wood_planks', 'nor_gl', '4k')).convert('RGB'))
    src_r = np.asarray(Image.open(ph_map('oak_wood_planks', 'Rough', '4k')).convert('L'))
    SRC_PXCM = src_c.shape[1] / 120.0          # la texture couvre 1,20 m

    def band(y0, x0, h_cm, l_cm, out_w, out_h, flip=False):
        """Bande de la source (h_cm × l_cm, enroulée), rééchantillonnée en out_w × out_h : couleur, normale,
        rugosité, en float."""
        H, Wd = src_c.shape[:2]
        ys = (np.arange(round(h_cm * SRC_PXCM)) + y0) % H
        xs = (np.arange(round(l_cm * SRC_PXCM)) + x0) % Wd
        out = []
        for s in (src_c, src_n, src_r):
            crop = s[ys][:, xs]
            im = Image.fromarray(crop).resize((out_w, out_h), Image.LANCZOS)
            out.append(F(im))
        c, n, r = out
        if flip:
            c, n, r = c[:, ::-1], n[:, ::-1].copy(), r[:, ::-1]
            n[..., 0] = 1.0 - n[..., 0]
        return c, n, r

    col = np.zeros((ATLAS, ATLAS, 3), np.float32)
    nrm = np.zeros((ATLAS, ATLAS, 3), np.float32)
    nrm[...] = (0.5, 0.5, 1.0)
    rgh = np.full((ATLAS, ATLAS), 0.6, np.float32)
    hgt = np.zeros((ATLAS, ATLAS), np.float32)     # relief ajouté (rayures, bosses), en « px »

    # lames de 4,6 à 6,4 cm sur la profondeur (z = 0 au fond)
    widths = rng.uniform(4.6, 6.4, 7)
    widths *= TOP_D / widths.sum()
    edges = np.concatenate([[0.0], np.cumsum(widths)])
    tones = []
    x0, y0, x1, y1 = R_TOP
    for k, w in enumerate(widths):
        py0, py1 = round(edges[k] * PXCM), round(edges[k + 1] * PXCM)
        c, n, r = band(int(rng.integers(0, 4096)), int(rng.integers(0, 4096)), w, TOP_L, x1 - x0, py1 - py0,
                       flip=bool(rng.random() < 0.5))
        tone = np.array([1.0, 1.0, 1.0]) * rng.uniform(0.9, 1.07) * (1 + rng.normal(0, 0.025, 3))
        tones.append(tone)
        col[py0:py1, x0:x1] = c * tone
        nrm[py0:py1, x0:x1] = n
        rgh[py0:py1, x0:x1] = r
        if k:   # joint de colle : un trait à peine plus sombre, irrégulier
            j = noise(1, x1 - x0, 40)[0]
            col[py0:py0 + 2, x0:x1] *= (0.78 + 0.12 * j)[None, :, None]
            hgt[py0:py0 + 2, x0:x1] -= 0.6

    # chants avant / arrière : fil droit d'une lame (même chêne)
    for R in (R_FRONT, R_BACK):
        c, n, r = band(int(rng.integers(0, 4096)), int(rng.integers(0, 4096)), TOP_H, TOP_L,
                       R[2] - R[0], R[3] - R[1], flip=bool(rng.random() < 0.5))
        col[R[1]:R[3], R[0]:R[2]] = c * rng.uniform(0.92, 1.0)
        nrm[R[1]:R[3], R[0]:R[2]] = n
        rgh[R[1]:R[3], R[0]:R[2]] = r

    # bois de bout des deux extrémités : une bande par lame, image tournée d'un quart de tour dans l'atlas
    mean_c = col[R_TOP[1]:R_TOP[3], R_TOP[0]:R_TOP[2]].reshape(-1, 3).mean(0)
    for R, flip in ((R_END_R, False), (R_END_L, True)):
        A_c = np.zeros((_TH, _TD, 3), np.float32)
        A_h = np.zeros((_TH, _TD), np.float32)
        for k, w in enumerate(widths):
            zk0, zk1 = (TOP_D - edges[k + 1], TOP_D - edges[k]) if flip else (edges[k], edges[k + 1])
            px0, px1 = round(zk0 * PXCM), round(zk1 * PXCM)
            c, h = end_grain(px1 - px0, _TH, PXCM, mean_c * tones[k] * np.array([0.72, 0.6, 0.5]),
                             100 + k + (50 if flip else 0))
            A_c[:, px0:px1] = c
            A_h[:, px0:px1] = h
            if k:
                A_c[:, px0:px0 + 2] *= 0.7
        col[R[1]:R[3], R[0]:R[2]] = np.rot90(A_c)
        hgt[R[1]:R[3], R[0]:R[2]] += np.rot90(A_h)
        rgh[R[1]:R[3], R[0]:R[2]] = 0.82
    # intérieur des trous de valet, dessous
    hx0, hy0, hx1, hy1 = R_HOLE
    c, h = end_grain(hx1 - hx0, hy1 - hy0, PXCM, mean_c * np.array([0.58, 0.48, 0.4]), 999)
    col[hy0:hy1, hx0:hx1] = c * 0.55
    rgh[hy0:hy1, hx0:hx1] = 0.85
    bx0, by0, bx1, by1 = R_BOTTOM
    col[by0:by1, bx0:bx1] = mean_c * 0.5
    rgh[by0:by1, bx0:bx1] = 0.9

    # ------------------------------------------------------------------ usure du dessus
    TH, TW = R_TOP[3] - R_TOP[1], R_TOP[2] - R_TOP[0]
    yy, xx = np.mgrid[0:TH, 0:TW].astype(np.float32)
    Xc, Zc = xx / PXCM, yy / PXCM                       # cm, (0, 0) = coin arrière gauche
    top = col[0:TH, 0:TW]
    # patine : huile qui fonce et réchauffe, mouchetures basse fréquence
    mott = fbm(TH, TW, 260, 4)
    top *= (0.86 + 0.18 * mott)[..., None]
    # mains : avant du plateau plus foncé et plus lisse
    front = smoothstep(TOP_D - 12, TOP_D - 1, Zc) * (0.6 + 0.4 * noise(TH, TW, 120))
    top *= (1 - 0.12 * front)[..., None]
    rgh[0:TH, 0:TW] -= 0.07 * front
    # crasse le long des arêtes
    d_edge = np.minimum.reduce([Xc, TOP_L - Xc, Zc, TOP_D - Zc])
    grime = np.exp(-d_edge / 0.9) * (0.5 + 0.5 * noise(TH, TW, 30))
    top *= (1 - 0.28 * grime)[..., None]
    # taches (huile, eau, café)
    for _ in range(6):
        cx, cz, rr = rng.uniform(4, TOP_L - 4), rng.uniform(4, TOP_D - 4), rng.uniform(1.2, 4.0)
        d = np.hypot((Xc - cx) / rng.uniform(0.7, 1.4), Zc - cz) / rr + (noise(TH, TW, 25) - 0.5) * 0.6
        m = 1 - smoothstep(0.6, 1.0, d)
        top *= (1 - rng.uniform(0.06, 0.16) * m)[..., None]
        rgh[0:TH, 0:TW] -= 0.06 * m
    # cerne de tasse, à moitié effacé (devant, entre le mètre et le support)
    cx, cz = 30.0 + 4.5, 20.0 + 13.0
    d = np.abs(np.hypot(Xc - cx, Zc - cz) - 4.1)
    ring_m = np.exp(-(d / 0.12) ** 2) * smoothstep(0.3, 0.7, noise(TH, TW, 60))
    top *= (1 - 0.2 * ring_m)[..., None]
    # crasse autour des trous de valet
    for hx, hz in DOG_HOLES:
        d = np.hypot(Xc - (hx + TOP_L / 2), Zc - (hz + TOP_D / 2))
        m = np.exp(-np.maximum(d - DOG_R, 0) / 0.5) * (d > DOG_R - 0.2)
        top *= (1 - 0.35 * m)[..., None]

    # rayures (bois frais, plus clair), entailles de lame, coups (bosses), gouttes de colle, crayon
    fresh = np.array([0.80, 0.64, 0.45], np.float32)
    S2 = 2
    mask_s = Image.new('L', (TW * S2, TH * S2), 0)
    mask_k = Image.new('L', (TW * S2, TH * S2), 0)
    ds, dk = ImageDraw.Draw(mask_s), ImageDraw.Draw(mask_k)
    for _ in range(120):
        x, z = rng.uniform(0, TOP_L), rng.uniform(0, TOP_D)
        a = rng.normal(0, 0.35) if rng.random() < 0.7 else rng.uniform(0, pi)
        L = rng.gamma(2.0, 1.8)
        pts = []
        for t in np.linspace(0, 1, 6):
            pts.append(((x + cos(a) * L * t) * PXCM * S2, (z + sin(a) * L * t + rng.normal(0, 0.02)) * PXCM * S2))
        ds.line(pts, fill=int(rng.uniform(70, 200)), width=int(rng.integers(1, 3)))
    for _ in range(12):
        x, z = rng.uniform(2, TOP_L - 2), rng.uniform(2, TOP_D - 2)
        a = rng.uniform(0, pi)
        L = rng.uniform(0.6, 2.8)
        dk.line([(x * PXCM * S2, z * PXCM * S2), ((x + cos(a) * L) * PXCM * S2, (z + sin(a) * L) * PXCM * S2)],
                fill=255, width=3)
    ms = F(mask_s.resize((TW, TH), Image.LANCZOS))
    mk = F(mask_k.resize((TW, TH), Image.LANCZOS))
    top[...] = top * (1 - 0.32 * ms[..., None]) + fresh * (0.32 * ms[..., None])
    top *= (1 - 0.5 * mk)[..., None]
    hgt[0:TH, 0:TW] -= 1.0 * ms + 2.2 * mk
    for _ in range(45):   # coups de marteau, chocs
        cx, cz, rr = rng.uniform(1, TOP_L - 1), rng.uniform(1, TOP_D - 1), rng.uniform(0.08, 0.35)
        d2 = ((Xc - cx) ** 2 + (Zc - cz) ** 2) / rr ** 2
        m = np.exp(-d2)
        hgt[0:TH, 0:TW] -= 3.0 * m
        top *= (1 - 0.08 * m)[..., None]
    for _ in range(14):   # gouttes de colle (ambrées, brillantes, en relief)
        cx, cz = rng.uniform(3, TOP_L - 3), rng.uniform(3, TOP_D - 3)
        rr = rng.uniform(0.12, 0.45)
        d = np.hypot((Xc - cx) / rng.uniform(0.7, 1.5), Zc - cz) / rr + (noise(TH, TW, 6) - 0.5) * 0.5
        m = 1 - smoothstep(0.75, 1.0, d)
        top[...] = top * (1 - 0.45 * m[..., None]) + np.array([0.52, 0.34, 0.12]) * (0.45 * m[..., None])
        rgh[0:TH, 0:TW] = rgh[0:TH, 0:TW] * (1 - m) + 0.18 * m
        hgt[0:TH, 0:TW] += 2.5 * (1 - smoothstep(0.0, 1.0, d)) * m
    # traits de crayon : une ligne de cote, deux repères et une cote griffonnée (devant, bien visibles)
    pen = Image.new('L', (TW * S2, TH * S2), 0)
    dp = ImageDraw.Draw(pen)

    def P(x, z):
        return (x * PXCM * S2, z * PXCM * S2)

    dp.line([P(6.5, 36.6), P(19.5, 36.4)], fill=200, width=3)
    for x in (6.5, 19.5):
        dp.line([P(x, 35.6), P(x + 0.15, 37.5)], fill=210, width=3)
    dp.line([P(52.0, 18.4), P(52.6, 19.6), P(54.2, 17.1)], fill=190, width=3)   # coche
    fnt = font('instrument-serif-latin-400-italic.woff2', int(1.5 * PXCM * S2))
    dp.text(P(10.5, 34.0), '13,2', font=fnt, fill=185)
    fnt2 = font('instrument-serif-latin-400-italic.woff2', int(1.2 * PXCM * S2))
    dp.text(P(46.5, 19.6), 'x 4', font=fnt2, fill=160)
    mp = F(pen.resize((TW, TH), Image.LANCZOS)) * (0.55 + 0.45 * noise(TH, TW, 8))
    top[...] = top * (1 - 0.6 * mp[..., None]) + np.array([0.13, 0.13, 0.14]) * (0.6 * mp[..., None])
    rgh[0:TH, 0:TW] = rgh[0:TH, 0:TW] * (1 - 0.6 * mp) + 0.38 * (0.6 * mp)
    # éclats le long de l'arête avant (bois clair mis à nu)
    for _ in range(18):
        cx = rng.uniform(1, TOP_L - 1)
        rr = rng.uniform(0.1, 0.4)
        d = np.hypot((Xc - cx) / 2.0, Zc - TOP_D) / rr
        m = 1 - smoothstep(0.6, 1.0, d)
        top[...] = top * (1 - 0.3 * m[..., None]) + fresh * 0.75 * (0.3 * m[..., None])
        hgt[0:TH, 0:TW] -= 1.5 * m

    # chants (fil) : crasse vers les arêtes, éclats clairs, coups
    for R in (R_FRONT, R_BACK):
        h_, w_ = R[3] - R[1], R[2] - R[0]
        gy_, gx_ = np.mgrid[0:h_, 0:w_].astype(np.float32)
        yy2 = gy_ / PXCM
        sub = col[R[1]:R[3], R[0]:R[2]]
        g = np.exp(-yy2 / 0.8) * 0.3 + np.exp(-(TOP_H - yy2) / 1.2) * 0.25
        sub *= (1 - g * (0.6 + 0.4 * noise(h_, w_, 20)))[..., None]
        sub *= (0.88 + 0.16 * fbm(h_, w_, 120, 3))[..., None]
        for _ in range(int(w_ / 90)):
            cx, cy = rng.uniform(0, w_), rng.choice([rng.uniform(0, 8), rng.uniform(0, h_)])
            rr = rng.uniform(2, 9)
            m = np.exp(-((gx_ - cx) ** 2 + (gy_ - cy) ** 2) / rr ** 2)
            sub[...] = sub * (1 - 0.35 * m[..., None]) + fresh * (0.35 * m[..., None])
            hgt[R[1]:R[3], R[0]:R[2]] -= 1.5 * m
    # bouts (images tournées : l'arête du dessus est la colonne 0)
    for R in (R_END_R, R_END_L):
        h_, w_ = R[3] - R[1], R[2] - R[0]
        gy_, gx_ = np.mgrid[0:h_, 0:w_].astype(np.float32)
        dtop = gx_ / PXCM
        sub = col[R[1]:R[3], R[0]:R[2]]
        g = np.exp(-dtop / 0.8) * 0.3 + np.exp(-(TOP_H - dtop) / 1.2) * 0.25
        sub *= (1 - g * (0.6 + 0.4 * noise(h_, w_, 20)))[..., None]

    # gouttières : les bords de chaque région débordent (filtrage, mipmaps)
    def bleed(R, n=GUT):
        x0_, y0_, x1_, y1_ = R
        for arr in (col, nrm, rgh, hgt):
            for k in range(1, n + 1):
                if y0_ - k >= 0:
                    arr[y0_ - k, x0_:x1_] = arr[y0_, x0_:x1_]
                if y1_ - 1 + k < ATLAS:
                    arr[y1_ - 1 + k, x0_:x1_] = arr[y1_ - 1, x0_:x1_]
            for k in range(1, n + 1):
                ya, yb = max(0, y0_ - n), min(ATLAS, y1_ + n)
                if x0_ - k >= 0:
                    arr[ya:yb, x0_ - k] = arr[ya:yb, x0_]
                if x1_ - 1 + k < ATLAS:
                    arr[ya:yb, x1_ - 1 + k] = arr[ya:yb, x1_ - 1]

    for R in (R_TOP, R_END_R, R_END_L, R_FRONT, R_BACK, R_HOLE, R_BOTTOM):
        bleed(R)

    # étalonnage : chêne doré (moyenne du dessus visée, en linéaire), puis sortie couleur 2K, normale et
    # rugosité 1K
    tgt = (np.asarray(OAK_MEAN, np.float32) / 255.0) ** 2.2
    cur = (np.clip(col[R_TOP[1]:R_TOP[3], R_TOP[0]:R_TOP[2]], 0, 1) ** 2.2).reshape(-1, 3).mean(0)
    col = np.clip(col, 0, 1) ** 2.2 * (tgt / cur)
    col = np.clip(col, 0, 1) ** (1 / 2.2)
    to_img(col).save(os.path.join(GEN, 'top_col.png'))
    dx, dy = height_to_normal(blur(hgt, 0.7), 0.35)
    n = nrm * 2 - 1
    n[..., 0] += dx
    n[..., 1] += dy
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    to_img(n * 0.5 + 0.5).resize((1024, 1024), Image.LANCZOS).save(os.path.join(GEN, 'top_nrm.png'))
    rr_ = np.clip(rgh * 0.55 + 0.32, 0.12, 0.95)          # chêne huilé : 0,45 → 0,8
    rr_[R_FRONT[1]:, :] = np.clip(rgh[R_FRONT[1]:, :] * 0.55 + 0.32, 0.12, 0.95)
    rr_[0:_TD, R_END_R[0]:] = np.clip(rgh[0:_TD, R_END_R[0]:], 0.12, 0.95)
    arm = np.stack([np.ones_like(rr_), rr_, np.zeros_like(rr_)], axis=2)
    to_img(arm).resize((1024, 1024), Image.LANCZOS).save(os.path.join(GEN, 'top_arm.png'))
    print('TEX plateau OK')

    # ------------------------------------------------------------------ essences des outils
    def flecks(a, n, color, rng_):
        """Mailles (rayons ligneux) du hêtre : petits traits sombres le long du fil, posés en boucle."""
        S = a.shape[0]
        m = Image.new('L', (S * 2, S * 2), 0)
        dm = ImageDraw.Draw(m)
        for _ in range(n):
            x, y = rng_.uniform(0, S * 2), rng_.uniform(0, S * 2)
            L = rng_.uniform(2, 7)
            for ox in (-S * 2, 0, S * 2):
                for oy in (-S * 2, 0, S * 2):
                    dm.line([(x + ox, y + oy), (x + ox + L, y + oy)], fill=int(rng_.uniform(120, 255)), width=2)
        mm = F(m.resize((S, S), Image.LANCZOS))
        return a * (1 - 0.35 * mm[..., None]) + np.asarray(color) * (0.35 * mm[..., None])

    def periodic(S, rng_, freqs=(1, 2, 3), n=10):
        """Bruit raccordable (somme de sinus de fréquences entières), ~[0, 1]."""
        yy_, xx_ = np.mgrid[0:S, 0:S].astype(np.float32) / S
        out = np.zeros((S, S), np.float32)
        for _ in range(n):
            fx, fy = rng_.choice(freqs), rng_.choice((0,) + tuple(freqs))
            out += rng_.uniform(0.4, 1.0) * np.sin(2 * pi * (fx * xx_ + fy * yy_) + rng_.uniform(0, 2 * pi))
        out -= out.min()
        return out / max(out.max(), 1e-6)

    for key, (asset, rot, target, contrast, patina) in WOODS.items():
        im = Image.open(ph_map(asset, 'Diffuse', '1k')).convert('RGB')
        if rot:
            im = im.rotate(90, expand=True)
        a = F(im.resize((512, 512), Image.LANCZOS))
        lum = a.mean(2, keepdims=True)
        m = lum.mean()
        a = a * ((m + (lum - m) * contrast) / np.maximum(lum, 1e-3))     # fil plus marqué, teinte gardée
        a *= (1 - patina * smoothstep(0.45, 0.9, periodic(512, np.random.default_rng(len(key) * 7))))[..., None]
        tgt = np.asarray(target, np.float32) / 255.0
        lin_a = np.clip(a, 0, 1) ** 2.2
        lin_a *= (tgt ** 2.2) / lin_a.reshape(-1, 3).mean(0)
        a = np.clip(lin_a, 0, 1) ** (1 / 2.2)
        if key == 'beech':
            a = flecks(a, 900, tgt * 0.62, np.random.default_rng(5))
        to_img(np.clip(a, 0, 1)).save(os.path.join(GEN, f'{key}.png'))
        pxcm = 256 / END_CM
        c, _h = end_grain(256, 256, pxcm, tgt * np.array([0.82, 0.74, 0.66]), 300 + len(key),
                          sp=(0.16, 0.26))
        to_img(np.clip(c, 0, 1)).save(os.path.join(GEN, f'{key}_end.png'))

    # ------------------------------------------------------------------ copeaux (RGBA, alpha découpé)
    sv = Image.open(ph_map('white_oak_veneer', 'Diffuse', '1k')).convert('RGB').rotate(90, expand=True)
    sw, sh = 512, 128
    s_img = F(sv.crop((0, 300, 1024, 556)).resize((sw, sh), Image.LANCZOS))
    lum = s_img.mean(2, keepdims=True)
    s_img = s_img * ((lum.mean() + (lum - lum.mean()) * 1.6) / np.maximum(lum, 1e-3))
    s_img = s_img * (np.array([222, 190, 150]) / 255.0 / s_img.reshape(-1, 3).mean(0))
    v = (np.mgrid[0:sh, 0:sw][0].astype(np.float32) + 0.5) / sh
    e = np.abs(v - 0.5) * 2
    thin = smoothstep(0.45, 1.0, e)                  # bords plus fins : plus clairs, plus chauds
    s_img = s_img * (1 - 0.35 * thin[..., None]) + np.array([1.0, 0.88, 0.66]) * (0.35 * thin[..., None])
    s_img *= (0.93 + 0.1 * noise(sh, sw, 10, wrap_x=True))[..., None]
    rag = 0.93 + 0.04 * noise(1, sw, 18, wrap_x=True)[0] + 0.025 * noise(1, sw, 4, wrap_x=True)[0]
    tear = (noise(1, sw, 30, wrap_x=True)[0] > 0.86) * 0.08
    lim_top = rag - tear
    lim_bot = 0.94 + 0.035 * noise(1, sw, 15, wrap_x=True)[0] + 0.02 * noise(1, sw, 5, wrap_x=True)[0]
    alpha = np.where(v < 0.5, e < lim_top[None, :], e < lim_bot[None, :]).astype(np.float32)
    rgba = np.concatenate([np.clip(s_img, 0, 1), alpha[..., None]], axis=2)
    to_img(rgba, 'RGBA').save(os.path.join(GEN, 'shaving.png'))

    # ------------------------------------------------------------------ ruban du mètre (2048 × 128)
    tw, th = 2048, 128
    ppc = tw / TAPE_CM
    yel = np.ones((th, tw, 3), np.float32) * np.array([0.95, 0.76, 0.14])
    yel *= (0.94 + 0.08 * fbm(th, tw, 60, 3))[..., None]
    scuff = smoothstep(0.62, 0.8, fbm(th, tw, 40, 3)) * smoothstep(8 * ppc, 0, np.mgrid[0:th, 0:tw][1])
    yel = yel * (1 - 0.3 * scuff[..., None]) + np.array([0.55, 0.5, 0.42]) * (0.3 * scuff[..., None])
    tape = to_img(yel).resize((tw * 2, th * 2), Image.LANCZOS)
    dt = ImageDraw.Draw(tape)
    K = 2
    black, red = (20, 18, 16), (196, 22, 32)
    fnum = font('inter-latin-wght-normal.woff2', 34 * K, 620)
    for mm in range(0, int(TAPE_CM * 10) + 1):
        x = mm / 10 * ppc * K
        L = 30 if mm % 10 == 0 else (20 if mm % 5 == 0 else 12)
        wdt = 4 if mm % 10 == 0 else 3
        dt.line([(x, 0), (x, L * K)], fill=black, width=wdt)
        dt.line([(x, th * K), (x, (th - L) * K)], fill=black, width=wdt)
    for cm in range(1, int(TAPE_CM)):
        x = cm * ppc * K
        txt = str(cm)
        bb = dt.textbbox((0, 0), txt, font=fnum)
        tx, ty = x - (bb[2] - bb[0]) / 2 - bb[0] - 6 * K, th * K / 2 - (bb[3] - bb[1]) / 2 - bb[1]
        if cm % 10 == 0:
            dt.rectangle([tx - 8, ty - 8, tx + (bb[2] - bb[0]) + 8, ty + (bb[3] - bb[1]) + 8], fill=red)
            dt.text((tx, ty), txt, font=fnum, fill=(250, 236, 200))
        else:
            dt.text((tx, ty), txt, font=fnum, fill=red if cm % 10 == 5 else black)
    tape.resize((tw, th), Image.LANCZOS).save(os.path.join(GEN, 'tape.png'))

    # ------------------------------------------------------------------ acier forgé (couleur + rugosité)
    n_ = 512
    base = fbm(n_, n_, 128, 5)
    spots = smoothstep(0.55, 0.75, fbm(n_, n_, 64, 4))
    stc = np.ones((n_, n_, 3), np.float32) * np.array([0.085, 0.085, 0.09])
    stc *= (0.75 + 0.5 * base)[..., None]
    stc = stc * (1 - 0.5 * spots[..., None]) + np.array([0.20, 0.19, 0.18]) * (0.5 * spots[..., None])
    scr = Image.new('L', (n_, n_), 0)
    dsc = ImageDraw.Draw(scr)
    for _ in range(120):
        x, y = rng.uniform(0, n_), rng.uniform(0, n_)
        a, L = rng.uniform(0, pi), rng.uniform(5, 60)
        dsc.line([(x, y), (x + cos(a) * L, y + sin(a) * L)], fill=int(rng.uniform(60, 180)), width=1)
    msc = F(scr)
    stc = stc * (1 - 0.6 * msc[..., None]) + np.array([0.42, 0.42, 0.43]) * (0.6 * msc[..., None])
    to_img(np.clip(stc, 0, 1)).save(os.path.join(GEN, 'steel_col.png'))
    sr = np.clip(0.42 + 0.22 * (base - 0.5) - 0.18 * msc + 0.1 * spots, 0.15, 0.8)
    to_img(np.stack([np.ones_like(sr), sr, np.ones_like(sr)], axis=2)).save(os.path.join(GEN, 'steel_arm.png'))

    # ------------------------------------------------------------------ écran : site fictif d'un ébéniste
    site_image(np, Image, ImageDraw, font)
    print('TEX OK ->', GEN)


def site_image(np, Image, ImageDraw, font):
    """« Atelier Sorbier », ébéniste fictif : page d'accueil mobile, 720 × 1560 (3x). Composée pour se lire
    même petite : une photo, un grand titre, un bouton sombre."""
    W_, H_ = SCREEN_W, SCREEN_H
    paper, ink, wood_dark = (243, 238, 230), (28, 24, 21), (64, 44, 30)
    accent = (150, 82, 40)
    im = Image.new('RGB', (W_, H_), paper)
    d = ImageDraw.Draw(im)
    serif = 'instrument-serif-latin-400-normal.woff2'
    serif_i = 'instrument-serif-latin-400-italic.woff2'
    inter = 'inter-latin-wght-normal.woff2'
    mono = 'jetbrains-mono-latin-400-normal.woff2'

    def photo(asset, w, h, rot=False, dark=0.0, warm=(1.0, 0.92, 0.82)):
        src = Image.open(ph_map(asset, 'Diffuse', '1k')).convert('RGB')
        if rot:
            src = src.rotate(90, expand=True)
        s = max(w / src.width, h / src.height) * 1.25
        src = src.resize((int(src.width * s), int(src.height * s)), Image.LANCZOS)
        ox, oy = (src.width - w) // 2, (src.height - h) // 2
        a = np.asarray(src.crop((ox, oy, ox + w, oy + h))).astype(np.float32) / 255
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        light = 0.55 + 0.6 * np.exp(-(((xx - w * 0.3) / (w * 0.7)) ** 2 + ((yy - h * 0.25) / (h * 0.8)) ** 2))
        a = a * light[..., None] * np.array(warm)
        a = a * (1 - dark * (yy / h)[..., None] ** 1.5)
        return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))

    # barre d'état
    f_sb = font(inter, 26, 600)
    d.text((44, 22), '9:41', font=f_sb, fill=ink)
    for i in range(4):
        d.rectangle([560 + i * 11, 44 - (i + 1) * 5, 567 + i * 11, 44], fill=ink)
    d.arc([612, 18, 646, 52], 225, 315, fill=ink, width=4)
    d.arc([620, 28, 638, 46], 225, 315, fill=ink, width=4)
    d.rounded_rectangle([656, 24, 696, 44], 5, outline=ink, width=2)
    d.rectangle([659, 27, 686, 41], fill=ink)
    d.rectangle([697, 30, 699, 38], fill=ink)
    # en-tête
    d.text((40, 76), 'Sorbier', font=font(serif, 70), fill=ink)
    d.text((44, 156), 'ATELIER D’ÉBÉNISTERIE · MONTREUIL', font=font(mono, 17), fill=(110, 98, 88))
    d.line([(626, 104), (680, 104)], fill=ink, width=4)
    d.line([(640, 124), (680, 124)], fill=ink, width=4)
    # photo d'ouverture : noyer en lumière rasante, titre en grand
    hero = photo('american_walnut_veneer', 720, 760, rot=True, dark=0.8)
    im.paste(hero, (0, 200))
    d.text((40, 650), 'MENUISERIE · SUR MESURE', font=font(mono, 22), fill=(236, 220, 196))
    d.text((36, 684), 'Le bois, taillé', font=font(serif, 92), fill=(250, 244, 234))
    d.text((36, 778), 'à votre mesure.', font=font(serif_i, 92), fill=(250, 244, 234))
    # texte + bouton
    f_b = font(inter, 28, 420)
    y = 1000
    for line in ('Tables, bibliothèques, cuisines :', 'chaque pièce est dessinée et', 'fabriquée dans notre atelier.'):
        d.text((40, y), line, font=f_b, fill=(58, 52, 46))
        y += 42
    d.rectangle([40, 1146, 680, 1240], fill=wood_dark)
    f_btn = font(inter, 32, 600)
    d.text((72, 1173), 'Demander un devis', font=f_btn, fill=(250, 244, 234))
    d.line([(608, 1193), (646, 1193)], fill=(250, 244, 234), width=4)
    d.line([(632, 1179), (646, 1193), (632, 1207)], fill=(250, 244, 234), width=4)
    # réalisations
    d.text((40, 1282), 'Réalisations', font=font(serif, 50), fill=ink)
    d.text((560, 1302), 'Tout voir', font=font(inter, 22, 500), fill=accent)
    t1 = photo('oak_veneer_01', 310, 170, rot=True, dark=0.2)
    t2 = photo('black_walnut_veneer_01', 310, 170, rot=False, dark=0.2)
    im.paste(t1, (40, 1356))
    im.paste(t2, (370, 1356))
    # indicateur d'accueil (système)
    d.rounded_rectangle([250, 1538, 470, 1547], 5, fill=ink)
    im.save(os.path.join(GEN, 'screen.png'))
    im.save(os.path.join(PUB, 'site-default.webp'), quality=88, method=6)
    print('TEX écran ->', os.path.join(PUB, 'site-default.webp'))


# =============================================================================== mode Blender
if not IN_BLENDER:
    textures_main()
    sys.exit(0)

import bmesh  # noqa: E402
import bpy  # noqa: E402
import numpy as np  # noqa: E402  (fourni avec Blender)
from mathutils import Matrix, Vector  # noqa: E402

ARGS = cli_args()
random.seed(2026)
TEX_FILES = ['top_col.png', 'top_nrm.png', 'top_arm.png', 'shaving.png', 'tape.png', 'steel_col.png',
             'steel_arm.png', 'screen.png'] + [f'{k}{s}.png' for k in WOODS for s in ('', '_end')]
if ARGS.get('textures') or not all(os.path.exists(os.path.join(GEN, n)) for n in TEX_FILES):
    subprocess.run([os.environ.get('ETABLI_PYTHON', 'python'), os.path.abspath(__file__)], check=True)


def GT(name):
    return os.path.join(GEN, name)


# ------------------------------------------------------------------------------- géométrie (cm, Y-up)
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(radians(deg), 4, axis)


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


def xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    if M.to_3x3().determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def superellipse(a, b, p, n, phase=0.0):
    """Contour (a, b) de puissance p (2 = ellipse, 4+ = carré arrondi), n points, sens trigonométrique."""
    out = []
    for k in range(n):
        t = 2 * pi * k / n + phase
        c, s_ = cos(t), sin(t)
        out.append((a * math.copysign(abs(c) ** (2 / p), c), b * math.copysign(abs(s_) ** (2 / p), s_)))
    return out


def rrect4(x0, y0, x1, y1, radii, n=6):
    """Rectangle à coins de rayons distincts (bas-gauche, bas-droit, haut-droit, haut-gauche), sens trigo."""
    out = []
    for (cx, cy, a0), r in zip(((x0, y0, 180), (x1, y0, 270), (x1, y1, 0), (x0, y1, 90)), radii):
        r = max(r, 0.02)
        ox = cx + (r if a0 in (180, 90) else -r)
        oy = cy + (r if a0 in (180, 270) else -r)
        for k in range(n + 1):
            a = radians(a0 + 90 * k / n)
            out.append((ox + r * cos(a), oy + r * sin(a)))
    return out


def loft(rings, cap0='ngon', cap1='ngon', uvs=None, c0=None, c1=None):
    """Surface entre anneaux successifs (listes de Vector de même taille). cap : 'ngon', 'fan' (sommet c0/c1)
    ou None. uvs(i, j) -> (u, v), j ∈ [0, n] (j = n : couture)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    n = len(rings[0])
    V = [[bm.verts.new(p) for p in ring] for ring in rings]
    for i in range(len(rings) - 1):
        for j in range(n):
            j2 = (j + 1) % n
            f = bm.faces.new([V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]])
            if uvs:
                for lp, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                    lp[uvl].uv = uvs(ii, jj)

    def cap(idx, kind, center):
        ring = V[idx]
        if kind == 'ngon':
            f = bm.faces.new(ring)
            if uvs:
                for lp, j in zip(f.loops, range(n)):
                    lp[uvl].uv = uvs(idx, j)
        elif kind == 'fan':
            cv = bm.verts.new(center)
            for j in range(n):
                f = bm.faces.new([ring[j], ring[(j + 1) % n], cv])
                if uvs:
                    a, b = uvs(idx, j), uvs(idx, j + 1)
                    for lp, uv in zip(f.loops, (a, b, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))):
                        lp[uvl].uv = uv

    if cap0:
        cap(0, cap0, c0)
    if cap1:
        cap(len(rings) - 1, cap1, c1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def lathe(prof, segs=24):
    """Révolution d'un profil (r, y) autour de l'axe Y (anneaux fermés, pôles aux rayons nuls)."""
    rings = []
    for r, y in prof:
        r = max(r, 1e-4)
        rings.append([Vector((r * cos(2 * pi * k / segs), y, -r * sin(2 * pi * k / segs))) for k in range(segs)])
    bm = loft(rings, cap0='ngon', cap1='ngon')
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def prism(outline, t0, t1):
    """Prisme : contour 2D (x, y) extrudé en z de t0 à t1."""
    return loft([[Vector((x, y, t)) for x, y in outline] for t in (t0, t1)])


def rbox(sx, sy, sz, bev, seg=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=S(sx, sy, sz))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=min(bev, 0.45 * min(sx, sy, sz)),
                        offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm


def box_uv(bm, scale, off=(0.0, 0.0)):
    """Projection cubique (cm -> UV) : dessus (x, z), côtés (x, y), bouts (z, y) ; fil du bois le long de x."""
    uvl = bm.loops.layers.uv.verify()
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda k: abs(n[k]))
        for lp in f.loops:
            c = lp.vert.co
            u, v = (c.x, c.z) if ax == 1 else ((c.x, c.y) if ax == 2 else (c.z, c.y))
            lp[uvl].uv = (u * scale + off[0], v * scale + off[1])
    return bm


def is_end(f, axis=0, lim=0.8):
    """Face de bois de bout : normale le long du fil (axe `axis`)."""
    return abs(f.normal[axis]) > lim


def wood_uv(bm, axis=0, off=(0.0, 0.0), only_end=False):
    """UV d'une pièce de bois dont le fil suit `axis` : faces de fil -> (fil, travers) / WOOD_CM, faces de bout
    -> (travers, travers) / END_CM (matériau *_end)."""
    uvl = bm.loops.layers.uv.verify()
    bm.normal_update()
    o = [k for k in range(3) if k != axis]
    for f in bm.faces:
        n = f.normal
        end = is_end(f, axis)
        if only_end and not end:
            continue
        ax = max(range(3), key=lambda k: abs(n[k]))
        for lp in f.loops:
            c = lp.vert.co
            if end:
                lp[uvl].uv = (c[o[0]] / END_CM + off[0], c[o[1]] / END_CM + off[1])
            else:
                other = o[1] if ax == o[0] else o[0]
                lp[uvl].uv = (c[axis] / WOOD_CM + off[0], c[other] / WOOD_CM + off[1])
    return bm


def boolean_diff(bm_a, bm_b):
    """A − B (booléen exact via un modificateur temporaire). Les UV sont à recalculer."""
    sc = bpy.context.scene.collection
    obs = []
    for nm, bm in (('_boolA', bm_a), ('_boolB', bm_b)):
        me = bpy.data.meshes.new(nm)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(nm, me)
        sc.objects.link(ob)
        obs.append(ob)
    mod = obs[0].modifiers.new('bool', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = obs[1]
    obs[1].hide_render = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obs[0].evaluated_get(dg))
    out = bmesh.new()
    out.from_mesh(me)
    for ob in obs:
        m = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.meshes.remove(m)
    bpy.data.meshes.remove(me)
    bmesh.ops.recalc_face_normals(out, faces=out.faces[:])
    return out


class Geo:
    """Accumulateur de pièces (bmesh en cm) d'un même objet, matériaux par face."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.mats = []

    def mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def add(self, bm, mat, M=None):
        """mat : matériau, ou fonction (face source) -> matériau."""
        bm.normal_update()
        src_uv = bm.loops.layers.uv.active
        vmap = {v: self.bm.verts.new((M @ v.co) if M else v.co) for v in bm.verts}
        new = []
        for f in bm.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            new.append(nf)
            nf.material_index = self.mi(mat(f) if callable(mat) else mat)
            for ls, ld in zip(f.loops, nf.loops):
                ld[self.uv].uv = ls[src_uv].uv if src_uv else (0.0, 0.0)
        if M is not None and M.to_3x3().determinant() < 0:
            bmesh.ops.reverse_faces(self.bm, faces=new)
        bm.free()
        return self

    def com(self):
        """Centre de masse (cm) : volumes signés pondérés par la densité du matériau ; surface sinon."""
        self.bm.normal_update()
        acc, tot = Vector((0, 0, 0)), 0.0
        for f in self.bm.faces:
            d = DENSITY.get(self.mats[f.material_index].name, 0.0)
            if d <= 0:
                continue
            vs = [v.co for v in f.verts]
            for k in range(1, len(vs) - 1):
                a, b, c = vs[0], vs[k], vs[k + 1]
                vol = a.dot(b.cross(c)) / 6.0 * d
                acc += vol * (a + b + c) / 4.0
                tot += vol
        if abs(tot) > 1e-6:
            return acc / tot
        acc, tot = Vector((0, 0, 0)), 0.0
        for f in self.bm.faces:
            a = f.calc_area()
            acc += a * f.calc_center_median()
            tot += a
        return acc / tot


DENSITY = {}
OBJS = []
SURF = TOP_H          # dessus du plateau (cm)


def place(geo, name, coll, pos, yaw, parent, sharp=40.0, com=None, y0=SURF):
    """Recentre le maillage (cm, repère local posé sur le plateau) sur son centre de masse, passe en
    unités-scène et pose l'objet : origine locale en pos (x, z en cm) à la hauteur y0, lacet `yaw` (degrés,
    autour de Y). Retourne (objet, centre de masse local)."""
    c = com if com is not None else geo.com()
    xf(geo.bm, S(U) @ T(-c.x, -c.y, -c.z))
    ob = bm_obj(geo.bm, name, geo.mats, coll, sharp=sharp)
    a = radians(yaw)
    cx, cz = c.x * cos(a) + c.z * sin(a), -c.x * sin(a) + c.z * cos(a)
    ob.location = W((pos[0] + cx) * U, (y0 + c.y) * U, (pos[1] + cz) * U)
    ob.rotation_euler = (0.0, 0.0, a)
    ob.parent = parent
    OBJS.append(ob)
    return ob, c


# ------------------------------------------------------------------------------- matériaux
def alpha_clip(m):
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    link = p.inputs['Alpha'].links[0]
    rnd = nt.nodes.new('ShaderNodeMath')
    rnd.operation = 'ROUND'
    nt.links.new(link.from_socket, rnd.inputs[0])
    nt.links.new(rnd.outputs[0], p.inputs['Alpha'])
    return m


def make_materials():
    M = {}

    def add(key, m, density=0.0, cull=True):
        m.use_backface_culling = cull
        DENSITY[m.name] = density
        M[key] = m

    add('top', pbr('EtabliChene', color_map=GT('top_col.png'), normal_map=GT('top_nrm.png'),
                   rough_map=GT('top_arm.png'), normal=1.0), 0.7)
    names = {'beech': 'Hetre', 'ash': 'Frene', 'walnut': 'Noyer', 'oak': 'ChenePresse'}
    rough = {'beech': 0.5, 'ash': 0.42, 'walnut': 0.48, 'oak': 0.55}
    dens = {'beech': 0.72, 'ash': 0.68, 'walnut': 0.65, 'oak': 0.7}
    for k, nm in names.items():
        add(k, pbr('Etabli' + nm, color_map=GT(f'{k}.png'), rough=rough[k]), dens[k])
        add(k + '_end', pbr('Etabli' + nm + 'Bout', color_map=GT(f'{k}_end.png'), rough=min(0.9, rough[k] + 0.2)),
            dens[k])
    add('sole', pbr('EtabliSemelle', '#4a3424', rough=0.42), 0.8)
    add('forged', pbr('EtabliAcierForge', metal=1.0, color_map=GT('steel_col.png'), arm_map=GT('steel_arm.png')),
        7.8)
    add('bright', pbr('EtabliAcierPoli', '#c3c3c5', rough=0.2, metal=1.0), 7.8)
    add('satin', pbr('EtabliAcierSatine', '#a9a9ac', rough=0.34, metal=1.0), 7.8)
    add('tape', pbr('EtabliRuban', color_map=GT('tape.png'), rough=0.32), 0.0, cull=False)
    add('case', pbr('EtabliBoitier', '#2e2d2c', rough=0.42, coat=0.3, coat_rough=0.25), 1.2)
    add('case2', pbr('EtabliBoitierDisque', '#3d3c3a', rough=0.3), 1.2)
    add('rubber', pbr('EtabliCaoutchouc', '#141414', rough=0.82), 1.2)
    add('accent', pbr('EtabliBouton', '#c25a22', rough=0.45), 1.2)
    add('paint', pbr('EtabliCrayonLaque', '#a3241c', rough=0.3, coat=0.5, coat_rough=0.2), 0.6)
    add('cedar', pbr('EtabliCrayonBois', '#d2a576', rough=0.72), 0.5)
    add('graphite', pbr('EtabliGraphite', '#2b2b2e', rough=0.38, metal=0.5), 2.2)
    add('frame', pbr('EtabliCadre', '#55524e', rough=0.3, metal=1.0), 2.7)
    add('glass', pbr('EtabliVerre', '#030304', rough=0.04), 2.5)
    add('back', pbr('EtabliDos', '#1b1c1f', rough=0.38, coat=0.4, coat_rough=0.3), 2.5)
    add('screen', pbr('EtabliEcran', '#000000', rough=0.12, emit_map=load_image(GT('screen.png'), name='etabli_screen'),
                      strength=float(ARGS.get('screen', 1.15))), 0.0)
    sh = pbr('EtabliCopeau', color_map=GT('shaving.png'), alpha_map=True, rough=0.55)
    alpha_clip(sh)
    add('shaving', sh, 0.0, cull=False)
    add('brass', pbr('EtabliLaiton', '#c9a35b', rough=0.3, metal=1.0), 8.5)
    return M


def wood(M, key, axis=0):
    """Matériau par face : bois de bout si la normale suit le fil."""
    return lambda f: M[key + '_end'] if is_end(f, axis) else M[key]


# ------------------------------------------------------------------------------- plateau
def build_top(M, coll, root):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=T(0, TOP_H / 2, 0) @ S(TOP_L, TOP_H, TOP_D))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=BEV, offset_type='OFFSET', segments=3, profile=0.5,
                    affect='EDGES', clamp_overlap=True)
    cut = Geo()
    for hx, hz in DOG_HOLES:
        c = lathe([(0.0, -1.0), (DOG_R, -1.0), (DOG_R, TOP_H - 0.2), (DOG_R + 0.22, TOP_H + 0.02),
                   (DOG_R + 0.22, TOP_H + 1.0), (0.0, TOP_H + 1.0)], 32)
        cut.add(c, M['top'], T(hx, 0, hz))
    bm = boolean_diff(bm, cut.bm)
    # atlas : chaque face va dans la région de sa direction dominante
    uvl = bm.loops.layers.uv.verify()
    bm.normal_update()
    A = float(ATLAS)
    for f in bm.faces:
        n = f.normal
        cen = f.calc_center_median()
        hole = None
        for hx, hz in DOG_HOLES:
            if hypot(cen.x - hx, cen.z - hz) < DOG_R + 0.4 and abs(n.y) < 0.97:
                hole = (hx, hz)
        for lp in f.loops:
            x, y, z = lp.vert.co
            if hole:
                ang = (atan2(z - hole[1], x - hole[0]) / (2 * pi)) % 1.0
                px = R_HOLE[0] + ang * (R_HOLE[2] - R_HOLE[0])
                py = R_HOLE[1] + (TOP_H - y) / TOP_H * (R_HOLE[3] - R_HOLE[1]) * 0.9
            elif n.y < -0.9:
                px = R_BOTTOM[0] + (x + TOP_L / 2) / TOP_L * (R_BOTTOM[2] - R_BOTTOM[0])
                py = R_BOTTOM[1] + (z + TOP_D / 2) / TOP_D * (R_BOTTOM[3] - R_BOTTOM[1])
            elif abs(n.y) >= max(abs(n.x), abs(n.z)):
                px, py = (x + TOP_L / 2) * PXCM, (z + TOP_D / 2) * PXCM
            elif abs(n.z) >= abs(n.x):
                if n.z > 0:
                    px, py = (x + TOP_L / 2) * PXCM, R_FRONT[1] + (TOP_H - y) * PXCM
                else:
                    px, py = (TOP_L / 2 - x) * PXCM, R_BACK[1] + (TOP_H - y) * PXCM
            elif n.x > 0:
                px, py = R_END_R[0] + (TOP_H - y) * PXCM, R_END_R[1] + (TOP_D / 2 - z) * PXCM
            else:
                px, py = R_END_L[0] + (TOP_H - y) * PXCM, R_END_L[1] + (TOP_D / 2 + z) * PXCM
            lp[uvl].uv = (px / A, 1.0 - py / A)
    xf(bm, S(U))
    ob = bm_obj(bm, 'Bench_Top', M['top'], coll, sharp=50)
    ob.parent = root
    OBJS.append(ob)
    return ob


# ------------------------------------------------------------------------------- presse avant
VISE_X = -18.5        # axe de la vis
VISE_Y = 4.6
JAW_GAP = 0.6


def build_vise(M):
    """Repère du plateau (cm, sol à y = 0). Mâchoire en chêne (fil le long de x), légèrement ouverte, deux
    guides d'acier visibles dans l'ouverture, moyeu tourné et barre de serrage en hêtre."""
    g = Geo()
    z0 = TOP_D / 2 + JAW_GAP
    jaw = rbox(21.0, TOP_H - 0.5, 4.6, 0.4, 3)
    wood_uv(jaw, 0, (0.13, 0.41))
    g.add(jaw, wood(M, 'oak'), T(VISE_X, (TOP_H - 0.5) / 2 + 0.25, z0 + 2.3))
    for gx in (VISE_X - 8.0, VISE_X + 8.0):          # guides
        rod = lathe([(0, 0), (0.8, 0), (0.8, JAW_GAP + 0.4), (0, JAW_GAP + 0.4)], 20)
        g.add(rod, M['satin'], T(gx, 2.4, TOP_D / 2 - 0.2) @ R('X', 90))
    scr = lathe([(0, 0), (1.7, 0), (1.7, JAW_GAP + 0.4), (0, JAW_GAP + 0.4)], 24)     # vis (dans l'ouverture)
    box_uv(scr, 1 / WOOD_CM)
    g.add(scr, M['beech'], T(VISE_X, VISE_Y, TOP_D / 2 - 0.2) @ R('X', 90))
    # moyeu tourné : collet, corps renflé, gorge, nez arrondi (axe +z)
    hub_prof = [(0, 0), (3.0, 0), (3.05, 0.25), (2.75, 0.55), (2.75, 0.85), (3.1, 1.3), (3.2, 2.1), (3.05, 2.9),
                (2.7, 3.35), (2.1, 3.65), (1.2, 3.82), (0, 3.86)]
    hub = lathe(hub_prof, 40)
    xf(hub, R('X', 90))
    box_uv(hub, 1 / WOOD_CM, (0.37, 0.11))
    hz = z0 + 4.6
    g.add(hub, M['beech'], T(VISE_X, VISE_Y, hz))
    # barre de serrage traversant le moyeu, inclinée, boules aux bouts
    tilt = 11.0
    bar = lathe([(0, -12.6), (0.95, -12.6), (1.0, 0.0), (0.95, 12.6), (0, 12.6)], 20)
    xf(bar, R('Z', -90))
    box_uv(bar, 1 / WOOD_CM, (0.21, 0.67))
    Mb = T(VISE_X, VISE_Y, hz + 2.0) @ R('Z', tilt)
    g.add(bar, M['beech'], Mb)
    for sx in (-1, 1):
        knob = lathe([(0, -1.45), (0.8, -1.32), (1.3, -0.85), (1.45, 0.0), (1.3, 0.85), (0.8, 1.32), (0, 1.45)], 24)
        box_uv(knob, 1 / WOOD_CM, (0.5, 0.5))
        g.add(knob, M['beech'], Mb @ T(sx * 13.6, 0, 0))
    return g


# ------------------------------------------------------------------------------- marteau de menuisier
def build_hammer(M):
    """Repère local : manche le long de +x, tête le long de z (table à -z, panne à +z), joues selon y."""
    g = Geo()
    head = [  # (z, demi-épaisseur le long du manche hx, demi-hauteur hy, puissance)
        (-5.47, 1.05, 1.05, 2.0), (-5.40, 1.24, 1.24, 2.0), (-5.26, 1.31, 1.31, 2.0), (-4.86, 1.31, 1.31, 2.0),
        (-4.64, 1.20, 1.20, 2.2), (-4.20, 1.02, 1.02, 2.6), (-3.40, 1.02, 1.04, 3.0), (-2.40, 1.18, 1.18, 3.4),
        (-1.40, 1.22, 1.24, 3.6), (0.00, 1.22, 1.28, 3.6), (1.40, 1.22, 1.25, 3.6), (2.40, 1.12, 1.25, 3.4),
        (3.60, 0.82, 1.29, 3.2), (4.70, 0.48, 1.33, 3.0), (5.45, 0.24, 1.36, 2.8), (5.80, 0.12, 1.32, 2.6),
        (5.92, 0.05, 1.18, 2.4)]
    N = 32
    rings = [[Vector((x, y, z)) for x, y in superellipse(hx, hy, p, N, pi / N)] for z, hx, hy, p in head]
    hb = loft(rings, cap0='fan', cap1='ngon', c0=Vector((0, 0, -5.56)))
    box_uv(hb, 1 / 6.0)
    g.add(hb, lambda f: M['bright'] if (f.calc_center_median().z < -4.72 or f.calc_center_median().z > 5.55)
          else M['forged'])
    # manche en frêne (ovale, grand axe le long de la tête)
    hnd = [(-1.205, 1.08, 0.57), (1.30, 1.08, 0.57), (1.7, 1.0, 0.59), (3.0, 0.92, 0.60), (8.0, 0.98, 0.66),
           (14.0, 1.10, 0.76), (20.0, 1.26, 0.88), (25.0, 1.40, 0.98), (28.5, 1.46, 1.02), (30.0, 1.42, 1.00),
           (30.8, 1.30, 0.92), (31.2, 1.06, 0.76), (31.42, 0.62, 0.46)]
    NH = 24
    rings = [[Vector((x, y, z)) for z, y in superellipse(az, ay, 2.25, NH)] for x, az, ay in hnd]
    hm = loft(rings, cap0='ngon', cap1='fan', c1=Vector((31.5, 0, 0)),
              uvs=lambda i, j: (hnd[i][0] / WOOD_CM, j / NH * 0.45))
    g.add(hm, lambda f: M['ash_end'] if f.calc_center_median().x > 31.3 else M['ash'])
    # coin du manche (bois sombre) et coin d'acier, visibles sur le dessus de la tête
    w = rbox(0.06, 0.14, 1.9, 0.02, 1)
    box_uv(w, 1 / 8.0)
    g.add(w, M['walnut'], T(-1.225, 0, 0))
    w2 = rbox(0.05, 0.9, 0.16, 0.02, 1)
    g.add(w2, M['satin'], T(-1.225, 0, 0.45))
    # posé sur le côté : tête et talon du manche touchent la table
    bm = g.bm
    y_head = min(v.co.y for v in bm.verts if v.co.x < 2.0)
    y_butt = min(v.co.y for v in bm.verts if v.co.x > 26.0)
    th = (y_head - y_butt) / 29.0
    xf(bm, R('Z', math.degrees(th)))
    xf(bm, T(0, -min(v.co.y for v in bm.verts) + 0.01, 0))
    return g


# ------------------------------------------------------------------------------- rabot à corne
X_M = 2.0     # lumière (bouche) sur la semelle, repère local du rabot


def plane_profile(h, ins):
    """Section du corps (z, y) : semelle plate, flancs droits, grands chanfreins en haut. Sens trigo vu de +x."""
    hw = 3.2 - ins
    top = h - ins * 0.6
    y0 = ins * 0.5
    right = [(0.0, y0), (1.5, y0), (hw - 0.15, y0), (hw - 0.04, y0 + 0.04), (hw, y0 + 0.15), (hw, 1.0),
             (hw, top - 0.85), (hw - 0.03, top - 0.74), (hw - 0.68, top - 0.07), (hw - 0.80, top), (1.2, top),
             (0.0, top)]
    return right + [(-z, y) for z, y in reversed(right[1:-1])]


def plane_h(x):
    h = 5.6
    if x < -7.0:
        h -= 1.4 * ((-7.0 - x) / 5.0) ** 2
    if x > 8.0:
        h -= 0.5 * ((x - 8.0) / 4.0) ** 2
    return h


def build_plane(M):
    g = Geo()
    xs = [(-12.0, 0.34), (-11.94, 0.16), (-11.82, 0.05), (-11.6, 0.0), (-10.8, 0), (-9.6, 0), (-8.2, 0),
          (-6.5, 0), (-4.0, 0), (-1.0, 0), (2.0, 0), (5.0, 0), (7.5, 0), (9.2, 0), (10.6, 0), (11.6, 0),
          (11.82, 0.05), (11.94, 0.16), (12.0, 0.34)]
    rings = [[Vector((x, y, z)) for z, y in plane_profile(plane_h(x), ins)] for x, ins in xs]
    body = loft(rings)
    # lumière : lit du fer à 45°, front d'échappement à 75°
    a75 = math.tan(radians(75))
    cav = [(X_M - 0.1, 0.6), (X_M + 0.4, 0.6), (X_M + 0.4 + 6.4 / a75, 7.0), (X_M - 0.1 - 6.4, 7.0)]
    cutter = prism(cav, -2.55, 2.55)
    body = boolean_diff(body, cutter)
    wood_uv(body, 0, (0.1, 0.3))
    g.add(body, lambda f: M['sole'] if f.calc_center_median().y < 0.98 else
          (M['beech_end'] if is_end(f) else M['beech']))
    # corne
    path = [Vector(p) for p in ((8.4, 3.8, 0), (8.9, 5.4, 0), (9.6, 7.2, 0), (10.4, 8.7, 0), (11.0, 9.8, 0))]
    from_sz = [(1.65, 1.35), (1.5, 1.25), (1.22, 1.05), (1.06, 0.95), (1.08, 0.98)]
    pts, szs = [], []
    for k in range(len(path) - 1):
        for t in (0.0, 0.34, 0.67):
            pts.append(path[k].lerp(path[k + 1], t))
            szs.append((lerp(from_sz[k][0], from_sz[k + 1][0], t), lerp(from_sz[k][1], from_sz[k + 1][1], t)))
    pts.append(path[-1])
    szs.append(from_sz[-1])
    tip_dir = (path[-1] - path[-2]).normalized()
    for dt, f in ((0.35, 1.12), (0.65, 1.08), (0.9, 0.9), (1.05, 0.62), (1.13, 0.3)):
        pts.append(path[-1] + tip_dir * dt)
        szs.append((from_sz[-1][0] * f, from_sz[-1][1] * f))
    rings = []
    NH = 20
    for k, (p, (a, b)) in enumerate(zip(pts, szs)):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        e1 = Vector((-t.y, t.x, 0.0))
        rings.append([p + e1 * x + Vector((0, 0, 1)) * z for x, z in superellipse(a, b, 2.3, NH)])
    horn = loft(rings, cap0='ngon', cap1='fan', c1=pts[-1] + tip_dir * 0.06)
    box_uv(horn, 1 / WOOD_CM, (0.31, 0.17))
    g.add(horn, M['beech'])
    # fer, contre-fer, vis et coin, dans le repère du lit (s le long du lit vers le haut, t vers l'avant)
    c45 = cos(radians(45))
    O = Vector((X_M - 0.1, 0.6, 0.0))
    d, nn = Vector((-c45, c45, 0)), Vector((c45, c45, 0))
    BED = Matrix(((d.x, nn.x, 0, O.x), (d.y, nn.y, 0, O.y), (d.z, nn.z, 1, O.z), (0, 0, 0, 1)))
    L_IRON = (9.7 - 0.6) / c45

    def plate(s0, s1, hw, r, t0, t1):
        out = rrect4(s0, -hw, s1, hw, (0.05, r, r, 0.05), 5)
        bm = prism(out, t0, t1)
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.025, offset_type='OFFSET', segments=1, affect='EDGES',
                        clamp_overlap=True)
        box_uv(bm, 1 / 6.0)
        return bm

    # contour (s, w) dans le plan (d, z) : on permute pour que l'épaisseur aille le long de t (= nn)
    SWAP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    g.add(plate(0.0, L_IRON, 2.4, 0.55, 0.0, 0.26), M['forged'], BED @ SWAP)
    g.add(plate(0.6, L_IRON - 1.5, 2.3, 0.45, 0.26, 0.44), M['satin'], BED @ SWAP)
    screw = lathe([(0, 0), (0.56, 0), (0.56, 0.12), (0.5, 0.24), (0.3, 0.31), (0, 0.33)], 20)
    g.add(screw, M['satin'], BED @ T(L_IRON - 2.4, 0.44, 0))
    # coin (hêtre) : s de 1.8 à 9.6, épaisseur croissante, tête arrondie
    ws = [1.8, 2.6, 4.0, 5.5, 7.0, 8.3, 8.9, 9.25, 9.5, 9.66, 9.72]
    rings = []
    for s_ in ws:
        th = 0.28 + (s_ - 1.8) / 7.9 * 1.42
        k = 1.0 if s_ < 8.6 else sqrt(max(0.06, 1 - ((s_ - 8.6) / 1.15) ** 2))
        hw = 2.5 * k
        rings.append([Vector((s_, 0.44 + th / 2 + y * th / 2, z * hw)) for z, y in superellipse(1, 1, 6, 24)])
    wedge = loft(rings)
    box_uv(wedge, 1 / WOOD_CM, (0.5, 0.2))
    g.add(wedge, M['beech'], BED)
    # bouton de frappe (arrière), noyer
    xb = -10.3
    btn = lathe([(0, -0.4), (0.7, -0.4), (0.72, 0.1), (0.62, 0.22), (0.35, 0.29), (0, 0.31)], 24)
    box_uv(btn, 1 / END_CM)
    g.add(btn, M['walnut_end'], T(xb, plane_h(xb) - 0.05, 0))
    return g


# ------------------------------------------------------------------------------- mètre ruban
TAPE_OUT = 13.0       # longueur sortie (cm), du nez du boîtier au crochet


def blade_y(x, z):
    base = 0.015 + 0.405 * (1 - sstep(0.0, 4.0, x))
    return base + 0.2 * (z / 1.25) ** 2


def build_tape(M):
    """Repère local : ruban le long de +x, boîtier debout (x ∈ [-6.6, 0], y ∈ [0, 6.6]), largeur en z."""
    g = Geo()
    zs = [(-1.8, 0.42), (-1.78, 0.24), (-1.72, 0.1), (-1.62, 0.03), (-1.5, 0.0), (1.5, 0.0), (1.62, 0.03),
          (1.72, 0.1), (1.78, 0.24), (1.8, 0.42)]
    rings = []
    for z, d in zs:
        pts = rrect4(-6.6 + d, 0.0 + d, 0.0 - d, 6.6 - d, (1.3 - d, 0.5 - d, 1.4 - d, 2.6 - d), 6)
        rings.append([Vector((x, y, z)) for x, y in pts])
    case = loft(rings)
    g.add(case, lambda f: M['case'] if abs(f.normal.z) > 0.72 else M['rubber'])
    for sgn in (1, -1):
        disc = lathe([(0, -0.05), (2.05, -0.05), (2.05, 0.03), (1.98, 0.08), (0, 0.08)], 40)
        g.add(disc, M['case2'], T(-3.35, 3.45, sgn * 1.8) @ R('X', 90 * sgn))
        scr = lathe([(0, 0), (0.3, 0), (0.3, 0.05), (0.22, 0.1), (0, 0.11)], 16)
        g.add(scr, M['satin'], T(-3.35, 3.45, sgn * 1.88) @ R('X', 90 * sgn))
    btn = rbox(0.42, 1.5, 1.05, 0.12)
    g.add(btn, M['accent'], T(0.05, 4.45, 0))
    lip = rbox(0.2, 0.22, 2.9, 0.05)
    g.add(lip, M['satin'], T(0.02, 0.8, 0))
    # ruban (surface, recto-verso), u = 0 au crochet
    L = TAPE_OUT
    xs = [-0.6, 0.0, 0.5, 1.0, 1.6, 2.3, 3.1, 4.0] + [4.0 + k * 1.6 for k in range(1, int((L - 5.0) / 1.6))] + [L - 0.8, L]
    NZ = 7
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    grid = [[bm.verts.new((x, blade_y(x, z), z)) for z in [lerp(-1.25, 1.25, k / (NZ - 1)) for k in range(NZ)]]
            for x in xs]
    for i in range(len(xs) - 1):
        for k in range(NZ - 1):
            f = bm.faces.new([grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]])
            for lp, (ii, kk) in zip(f.loops, ((i, k), (i + 1, k), (i + 1, k + 1), (i, k + 1))):
                lp[uvl].uv = ((L - xs[ii]) / TAPE_CM, kk / (NZ - 1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        if f.normal.y < 0:
            f.normal_flip()
    g.add(bm, M['tape'])
    # crochet : patte rivetée sur le ruban puis retour vers le bas (accroché au chant du plateau)
    tab = bmesh.new()
    tx = [L - 1.45, L - 1.0, L - 0.5, L]
    tzs = [lerp(-1.3, 1.3, k / 6) for k in range(7)]
    top_v = [[tab.verts.new((x, blade_y(min(x, L), max(-1.25, min(1.25, z))) + 0.035, z)) for z in tzs] for x in tx]
    bot_v = [[tab.verts.new((x, blade_y(min(x, L), max(-1.25, min(1.25, z))) + 0.005, z)) for z in tzs] for x in tx]
    for A_, rev in ((top_v, False), (bot_v, True)):
        for i in range(len(tx) - 1):
            for k in range(len(tzs) - 1):
                q = [A_[i][k], A_[i + 1][k], A_[i + 1][k + 1], A_[i][k + 1]]
                tab.faces.new(q[::-1] if rev else q)
    for i in range(len(tx) - 1):
        for A_k in (0, len(tzs) - 1):
            tab.faces.new([top_v[i][A_k], bot_v[i][A_k], bot_v[i + 1][A_k], top_v[i + 1][A_k]])
    tab.faces.new([top_v[0][k] for k in range(len(tzs))] + [bot_v[0][k] for k in reversed(range(len(tzs)))])
    bmesh.ops.recalc_face_normals(tab, faces=tab.faces[:])
    g.add(tab, M['satin'])
    hook_out = rrect4(-1.25, -1.3, 0.25, 1.3, (0.25, 0.05, 0.05, 0.25), 4)   # (y, z) : y de -1.25 à 0.25
    hook = loft([[Vector((x, y, z)) for y, z in hook_out] for x in (L + 0.05, L + 0.12)])
    g.add(hook, M['satin'])
    for zr in (-0.55, 0.55):
        riv = lathe([(0, 0), (0.17, 0), (0.15, 0.05), (0.08, 0.08), (0, 0.09)], 12)
        g.add(riv, M['satin'], T(L - 0.85, blade_y(L - 0.85, zr) + 0.03, zr))
    return g


# ------------------------------------------------------------------------------- crayon de menuisier
def build_pencil(M):
    g = Geo()
    N = 28
    base = superellipse(0.65, 0.375, 3.4, N, pi / N)
    xs = [(-8.8, 0.05), (-8.78, 0.02), (-8.72, 0.0), (-8.0, 0), (-4.0, 0), (0.0, 0), (4.0, 0), (6.2, 0), (6.45, 0),
          (6.75, 0), (7.05, 0), (7.35, 0), (7.65, 0), (7.95, 0), (8.2, 0), (8.38, 0), (8.5, 0), (8.62, 0),
          (8.72, 0), (8.8, 0)]

    def lim(x):
        yl = 0.375 if x < 6.4 else lerp(0.375, 0.075, sstep(6.4, 8.45, x) ** 0.8)
        zl = 0.65 if x < 7.3 else lerp(0.65, 0.25, sstep(7.3, 8.45, x))
        if x > 8.45:
            yl = lerp(0.075, 0.04, (x - 8.45) / 0.35)
            zl = lerp(0.25, 0.17, (x - 8.45) / 0.35)
        return yl, zl

    rings = []
    clamped = set()
    for i, (x, ins) in enumerate(xs):
        yl, zl = lim(x)
        ring = []
        for j, (z, y) in enumerate(base):
            z2 = max(-zl, min(zl, z * (1 - ins / 0.65)))
            y2 = max(-yl, min(yl, y * (1 - ins / 0.375)))
            if (abs(z2 - z) > 1e-4 or abs(y2 - y) > 1e-4) and x > 6.0:
                clamped.add((round(x, 3), round(z2, 3), round(y2, 3)))
            ring.append(Vector((x, y2, z2)))
        rings.append(ring)
    bm = loft(rings, cap0='ngon', cap1='ngon')

    def mat(f):
        c = f.calc_center_median()
        if c.x > 8.43:
            return M['graphite']
        if c.x < -8.75 and abs(f.normal.x) > 0.9:
            return M['cedar']
        if c.x > 6.2 and sum((round(v.co.x, 3), round(v.co.z, 3), round(v.co.y, 3)) in clamped
                             for v in f.verts) >= 3:
            return M['cedar']
        return M['paint']

    g.add(bm, mat)
    lead = rbox(0.01, 0.15, 0.46, 0.0)
    g.add(lead, M['graphite'], T(-8.805, 0, 0))
    xf(g.bm, T(0, 0.375, 0))
    return g


# ------------------------------------------------------------------------------- smartphone sur son support
PH_W, PH_L, PH_T = 7.15, 14.7, 0.78
SCREEN_LIFT = 0.008      # écran 0,08 mm au-dessus du verre (pas de z-fighting dans three.js)
SC_W, SC_L, SC_R = 6.6, 14.3, 0.85
PH_TILT = 18.0           # inclinaison du téléphone vers l'arrière (degrés depuis la verticale)
ST_W, ST_H, ST_D = 9.0, 2.4, 6.4     # support en noyer (x, y, z)


def phone_matrix():
    """Repère local du téléphone (largeur x, longueur z avec le haut vers -z, écran vers +y, dos à y = 0)
    -> repère du support (posé à y = 0, face avant vers +z) : arête basse du dos dans la rainure."""
    a = 90.0 - PH_TILT
    return T(0, 0.85, 0.95) @ R('X', a) @ T(0, 0, -PH_L / 2)


def build_stand(M):
    """Support en noyer : bloc aux arêtes adoucies, rainure sciée suivant l'inclinaison du téléphone."""
    blk = rbox(ST_W, ST_H, ST_D, 0.32, 3)
    xf(blk, T(0, ST_H / 2, 0))
    slot = rbox(ST_W + 2.0, PH_T + 0.14, 6.0, 0.0)
    xf(slot, phone_matrix() @ T(0, PH_T / 2, PH_L / 2 - 3.0 + 0.04))
    blk = boolean_diff(blk, slot)
    wood_uv(blk, 0, (0.4, 0.1))
    g = Geo()
    g.add(blk, wood(M, 'walnut'))
    # patins de liège sous le support : rien de visible, on s'en passe
    return g


def build_phone(M):
    g = Geo()
    Mx = phone_matrix()
    prof = [(0.0, 0.30), (0.015, 0.16), (0.05, 0.06), (0.1, 0.015), (0.16, 0.0), (0.62, 0.0), (0.68, 0.015),
            (0.72, 0.05), (0.75, 0.1), (0.772, 0.2), (0.78, 0.3)]
    rings = []
    for y, d in prof:
        pts = rrect4(-PH_W / 2 + d, -PH_L / 2 + d, PH_W / 2 - d, PH_L / 2 - d, [1.05 - d] * 4, 8)
        rings.append([Vector((x, y, z)) for x, z in pts])
    body = loft(rings)

    def mat(f):
        y = f.calc_center_median().y
        return M['back'] if y < 0.12 else (M['frame'] if y < 0.705 else M['glass'])

    g.add(body, mat, Mx)
    for x0, z0, z1 in ((PH_W / 2, -3.7, -1.9), (-PH_W / 2, -4.6, -3.5), (-PH_W / 2, -3.2, -2.1)):
        b = rbox(0.16, 0.26, z1 - z0, 0.06)
        g.add(b, M['frame'], Mx @ T(x0, 0.4, (z0 + z1) / 2))
    cam = lathe([(0, 0), (0.17, 0), (0.17, 0.004), (0, 0.006)], 20)
    g.add(cam, M['glass'], Mx @ T(0, PH_T + 0.016, -SC_L / 2 + 0.42))
    return g


def build_screen():
    """Plan de l'écran, dans le repère du support : UV = image entière, u vers la droite, v vers le haut."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    pts = rrect4(-SC_W / 2, -SC_L / 2, SC_W / 2, SC_L / 2, [SC_R] * 4, 8)
    vs = [bm.verts.new((x, PH_T + SCREEN_LIFT, z)) for x, z in pts]
    f = bm.faces.new(vs)
    f.normal_update()
    if f.normal.y < 0:
        f.normal_flip()
    for lp in f.loops:
        x, z = lp.vert.co.x, lp.vert.co.z
        lp[uvl].uv = ((x + SC_W / 2) / SC_W, (-z + SC_L / 2) / SC_L)
    xf(bm, phone_matrix())
    return bm


# ------------------------------------------------------------------------------- équerre de menuisier
def build_square(M):
    """Repère local : talon (noyer) le long de z, lame d'acier le long de +x, posée à plat."""
    g = Geo()
    stock = rbox(1.9, 1.05, 13.0, 0.12, 2)
    wood_uv(stock, 2, (0.2, 0.6))
    g.add(stock, wood(M, 'walnut', 2), T(0, 0.525, 6.5))
    blade = rbox(20.0, 0.16, 2.6, 0.03, 1)
    g.add(blade, M['satin'], T(0.95 + 10.0 - 1.2, 0.525, 1.3))
    for k in range(3):
        riv = lathe([(0, 0), (0.2, 0), (0.2, 0.02), (0, 0.03)], 14)
        g.add(riv, M['brass'], T(0, 1.05, 0.9 + 0.75 * k))
    for k in range(1, 18):     # graduations gravées le long de la lame
        L = 0.35 if k % 5 else 0.6
        tick = rbox(0.04, 0.012, L, 0.0)
        g.add(tick, M['forged'], T(0.95 + k * 1.0, 0.61, 2.6 - L / 2 - 0.02))
    return g


# ------------------------------------------------------------------------------- copeaux
def shaving(w, length, flat, R0, decay, drift, twist, cup, seed, theta0=0.0, rise=0.0):
    """Ruban qui part à plat (sur `flat` cm) puis s'enroule (rayon R0 qui se resserre de `decay` par cm),
    en dérivant de `drift` par cm sur le côté. UV : u = abscisse / SHAVING_CM, v à travers."""
    rnd = random.Random(seed)
    ds = 0.3
    n = max(8, int(length / ds))
    p = Vector((0.0, 0.0, 0.0))
    th = theta0
    ph1, ph2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    rows = []
    for i in range(n + 1):
        s_ = i * ds
        if s_ < flat:
            kap = 0.015 * sin(s_ * 0.9 + ph1)
        else:
            rho = R0 * math.exp(-decay * (s_ - flat))
            kap = 1.0 / max(rho, 0.25)
        tvec = Vector((cos(th), sin(th), drift)).normalized()
        nvec = Vector((-sin(th), cos(th), 0.0))
        bvec = tvec.cross(nvec).normalized()
        tw = twist * s_ + 0.05 * sin(s_ * 0.7 + ph2)
        bvec = (bvec * cos(tw) + nvec * sin(tw)).normalized()
        nvec2 = bvec.cross(tvec).normalized()
        wk = w * (0.93 + 0.07 * sin(s_ * 0.45 + ph2)) * (0.45 + 0.55 * sstep(0.0, 2.2, s_)) \
            * (0.55 + 0.45 * sstep(length, length - 3.0, s_))
        rows.append((p.copy(), bvec, nvec2, wk, s_))
        p += tvec * ds
        th += kap * ds
    NW = 5
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    grid = []
    for p0, b, nv, wk, s_ in rows:
        row = []
        for k in range(NW):
            v = k / (NW - 1)
            off = (v - 0.5) * wk
            c = cup * wk * (1 - (2 * v - 1) ** 2)
            row.append(bm.verts.new(p0 + b * off + nv * c))
        grid.append((row, s_))
    for i in range(len(grid) - 1):
        (A_, sa), (B_, sb) = grid[i], grid[i + 1]
        for k in range(NW - 1):
            f = bm.faces.new([A_[k], B_[k], B_[k + 1], A_[k + 1]])
            for lp, (ss, kk) in zip(f.loops, ((sa, k), (sb, k), (sb, k + 1), (sa, k + 1))):
                lp[uvl].uv = (ss / SHAVING_CM, kk / (NW - 1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if rise == 0.0:
        lo = min(v.co.y for v in bm.verts)
        xf(bm, T(0, -lo + 0.012, 0))
    return bm


# ------------------------------------------------------------------------------- scène
LAYOUT = {
    # origine du repère local de l'outil sur le plateau (x, z en cm, centre du plateau = 0), lacet en degrés
    'hammer': ((-24.5, 1.0), -10.0),
    'plane': ((9.5, -10.5), -4.0),
    'tape': ((10.5, TOP_D / 2 - TAPE_OUT - 0.12), -90.0),
    'pencil': ((-9.0, -4.0), 14.0),
    'square': ((-28.0, -17.6), 0.0),
    'stand': ((21.0, 10.5), 26.0),
}
SHAVINGS = [
    # w, length, flat, R0, decay, drift, twist, cup, (x, z), yaw
    (2.8, 26.0, 9.0, 1.7, 0.01, 0.30, 0.0, 0.10, (-6.5, -11.0), 172.0),
    (2.6, 21.0, 2.0, 1.45, 0.01, 0.33, 0.0, 0.10, (17.5, -2.5), -30.0),
    (3.0, 19.0, 6.0, 1.9, 0.02, 0.26, 0.0, 0.08, (-11.0, 10.0), 188.0),
]


def build_scene():
    clean_scene()
    coll = new_coll('Etabli')
    M = make_materials()
    root = empty('Bench_Root', coll)
    OBJS.append(root)
    top = build_top(M, coll, root)
    vise = build_vise(M)
    c = vise.com()
    xf(vise.bm, S(U) @ T(-c.x, -c.y, -c.z))
    ob = bm_obj(vise.bm, 'Bench_Vise', vise.mats, coll, sharp=40)
    ob.location = W(c.x * U, c.y * U, c.z * U)
    ob.parent = root
    OBJS.append(ob)
    place(build_hammer(M), 'Bench_Hammer', coll, *LAYOUT['hammer'], root)
    place(build_plane(M), 'Bench_Plane', coll, *LAYOUT['plane'], root)
    place(build_tape(M), 'Bench_Tape', coll, *LAYOUT['tape'], root)
    place(build_pencil(M), 'Bench_Pencil', coll, *LAYOUT['pencil'], root)
    place(build_square(M), 'Bench_Square', coll, *LAYOUT['square'], root)
    place(build_stand(M), 'Bench_Stand', coll, *LAYOUT['stand'], root)
    ph, ph_c = place(build_phone(M), 'Bench_Phone', coll, *LAYOUT['stand'], root, sharp=35)
    sbm = build_screen()
    xf(sbm, S(U) @ T(-ph_c.x, -ph_c.y, -ph_c.z))
    scr = bm_obj(sbm, 'Bench_Screen', M['screen'], coll, smooth=False)
    scr.parent = ph
    OBJS.append(scr)
    # copeau qui sort de la lumière du rabot (repère du rabot) : il monte le long du front d'échappement
    # (75°) jusqu'au-dessus du corps puis s'enroule vers l'arrière, au-dessus du coin ; puis copeaux épars
    k = 0
    g = Geo().add(shaving(3.5, 19.0, 4.9, 1.9, 0.015, 0.10, 0.0, 0.08, 7, theta0=radians(75), rise=1.0),
                  M['shaving'], T(X_M + 0.2, 0.75, -1.1))
    place(g, f'Bench_Shaving{k}', coll, *LAYOUT['plane'], root, sharp=80)
    for k, (w, L, fl, R0, dec, dr, tw, cup, pos, yaw) in enumerate(SHAVINGS, start=1):
        g = Geo().add(shaving(w, L, fl, R0, dec, dr, tw, cup, 100 + k), M['shaving'])
        place(g, f'Bench_Shaving{k}', coll, pos, yaw, root, sharp=80)
    bpy.context.view_layer.update()
    return coll, M, top


# ------------------------------------------------------------------------------- AO cuite dans le plateau
def bake_top_ao(top, M, samples=128, res=2048):
    """Occlusion ambiante du plateau (outils compris), multipliée dans la couleur : les outils restent posés
    dans three.js, qui n'a pas d'ombres portées ni d'occlusion."""
    sc = setup_cycles(samples=samples, res=256, transparent=True)
    w = bpy.data.worlds.new('BakeWorld')
    sc.world = w
    w.light_settings.distance = 4.0 * U
    img = bpy.data.images.new('etabli_ao', res, res, float_buffer=True)
    img.colorspace_settings.name = 'Non-Color'
    mat = top.data.materials[0]
    nt = mat.node_tree
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = img
    nt.nodes.active = n
    bpy.ops.object.select_all(action='DESELECT')
    top.select_set(True)
    bpy.context.view_layer.objects.active = top
    sc.render.bake.margin = 12
    sc.render.bake.use_selected_to_active = False
    bpy.ops.object.bake(type='AO', margin=12)
    nt.nodes.remove(n)
    ao = np.empty(res * res * 4, np.float32)
    img.pixels.foreach_get(ao)
    ao = ao.reshape(res, res, 4)[..., 0]
    base = bpy.data.images.load(GT('top_col.png'), check_existing=True)
    bw, bh = base.size
    col = np.empty(bw * bh * 4, np.float32)
    base.pixels.foreach_get(col)
    col = col.reshape(bh, bw, 4)
    if (bw, bh) != (res, res):
        raise RuntimeError('AO et couleur du plateau : tailles différentes')
    k = float(ARGS.get('ao', 0.85))
    ao_eff = 1.0 - k * (1.0 - np.clip(ao, 0, 1))
    c = col[..., :3]
    linc = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4) * ao_eff[..., None]
    col[..., :3] = np.where(linc <= 0.0031308, linc * 12.92, 1.055 * np.power(np.maximum(linc, 0), 1 / 2.4) - 0.055)
    out = bpy.data.images.new('etabli_top_ao', bw, bh, alpha=True, float_buffer=False)
    out.pixels.foreach_set(col.ravel())
    out.filepath_raw = GT('top_col_ao.png')
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)
    bpy.data.images.remove(img)
    tex = next(nd for nd in nt.nodes if nd.type == 'TEX_IMAGE' and nd.image == base)
    tex.image = bpy.data.images.load(GT('top_col_ao.png'), check_existing=False)
    tex.image.name = 'etabli_top'
    bpy.data.images.remove(base)
    bpy.data.worlds.remove(w)
    print('AO plateau cuite ->', GT('top_col_ao.png'))


# ------------------------------------------------------------------------------- rendu « comme three.js »
# Entrée `etabli` de src/scene/landing/views.ts (à garder identiques)
VIEW = {'yaw': float(ARGS.get('yaw', -0.5)), 'size': float(ARGS.get('size', 3.5)),
        'eye': tuple(float(v) for v in str(ARGS.get('eye', '0,3.9,6.2')).split(',')),
        'target': tuple(float(v) for v in str(ARGS.get('target', '0,-0.32,0')).split(',')), 'fov': 30.0}
# Studio.tsx : Lightformers (position, échelle, intensité, couleur), environmentIntensity, directionnelles
FORMERS = [((0, 6, 2), (8, 5), 2.4, '#ffffff'), ((-6, 1.5, -2), (1.2, 7), 5.0, '#dbe6ff'),
           ((6, 0.5, -1), (1.2, 6), 3.0, '#ffe2c4'), ((0, 0.5, 8), (8, 3), 0.5, '#ffffff')]
ENV_INTENSITY = 0.85
SUNS = [((3.5, 5, 4), 1.5, '#ffffff'), ((-4, 2.5, -5), 1.1, '#c9d6ff')]
# Ground (Studio.tsx) -> ContactShadows : scale size × 1.4, résolution 512, blur 2.6 (+ 0.4 × 2.6 lissé),
# opacité 0.75. Noyau de flou de three-stdlib (9 prises, écart-type ≈ 2,14 prises de blur/256 en UV).
SHADOW_OPACITY = 0.75


def view_frame(objs, yaw, size):
    lo, hi = bbox_yup(objs)
    w, h, d = (hi[0] - lo[0]), (hi[1] - lo[1]), (hi[2] - lo[2])
    s = size / max(h, math.hypot(w, d))
    c = [(lo[k] + hi[k]) / 2 for k in range(3)]

    def to_model(p, vec=False):
        x, y, z = p[0] / s, p[1] / s, p[2] / s
        cy, sy = math.cos(-yaw), math.sin(-yaw)
        o = (0, 0, 0) if vec else c
        return (o[0] + cy * x + sy * z, o[1] + y, o[2] - sy * x + cy * z)

    return to_model, s, lo, hi, c


def clear_coll(coll):
    for ob in list(coll.objects):
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data is not None and data.users == 0:
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Light):
                bpy.data.lights.remove(data)
            elif isinstance(data, bpy.types.Camera):
                bpy.data.cameras.remove(data)


def studio_three(coll, objs, yaw, size):
    """Éclairage de la visionneuse, dans le repère du modèle : Lightformers = plans émissifs invisibles à la
    caméra (vus dans les reflets), directionnelles sans ombre (three.js : castShadow absent)."""
    to_model, s, lo, hi, c = view_frame(objs, yaw, size)
    wd = bpy.context.scene.world
    if wd is None or wd.name != 'ThreeWorld':
        wd = bpy.data.worlds.new('ThreeWorld')
        bpy.context.scene.world = wd
        bgn = next(n for n in wd.node_tree.nodes if n.type == 'BACKGROUND')
        bgn.inputs['Color'].default_value = (0, 0, 0, 1)
        bgn.inputs['Strength'].default_value = 0.0
    for k, (pos, (sx, sy), inten, colr) in enumerate(FORMERS):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        me = bpy.data.meshes.new(f'Former{k}')
        bm.to_mesh(me)
        bm.free()
        mat = bpy.data.materials.get(f'FormerMat{k}') or bpy.data.materials.new(f'FormerMat{k}')
        nt = mat.node_tree
        for n in list(nt.nodes):
            if n.type != 'OUTPUT_MATERIAL':
                nt.nodes.remove(n)
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (*lin(colr), 1)
        em.inputs['Strength'].default_value = inten * ENV_INTENSITY
        nt.links.new(em.outputs[0], next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL').inputs[0])
        me.materials.append(mat)
        ob = bpy.data.objects.new(f'Former{k}', me)
        coll.objects.link(ob)
        ob.location = W(*to_model(pos))
        ob.scale = (sx / s, sy / s, 1)
        ob.rotation_euler = (W(*c) - ob.location).to_track_quat('-Z', 'Y').to_euler()
        ob.visible_camera = False
        ob.visible_shadow = False
    for k, (pos, inten, colr) in enumerate(SUNS):
        dl = bpy.data.lights.new(f'Sun{k}', 'SUN')
        dl.energy = inten
        dl.color = lin(colr)
        dl.angle = math.radians(1)
        try:
            dl.use_shadow = False
        except AttributeError:
            pass
        o = bpy.data.objects.new(f'Sun{k}', dl)
        coll.objects.link(o)
        o.rotation_euler = (-W(*to_model(pos, vec=True))).to_track_quat('-Z', 'Y').to_euler()
    return to_model, s, lo, hi, c


def contact_shadow(coll, objs, size):
    """ContactShadows de drei : empreinte du modèle vue de dessus (rendu Workbench orthographique), flou
    gaussien équivalent, posée en plan noir transparent au niveau du sol, visible de la caméra seulement."""
    _, s, lo, hi, c = view_frame(objs, 0.0, size)
    P = size * 1.4 / s                      # côté du plan (repère du modèle)
    res = 512
    sc = bpy.context.scene
    old = (sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent,
           sc.camera)
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'FLAT'
    sc.display.shading.color_type = 'SINGLE'
    sc.display.shading.single_color = (1, 1, 1)
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    cam = bpy.data.objects.new('FootCam', bpy.data.cameras.new('FootCam'))
    coll.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = P
    cam.data.clip_start, cam.data.clip_end = 0.01, 100
    cam.location = W(c[0], hi[1] + 1.0, c[2])
    cam.rotation_euler = (0, 0, 0)
    sc.camera = cam
    hidden = [o for o in sc.objects if o.type == 'MESH' and o not in objs and not o.hide_render]
    for o in hidden:
        o.hide_render = True
    path = GT('footprint.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in hidden:
        o.hide_render = False
    sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.camera = old
    bpy.data.objects.remove(cam, do_unlink=True)
    img = bpy.data.images.load(path, check_existing=False)
    a = np.empty(res * res * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    a = a.reshape(res, res, 4)[..., 3]          # lignes du bas vers le haut : bas = avant (+z)
    # three-stdlib Horizontal/VerticalBlurShader : 9 prises de poids gaussiens, pas = blur / 256 (UV)
    wts = np.array([0.051, 0.0918, 0.12245, 0.1531, 0.1633, 0.1531, 0.12245, 0.0918, 0.051], np.float32)
    for blur_ in (2.6, 2.6 * 0.4):
        step = blur_ / 256 * res
        offs = (np.arange(9) - 4) * step
        for ax in (0, 1):
            out = np.zeros_like(a)
            for wk, o in zip(wts, offs):
                i0 = int(math.floor(o))
                f = o - i0
                out += wk * ((1 - f) * np.roll(a, -i0, axis=ax) + f * np.roll(a, -(i0 + 1), axis=ax))
            a = out
    alpha = np.clip(a * float(ARGS.get('shadow', 0.85)) * SHADOW_OPACITY, 0, 1)
    tex = bpy.data.images.new('etabli_contact', res, res, alpha=False, float_buffer=True)
    tex.colorspace_settings.name = 'Non-Color'
    px = np.zeros((res, res, 4), np.float32)
    px[..., 0] = px[..., 1] = px[..., 2] = alpha
    px[..., 3] = 1
    tex.pixels.foreach_set(px.ravel())
    tex.pack()
    # plan
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    y = lo[1] + 0.0005
    x0, x1, z0, z1 = c[0] - P / 2, c[0] + P / 2, c[2] - P / 2, c[2] + P / 2
    vs = [bm.verts.new(p) for p in ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))]
    f = bm.faces.new(vs)
    for lp in f.loops:
        x, _, z = lp.vert.co
        lp[uvl].uv = ((x - x0) / P, (z1 - z) / P)
    me_ob = bm_obj(bm, 'ContactShadow', [], coll, smooth=False)
    mat = bpy.data.materials.new('ContactShadowMat')
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    ti = nt.nodes.new('ShaderNodeTexImage')
    ti.image = tex
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (0, 0, 0, 1)
    em.inputs['Strength'].default_value = 0.0
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(ti.outputs['Color'], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL').inputs[0])
    me_ob.data.materials.append(mat)
    for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter',
                 'visible_shadow'):
        setattr(me_ob, attr, False)
    return me_ob


def aces_three(c):
    """ACESFilmicToneMapping de three.js (exposition 1), RVB linéaire -> linéaire affiché [0, 1]."""
    A_in = np.array([[0.59719, 0.07600, 0.02840], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]],
                    np.float32)
    A_out = np.array([[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]],
                     np.float32)
    v = (c / 0.6) @ A_in
    a = v * (v + 0.0245786) - 0.000090537
    b = v * (0.983729 * v + 0.4329510) + 0.238081
    return np.clip((a / b) @ A_out, 0.0, 1.0)


def render_three(png, cam, res, samples):
    """Rendu Cycles linéaire (EXR), puis tone mapping ACES de three.js et encodage sRGB -> PNG RVBA."""
    sc = setup_cycles(samples=samples, res=res, transparent=True)
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 1
    sc.cycles.glossy_bounces = 2
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.camera = cam
    s = sc.render.image_settings
    s.file_format = 'OPEN_EXR'
    s.color_mode = 'RGBA'
    s.color_depth = '32'
    exr = png[:-4] + '.exr'
    os.makedirs(os.path.dirname(png), exist_ok=True)
    sc.render.filepath = exr
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(exr, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    px = px.reshape(h, w, 4)
    a = np.clip(px[..., 3:4], 0, 1)
    rgb = np.where(a > 1e-4, px[..., :3] / np.maximum(a, 1e-4), 0.0)     # EXR prémultiplié
    t = aces_three(rgb)
    t = np.where(t <= 0.0031308, t * 12.92, 1.055 * np.power(t, 1 / 2.4) - 0.055)
    out = np.concatenate([t, a], axis=2).astype(np.float32)
    o = bpy.data.images.new('three_out', w, h, alpha=True, float_buffer=False)
    o.pixels.foreach_set(out.ravel())
    o.filepath_raw = png
    o.file_format = 'PNG'
    o.save()
    bpy.data.images.remove(o)
    os.remove(exr)
    s.file_format = 'PNG'
    print('RENDER', png)
    return png


def stage(rig, meshes, yaw):
    """Caméra de la visionneuse + éclairage pour un lacet donné (le studio est fixe, le modèle tourne)."""
    clear_coll(rig)
    studio_three(rig, meshes, yaw, VIEW['size'])
    return viewer_camera(rig, meshes, yaw, VIEW['size'], eye=VIEW['eye'], target=VIEW['target'], fov=VIEW['fov'])


def main():
    coll, M, top = build_scene()
    if not ARGS.get('nobake'):
        bake_top_ao(top, M, samples=int(ARGS.get('bake_samples', 128)))
    total = report([o for o in OBJS if o.type == 'MESH'])
    os.makedirs(BLEND_DIR, exist_ok=True)
    glb = os.path.join(MODELS, NAME + '.glb')
    kb = export_glb(OBJS, glb, webp_quality=int(ARGS.get('webp', 80)))
    meshes = [o for o in OBJS if o.type == 'MESH']
    lo, hi = bbox_yup(meshes)
    print(f'BBOX {tuple(round(v, 3) for v in lo)} -> {tuple(round(v, 3) for v in hi)}  tris {total}  {kb:.0f} Ko')
    for ob in OBJS:
        mw = ob.matrix_world.translation
        print(f'NODE {ob.name:16s} origine (Y-up) {mw.x:.3f} {mw.z:.3f} {-mw.y:.3f}'
              f'  dims {tuple(round(v, 3) for v in ob.dimensions)}')
    shade = new_coll('Shadow')
    contact_shadow(shade, meshes, VIEW['size'])
    rig = new_coll('Rig')
    cam = stage(rig, meshes, VIEW['yaw'])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, 'landing_' + NAME + '.blend'))
    samples = int(ARGS.get('samples', 0) or 0)
    if ARGS.get('preview'):
        out = ARGS['preview']
        render_three(os.path.join(out, 'view.png'), cam, int(ARGS.get('res', 800)), samples or 64)
        # lacets atteints : balancement ±0.5 (views.ts), + quart de tour du scroll (Rig.tsx, SCROLL_TURN)
        for tag, dy in (('sway_l', -0.5), ('sway_r', 0.5), ('scroll', 0.5 + pi / 4)):
            c2 = stage(rig, meshes, VIEW['yaw'] + dy)
            render_three(os.path.join(out, f'{tag}.png'), c2, 400, 16)
        cam = stage(rig, meshes, VIEW['yaw'])
        top_cam = camera(rig, (0.0, 6.0, 0.001), (0.0, 0.0, 0.0), name='TopCam')
        top_cam.data.type = 'ORTHO'
        top_cam.data.ortho_scale = 2.4
        render_three(os.path.join(out, 'top.png'), top_cam, 700, 16)
        for name, eye, tgt in (('close_phone', (1.2, 0.95, 1.6), (0.62, 0.42, 0.3)),
                               ('close_plane', (0.75, 0.9, 0.9), (0.2, 0.36, -0.32)),
                               ('close_vise', (-0.25, 0.55, 1.75), (-0.62, 0.2, 0.7))):
            cc = camera(rig, eye, tgt, lens=50, name='Close_' + name)
            render_three(os.path.join(out, f'{name}.png'), cc, 700, samples or 64)
    if ARGS.get('poster'):
        cam = stage(rig, meshes, VIEW['yaw'])
        png = GT('poster.png')
        render_three(png, cam, 1200, samples or 256)
        png_to_webp(png, os.path.join(POSTERS, NAME + '.webp'), max_kb=120)


main()
