# Vitrine de boutique parisienne pour la page d'atterrissage /creation-site-internet-paris/ (clin d'œil au
# « site vitrine »), agent B4 (sous-agent vitrine), 2026-10-09. Diorama photoréaliste : un bloc de trottoir
# découpé (pavés de grès modélisés un par un, bordure de granit, caniveau, lit de pose visible sur la coupe),
# l'angle d'un immeuble en pierre de taille à refends, une devanture en applique en bois laqué vert anglais
# (pilastres à consoles, bandeau d'enseigne aux lettres dorées « LA VITRINE », corniche à couvre-joint de
# zinc, soubassement à panneaux), un store banne rayé à lambrequin festonné, deux lampes col-de-cygne et,
# derrière la glace, une boutique éclairée où un grand écran affiche un site fictif.
#
# Deux modes :
#   1. python scripts/blender/model_landing_vitrine.py
#      (Python 3.11 + Pillow + numpy) : textures générées dans node_modules/.cache/landing_vitrine/ (peinture,
#      toile rayée, enseigne, lumière du mur du fond, site affiché) et public/textures/landing/vitrine/
#      site-default.webp. Lancé automatiquement par le mode 2 si une image manque.
#   2. "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_landing_vitrine.py --
#        [--poster] [--preview <dossier>] [--check <dossier>] [--samples N]
#      modélise (bmesh, scène vide), sauve blender/landing_vitrine.blend, exporte
#      public/models/landing/vitrine.glb (Draco, textures WebP intégrées) ; --poster rend
#      public/posters/landing/vitrine.webp (Cycles, vue de départ de la visionneuse, voir viewer_camera) ;
#      --preview rend des vues de contrôle (64 échantillons) ; --check réimporte le GLB seul (HDRI, sans
#      lumière) pour vérifier qu'il tient sans l'éclairage du poster.
#
# Repère : on modélise en mètres réels (monde Y-up : x à droite, y en haut, +z vers la rue, façade de pierre
# en z = 0), puis tout est mis à l'échelle SC et recentré en X/Z (socle posé en y = 0) à la création des objets.
# Nœuds animables : Shop_Root (vide, parent de tout), Shop_Awning (origine sur l'axe du rouleau), Shop_Screen
# (UV 0→1 sur l'image), Shop_Glass, Shop_Sign, Shop_Lamp_L / Shop_Lamp_R (diffuseurs des cols-de-cygne),
# Shop_Lamp_Pendant_0 / _1 (globes intérieurs), Shop_Interior_Wash (lueur du mur du fond).
# Textures Poly Haven (CC0) : rock_surface (pavés, bordure), beige_wall_002 (pierre), fine_grained_wood
# (grain sous la peinture), rough_linen (toile), herringbone_parquet (parquet) ; HDRI modern_evening_street
# (poster). Polices OFL du projet (public/fonts) : Instrument Serif, Inter, JetBrains Mono.
import math
import os
import random
import subprocess
import sys
from math import atan2, cos, pi, radians, sin, sqrt, tan

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landing_common import *  # noqa: E402,F401,F403

GEN = os.path.join(ROOT, 'node_modules', '.cache', 'landing_vitrine')
TEX_PUB = os.path.join(TEXTURES, 'vitrine')
GLB = os.path.join(MODELS, 'vitrine.glb')
POSTER = os.path.join(POSTERS, 'vitrine.webp')
BLEND = os.path.join(BLEND_DIR, 'landing_vitrine.blend')
FONTS = os.path.join(ROOT, 'public', 'fonts')
F_SERIF = os.path.join(FONTS, 'instrument-serif-latin-400-normal.woff2')
F_SERIF_I = os.path.join(FONTS, 'instrument-serif-latin-400-italic.woff2')
F_INTER = os.path.join(FONTS, 'inter-latin-wght-normal.woff2')
F_MONO = os.path.join(FONTS, 'jetbrains-mono-latin-400-normal.woff2')

# =============================================================================== cotes (mètres réels)
SC = 0.48                 # échelle d'export : 5 m de façade -> 2,4 unités
X0, X1 = -2.5, 2.5        # largeur du bloc
ZB, ZF = -1.35, 2.30      # dos de l'immeuble, coupe avant du caniveau
CX, CZ = 0.0, (ZB + ZF) / 2   # recentrage X/Z
Y_BASE = 0.05             # dessus du socle noir
Y_SW = 0.34               # dessus du trottoir
SETT_H = 0.09             # épaisseur visible des pavés
Z_CURB0, Z_CURB1 = 1.75, 1.95
Y_GT = 0.20               # fil d'eau du caniveau
Y_TOP = 4.75              # coupe haute de l'immeuble
Y_FOUND = Y_SW - SETT_H   # assise de la pierre (sur le lit de pose)
COURSES = [Y_FOUND] + [0.76 + 0.4425 * k for k in range(9)]   # refends jusqu'au bandeau (4,30)
Y_BAND0, Y_BAND1 = 4.30, 4.44
ROOM = (-1.95, 1.95, -1.25, 0.0, 3.05)   # x0, x1, z0, z1, plafond
FLOOR_Y = Y_SW + 0.02
# devanture (porte à gauche, vitrine à droite)
PIL_L, PIL_R = (-2.20, -1.85), (1.85, 2.20)
DOOR = (-1.85, -0.95)
MULL = (-0.95, -0.80)
WIN = (-0.80, 1.85)
Y_SILL = 0.90
Y_TRANS0, Y_TRANS1 = 2.52, 2.60
Y_ARCH0, Y_ARCH1 = 2.95, 3.05
Y_SIGN0, Y_SIGN1 = 3.05, 3.55
Y_CORN0, Y_CORN1 = 3.58, 3.85
Z_GLASS = 0.10
# store banne
HINGE = (0.0, 2.97, 0.245)            # axe du rouleau (pivot de Shop_Awning)
AWN_X = 1.83
AWN_FRONT = (2.60, 1.08)              # (y, z) de la barre de charge
VAL_H = 0.20                          # hauteur du lambrequin
STRIPE_W = 2 * AWN_X / 31             # 31 bandes, écru aux deux bords
# écran (16:10)
SCR_W, SCR_H = 1.52, 0.95
SCR_C = (0.525, 1.58, -0.40)
SITE_W, SITE_H = 1280, 800
SIGN_ROWS = 276                       # hauteur de la bande d'enseigne dans l'atlas 2048 × 512
GREEN = '#1d3b2f'

# =============================================================================== textures (Pillow)
PAL = {'green': (29, 59, 47), 'ecru': (232, 223, 202), 'stripe': (40, 78, 60), 'gold': (214, 178, 96)}


def gen_path(name):
    return os.path.join(GEN, name)


def textures_main():
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    os.makedirs(GEN, exist_ok=True)
    os.makedirs(TEX_PUB, exist_ok=True)
    rng = np.random.default_rng(7)

    def arr(img):
        return np.asarray(img, dtype=np.float32) / 255.0

    def save(a, name, mode='RGB'):
        a = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
        Image.fromarray(a, mode if a.ndim == 3 else 'L').save(gen_path(name))
        print('TEX', name, a.shape)

    def lowfreq(h, w, cells, seed):
        r = np.random.default_rng(seed).random((cells, cells)).astype(np.float32)
        return arr(Image.fromarray((r * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC))

    def lum(a):
        return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11

    # ---- peinture laquée vert anglais (grain du bois à peine visible sous la laque)
    wood = arr(Image.open(ph_map('fine_grained_wood', 'Diffuse', '1k')).convert('RGB'))
    L = lum(wood)
    Ln = (L - L.mean()) / (L.std() + 1e-6)
    mott = lowfreq(1024, 1024, 6, 1) - 0.5
    base = np.array(PAL['green'], np.float32) / 255
    paint = base[None, None, :] * (1 + 0.035 * Ln[..., None] + 0.06 * mott[..., None])
    save(paint, 'paint_color.png')
    rough = 0.30 + 0.035 * Ln + 0.08 * (lowfreq(1024, 1024, 9, 2) - 0.5)
    save(np.asarray(Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8)).resize((512, 512)),
                    np.float32) / 255, 'paint_rough.png')

    # ---- toile de store rayée (31 bandes de STRIPE_W ; une tuile = 4 bandes) sur trame de lin
    lin_d = Image.open(ph_map('rough_linen', 'Diffuse', '1k')).convert('RGB').resize((512, 512), Image.LANCZOS)
    lin_n = Image.open(ph_map('rough_linen', 'nor_gl', '1k')).convert('RGB').resize((512, 512), Image.LANCZOS)
    tile_d, tile_n = Image.new('RGB', (1024, 1024)), Image.new('RGB', (1024, 1024))
    for i in range(2):
        for j in range(2):
            tile_d.paste(lin_d, (i * 512, j * 512))
            tile_n.paste(lin_n, (i * 512, j * 512))
    tl = lum(arr(tile_d))
    tln = (tl - tl.mean()) / (tl.std() + 1e-6)
    u = np.arange(1024)
    band = (u // 256) % 2                     # 0 écru, 1 vert
    edge = np.minimum(u % 256, 255 - u % 256)
    soft = np.clip(edge / 3.0, 0, 1)          # bords de bande tissés, pas tranchants
    ecru, green = (np.array(PAL[k], np.float32) / 255 for k in ('ecru', 'stripe'))
    col = np.where(band[None, :, None] == 0, ecru, green) * np.ones((1024, 1, 1), np.float32)
    mid = (ecru + green) / 2
    col = mid + (col - mid) * (0.82 + 0.18 * soft[None, :, None])
    col = col * (1 + 0.07 * tln[..., None])
    save(col, 'awning_color.png')
    tile_n.save(gen_path('awning_normal.png'))

    # ---- enseigne (atlas 2048 × 512) : bandeau 2048 × 276 en haut, plaque de numéro en dessous
    W_, H_ = 2048, 512
    pc = Image.open(gen_path('paint_color.png')).convert('RGB')
    sign = Image.new('RGB', (W_, H_))
    for i in range(2):
        sign.paste(pc, (i * 1024, 0))
    mr = Image.new('RGB', (W_, H_), (255, 82, 0))        # R occlusion, G rugosité, B métal
    gold_mask = Image.new('L', (W_, H_), 0)
    gm = ImageDraw.Draw(gold_mask)
    # double filet doré
    for inset, w in ((16, 5), (30, 2)):
        gm.rectangle([inset, inset, W_ - 1 - inset, SIGN_ROWS - 1 - inset], outline=255, width=w)
    font = ImageFont.truetype(F_SERIF, 214)
    text = 'LA VITRINE'
    track = 26
    widths = [font.getlength(c) for c in text]
    total = sum(widths) + track * (len(text) - 1)
    x = (W_ - total) / 2
    bb = font.getbbox('LV')
    y = (SIGN_ROWS - (bb[3] - bb[1])) / 2 - bb[1] + 4
    letters = Image.new('L', (W_, H_), 0)
    ld = ImageDraw.Draw(letters)
    for c, w in zip(text, widths):
        ld.text((x, y), c, font=font, fill=255)
        x += w + track
    # losanges de part et d'autre
    for cx in ((W_ - total) / 2 - 90, (W_ + total) / 2 + 90):
        cy = SIGN_ROWS / 2 + 2
        gm.polygon([(cx - 22, cy), (cx, cy - 22), (cx + 22, cy), (cx, cy + 22)], fill=255)
    gold_mask.paste(255, (0, 0), letters)
    # ombre portée peinte (lettres ombrées), décalée en bas à droite
    sh = letters.filter(ImageFilter.MaxFilter(5))
    sh = Image.fromarray(np.roll(np.roll(np.asarray(sh), 7, 0), 7, 1)).filter(ImageFilter.GaussianBlur(1.2))
    sa = arr(sign)
    sm = arr(sh)[..., None] * (1 - arr(letters)[..., None])
    sa = sa * (1 - 0.75 * sm) + np.array([0.04, 0.05, 0.04]) * 0.75 * sm
    # dorure : dégradé vertical, légère usure
    g = arr(gold_mask)[..., None]
    yy = np.linspace(0, 1, H_)[:, None, None] % (SIGN_ROWS / H_) / (SIGN_ROWS / H_)
    gold_top, gold_bot = np.array([0.93, 0.80, 0.47]), np.array([0.72, 0.53, 0.22])
    gcol = gold_top * (1 - yy) + gold_bot * yy
    wear = lowfreq(H_, W_, 40, 5)[..., None]
    gcol = gcol * (0.9 + 0.2 * wear)
    sa = sa * (1 - g) + gcol * g
    # plaque de numéro (émail bleu de Paris), zone (0, 300) 256 × 192
    plaque = Image.new('RGB', (256, 192), (25, 52, 108))
    pd = ImageDraw.Draw(plaque)
    pd.rounded_rectangle([10, 10, 245, 181], radius=16, outline=(236, 238, 240), width=6)
    pf = ImageFont.truetype(F_INTER, 120)
    pf.set_variation_by_axes([560])
    tb = pd.textbbox((0, 0), '12', font=pf)
    pd.text(((256 - (tb[2] - tb[0])) / 2 - tb[0], (192 - (tb[3] - tb[1])) / 2 - tb[1]), '12', font=pf,
            fill=(240, 241, 242))
    sa[300:492, 0:256] = arr(plaque)
    save(sa, 'sign_color.png')
    m = np.zeros((H_, W_, 3), np.float32)
    m[..., 0] = 1.0
    m[..., 1] = 0.30 + 0.05 * (lowfreq(H_, W_, 30, 9) - 0.5)
    m[..., 1] = m[..., 1] * (1 - g[..., 0]) + (0.22 + 0.12 * wear[..., 0]) * g[..., 0]
    m[..., 2] = g[..., 0]
    m[300:492, 0:256, 1] = 0.12
    m[300:492, 0:256, 2] = 0.0
    save(m, 'sign_mr.png')

    # ---- lueur chaude du mur du fond (carte émissive, 512 × 512, u = x, v = hauteur)
    h = w = 512
    uu, vv = np.meshgrid(np.linspace(0, 1, w), np.linspace(1, 0, h))
    glow = 0.18 + 0.55 * np.exp(-((1 - vv) / 0.22)) * 1.0
    for cu in (0.18, 0.5, 0.82):
        glow += 0.55 * np.exp(-((uu - cu) / 0.10) ** 2) * np.exp(-((vv - 0.95) / 0.45) ** 2)
    glow = glow / glow.max()
    warm = np.array([1.0, 0.78, 0.52])
    save(glow[..., None] * warm, 'wash.png')

    # ---- site affiché à l'écran (1280 × 800)
    site = make_site(np, Image, ImageDraw, ImageFilter, ImageFont)
    site.save(gen_path('site.png'))
    site.save(os.path.join(TEX_PUB, 'site-default.webp'), 'WEBP', quality=88, method=6)
    print('TEX site.png + site-default.webp', os.path.getsize(os.path.join(TEX_PUB, 'site-default.webp')) // 1024,
          'Ko')


def make_site(np, Image, ImageDraw, ImageFilter, ImageFont):
    W_, H_ = SITE_W, SITE_H
    BG = (242, 237, 228)
    INK = (33, 33, 30)
    GRN = (29, 59, 47)
    MUTED = (139, 125, 107)
    img = Image.new('RGB', (W_, H_), BG)
    d = ImageDraw.Draw(img)

    def serif(s, italic=False):
        return ImageFont.truetype(F_SERIF_I if italic else F_SERIF, s)

    def inter(s, wght=400):
        f = ImageFont.truetype(F_INTER, s)
        f.set_variation_by_axes([wght])
        return f

    mono = ImageFont.truetype(F_MONO, 13)

    def arrow(x, y, fill, ln=16):
        d.line([(x, y), (x + ln, y)], fill=fill, width=2)
        d.line([(x + ln - 5, y - 5), (x + ln, y), (x + ln - 5, y + 5)], fill=fill, width=2)

    def spaced(x, y, text, font, fill, track=1.6):
        for c in text:
            d.text((x, y), c, font=font, fill=fill)
            x += font.getlength(c) + track
        return x

    # navigation
    d.text((64, 26), 'La Vitrine', font=serif(36), fill=GRN)
    x = 560
    for t in ('Boutique', 'Atelier', 'Journal', 'Nous trouver'):
        d.text((x, 38), t, font=inter(15, 450), fill=INK)
        x += inter(15, 450).getlength(t) + 40
    d.text((1112, 38), 'Panier (2)', font=inter(15, 450), fill=INK)
    d.line([(64, 92), (1216, 92)], fill=(219, 210, 196), width=1)
    # accroche
    spaced(64, 150, 'PARIS 11e — OBJETS & CÉRAMIQUES', mono, MUTED, 1.8)
    d.text((60, 178), 'Des objets', font=serif(92), fill=GRN)
    d.text((60, 268), 'faits pour', font=serif(92), fill=GRN)
    d.text((60, 358), 'durer.', font=serif(92, italic=True), fill=GRN)
    p = inter(18, 400)
    d.text((64, 490), 'Céramiques, linge de maison et papeterie,', font=p, fill=(74, 71, 64))
    d.text((64, 518), 'choisis un par un dans des ateliers français.', font=p, fill=(74, 71, 64))
    d.rectangle([64, 572, 290, 624], fill=GRN)
    bt = inter(16, 520)
    tw = bt.getlength('Voir la collection')
    d.text((64 + (226 - tw) / 2, 588), 'Voir la collection', font=bt, fill=(244, 240, 232))
    d.text((318, 588), 'Venir à la boutique', font=bt, fill=GRN)
    arrow(318 + bt.getlength('Venir à la boutique') + 12, 599, GRN)
    d.line([(318, 612), (318 + bt.getlength('Venir à la boutique'), 612)], fill=GRN, width=1)
    spaced(64, 666, 'OUVERT DU MARDI AU SAMEDI · 11 H – 19 H', ImageFont.truetype(F_MONO, 12), MUTED, 1.4)
    # photo (nature morte) à droite
    px0, py0, pw, ph = 664, 120, 552, 548
    img.paste(still_life(np, Image, ImageFilter, pw, ph), (px0, py0))
    spaced(px0, py0 + ph + 12, 'VASE LUNE, GRÈS ÉMAILLÉ — 68 €', ImageFont.truetype(F_MONO, 12), MUTED, 1.4)
    # nouveautés (début de la section suivante, coupée par le bas de l'écran)
    d.text((64, 716), 'Nouveautés', font=serif(34), fill=INK)
    xe = spaced(1100, 730, 'TOUT VOIR', mono, GRN, 1.6)
    arrow(xe + 8, 739, GRN, 14)
    for k, c in enumerate([(222, 211, 194), (205, 186, 160), (214, 205, 190), (188, 170, 148)]):
        x = 64 + k * 292
        d.rectangle([x, 772, x + 268, 800], fill=c)
    a = np.asarray(img, np.float32)
    a += np.random.default_rng(3).normal(0, 1.4, a.shape)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def still_life(np, Image, ImageFilter, w, h):
    """Nature morte peinte en numpy : mur enduit, rai de lumière en arche, tablette, vase, bol, galet."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    wall0, wall1 = np.array([0.90, 0.85, 0.78]), np.array([0.76, 0.69, 0.60])
    t = np.clip(0.55 * u + 0.6 * v, 0, 1)[..., None]
    img = wall0 * (1 - t) + wall1 * t
    # rai de lumière en arche (fenêtre hors champ)
    arch = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    ad = ImageDraw.Draw(arch)
    ad.rectangle([int(0.12 * w), int(0.20 * h), int(0.46 * w), int(0.70 * h)], fill=255)
    ad.ellipse([int(0.12 * w), int(0.03 * h), int(0.46 * w), int(0.37 * h)], fill=255)
    arch = arch.transform((w, h), Image.AFFINE, (1, 0.28, -40, 0, 1, 0)).filter(ImageFilter.GaussianBlur(16))
    img = img * (1 + 0.16 * (np.asarray(arch, np.float32) / 255)[..., None] * np.array([1.0, 0.97, 0.9]))
    # tablette
    ty = 0.74 * h
    top = (yy > ty)[..., None]
    shelf = np.array([0.70, 0.62, 0.52]) * (1 - 0.25 * np.clip((yy - ty) / (h - ty), 0, 1))[..., None]
    img = np.where(top, shelf, img)
    edge = np.exp(-((yy - ty) / 1.5) ** 2)[..., None]
    img = img * (1 - 0.18 * edge)
    shadow = np.zeros((h, w), np.float32)
    L = np.array([-0.62, 0.48, 0.62])
    L = L / np.linalg.norm(L)
    H = L + np.array([0, 0, 1.0])
    H = H / np.linalg.norm(H)

    def body(cx, base, height, keys, albedo, gloss, speck=0.0, foot=None):
        nonlocal img, shadow
        ts = np.array([k[0] for k in keys])
        rs = np.array([k[1] for k in keys]) * w
        tt = np.clip((base - yy) / height, 0, 1)
        lin_t = np.linspace(0, 1, 400)
        fine = np.interp(lin_t, ts, rs)
        ker = np.exp(-np.linspace(-3, 3, 41) ** 2)
        ker /= ker.sum()
        fine = np.convolve(np.pad(fine, 20, mode='edge'), ker, mode='valid')
        r = np.interp(tt, lin_t, fine)
        drdt = np.interp(tt, lin_t, np.gradient(fine) * 399 / height)
        inside = (yy <= base) & (yy >= base - height) & (np.abs(xx - cx) < r)
        nx = np.clip((xx - cx) / np.maximum(r, 1e-3), -1, 1)
        nz = np.sqrt(np.clip(1 - nx ** 2, 0, 1))
        n = np.stack([nx, -drdt * nz, nz], -1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-6
        diff = np.clip(n @ L, 0, 1)
        spec = np.clip(n @ H, 0, 1) ** 60 * gloss
        rim = (1 - nz) ** 2 * 0.10
        alb = np.array(albedo) * np.ones_like(img)
        if speck:
            alb = alb * (1 - speck * (np.random.default_rng(int(cx)).random((h, w)) > 0.985)[..., None])
        if foot:
            alb = np.where((tt < foot[0])[..., None], np.array(foot[1]), alb)
        col = alb * (0.32 + 0.78 * diff[..., None] + rim[..., None]) + spec[..., None]
        img = np.where(inside[..., None], col, img)
        # ombre portée sur la tablette et le mur
        sx = cx + 0.55 * height
        shadow += 0.55 * np.exp(-(((xx - sx) / (r.max() * 1.5 + 0.5 * height)) ** 2) -
                                ((yy - base) / (0.018 * h)) ** 2)
        shadow += 0.30 * ((np.abs(xx - cx - 0.28 * height) < r * 1.05) & (yy < base) &
                          (yy > base - height * 1.02)).astype(np.float32)

    body(0.42 * w, ty + 6, 0.52 * h, [(0, 0.07), (0.06, 0.10), (0.32, 0.128), (0.58, 0.108), (0.76, 0.058),
                                       (0.86, 0.044), (0.96, 0.050), (1.0, 0.056)],
         (0.90, 0.87, 0.81), 0.55, speck=0.12, foot=(0.035, (0.62, 0.47, 0.34)))
    body(0.73 * w, ty + 14, 0.13 * h, [(0, 0.06), (0.35, 0.115), (0.75, 0.135), (1.0, 0.138)],
         (0.68, 0.36, 0.22), 0.25)
    body(0.20 * w, ty + 10, 0.075 * h, [(0, 0.03), (0.3, 0.052), (0.7, 0.052), (1.0, 0.025)],
         (0.22, 0.21, 0.20), 0.35)
    sh = Image.fromarray((np.clip(shadow, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
    s = (np.asarray(sh, np.float32) / 255)[..., None]
    img = img * (1 - 0.32 * s)
    # intérieur du bol (ellipse sombre au bord)
    cx, cy = 0.73 * w, ty + 14 - 0.13 * h
    ell = (((xx - cx) / (0.132 * w)) ** 2 + ((yy - cy) / (0.022 * h)) ** 2) < 1
    img = np.where(ell[..., None], np.array([0.42, 0.21, 0.13]) * (0.8 + 0.3 * ((xx - cx) / w + 0.2))[..., None],
                   img)
    vign = 1 - 0.12 * (((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2.2)
    img = img * vign[..., None]
    return Image.fromarray((np.clip(img, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8))


GEN_FILES = ['paint_color.png', 'paint_rough.png', 'awning_color.png', 'awning_normal.png', 'sign_color.png',
             'sign_mr.png', 'wash.png', 'site.png']

if not IN_BLENDER:
    if __name__ == '__main__':
        textures_main()
    sys.exit(0)

# =============================================================================== Blender
from mathutils import Matrix, Vector  # noqa: E402

ARGS = cli_args()
random.seed(2026)


def ensure_textures():
    if ARGS.get('textures') or not all(os.path.exists(gen_path(f)) for f in GEN_FILES):
        py = os.environ.get('PYTHON', 'python')
        subprocess.run([py, os.path.abspath(__file__)], check=True)


# ----------------------------------------------------------------------------- maths
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(radians(deg), 4, axis)


def Sm(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


ZTOY = R('X', -90)


def catmull(pts, n=6):
    P = [Vector(p) for p in pts]
    m = len(P)
    out = []
    for i in range(m - 1):
        p1, p2 = P[i], P[i + 1]
        p0, p3 = P[max(i - 1, 0)], P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1].copy())
    return out


def fillet(pts, r, n=2, closed=True):
    """Arrondit chaque angle d'une polyligne 2D (rayon r, n segments) : pas d'arête vive."""
    P = [Vector(p) for p in pts]
    m = len(P)
    out = []
    for i in range(m):
        if not closed and i in (0, m - 1):
            out.append(P[i])
            continue
        p0, p1, p2 = P[i - 1], P[i], P[(i + 1) % m]
        a, b = p0 - p1, p2 - p1
        la, lb = a.length, b.length
        if la < 1e-9 or lb < 1e-9:
            continue
        a.normalize()
        b.normalize()
        ang = math.acos(max(-1.0, min(1.0, a.dot(b))))
        if ang > radians(176) or ang < 1e-3 or r <= 0:
            out.append(p1)
            continue
        t = min(r / tan(ang / 2), 0.45 * la, 0.45 * lb)
        rr = t * tan(ang / 2)
        q0 = p1 + a * t
        q1 = p1 + b * t
        c = p1 + (a + b).normalized() * (rr / sin(ang / 2))
        a0 = atan2(q0.y - c.y, q0.x - c.x)
        a1 = atan2(q1.y - c.y, q1.x - c.x)
        da = (a1 - a0 + pi) % (2 * pi) - pi
        for k in range(n + 1):
            aa = a0 + da * k / n
            out.append(Vector((c.x + rr * cos(aa), c.y + rr * sin(aa))))
    return [(p.x, p.y) for p in out]


# ----------------------------------------------------------------------------- primitives bmesh (monde Y-up)
def bx(x0, x1, y0, y1, z0, z1, bev=0.0, seg=1):
    bm = bmesh.new()
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    bmesh.ops.create_cube(bm, size=1.0, matrix=T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) @ Sm(sx, sy, sz))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=min(bev, 0.45 * min(sx, sy, sz)),
                        offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm


def revolve(prof, segs=24):
    """Révolution d'un profil (r, y) autour de l'axe Y (rayons nuls -> pôles)."""
    bm = bmesh.new()
    rings = []
    for r, y in prof:
        if r < 1e-7:
            v = bm.verts.new((0, y, 0))
            rings.append([v] * segs)
        else:
            rings.append([bm.verts.new((r * cos(2 * pi * j / segs), y, -r * sin(2 * pi * j / segs)))
                          for j in range(segs)])
    for A, B in zip(rings, rings[1:]):
        for j in range(segs):
            j2 = (j + 1) % segs
            vs = []
            for v in (A[j], A[j2], B[j2], B[j]):
                if v not in vs:
                    vs.append(v)
            if len(vs) >= 3:
                try:
                    bm.faces.new(vs)
                except ValueError:
                    pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    if M.to_3x3().determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def tube(path, r, segs=8, up=(0, 1, 0), caps=True):
    path = [Vector(p) for p in path]
    n = len(path)
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(path):
        t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        u = Vector(up)
        nn = u - t * u.dot(t)
        if nn.length < 1e-6:
            nn = t.orthogonal()
        nn.normalize()
        b = t.cross(nn)
        rr = r(i / (n - 1)) if callable(r) else r
        rings.append([bm.verts.new(p + (b * cos(2 * pi * k / segs) + nn * sin(2 * pi * k / segs)) * rr)
                      for k in range(segs)])
    for A, B in zip(rings, rings[1:]):
        for k in range(segs):
            bm.faces.new([A[k], A[(k + 1) % segs], B[(k + 1) % segs], B[k]])
    if caps:
        bm.faces.new(rings[0])
        bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def sweep(path, prof, N=(0, 0, 1), closed_path=False, cap=True, mats=None):
    """Profil (s, t) balayé le long d'une polyligne (monde) contenue dans un plan de normale N, coupes
    d'onglet aux angles. s : décalage le long de S = T × N (vers l'extérieur d'une boucle parcourue dans le
    sens trigonométrique vu depuis N), t : le long de N. Profil fermé ; mats : index de matériau par côté."""
    P = [Vector(p) for p in path]
    N = Vector(N).normalized()
    n = len(P)
    segs = n if closed_path else n - 1
    Tg = [(P[(i + 1) % n] - P[i]).normalized() for i in range(segs)]
    S = [t.cross(N).normalized() for t in Tg]
    bm = bmesh.new()
    rings = []
    for i in range(n):
        if closed_path:
            s0, s1 = S[i - 1], S[i % segs]
        else:
            s0, s1 = S[max(i - 1, 0)], S[min(i, segs - 1)]
        m = (s0 + s1).normalized()
        k = 1.0 / max(0.2, m.dot(s1))
        rings.append([bm.verts.new(P[i] + m * (s * k) + N * t) for s, t in prof])
    npf = len(prof)
    for i in range(segs):
        A, B = rings[i], rings[(i + 1) % n]
        for j in range(npf):
            j2 = (j + 1) % npf
            f = bm.faces.new([A[j], B[j], B[j2], A[j2]])
            if mats:
                f.material_index = mats[j]
    if cap and not closed_path:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def rect_loop(x0, y0, x1, y1, z):
    """Rectangle du plan de façade parcouru dans le sens trigonométrique vu de +z."""
    return [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]


# ----------------------------------------------------------------------------- assemblage
MAT = {}


class Geo:
    """Un maillage final (un nœud glTF), multi-matériaux ; UV 'box' (projection selon la normale, en mètres
    / uvs + décalage uvo) ou fonction (co, normale, mat) -> uv ; couleur de sommet (teinte) par ajout."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.col = self.bm.loops.layers.float_color.new('Col')

    def mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def add(self, src, mat='Paint', uv='box', uvs=1.0, uvo=(0.0, 0.0), col=None, M=None):
        M = Matrix.Identity(4) if M is None else M
        flip = M.to_3x3().determinant() < 0
        NM = M.to_3x3().inverted_safe().transposed()
        vs = [self.bm.verts.new(M @ v.co) for v in src.verts]
        src.verts.index_update()
        names = mat if isinstance(mat, (list, tuple)) else None
        c = (*lin(col), 1.0) if isinstance(col, str) else ((*col, 1.0) if col else (1.0, 1.0, 1.0, 1.0))
        src_uv = src.loops.layers.uv.active
        for f in src.faces:
            fv = [vs[v.index] for v in f.verts]
            loops = list(f.loops)
            if flip:
                fv.reverse()
                loops.reverse()
            try:
                nf = self.bm.faces.new(fv)
            except ValueError:
                continue
            nf.smooth = True
            name = names[min(f.material_index, len(names) - 1)] if names else mat
            nf.material_index = self.mi(name)
            n = (NM @ f.normal).normalized()
            for lp, sl in zip(nf.loops, loops):
                co = lp.vert.co
                res = None
                if callable(uv):
                    res = uv(co, n, name)
                elif uv == 'src' and src_uv is not None:
                    res = tuple(sl[src_uv].uv)
                if res is None:
                    ax = max(range(3), key=lambda k: abs(n[k]))
                    a, b = ((-co.z if n.x > 0 else co.z, co.y), (co.x, -co.z if n.y > 0 else co.z),
                            (co.x if n.z > 0 else -co.x, co.y))[ax]
                    res = (a / uvs + uvo[0], b / uvs + uvo[1])
                lp[self.uv].uv = res
                lp[self.col] = c
        src.free()


COLL = None
EXPORT = []
ROOT_EMPTY = None


def finish(geo, name, pivot=(0.0, 0.0, 0.0), sharp=35, wn=True):
    """Objet final : sommets en unités d'export (échelle SC, recentré), origine sur `pivot` (mètres réels)."""
    me = bpy.data.meshes.new(name)
    px, py, pz = pivot
    bmesh.ops.transform(geo.bm, matrix=Sm(SC) @ T(-px, -py, -pz), verts=geo.bm.verts)
    geo.bm.to_mesh(me)
    geo.bm.free()
    for n in geo.mats:
        me.materials.append(MAT[n])
    me.transform(YUP)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=radians(sharp))
    ob = bpy.data.objects.new(name, me)
    COLL.objects.link(ob)
    ob.location = W((px - CX) * SC, py * SC, (pz - CZ) * SC)
    ob.parent = ROOT_EMPTY
    if wn:
        m = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
        m.keep_sharp = True
        m.mode = 'FACE_AREA'
    assert ob.name == name, f'nom en double : {ob.name}'
    EXPORT.append(ob)
    return ob


# ----------------------------------------------------------------------------- matériaux
def with_vc(m):
    """Base Color = image (ou couleur) × couleur de sommet 'Col' (COLOR_0 en glTF)."""
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    mx = nt.nodes.new('ShaderNodeMix')
    mx.data_type = 'RGBA'
    mx.blend_type = 'MULTIPLY'
    mx.inputs['Factor'].default_value = 1.0
    src = next((lk.from_socket for lk in nt.links if lk.to_socket == p.inputs['Base Color']), None)
    if src is not None:
        nt.links.new(src, mx.inputs[6])
    else:
        mx.inputs[6].default_value = p.inputs['Base Color'].default_value[:]
    nt.links.new(ca.outputs['Color'], mx.inputs[7])
    nt.links.new(mx.outputs[2], p.inputs['Base Color'])
    return m


def build_materials():
    g = gen_path
    paint_n = ph_map('fine_grained_wood', 'nor_gl', '1k')
    MAT['Paint'] = pbr('Vit_Paint', GREEN, rough=0.32, color_map=g('paint_color.png'), normal_map=paint_n,
                       rough_map=g('paint_rough.png'), normal=0.35, coat=0.0)
    MAT['Gilt'] = pbr('Vit_Gilt', '#d9b45e', rough=0.26, metal=1.0)
    MAT['Brass'] = pbr('Vit_Brass', '#c7a467', rough=0.30, metal=1.0)
    MAT['Iron'] = pbr('Vit_Iron', '#1b1c1d', rough=0.42, metal=0.7)
    MAT['Zinc'] = pbr('Vit_Zinc', '#8a9096', rough=0.48, metal=0.85)
    MAT['Stone'] = with_vc(pbr('Vit_Stone', '#d8cdb9', rough=0.85,
                               color_map=ph_map('beige_wall_002', 'Diffuse', '1k'),
                               normal_map=ph_map('beige_wall_002', 'nor_gl', '1k'),
                               rough_map=ph_map('beige_wall_002', 'Rough', '1k'), normal=1.0))
    MAT['Joint'] = pbr('Vit_Joint', '#8d8577', rough=0.95)
    MAT['Sett'] = with_vc(pbr('Vit_Sett', '#9a958c', rough=0.8, color_map=ph_map('rock_surface', 'Diffuse', '1k'),
                              normal_map=ph_map('rock_surface', 'nor_gl', '1k'),
                              rough_map=ph_map('rock_surface', 'Rough', '1k'), normal=1.2))
    MAT['Bed'] = with_vc(pbr('Vit_Bed', '#3a342c', rough=0.95))
    MAT['Base'] = pbr('Vit_Base', '#0e0e10', rough=0.38)
    MAT['Glass'] = pbr('Vit_Glass', '#eef4f2', rough=0.02, transmission=1.0, ior=1.5)
    MAT['Canvas'] = pbr('Vit_Canvas', '#e8dfca', rough=0.88, color_map=g('awning_color.png'),
                        normal_map=g('awning_normal.png'), normal=0.8)
    MAT['Sign'] = pbr('Vit_Sign', GREEN, rough=0.3, metal=1.0, color_map=g('sign_color.png'),
                      arm_map=g('sign_mr.png'))
    MAT['Screen'] = pbr('Vit_Screen', '#060607', rough=0.18, emit_map=g('site.png'), strength=1.4)
    MAT['Bezel'] = pbr('Vit_Bezel', '#0d0d0e', rough=0.35, metal=0.3)
    MAT['LampGlow'] = pbr('Vit_LampGlow', '#fff3e0', rough=0.4, emit='#ffd39a', strength=14.0)
    MAT['GlobeGlow'] = pbr('Vit_GlobeGlow', '#f4ece0', rough=0.3, emit='#ffcf96', strength=5.0)
    MAT['ShadeIn'] = pbr('Vit_ShadeIn', '#e9e4da', rough=0.5)
    MAT['Wash'] = pbr('Vit_Wash', '#cdbca4', rough=0.92, emit_map=g('wash.png'), strength=1.1)
    MAT['Plaster'] = pbr('Vit_Plaster', '#c9b9a2', rough=0.92)
    MAT['Parquet'] = pbr('Vit_Parquet', '#8a6a48', rough=0.45,
                         color_map=ph_map('herringbone_parquet', 'Diffuse', '1k'))
    MAT['Oak'] = pbr('Vit_Oak', '#8c6a47', rough=0.5)
    MAT['Plinth'] = pbr('Vit_Plinth', '#e2dbd0', rough=0.7)
    MAT['Terracotta'] = pbr('Vit_Terracotta', '#a85c3c', rough=0.75)
    MAT['Soil'] = pbr('Vit_Soil', '#231a14', rough=1.0)
    MAT['Leaf'] = pbr('Vit_Leaf', '#2f4d2a', rough=0.42, sheen=('#9fbf8a', 0.4))
    MAT['Bark'] = pbr('Vit_Bark', '#5b4a3a', rough=0.8)
    MAT['CerCream'] = pbr('Vit_CerCream', '#e6ded0', rough=0.18)
    MAT['CerSage'] = pbr('Vit_CerSage', '#8fa08a', rough=0.22)
    MAT['CerRust'] = pbr('Vit_CerRust', '#a8573a', rough=0.3)
    MAT['CerInk'] = pbr('Vit_CerInk', '#2b2e33', rough=0.25)
    MAT['BookA'] = pbr('Vit_BookA', '#7d2f25', rough=0.7)
    MAT['BookB'] = pbr('Vit_BookB', '#d9cfbd', rough=0.75)
    MAT['BookC'] = pbr('Vit_BookC', '#2e4756', rough=0.7)
    MAT['Twig'] = pbr('Vit_Twig', '#7a6650', rough=0.8)
    for m in MAT.values():
        m.use_backface_culling = m.name not in ('Vit_Leaf', 'Vit_Glass')


# =============================================================================== modélisation
def build_ground():
    """Socle : base noire, lit de pose, pavés de grès (un par un), bordure de granit, caniveau."""
    g = Geo()
    g.add(bx(X0 - 0.02, X1 + 0.02, 0.0, Y_BASE, ZB - 0.02, ZF + 0.02, bev=0.012, seg=2), 'Base')
    bed = (0.40, 0.37, 0.33)
    g.add(bx(X0, X1, Y_BASE, Y_SW - SETT_H, ZB, Z_CURB0, bev=0.003), 'Bed', col=bed)
    g.add(bx(X0, X1, Y_BASE, Y_GT - SETT_H + 0.01, Z_CURB1, ZF, bev=0.003), 'Bed', col=bed)
    tints = [(0.92, 0.90, 0.86), (0.80, 0.79, 0.77), (0.98, 0.93, 0.85), (0.72, 0.72, 0.71), (0.88, 0.84, 0.78),
             (0.84, 0.86, 0.88)]

    def sett(x0, x1, z0, z1, ytop, ybot, cut):
        """Pavé : dessus bombé, chanfrein 1,2 cm (sauf sur les faces sciées de la coupe), flancs."""
        c = 0.012
        jit = random.uniform(-0.004, 0.003)
        tx, tz = random.uniform(-0.012, 0.012), random.uniform(-0.012, 0.012)

        def h(x, z):
            return ytop + jit + tx * (x - (x0 + x1) / 2) + tz * (z - (z0 + z1) / 2)
        cx0 = x0 if 'x0' in cut else x0 + c
        cx1 = x1 if 'x1' in cut else x1 - c
        cz0 = z0 if 'z0' in cut else z0 + c
        cz1 = z1 if 'z1' in cut else z1 - c
        bm = bmesh.new()
        top = [bm.verts.new((x, h(x, z), z)) for x, z in ((cx0, cz1), (cx1, cz1), (cx1, cz0), (cx0, cz0))]
        mid = bm.verts.new(((x0 + x1) / 2, h((x0 + x1) / 2, (z0 + z1) / 2) + 0.004, (z0 + z1) / 2))
        ring = [bm.verts.new((x, h(x, z) - c * 0.9, z)) for x, z in ((x0, z1), (x1, z1), (x1, z0), (x0, z0))]
        bot = [bm.verts.new((x, ybot, z)) for x, z in ((x0, z1), (x1, z1), (x1, z0), (x0, z0))]
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new([top[i], top[j], mid])
            bm.faces.new([ring[i], ring[j], top[j], top[i]])
            bm.faces.new([bot[i], bot[j], ring[j], ring[i]])
        g.add(bm, 'Sett', uvs=2.0, uvo=(random.random(), random.random()), col=random.choice(tints))

    # trottoir : rangs parallèles à la façade, pavés 10,5 × (13 à 20) cm, joints de 1,2 cm
    rows = 15
    pitch = Z_CURB0 / rows
    for r in range(rows):
        z0, z1 = r * pitch + 0.006, (r + 1) * pitch - 0.006
        x = X0 - random.uniform(0.0, 0.12)
        while x < X1:
            ln = random.uniform(0.13, 0.20)
            a, b = max(x, X0), min(x + ln, X1)
            if b - a > 0.03:
                cut = ('x0' if a <= X0 + 1e-6 else '') + ('x1' if b >= X1 - 1e-6 else '')
                sett(a + (0 if a <= X0 else 0.006), b - (0 if b >= X1 else 0.006), z0, z1, Y_SW, Y_SW - SETT_H - 0.01,
                     cut)
            x += ln
    # caniveau : 3 rangs de pavés carrés, pente vers la bordure
    rows = 3
    zc0 = Z_CURB1 + 0.012
    pitch = (ZF - zc0) / rows
    for r in range(rows):
        z0, z1 = zc0 + r * pitch + 0.006, zc0 + (r + 1) * pitch - 0.006
        if r == rows - 1:
            z1 = ZF
        yt = Y_GT + 0.024 * (r + 0.5) / rows
        x = X0 - random.uniform(0.0, 0.1)
        while x < X1:
            ln = random.uniform(0.10, 0.13)
            a, b = max(x, X0), min(x + ln, X1)
            if b - a > 0.03:
                cut = ('x0' if a <= X0 + 1e-6 else '') + ('x1' if b >= X1 - 1e-6 else '') + \
                      ('z1' if r == rows - 1 else '')
                sett(a + (0 if a <= X0 else 0.006), b - (0 if b >= X1 else 0.006), z0, z1, yt,
                     Y_GT - SETT_H + 0.01, cut)
            x += ln
    # bordure de granit (tronçons de 1,25 m, arête avant arrondie, fruit léger)
    prof = fillet([(Z_CURB0, Y_BASE), (Z_CURB1 + 0.012, Y_BASE), (Z_CURB1 + 0.004, Y_GT + 0.02),
                   (Z_CURB1, Y_SW - 0.03), (Z_CURB1 - 0.03, Y_SW), (Z_CURB0, Y_SW)], 0.006, 2)
    prof = [(z, y) for z, y in prof]
    n = 4
    for k in range(n):
        xa = X0 + (X1 - X0) * k / n + (0.002 if k else 0.0)
        xb = X0 + (X1 - X0) * (k + 1) / n - (0.002 if k < n - 1 else 0.0)
        # profil (s, t) = (z, y) balayé le long de x : T = +x, N = +y -> S = +z
        bm = sweep([(xa, 0, 0), (xb, 0, 0)], [(z, y) for z, y in prof], N=(0, 1, 0))
        g.add(bm, 'Sett', uvs=2.0, uvo=(random.random(), random.random()), col=(0.66, 0.67, 0.68))
    return finish(g, 'Shop_Ground', sharp=40)


def build_stone():
    """Angle d'immeuble en pierre de taille : assises à refends (joints creux arrondis), bandeau mouluré,
    retour sur les deux flancs, noyau en retrait (couleur du joint) derrière les blocs."""
    g = Geo()
    jt = 0.012            # largeur de joint
    rec = 0.018           # retrait du noyau

    def tint():
        k = random.uniform(0.90, 1.04)
        return (k * random.uniform(0.98, 1.02), k, k * random.uniform(0.95, 1.0))

    def block(x0, x1, y0, y1, z0, z1):
        g.add(bx(x0, x1, y0, y1, z0, z1, bev=0.016, seg=2), 'Stone', uvs=3.0,
              uvo=(random.random(), random.random()), col=tint())

    xr0, xr1 = ROOM[0], ROOM[1]
    # noyau (joints) : murs latéraux, mur du fond, masse au-dessus du plafond
    g.add(bx(X0 + rec, xr0 - 0.01, Y_FOUND, Y_TOP - rec, ZB + rec, -rec), 'Joint', uvs=1.0)
    g.add(bx(xr1 + 0.01, X1 - rec, Y_FOUND, Y_TOP - rec, ZB + rec, -rec), 'Joint', uvs=1.0)
    g.add(bx(xr0 - 0.01, xr1 + 0.01, Y_FOUND, Y_TOP - rec, ZB + rec, ROOM[2] - 0.01), 'Joint', uvs=1.0)
    g.add(bx(xr0 - 0.01, xr1 + 0.01, ROOM[4] + 0.01, Y_TOP - rec, ROOM[2] - 0.01, -rec), 'Joint', uvs=1.0)
    ys = COURSES
    for k in range(len(ys) - 1):
        y0, y1 = ys[k] + (jt / 2 if k else 0.0), ys[k + 1] - jt / 2
        full = y0 > Y_CORN1 - 0.02           # au-dessus de la corniche : assise pleine largeur
        wc = {s_: random.uniform(0.75, 0.95) for s_ in (-1, 1)}
        for side in (-1, 1):
            # bloc d'angle (harpe alternée) puis blocs du flanc
            lc = 0.48 if k % 2 == 0 else 0.78
            xo, xi = (X0, PIL_L[0] + 0.03) if side < 0 else (PIL_R[1] - 0.03, X1)
            if full:
                xo, xi = (X0, X0 + wc[-1]) if side < 0 else (X1 - wc[1], X1)
            block(xo, xi, y0, y1, -lc, 0.0)
            z = -lc - jt
            while z > ZB + 0.05:
                ln = random.choice((0.62, 0.85, 0.95))
                z1 = max(z - ln, ZB)
                if z1 - ZB < 0.25:
                    z1 = ZB
                xa, xb = (X0, X0 + 0.30) if side < 0 else (X1 - 0.30, X1)
                block(xa, xb, y0, y1, z1, z)
                z = z1 - jt
        if full:
            x = X0 + wc[-1] + jt
            xe = X1 - wc[1] - jt
            while x < xe - 0.05:
                ln = random.uniform(0.95, 1.35)
                b = min(x + ln, xe)
                if xe - b < 0.4:
                    b = xe
                block(x, b, y0, y1, -0.30, 0.0)
                x = b + jt
    # bandeau mouluré (filet, larmier, doucine) avec retours sur les flancs
    prof = fillet([(0.0, 0.0), (0.035, 0.0), (0.035, 0.012), (0.075, 0.03), (0.08, 0.075), (0.065, 0.09),
                   (0.06, Y_BAND1 - Y_BAND0), (0.0, Y_BAND1 - Y_BAND0)], 0.006, 2)
    path = [(X0, Y_BAND0, ZB), (X0, Y_BAND0, 0.0), (X1, Y_BAND0, 0.0), (X1, Y_BAND0, ZB)]
    g.add(sweep(path, prof, N=(0, 1, 0)), 'Stone', uvs=3.0, uvo=(0.3, 0.7), col=(0.97, 0.96, 0.93))
    # assise haute (coupe) au-dessus du bandeau
    y0, y1 = Y_BAND1 + jt / 2, Y_TOP
    x = X0
    while x < X1 - 0.05:
        ln = random.uniform(0.9, 1.3)
        b = min(x + ln, X1)
        if X1 - b < 0.4:
            b = X1
        block(x, b, y0, y1, -0.62 if x <= X0 or b >= X1 else -0.30, 0.0)
        x = b + jt
    for side in (-1, 1):
        z = -0.62 - jt
        xa, xb = (X0, X0 + 0.30) if side < 0 else (X1 - 0.30, X1)
        while z > ZB + 0.05:
            z1 = max(z - 0.9, ZB)
            if z1 - ZB < 0.25:
                z1 = ZB
            block(xa, xb, y0, y1, z1, z)
            z = z1 - jt
    # dessus de la coupe : dalle de pierre en retrait
    g.add(bx(X0 + 0.29, X1 - 0.29, Y_TOP - 0.012, Y_TOP - 0.002, ZB + 0.29, -0.29), 'Stone', uvs=3.0,
          col=(0.9, 0.88, 0.84))
    g.add(bx(X0 + 0.29, X1 - 0.29, Y_FOUND, Y_TOP - 0.002, ZB, ZB + 0.03), 'Stone', uvs=3.0, col=(0.92, 0.9, 0.86))
    return finish(g, 'Shop_Facade', sharp=40)


def panel(g, x0, y0, x1, y1, z, mat='Paint'):
    """Panneau à plate-bande en saillie + moulure de cadre (boucle à onglets)."""
    inset = 0.05
    bm = bmesh.new()
    outer = [bm.verts.new(p) for p in rect_loop(x0 + 0.012, y0 + 0.012, x1 - 0.012, y1 - 0.012, z)]
    midr = [bm.verts.new(p) for p in rect_loop(x0 + inset, y0 + inset, x1 - inset, y1 - inset, z + 0.009)]
    inner = [bm.verts.new(p) for p in rect_loop(x0 + inset + 0.006, y0 + inset + 0.006, x1 - inset - 0.006,
                                                y1 - inset - 0.006, z + 0.011)]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new([outer[i], outer[j], midr[j], midr[i]])
        bm.faces.new([midr[i], midr[j], inner[j], inner[i]])
    bm.faces.new(inner)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    g.add(bm, mat, uvs=0.6)
    prof = fillet([(0.006, -0.002), (0.006, 0.005), (0.0, 0.011), (-0.007, 0.017), (-0.014, 0.015),
                   (-0.018, 0.007), (-0.020, -0.002)], 0.002, 2)
    g.add(sweep(rect_loop(x0, y0, x1, y1, z), prof, N=(0, 0, 1), closed_path=True), mat, uvs=0.6)


def stop_bead(g, x0, y0, x1, y1, z, mat='Paint'):
    """Parclose (petite moulure qui tient la glace), vers l'intérieur du cadre."""
    prof = fillet([(0.002, 0.0), (0.002, 0.012), (-0.008, 0.018), (-0.018, 0.010), (-0.020, 0.0)], 0.003, 2)
    g.add(sweep(rect_loop(x0, y0, x1, y1, z), prof, N=(0, 0, 1), closed_path=True), mat, uvs=0.6)


def build_woodwork():
    """Devanture en applique : pilastres, consoles, architrave, corniche, soubassement, porte, châssis."""
    g = Geo()
    B = lambda *a, **k: g.add(bx(*a, bev=k.get('bev', 0.006), seg=k.get('seg', 2)), k.get('mat', 'Paint'),  # noqa
                              uvs=0.6, uvo=(random.random(), random.random()))
    for xa, xb in (PIL_L, PIL_R):
        # socle, chapiteau du socle, fût à panneau, console
        B(xa - 0.012, xb + 0.012, Y_SW, Y_SW + 0.30, -0.02, 0.235)
        cap = fillet([(0.0, 0.0), (0.012, 0.0), (0.022, 0.012), (0.022, 0.022), (0.010, 0.034), (0.0, 0.034)],
                     0.003, 2)
        g.add(sweep([(xa - 0.012, Y_SW + 0.30, -0.02), (xa - 0.012, Y_SW + 0.30, 0.235),
                     (xb + 0.012, Y_SW + 0.30, 0.235), (xb + 0.012, Y_SW + 0.30, -0.02)], cap, N=(0, 1, 0)),
              'Paint', uvs=0.6)
        B(xa, xb, Y_SW + 0.30, Y_ARCH0 + 0.002, -0.02, 0.20)
        panel(g, xa + 0.05, Y_SW + 0.42, xb - 0.05, Y_ARCH0 - 0.12, 0.20)
        # console en S (profil (z, y) balayé le long de x)
        cons = [(0.0, Y_ARCH0), (0.20, Y_ARCH0)]
        for k in range(1, 13):
            t = k / 12
            cons.append((0.20 + 0.075 * (1 - cos(pi * t)) / 2 + 0.03 * sin(pi * t) * (1 - t),
                         Y_ARCH0 + t * (Y_CORN0 - 0.05 - Y_ARCH0)))
        cons += [(0.305, Y_CORN0 - 0.05), (0.33, Y_CORN0 - 0.04), (0.33, Y_CORN0 + 0.002), (0.0, Y_CORN0 + 0.002)]
        cons = fillet(cons, 0.006, 2)
        g.add(sweep([(xa + 0.01, 0, 0), (xb - 0.01, 0, 0)], [(z, y) for z, y in cons], N=(0, 1, 0)), 'Paint',
              uvs=0.6)
        # rosace dorée sur la console
        ros = revolve([(0.0, 0.016), (0.012, 0.014), (0.024, 0.008), (0.03, 0.002), (0.03, 0.0), (0.0, 0.0)], 16)
        g.add(xf(ros, T((xa + xb) / 2, Y_ARCH0 + 0.30, 0.250) @ R('X', 90) @ R('X', -12)), 'Gilt', uvs=0.3)
    # architrave sous l'enseigne + filet doré
    B(PIL_L[1], PIL_R[0], Y_ARCH0, Y_ARCH1, -0.02, 0.19)
    g.add(tube([(PIL_L[1], Y_ARCH1 - 0.03, 0.192), (PIL_R[0], Y_ARCH1 - 0.03, 0.192)], 0.007, 8), 'Gilt', uvs=0.3)
    # cadre mouluré de l'enseigne
    prof = fillet([(0.004, -0.002), (0.004, 0.012), (-0.006, 0.022), (-0.018, 0.020), (-0.026, 0.010),
                   (-0.030, -0.002)], 0.002, 2)
    g.add(sweep(rect_loop(PIL_L[1] + 0.002, Y_SIGN0 + 0.002, PIL_R[0] - 0.002, Y_SIGN1 - 0.002, 0.17), prof,
                closed_path=True), 'Paint', uvs=0.6)
    # dessus de l'enseigne jusqu'à la corniche
    B(PIL_L[1], PIL_R[0], Y_SIGN1 - 0.01, Y_CORN0 + 0.002, -0.02, 0.12)
    # corniche (filet, gorge, larmier, perle dorée, cimaise, couvre-joint de zinc) avec retours
    cp = [(0.0, 0.0), (0.03, 0.0), (0.03, 0.018), (0.05, 0.028)]
    for k in range(1, 7):            # gorge (quart de cercle concave)
        a = pi / 2 * k / 6
        cp.append((0.05 + 0.13 * (1 - cos(a)), 0.028 + 0.075 * sin(a) ** 0.8 * 1.0 - 0.0))
    cp += [(0.19, 0.11), (0.33, 0.12), (0.345, 0.12), (0.345, 0.185), (0.355, 0.19), (0.36, 0.20),
           (0.372, 0.215), (0.375, 0.235), (0.365, 0.248), (0.365, 0.255), (0.0, 0.272)]
    cp = [(0.0, 0.0)] + [(s_ + 0.12, t_) for s_, t_ in cp[1:-1]] + [(0.0, 0.272)]
    cp = fillet(cp, 0.004, 2)
    mats = []
    for i in range(len(cp)):
        a, b = cp[i], cp[(i + 1) % len(cp)]
        top = b[1] > 0.247 and a[1] > 0.247
        bead = 0.185 <= a[1] <= 0.215 and a[0] >= 0.46
        mats.append(2 if top else (1 if bead else 0))
    L = 1.78
    g.add(sweep([(-L, Y_CORN0, -0.04), (-L, Y_CORN0, -0.02), (L, Y_CORN0, -0.02), (L, Y_CORN0, -0.04)],
                [(s, t) for s, t in cp], N=(0, 1, 0), mats=mats), ['Paint', 'Gilt', 'Zinc'], uvs=0.6)
    # ---- vitrine (à droite) : soubassement, appui, montants, imposte
    wx0, wx1 = WIN
    B(wx0, PIL_R[0] + 0.01, Y_SW, Y_SILL, -0.02, 0.14)
    B(wx0 - 0.004, PIL_R[0] + 0.012, Y_SW, Y_SW + 0.075, -0.02, 0.155)
    xm = (wx0 + wx1) / 2
    panel(g, wx0 + 0.07, Y_SW + 0.14, xm - 0.035, Y_SILL - 0.08, 0.14)
    panel(g, xm + 0.035, Y_SW + 0.14, wx1 - 0.07, Y_SILL - 0.08, 0.14)
    sill = fillet([(0.0, 0.0), (0.012, 0.0), (0.012, -0.012), (0.03, -0.012), (0.06, 0.02), (0.06, 0.05),
                   (0.0, 0.062)], 0.004, 2)
    g.add(sweep([(wx0 - 0.02, Y_SILL - 0.012, 0.0), (wx0 - 0.02, Y_SILL - 0.012, 0.14),
                 (wx1 + 0.015, Y_SILL - 0.012, 0.14), (wx1 + 0.015, Y_SILL - 0.012, 0.0)], sill, N=(0, 1, 0)),
          'Paint', uvs=0.6)
    # montants : meneau (porte | vitrine), dormant contre le pilastre droit
    B(MULL[0], MULL[1], Y_SW, Y_TRANS1, -0.02, 0.16)
    panel(g, MULL[0] + 0.03, Y_SW + 0.14, MULL[1] - 0.03, Y_SILL - 0.08, 0.16)
    B(wx1 - 0.06, PIL_R[0] + 0.01, Y_SILL, Y_ARCH0 + 0.01, -0.02, 0.12)
    # traverse d'imposte (nez arrondi, filet doré)
    B(PIL_L[1] - 0.01, PIL_R[0] + 0.01, Y_TRANS0, Y_TRANS1, -0.02, 0.15)
    g.add(tube([(PIL_L[1], Y_TRANS0 + 0.012, 0.152), (PIL_R[0], Y_TRANS0 + 0.012, 0.152)], 0.006, 8), 'Gilt',
          uvs=0.3)
    # meneaux d'imposte (au-dessus de la porte et de la vitrine)
    B(MULL[0], MULL[1], Y_TRANS1, Y_ARCH0 + 0.01, -0.02, 0.12)
    # parcloses autour des glaces de la vitrine
    stop_bead(g, wx0, Y_SILL + 0.045, wx1 - 0.06, Y_TRANS0, 0.12)
    stop_bead(g, wx0, Y_TRANS1, wx1 - 0.06, Y_ARCH0, 0.12)
    stop_bead(g, DOOR[0] + 0.03, Y_TRANS1, DOOR[1], Y_ARCH0, 0.12)
    # ---- porte (à gauche) : dormant, vantail à panneau bas et glace, plaque de propreté, bâton de maréchal
    dx0, dx1 = DOOR
    B(dx0 - 0.01, dx0 + 0.035, Y_SW, Y_TRANS0, -0.02, 0.12)
    lx0, lx1 = dx0 + 0.035, dx1 - 0.008
    ly0, ly1 = Y_SW + 0.012, Y_TRANS0 - 0.006
    lz0, lz1 = 0.025, 0.085
    st = 0.11
    B(lx0, lx0 + st, ly0, ly1, lz0, lz1)
    B(lx1 - st, lx1, ly0, ly1, lz0, lz1)
    B(lx0 + st - 0.01, lx1 - st + 0.01, ly0, 0.98, lz0, lz1)
    B(lx0 + st - 0.01, lx1 - st + 0.01, ly1 - 0.12, ly1, lz0, lz1)
    panel(g, lx0 + st + 0.02, ly0 + 0.20, lx1 - st - 0.02, 0.92, lz1)
    stop_bead(g, lx0 + st - 0.002, 0.98, lx1 - st + 0.002, ly1 - 0.12, lz1)
    B(lx0 + 0.01, lx1 - 0.01, ly0 + 0.005, ly0 + 0.16, lz1, lz1 + 0.004, mat='Brass', bev=0.002, seg=1)
    hx = lx1 - 0.055
    g.add(tube(catmull([(hx, 1.00, lz1 + 0.055), (hx, 1.30, lz1 + 0.062), (hx, 1.60, lz1 + 0.055)], 4), 0.011, 10),
          'Brass', uvs=0.3)
    for yy in (1.06, 1.54):
        g.add(tube([(hx, yy, lz1), (hx, yy, lz1 + 0.055)], 0.008, 8), 'Brass', uvs=0.3)
    # seuil de granit devant la porte
    g.add(bx(dx0 - 0.03, dx1 + 0.04, Y_SW - 0.02, Y_SW + 0.03, -0.10, 0.26, bev=0.01, seg=2), 'Sett', uvs=2.0,
          uvo=(0.37, 0.61), col=(0.62, 0.63, 0.64))
    # ---- store : rouleau et supports (fixes)
    hy, hz = HINGE[1], HINGE[2]
    g.add(tube([(-AWN_X - 0.01, hy, hz), (AWN_X + 0.01, hy, hz)], 0.036, 16), 'Paint', uvs=0.6)
    for sx in (-1, 1):
        x = sx * (AWN_X + 0.012)
        g.add(bx(x - 0.01, x + 0.01, hy - 0.05, hy + 0.05, 0.12, hz + 0.02, bev=0.004), 'Iron', uvs=0.3)
        g.add(bx(sx * 1.60 - 0.035, sx * 1.60 + 0.035, Y_TRANS0 - 0.01, Y_TRANS1 + 0.09, 0.14, 0.175, bev=0.006),
              'Iron', uvs=0.3)
    # ---- lampes col-de-cygne (bras et abat-jour ; diffuseurs = Shop_Lamp_L / _R)
    for sx in (-1, 1):
        x = sx * 1.25
        base = (x, Y_CORN1 + 0.002, 0.30)
        pts = catmull([base, (x, Y_CORN1 + 0.10, 0.36), (x, Y_CORN1 + 0.17, 0.52), (x, Y_CORN1 + 0.12, 0.68),
                       (x, LAMP_Y + 0.05, 0.74)], 6)
        g.add(tube(pts, 0.011, 8), 'Iron', uvs=0.3)
        g.add(bx(x - 0.05, x + 0.05, Y_CORN1 - 0.015, Y_CORN1 + 0.005, 0.24, 0.36, bev=0.006, seg=2), 'Iron',
              uvs=0.3)
        shade = revolve([(0.0, 0.0), (0.022, 0.0), (0.03, -0.03), (0.06, -0.10), (0.088, -0.14), (0.092, -0.145),
                         (0.088, -0.148), (0.082, -0.142), (0.055, -0.10), (0.026, -0.035), (0.018, -0.012),
                         (0.0, -0.012)], 20)
        for f in shade.faces:
            c = f.calc_center_median()
            f.material_index = 1 if (f.normal.x * c.x + f.normal.z * c.z) < 0 else 0
        g.add(xf(shade, LAMP_M(sx)), ['Iron', 'ShadeIn'], uvs=0.3)
    # ---- plaque de numéro (émail bleu) sur le trumeau droit
    pl = bx(2.27, 2.47, 2.20, 2.35, 0.0, 0.008, bev=0.003, seg=1)
    g.add(pl, 'Sign', uv=lambda co, n, m: (((co.x - 2.27) / 0.20) * 0.25,
                                         1 - (492 - (co.y - 2.20) / 0.15 * 192) / 512) if n.z > 0.5 else (0.02, 0.1))
    return finish(g, 'Shop_Woodwork', sharp=35)


LAMP_Y = Y_CORN1 + 0.02


def LAMP_M(sx):
    """Repère de l'abat-jour : sommet sous le bout du bras, axe pointé vers le centre de l'enseigne."""
    x = sx * 1.25
    top = Vector((x, LAMP_Y + 0.03, 0.75))
    tgt = Vector((x * 0.7, (Y_SIGN0 + Y_SIGN1) / 2, 0.17))
    d = (tgt - top).normalized()
    q = Vector((0, -1, 0)).rotation_difference(d)
    return T(*top) @ q.to_matrix().to_4x4()


def build_lamps():
    out = []
    for sx, name in ((-1, 'Shop_Lamp_L'), (1, 'Shop_Lamp_R')):
        g = Geo()
        disc = revolve([(0.0, -0.118), (0.05, -0.118), (0.072, -0.13), (0.0, -0.126)], 20)
        g.add(xf(disc, LAMP_M(sx)), 'LampGlow', uvs=0.3)
        out.append(finish(g, name, wn=False))
    return out


def build_sign():
    g = Geo()
    x0, x1 = PIL_L[1], PIL_R[0]
    bm = bx(x0, x1, Y_SIGN0, Y_SIGN1, -0.02, 0.17, bev=0.004, seg=1)
    for f in bm.faces:
        f.material_index = 1 if f.normal.z > 0.9 else 0
    v0 = 1 - SIGN_ROWS / 512

    def uv(co, n, m):
        if m != 'Sign':
            return None
        return ((co.x - x0) / (x1 - x0), v0 + (co.y - Y_SIGN0) / (Y_SIGN1 - Y_SIGN0) * (SIGN_ROWS / 512))
    g.add(bm, ['Paint', 'Sign'], uv=uv, uvs=0.6)
    return finish(g, 'Shop_Sign', sharp=35)


def build_glass():
    g = Geo()
    th = 0.006
    wx0, wx1 = WIN
    for x0, x1, y0, y1, z in ((wx0 - 0.01, wx1 - 0.05, Y_SILL + 0.035, Y_TRANS0 + 0.01, Z_GLASS),
                              (wx0 - 0.01, wx1 - 0.05, Y_TRANS1 - 0.01, Y_ARCH0 + 0.01, Z_GLASS),
                              (DOOR[0] + 0.03, MULL[0] + 0.01, Y_TRANS1 - 0.01, Y_ARCH0 + 0.01, Z_GLASS),
                              (DOOR[0] + 0.035 + 0.10, DOOR[1] - 0.008 - 0.10, 0.97, Y_TRANS0 - 0.12, 0.05)):
        g.add(bx(x0, x1, y0, y1, z - th / 2, z + th / 2), 'Glass', uvs=1.0)
    return finish(g, 'Shop_Glass', wn=False)


def build_awning():
    """Store banne : toile (épaisseur 3 mm, légère flèche), lambrequin festonné, barre de charge, bras.
    Origine de l'objet = axe du rouleau (HINGE) : une rotation autour de X local le replie."""
    g = Geo()
    hy, hz = HINGE[1], HINGE[2]
    p0 = Vector((0, hy - 0.034, hz + 0.012))           # sortie de toile sous le rouleau
    fy, fz = AWN_FRONT
    p1 = Vector((0, fy + 0.02, fz))
    nx, nv = 40, 10
    th = 0.003
    tile = 4 * STRIPE_W

    def P(u, v):
        p = p0.lerp(p1, v)
        sag = 0.022 * sin(pi * v) * (0.75 + 0.25 * cos(2 * pi * (u - 0.5)))
        return Vector((-AWN_X + 2 * AWN_X * u, p.y - sag, p.z))
    slope = (p1 - p0).length
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    grid = {}
    nrm = (p1 - p0).normalized().cross(Vector((1, 0, 0)))   # normale vers le haut-avant
    if nrm.y < 0:
        nrm = -nrm
    for side, off in ((0, th / 2), (1, -th / 2)):
        for i in range(nx + 1):
            for j in range(nv + 1):
                grid[side, i, j] = bm.verts.new(P(i / nx, j / nv) + nrm * off)

    def tuv(i, j):
        x = -AWN_X + 2 * AWN_X * i / nx
        return ((x + AWN_X) / tile, slope * j / nv / tile)
    for side in (0, 1):
        for i in range(nx):
            for j in range(nv):
                q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                vs = [grid[side, a, b] for a, b in q]
                if side == 0:
                    vs = vs[::-1]
                    q = q[::-1]
                f = bm.faces.new(vs)
                for lp, (a, b) in zip(f.loops, q):
                    lp[uvl].uv = tuv(a, b)
    # chants
    for i in range(nx):
        for j in (0, nv):
            vs = [grid[0, i, j], grid[0, i + 1, j], grid[1, i + 1, j], grid[1, i, j]]
            f = bm.faces.new(vs if j == 0 else vs[::-1])
            for lp in f.loops:
                lp[uvl].uv = tuv(i, j)
    for i in (0, nx):
        for j in range(nv):
            vs = [grid[0, i, j], grid[0, i, j + 1], grid[1, i, j + 1], grid[1, i, j]]
            f = bm.faces.new(vs if i == nx else vs[::-1])
            for lp in f.loops:
                lp[uvl].uv = tuv(i, j)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    g.add(bm, 'Canvas', uv='src')
    # lambrequin festonné : 12 festons, plan vertical sous la barre
    nf, per = 12, 10
    ytop = fy - 0.005
    ymid = fy - VAL_H + 0.065
    depth = 0.065
    zf = fz + 0.028
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    cols = []
    for k in range(nf * per + 1):
        u = k / (nf * per)
        x = -AWN_X + 2 * AWN_X * u
        fr = (k % per) / per
        yb = ymid - depth * sin(pi * fr)
        cols.append((x, yb))
    for side, dz in ((0, th / 2), (1, -th / 2)):
        tv = [bm.verts.new((x, ytop, zf + dz)) for x, yb in cols]
        bv = [bm.verts.new((x, yb, zf + dz)) for x, yb in cols]
        for k in range(len(cols) - 1):
            vs = [bv[k], bv[k + 1], tv[k + 1], tv[k]]
            if side == 1:
                vs = vs[::-1]
            f = bm.faces.new(vs)
            for lp in f.loops:
                co = lp.vert.co
                lp[uvl].uv = ((co.x + AWN_X) / tile, (co.y - ytop) / tile)
        if side == 0:
            tv0, bv0 = tv, bv
        else:
            for k in range(len(cols) - 1):
                f = bm.faces.new([bv0[k], bv[k], bv[k + 1], bv0[k + 1]])
                for lp in f.loops:
                    lp[uvl].uv = ((lp.vert.co.x + AWN_X) / tile, -0.4)
    g.add(bm, 'Canvas', uv='src')
    # galon vert le long des festons (ruban de 1,6 cm, devant et derrière)
    for dz in (th / 2 + 0.0008, -th / 2 - 0.0008):
        bm = bmesh.new()
        a = [bm.verts.new((x, yb + 0.016, zf + dz)) for x, yb in cols]
        b = [bm.verts.new((x, yb - 0.001, zf + dz)) for x, yb in cols]
        for k in range(len(cols) - 1):
            vs = [b[k], b[k + 1], a[k + 1], a[k]]
            bm.faces.new(vs if dz > 0 else vs[::-1])
        g.add(bm, 'Paint', uvs=0.6)
    # barre de charge et embouts
    g.add(bx(-AWN_X - 0.015, AWN_X + 0.015, fy - 0.02, fy + 0.035, fz - 0.025, fz + 0.025, bev=0.008, seg=2),
          'Paint', uvs=0.6)
    for sx in (-1, 1):
        g.add(bx(sx * AWN_X - 0.012, sx * AWN_X + 0.012 + sx * 0.008, fy - 0.025, fy + 0.04, fz - 0.03, fz + 0.03,
                 bev=0.006), 'Iron', uvs=0.3)
    # bras articulés (épaule sur le support mural, coude, attache sous la barre)
    for sx in (-1, 1):
        x = sx * 1.60
        sh = Vector((x, Y_TRANS1 + 0.05, 0.175))
        en = Vector((x, fy - 0.02, fz - 0.03))
        el = sh.lerp(en, 0.5) + Vector((sx * -0.10, -0.035, 0.0))
        g.add(tube([sh, el], 0.011, 8), 'Iron', uvs=0.3)
        g.add(tube([el, en], 0.010, 8), 'Iron', uvs=0.3)
        g.add(xf(revolve([(0.0, -0.02), (0.02, -0.02), (0.022, 0.0), (0.02, 0.02), (0.0, 0.02)], 12), T(*el)),
              'Iron', uvs=0.3)
    return finish(g, 'Shop_Awning', pivot=HINGE, sharp=50)


def build_interior():
    """Boutique derrière la glace : parquet, murs enduits, mur du fond lumineux, étagères, céramiques."""
    g = Geo()
    x0, x1, z0, z1, yc = ROOM
    g.add(bx(x0, x1, Y_FOUND, FLOOR_Y, z0, z1 + 0.0), 'Parquet', uvs=3.4)
    g.add(bx(x0 - 0.02, x0 + 0.005, FLOOR_Y, yc, z0, z1), 'Plaster', uvs=1.0)
    g.add(bx(x1 - 0.005, x1 + 0.02, FLOOR_Y, yc, z0, z1), 'Plaster', uvs=1.0)
    g.add(bx(x0, x1, yc - 0.005, yc + 0.02, z0, z1), 'Plaster', uvs=1.0)
    # plinthe
    g.add(bx(x0 + 0.004, x1 - 0.004, FLOOR_Y, FLOOR_Y + 0.08, z0 + 0.004, z0 + 0.018, bev=0.003), 'Paint', uvs=0.6)
    # étagères de chêne sur le mur du fond (à gauche, vue par la porte ; à droite derrière la plante)
    for xa, xb in ((-1.90, -0.55), (1.30, 1.90)):
        for yy in (1.20, 1.62, 2.04):
            g.add(bx(xa, xb, yy, yy + 0.028, z0 + 0.005, z0 + 0.26, bev=0.004, seg=2), 'Oak', uvs=1.0)
    rng = random.Random(5)
    shapes = {
        'bottle': [(0.0, 0.0), (0.045, 0.0), (0.05, 0.01), (0.05, 0.14), (0.03, 0.19), (0.016, 0.21),
                   (0.018, 0.24), (0.0, 0.24)],
        'vase': [(0.0, 0.0), (0.04, 0.0), (0.065, 0.06), (0.07, 0.11), (0.05, 0.17), (0.045, 0.19),
                 (0.05, 0.2), (0.0, 0.2)],
        'bowl': [(0.0, 0.0), (0.04, 0.0), (0.08, 0.03), (0.095, 0.065), (0.09, 0.068), (0.075, 0.04),
                 (0.0, 0.03)],
        'cup': [(0.0, 0.0), (0.035, 0.0), (0.042, 0.08), (0.038, 0.082), (0.03, 0.01), (0.0, 0.01)],
    }
    cer = ['CerCream', 'CerSage', 'CerRust', 'CerInk']
    for xa, xb in ((-1.85, -0.60), (1.35, 1.85)):
        for yy in (1.228, 1.648, 2.068):
            x = xa + 0.06
            while x < xb - 0.08:
                kind = rng.choice(list(shapes))
                sc = rng.uniform(0.8, 1.15)
                g.add(xf(revolve([(r * sc, y * sc) for r, y in shapes[kind]], 16),
                         T(x + 0.05, yy, z0 + 0.13 + rng.uniform(-0.03, 0.03))), rng.choice(cer), uvs=0.3)
                x += rng.uniform(0.15, 0.24)
    # socle-présentoir (gauche de l'écran), livres, vase et branches sèches
    px, pz = -0.52, -0.18
    g.add(bx(px - 0.18, px + 0.18, FLOOR_Y, FLOOR_Y + 0.74, pz - 0.18, pz + 0.18, bev=0.008, seg=2), 'Plinth',
          uvs=1.0)
    ytop = FLOOR_Y + 0.74
    for k, (m, th, rot) in enumerate((('BookC', 0.032, 4), ('BookB', 0.026, -7), ('BookA', 0.03, 10))):
        bm = bx(-0.12, 0.12, 0.0, th, -0.085, 0.085, bev=0.004, seg=1)
        g.add(xf(bm, T(px + 0.02, ytop, pz) @ R('Y', rot)), m, uvs=0.3)
        ytop += th
    vase = revolve([(0.0, 0.0), (0.035, 0.0), (0.055, 0.05), (0.06, 0.11), (0.04, 0.2), (0.028, 0.24),
                    (0.034, 0.26), (0.03, 0.262), (0.024, 0.245), (0.0, 0.245)], 20)
    g.add(xf(vase, T(px + 0.05, ytop, pz + 0.01)), 'CerCream', uvs=0.3)
    rng2 = random.Random(11)
    for k in range(5):
        a = rng2.uniform(-0.6, 0.6)
        base = Vector((px + 0.05, ytop + 0.22, pz + 0.01))
        pts = [base, base + Vector((sin(a) * 0.08, 0.20, cos(a) * 0.03)),
               base + Vector((sin(a) * 0.20, 0.42 + rng2.uniform(-0.05, 0.08), cos(a) * 0.06))]
        g.add(tube(catmull(pts, 4), lambda t: 0.004 * (1 - 0.7 * t), 5), 'Twig', uvs=0.3)
    return finish(g, 'Shop_Interior', sharp=40)


def build_wash():
    g = Geo()
    x0, x1, z0, z1, yc = ROOM
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ((x0, FLOOR_Y, z0 + 0.002), (x1, FLOOR_Y, z0 + 0.002), (x1, yc, z0 + 0.002),
                                    (x0, yc, z0 + 0.002))]
    bm.faces.new(vs)
    g.add(bm, 'Wash', uv=lambda co, n, m: ((co.x - x0) / (x1 - x0), (co.y - FLOOR_Y) / (yc - FLOOR_Y)))
    return finish(g, 'Shop_Interior_Wash', wn=False)


def build_pendants():
    out = []
    x0, x1, z0, z1, yc = ROOM
    for k, x in enumerate((0.05, 1.05)):
        g = Geo()
        gy = 2.62
        g.add(revolve([(0.0, -0.085), (0.04, -0.077), (0.07, -0.05), (0.085, 0.0), (0.07, 0.05), (0.04, 0.077),
                       (0.02, 0.083), (0.02, 0.095), (0.0, 0.095)], 16), 'GlobeGlow', uvs=0.3,
              M=T(x, gy, -0.85))
        g.add(tube([(x, gy + 0.09, -0.85), (x, yc, -0.85)], 0.004, 6), 'Iron', uvs=0.3)
        g.add(bx(x - 0.04, x + 0.04, yc - 0.015, yc, -0.89, -0.81, bev=0.004), 'Iron', uvs=0.3)
        out.append(finish(g, f'Shop_Lamp_Pendant_{k}', wn=False))
    return out


def build_display():
    """Écran 16:10 sur pied (cadre, dos, colonne, platine). Shop_Screen : plan seul, UV 0→1 sur l'image."""
    g = Geo()
    cx, cy, cz = SCR_C
    w, h = SCR_W / 2, SCR_H / 2
    bz = 0.018
    g.add(bx(cx - w - bz, cx + w + bz, cy - h - bz, cy + h + bz, cz - 0.035, cz - 0.004, bev=0.006, seg=2), 'Bezel',
          uvs=1.0)
    g.add(bx(cx - w - bz + 0.003, cx + w + bz - 0.003, cy - h - bz + 0.003, cy + h + bz - 0.003, cz - 0.004,
             cz + 0.002, bev=0.003, seg=1), 'Bezel', uvs=1.0)
    g.add(bx(cx - 0.03, cx + 0.03, FLOOR_Y + 0.01, cy - 0.10, cz - 0.07, cz - 0.03, bev=0.008, seg=2), 'Iron',
          uvs=1.0)
    g.add(bx(cx - 0.20, cx + 0.20, FLOOR_Y, FLOOR_Y + 0.014, cz - 0.22, cz + 0.08, bev=0.006, seg=2), 'Iron',
          uvs=1.0)
    g.add(bx(cx - 0.12, cx + 0.12, cy - 0.16, cy + 0.10, cz - 0.05, cz - 0.034, bev=0.004), 'Iron', uvs=1.0)
    disp = finish(g, 'Shop_Display', sharp=35)
    s = Geo()
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ((cx - w, cy - h, cz + 0.0025), (cx + w, cy - h, cz + 0.0025),
                                    (cx + w, cy + h, cz + 0.0025), (cx - w, cy + h, cz + 0.0025))]
    bm.faces.new(vs)
    s.add(bm, 'Screen', uv=lambda co, n, m: ((co.x - (cx - w)) / (2 * w), (co.y - (cy - h)) / (2 * h)))
    scr = finish(s, 'Shop_Screen', pivot=(cx, cy, cz + 0.0025), wn=False)
    return disp, scr


def leaf_bm(length, width, fold=0.25, curl=0.12):
    """Feuille de ficus lyrata (violon) : 7 × 3 sommets, nervure pliée, bout recourbé ; axe +y, face +z."""
    bm = bmesh.new()
    rows = []
    for i in range(8):
        t = i / 7
        wdt = width * (0.18 + 0.82 * sin(pi * min(1.0, t * 1.05)) ** 0.7) * (1 - 0.18 * sin(pi * t * 1.6) ** 2)
        if i == 7:
            wdt = 0.0
        y = length * t
        z = -curl * length * t * t
        rows.append([bm.verts.new((s * wdt / 2, y, z - abs(s) * fold * wdt / 2)) for s in (-1, 0, 1)])
    for A, B in zip(rows, rows[1:]):
        for k in range(2):
            vs = [A[k], A[k + 1], B[k + 1], B[k]]
            uniq = []
            for v in vs:
                if v not in uniq:
                    uniq.append(v)
            if len(uniq) >= 3:
                bm.faces.new(uniq)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    return bm


def build_plant():
    g = Geo()
    px, pz = 1.58, -0.30
    pot = revolve([(0.0, 0.0), (0.13, 0.0), (0.145, 0.015), (0.17, 0.30), (0.182, 0.31), (0.182, 0.345),
                   (0.165, 0.35), (0.158, 0.32), (0.0, 0.32)], 24)
    g.add(xf(pot, T(px, FLOOR_Y, pz)), 'Terracotta', uvs=0.5)
    g.add(xf(revolve([(0.0, 0.0), (0.158, 0.0), (0.158, 0.012), (0.0, 0.016)], 20), T(px, FLOOR_Y + 0.30, pz)),
          'Soil', uvs=0.5)
    rng = random.Random(3)
    stems = []
    for k, (dx, dz, top) in enumerate(((0.0, 0.0, 1.95), (0.06, -0.04, 1.55), (-0.05, 0.05, 1.30))):
        base = Vector((px + dx, FLOOR_Y + 0.30, pz + dz))
        pts = [base, base + Vector((0.02, 0.4, 0.0)), base + Vector((-0.03 + dx, top * 0.6, 0.02)),
               base + Vector((0.02 + dx * 1.5, top - FLOOR_Y - 0.3 + 0.0, -0.01))]
        path = catmull(pts, 5)
        stems.append(path)
        g.add(tube(path, lambda t: 0.018 * (1 - 0.6 * t), 6), 'Bark', uvs=0.3)
    for path in stems:
        n = len(path)
        start = int(n * 0.45)
        for i in range(start, n, 2):
            p = path[i]
            yaw = rng.uniform(0, 360)
            if 30 < (yaw % 360) < 150:     # pas de feuille devant l'écran
                yaw += 180
            pitch = rng.uniform(-25, 35) + 25 * (i - start) / max(1, n - start)
            ln = rng.uniform(0.22, 0.32)
            wd = ln * rng.uniform(0.62, 0.75)
            M = T(*p) @ R('Y', yaw) @ R('X', -(90 - pitch)) @ R('Y', rng.uniform(-20, 20))
            g.add(xf(leaf_bm(ln, wd, curl=rng.uniform(0.05, 0.2)), M), 'Leaf', uvs=0.3)
    return finish(g, 'Shop_Plant', sharp=60, wn=False)


# =============================================================================== scène
def build_all():
    global COLL, ROOT_EMPTY
    clean_scene()
    COLL = new_coll('Vitrine')
    build_materials()
    ROOT_EMPTY = bpy.data.objects.new('Shop_Root', None)
    COLL.objects.link(ROOT_EMPTY)
    EXPORT.append(ROOT_EMPTY)
    build_ground()
    build_stone()
    build_woodwork()
    build_sign()
    build_glass()
    build_awning()
    build_lamps()
    build_interior()
    build_wash()
    build_pendants()
    build_display()
    build_plant()
    bpy.context.view_layer.update()
    tris = report([o for o in EXPORT if o.type == 'MESH'])
    lo, hi = bbox_yup([o for o in EXPORT if o.type == 'MESH'])
    print('BBOX', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))
    return tris


def poster_lights(coll, interior=1.0):
    """Éclairage du poster (non exporté) : clé froide en haut à gauche, contre-jour, douche chaude sur
    l'enseigne, appoint chaud dans la boutique."""
    s = SC

    def P(x, y, z):
        return ((x - CX) * s, y * s, (z - CZ) * s)
    area_light('Key', coll, P(-5.5, 7.5, 7.5), P(0.0, 1.8, 0.5), 420, '#e9eeff', size=2.6 * s)
    area_light('Rim', coll, P(5.5, 6.0, -5.0), P(0.0, 2.0, 0.0), 260, '#c9d6ff', size=2.0 * s)
    area_light('Fill', coll, P(4.0, 1.5, 7.0), P(0.0, 1.2, 0.5), 60, '#ffe2c4', size=3.0 * s)
    for sx in (-1, 1):
        area_light(f'SignWash{sx}', coll, P(sx * 1.25, LAMP_Y - 0.05, 0.70), P(sx * 0.9, Y_SIGN0 + 0.15, 0.17),
                   5.0, '#ffc98a', size=0.12 * s, spread=70)
    area_light('ShopFill', coll, P(0.3, 2.95, -0.55), P(0.3, 0.4, -0.55), 26 * interior, '#ffc98f', size=3.0 * s,
               size_y=0.9 * s)


def render_shots(out, samples, res, shots):
    sc = setup_cycles(samples=samples, res=res, transparent=True)
    for name, cam in shots:
        sc.camera = cam
        render_png(os.path.join(out, f'{name}.png'))


def main():
    if ARGS.get('check'):
        return check_glb(ARGS['check'])
    ensure_textures()
    build_all()
    os.makedirs(BLEND_DIR, exist_ok=True)
    kb = export_glb([o for o in EXPORT], GLB)
    print(f'GLB {kb:.0f} Ko')
    meshes = [o for o in EXPORT if o.type == 'MESH']
    lights = new_coll('PosterRig')
    world_hdri(ph_hdri('modern_evening_street', '1k'), strength=0.55, rot_deg=110)
    poster_lights(lights)
    lo, hi = bbox_yup(meshes)
    cat = shadow_catcher(lights, y=lo[1])
    cam = viewer_camera(lights, meshes, yaw=float(ARGS.get('yaw', -0.35)), size=float(ARGS.get('size', 3.0)))
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    if ARGS.get('preview'):
        out = ARGS['preview']
        shots = [('poster', cam)]
        c = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2
        shots.append(('front', camera(lights, (c[0], c[1] + 0.1, c[2] + 6.5), c, lens=50, name='Front')))
        shots.append(('window', camera(lights, (0.9, 0.95, 2.4), (0.25, 0.75, -0.2), lens=50, name='Win')))
        shots.append(('high', camera(lights, (-3.2, 3.2, 3.6), (0.0, 0.8, 0.0), lens=50, name='High')))
        render_shots(out, int(ARGS.get('samples', 64)), int(ARGS.get('res', 700)), shots)
        bpy.context.scene.camera = cam
    if ARGS.get('poster'):
        sc = setup_cycles(samples=int(ARGS.get('samples', 384)), res=1200, transparent=True)
        sc.camera = cam
        png = os.path.join(GEN, 'poster.png')
        render_png(png)
        png_to_webp(png, POSTER, max_kb=120)


def check_glb(out):
    """Réimport du GLB seul : HDRI studio, aucune lampe, mêmes cadrages."""
    clean_scene()
    bpy.ops.import_scene.gltf(filepath=GLB)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    coll = new_coll('Check')
    world_hdri(ph_hdri(ARGS.get('hdri', 'studio_small_09'), '1k'), strength=float(ARGS.get('strength', 1.0)),
               rot_deg=float(ARGS.get('rot', 0.0)))
    lo, hi = bbox_yup(meshes)
    shadow_catcher(coll, y=lo[1])
    cam = viewer_camera(coll, meshes, yaw=float(ARGS.get('yaw', -0.35)), size=float(ARGS.get('size', 3.0)))
    eng = ARGS.get('engine', 'cycles')
    if eng == 'eevee':
        sc = bpy.context.scene
        for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
            try:
                sc.render.engine = e
                break
            except TypeError:
                continue
        sc.render.resolution_x = sc.render.resolution_y = int(ARGS.get('res', 700))
        sc.render.film_transparent = True
        sc.camera = cam
        render_png(os.path.join(out, 'check_eevee.png'))
    else:
        render_shots(out, int(ARGS.get('samples', 64)), int(ARGS.get('res', 700)), [('check', cam)])


main()
