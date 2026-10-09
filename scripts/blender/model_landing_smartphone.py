# Smartphone en vue éclatée de la page d'atterrissage /application-mobile-sur-mesure/ (agent B4, 2026-10-09).
# Un smartphone réaliste sans marque (cadre en aluminium brossé à chanfreins polis, verre avant à bord
# arrondi, écran bord à bord avec îlot caméra, dos en verre dépoli, bloc photo à trois objectifs) et
# l'interface d'une app fictive de réservation d'un salon de coiffure de quartier, éclatée en quatre
# calques qui flottent devant l'écran (fond, contenu, navigation, éléments flottants).
#
# Deux modes :
#   python scripts/blender/model_landing_smartphone.py
#       -> dessine les écrans d'interface (Pillow + numpy, polices OFL du projet) dans
#          public/textures/landing/smartphone/ : screen.webp (app assemblée + îlot), layer0..3.webp (RVBA),
#          brushed.webp (rugosité du métal brossé, canal G ; R = B = 255 pour que metallic = 1 en glTF).
#   "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_landing_smartphone.py --
#          [--poster] [--preview <dossier>] [--glbcheck <dossier>] [--samples N] [--res N]
#       -> modélise tout en bmesh depuis une scène vide, sauvegarde blender/landing_smartphone.blend,
#          exporte public/models/landing/smartphone.glb (Draco, WebP intégrés), et au besoin le poster
#          Cycles (public/posters/landing/smartphone.webp), un aperçu, et un rendu du GLB réimporté
#          sous HDRI seul (sans aucune lampe) pour vérifier qu'il tient dans R3F.
#
# Repère (monde Y-up, celui du site) : téléphone centré à l'origine, debout, écran vers +Z.
#   hauteur 2.0, largeur BODY_W, épaisseur 0.104 (+ bloc photo au dos jusqu'à z = -0.078).
#   App_Screen : plan à z = Z_SCREEN, W_S × H_S, UV 0..1 sur l'image (u à droite, v en haut, convention
#   Blender ; dans le glTF v est inversé, donc une texture de remplacement three.js prend flipY = false).
#   App_Layer0..3 : mêmes dimensions que l'écran, origine au centre, normale +Z, à
#   z = Z_SCREEN + LAYER_GAP * (i + 1). Facteur d'éclatement f côté code : z_i = Z_SCREEN + f * GAP * (i + 1)
#   (f = 0 : calques posés sur l'écran ; f = 1 : état exporté).
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from landing_common import *  # noqa: E402,F401,F403

NAME = 'smartphone'
TEX_DIR = os.path.join(TEXTURES, NAME)
GLB = os.path.join(MODELS, NAME + '.glb')
POSTER = os.path.join(POSTERS, NAME + '.webp')
BLEND = os.path.join(BLEND_DIR, 'landing_' + NAME + '.blend')
FONTS = os.path.join(ROOT, 'public', 'fonts')

# =============================================================================== cotes (monde Y-up)
IMG_W, IMG_H = 1024, 2160          # images d'écran et de calques
PT_W = 390.0                       # maquette en points (largeur iPhone), hauteur PT_H
PT_H = PT_W * IMG_H / IMG_W        # 822.66
W_S = 0.92                         # écran
H_S = W_S * IMG_H / IMG_W          # 1.9406
BODY_H = 2.0
BEZEL = (BODY_H - H_S) / 2         # 0.0297 (bordure noire autour de l'écran)
BODY_W = W_S + 2 * BEZEL           # 0.9794
SQ_N = 4.0                         # exposant des coins en super-ellipse (courbure continue)
E_BODY = 0.27                      # étendue du coin du boîtier
E_SCREEN = E_BODY - BEZEL          # coin de l'écran, concentrique
Z_FRONT = 0.052                    # dessus du verre avant
Z_SCREEN = Z_FRONT + 0.0006        # écran posé sur le verre (reflets continus)
Z_BACK = -0.052                    # dos (verre dépoli)
LAYER_GAP = 0.20                   # écart entre calques (et entre l'écran et le calque 0)
LAYER_T = 0.006                    # épaisseur des plaques
UPT = W_S / PT_W                   # unités par point
# photo d'en-tête : HDRI Poly Haven (CC0), (u, v) du centre de la vue dans l'équirectangulaire, fov horiz.
HERO_SRC = ('colorful_studio', (0.64, 0.56, 74.0))
HERO_GAIN = 0.55


def pt_to_xy(x_pt, y_pt):
    """Point de la maquette (pt, origine en haut à gauche) -> (x, y) sur l'écran (unités, centre)."""
    return (x_pt / PT_W - 0.5) * W_S, (0.5 - y_pt / PT_H) * H_S


def squircle_corner(e, n, k):
    """Quart de super-ellipse |x|^n + |y|^n = e^n, de (e, 0) à (0, e), k + 1 points à pas d'arc égal."""
    m = 2000
    dense = []
    for i in range(m + 1):
        t = (math.pi / 2) * i / m
        c, s = math.cos(t), math.sin(t)
        dense.append((e * c ** (2 / n), e * s ** (2 / n)))
    acc = [0.0]
    for i in range(1, len(dense)):
        acc.append(acc[-1] + math.dist(dense[i], dense[i - 1]))
    out, j = [], 0
    for q in range(k + 1):
        target = acc[-1] * q / k
        while j < m - 1 and acc[j + 1] < target:
            j += 1
        f = 0.0 if acc[j + 1] == acc[j] else (target - acc[j]) / (acc[j + 1] - acc[j])
        f = max(0.0, min(1.0, f))
        out.append((dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f,
                    dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f))
    return out


def squircle(w, h, e, n=SQ_N, k=24, breaks=()):
    """Contour fermé (sens trigo, départ au milieu du bord droit) d'un rectangle aux coins en
    super-ellipse. `breaks` : abscisses curvilignes relatives (0..1) où insérer des points exacts
    (coupures d'antenne). Retourne [(x, y, s)] avec s l'abscisse curviligne."""
    q = squircle_corner(e, n, k)
    cx, cy = w / 2 - e, h / 2 - e
    pts = []
    # coin haut droit, haut gauche, bas gauche, bas droit (chaque quart tourné de 90°)
    for sx, sy, rev in ((1, 1, False), (-1, 1, True), (-1, -1, False), (1, -1, True)):
        arc = q if not rev else [(b, a) for a, b in q]
        arc = [(cx * sx + a * sx, cy * sy + b * sy) for a, b in arc]
        pts.extend(arc)
    # ordre trigo : le premier quart va de (w/2, cy) à (cx, h/2) ; vérifier et dédoublonner
    clean = []
    for p in pts:
        if not clean or math.dist(p, clean[-1]) > 1e-7:
            clean.append(p)
    if math.dist(clean[0], clean[-1]) < 1e-7:
        clean.pop()
    # rotation pour démarrer au milieu du bord droit (x = w/2, y = 0)
    start = (w / 2, 0.0)
    poly = [start] + [p for p in clean]
    # abscisse curviligne
    acc = [0.0]
    for i in range(1, len(poly)):
        acc.append(acc[-1] + math.dist(poly[i], poly[i - 1]))
    total = acc[-1] + math.dist(poly[-1], poly[0])
    out = [(p[0], p[1], a) for p, a in zip(poly, acc)]
    # coupures exactes sur les segments droits
    for b in sorted(breaks):
        sb = b * total
        for i in range(len(out)):
            a0 = out[i][2]
            a1 = out[i + 1][2] if i + 1 < len(out) else total
            if a0 < sb < a1:
                p0 = out[i]
                p1 = out[(i + 1) % len(out)]
                f = (sb - a0) / (a1 - a0)
                out.insert(i + 1, (p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, sb))
                break
    return out, total


def outline_normals(poly):
    """Normales sortantes (contour trigo) moyennées aux sommets."""
    n = len(poly)
    out = []
    for i in range(n):
        a, b, c = poly[i - 1], poly[i], poly[(i + 1) % n]
        t1 = (b[0] - a[0], b[1] - a[1])
        t2 = (c[0] - b[0], c[1] - b[1])
        l1, l2 = math.hypot(*t1) or 1, math.hypot(*t2) or 1
        tx, ty = t1[0] / l1 + t2[0] / l2, t1[1] / l1 + t2[1] / l2
        lt = math.hypot(tx, ty) or 1
        out.append((ty / lt, -tx / lt))
    return out


# ############################################################################### interface (Pillow)
def ui_main():
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    SS = 2                              # suréchantillonnage
    K = SS * IMG_W / PT_W               # px par point
    CW, CH = IMG_W * SS, IMG_H * SS

    BG = (13, 13, 16)
    FG = (237, 237, 240)
    FG2 = (160, 160, 168)
    FG3 = (101, 101, 110)
    LINE = (237, 237, 240, 30)
    ACC = (18, 181, 189)
    ACC_INK = (3, 24, 26)
    ACC_DARK = (8, 118, 124)
    INK = (18, 18, 22)

    def font(name, size, wght=None):
        f = ImageFont.truetype(os.path.join(FONTS, name), max(1, round(size * K)))
        if wght is not None:
            f.set_variation_by_axes([wght])
        return f

    INTER = 'inter-latin-wght-normal.woff2'
    SERIF = 'instrument-serif-latin-400-normal.woff2'
    MONO = 'jetbrains-mono-latin-400-normal.woff2'

    def P(v):
        return v * K

    class Canvas:
        def __init__(self, fill=None):
            self.im = Image.new('RGBA', (CW, CH), fill if fill else (0, 0, 0, 0))

        def paint(self, color, draw_fn):
            """Dessine une forme dans un masque L puis compose la couleur (pas de liseré sombre)."""
            m = Image.new('L', (CW, CH), 0)
            draw_fn(ImageDraw.Draw(m))
            box = m.getbbox()
            if not box:
                return
            a = color[3] if len(color) == 4 else 255
            sub = m.crop(box)
            if a < 255:
                sub = sub.point(lambda v: v * a // 255)
            layer = Image.new('RGBA', sub.size, tuple(color[:3]) + (0,))
            layer.putalpha(sub)
            self.im.alpha_composite(layer, dest=box[:2])

        def rect(self, x0, y0, x1, y1, color, r=0.0):
            box = [P(x0), P(y0), P(x1) - 1, P(y1) - 1]
            if r > 0:
                self.paint(color, lambda d: d.rounded_rectangle(box, radius=P(r), fill=255))
            else:
                self.paint(color, lambda d: d.rectangle(box, fill=255))

        def hline(self, x0, x1, y, color=LINE, w=0.6):
            self.rect(x0, y - w / 2, x1, y + w / 2, color)

        def vline(self, x, y0, y1, color=LINE, w=0.6):
            self.rect(x - w / 2, y0, x + w / 2, y1, color)

        def text(self, x, y, s, f, color, anchor='ls', track=0.0):
            """Texte ; `track` : interlettrage en points (dessin lettre à lettre)."""
            if not track:
                self.paint(color, lambda d: d.text((P(x), P(y)), s, font=f, fill=255, anchor=anchor))
                return
            width = sum(f.getlength(ch) for ch in s) + P(track) * (len(s) - 1)
            x0 = P(x)
            if anchor[0] == 'r':
                x0 -= width
            elif anchor[0] == 'm':
                x0 -= width / 2

            def fn(d):
                cx = x0
                for ch in s:
                    d.text((cx, P(y)), ch, font=f, fill=255, anchor='l' + anchor[1])
                    cx += f.getlength(ch) + P(track)
            self.paint(color, fn)

        def poly(self, pts, color, width=None, closed=True):
            pp = [(P(x), P(y)) for x, y in pts]
            if width is None:
                self.paint(color, lambda d: d.polygon(pp, fill=255))
            else:
                def fn(d):
                    d.line(pp + ([pp[0]] if closed else []), fill=255, width=max(1, round(P(width))),
                           joint='curve')
                    r = P(width) / 2
                    for x, y in pp:   # bouts ronds
                        d.ellipse([x - r, y - r, x + r, y + r], fill=255)
                self.paint(color, fn)

        def ellipse(self, cx, cy, rx, ry, color, width=None):
            box = [P(cx - rx), P(cy - ry), P(cx + rx), P(cy + ry)]
            if width is None:
                self.paint(color, lambda d: d.ellipse(box, fill=255))
            else:
                self.paint(color, lambda d: d.ellipse(box, outline=255, width=max(1, round(P(width)))))

        def arc(self, cx, cy, r, a0, a1, color, width):
            box = [P(cx - r), P(cy - r), P(cx + r), P(cy + r)]
            self.paint(color, lambda d: d.arc(box, a0, a1, fill=255, width=max(1, round(P(width)))))

        def out(self):
            return self.im.resize((IMG_W, IMG_H), Image.LANCZOS)

    # ------------------------------------------------------------------ contour de l'écran (pt)
    e_pt = E_SCREEN / UPT
    sq, _ = squircle(PT_W, PT_H, e_pt, k=48)
    screen_poly = [(x + PT_W / 2, PT_H / 2 - y) for x, y, _ in sq]

    def screen_mask(inset=0.0):
        m = Image.new('L', (CW, CH), 0)
        if inset:
            nrm = outline_normals([(x, -y) for x, y in screen_poly])
            pts = [(P(x - inset * nx), P(y + inset * ny)) for (x, y), (nx, ny) in zip(screen_poly, nrm)]
        else:
            pts = [(P(x), P(y)) for x, y in screen_poly]
        ImageDraw.Draw(m).polygon(pts, fill=255)
        return m

    # ------------------------------------------------------------------ photo d'en-tête
    def hero_photo(w_pt, h_pt):
        """Vraie photo d'intérieur CC0 : vue rectiligne reprojetée depuis l'aperçu tonemappé (JPG
        équirectangulaire) d'un HDRI Poly Haven, assombrie, légèrement adoucie, fondue vers le fond."""
        asset, (u0, v0, hfov) = HERO_SRC
        url = ph_info(asset)['tonemapped']['url']
        src = np.asarray(Image.open(ph_fetch(url, os.path.join(CACHE, asset, os.path.basename(url))))
                         .convert('RGB'), np.float32) / 255
        sh, sw = src.shape[:2]
        w, h = int(P(w_pt)), int(P(h_pt))
        lon0, lat0 = (u0 - 0.5) * 2 * math.pi, (0.5 - v0) * math.pi
        f = np.array([math.cos(lat0) * math.sin(lon0), math.sin(lat0), math.cos(lat0) * math.cos(lon0)])
        r = np.array([math.cos(lon0), 0.0, -math.sin(lon0)])
        up = np.cross(f, r)
        t = math.tan(math.radians(hfov) / 2)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        nx = (2 * (xx + 0.5) / w - 1) * t
        ny = (1 - 2 * (yy + 0.5) / h) * t * h / w
        d = f[None, None, :] + nx[..., None] * r[None, None, :] + ny[..., None] * up[None, None, :]
        d /= np.linalg.norm(d, axis=-1, keepdims=True)
        lon = np.arctan2(d[..., 0], d[..., 2])
        lat = np.arcsin(np.clip(d[..., 1], -1, 1))
        su = ((0.5 + lon / (2 * math.pi)) % 1.0) * sw - 0.5
        sv = (0.5 - lat / math.pi) * sh - 0.5
        x0, y0 = np.floor(su).astype(int), np.floor(sv).astype(int)
        fx, fy = (su - x0)[..., None], (sv - y0)[..., None]
        x1, y1 = (x0 + 1) % sw, np.clip(y0 + 1, 0, sh - 1)
        x0, y0 = x0 % sw, np.clip(y0, 0, sh - 1)
        img = (src[y0, x0] * (1 - fx) * (1 - fy) + src[y0, x1] * fx * (1 - fy) + src[y1, x0] * (1 - fx) * fy
               + src[y1, x1] * fx * fy)
        # étalonnage : plus sombre et plus dense (soir, éclairage du salon), vignette, fondu vers le fond
        lin_img = img ** 2.2 * HERO_GAIN
        v = yy / h
        u = xx / w
        vig = 1 - 0.35 * (((u - 0.5) / 0.75) ** 2 + ((v - 0.45) / 0.9) ** 2)
        lin_img *= np.clip(vig, 0, 1)[..., None]
        fade = np.clip((v - 0.38) / 0.58, 0, 1) ** 1.15
        bg_lin = (np.array(BG, np.float32) / 255) ** 2.2
        lin_img = lin_img * (1 - fade[..., None]) + bg_lin * fade[..., None]
        out = np.clip(lin_img, 0, 1) ** (1 / 2.2)
        im = Image.fromarray((out * 255).astype(np.uint8), 'RGB')
        return im.filter(ImageFilter.GaussianBlur(2.2))        # faible profondeur de champ

    # ================================================================== calque 0 : fond
    L0 = Canvas(BG + (255,))
    hero_h = 340
    L0.im.paste(hero_photo(PT_W, hero_h), (0, 0))
    # fond sous la photo : très léger dégradé vertical
    grad = Image.linear_gradient('L').resize((CW, CH - int(P(hero_h))))
    tint = Image.new('RGBA', grad.size, (20, 20, 24, 0))
    tint.putalpha(grad.point(lambda v: int(v * 0.5)))
    L0.im.alpha_composite(tint, dest=(0, int(P(hero_h))))

    # ================================================================== calque 1 : contenu
    L1 = Canvas()
    MX = 22                             # marge
    f_label = font(MONO, 10.5)
    f_title = font(SERIF, 52)
    f_body = font(INTER, 14, 420)
    f_day = font(SERIF, 36)
    f_time = font(INTER, 18, 480)
    f_time_b = font(INTER, 18, 620)
    f_row = font(INTER, 17, 520)
    f_sub = font(INTER, 13, 420)
    f_price = font(SERIF, 27)

    # interface en français (2026-10-10) : espace insécable NB avant « h », « min » et « € » (les polices
    # du projet n'ont pas l'espace fine insécable U+202F), heures au format 24 h, abréviations « mar. », « oct. »
    NB = '\u00a0'
    L1.text(MX, 214, 'SALON DE COIFFURE  /  PARIS 11', f_label, FG2, track=1.4)
    L1.text(MX - 1.5, 264, 'Atelier Lune', f_title, FG)
    hours = 'Ouvert jusqu\u2019\u00e0 19' + NB + 'h'
    L1.text(MX, 289, hours, f_body, FG2)
    sep = MX + f_body.getlength(hours) / K + 9
    L1.vline(sep, 278, 292, (101, 101, 110, 160), 0.8)
    L1.text(sep + 9, 289, '4,9 / 5 \u00b7 212 avis', f_body, FG3)

    def section(y, num, label, right):
        L1.hline(MX, PT_W - MX, y)
        L1.text(MX, y + 22, num, f_label, ACC, track=1.2)
        L1.text(MX + 26, y + 22, label, f_label, FG2, track=1.4)
        L1.text(PT_W - MX, y + 22, right, f_label, FG3, anchor='rs', track=1.4)

    section(306, '01', 'JOUR', 'OCTOBRE')
    days = [('LUN', '12', 'closed'), ('MAR', '13', 'sel'), ('MER', '14', ''), ('JEU', '15', ''),
            ('VEN', '16', '')]
    cw = (PT_W - 2 * MX) / 5
    for i, (wd, num, st) in enumerate(days):
        x = MX + cw * i
        col_n = FG if st == 'sel' else (FG3 if st == 'closed' else FG2)
        col_w = FG2 if st == 'sel' else FG3
        L1.text(x, 350, wd, f_label, col_w, track=1.2)
        L1.text(x - 1, 391, num, f_day, col_n)
        if st == 'sel':
            L1.rect(x, 400, x + cw - 14, 402.5, ACC)
        if st == 'closed':
            L1.hline(x - 3, x + f_day.getlength(num) / K + 1, 380, (101, 101, 110, 255), 1.0)

    section(414, '02', 'HEURE', 'MARDI 13')
    times = ['09:30', '10:00', '10:30', '11:15', '14:00', '15:45']
    gw = (PT_W - 2 * MX) / 3
    gy0, gh = 436, 46
    for i, t in enumerate(times):
        c, r = i % 3, i // 3
        x, y = MX + gw * c, gy0 + gh * r
        if t == '10:30':
            L1.rect(x + 5, y + 5, x + gw - 5, y + gh - 5, ACC, r=3)
            L1.text(x + 17, y + gh / 2 + 6.5, t, f_time_b, ACC_INK)
        elif t == '11:15':
            L1.text(x + 17, y + gh / 2 + 6.5, t, f_time, FG3)
            L1.hline(x + 15, x + 19 + f_time.getlength(t) / K, y + gh / 2, (101, 101, 110, 255), 1.0)
        else:
            L1.text(x + 17, y + gh / 2 + 6.5, t, f_time, FG)
    L1.hline(MX, PT_W - MX, gy0 + gh)
    L1.vline(MX + gw, gy0 + 6, gy0 + 2 * gh - 6)
    L1.vline(MX + 2 * gw, gy0 + 6, gy0 + 2 * gh - 6)

    section(538, '03', 'PRESTATION', '4 CHOIX')
    rows = [('Coupe et coiffage', '45' + NB + 'min \u00b7 avec In\u00e8s', '38', True),
            ('Taille de barbe', '20' + NB + 'min', '18', False),
            ('Couleur et gloss', '1' + NB + 'h' + NB + '30', '74', False),
            ('Coupe enfant', '30' + NB + 'min', '22', False)]
    for i, (name, sub, price, sel) in enumerate(rows):
        y = 566 + 58 * i
        if sel:
            L1.rect(MX, y + 4, MX + 2.5, y + 44, ACC)
        x = MX + (14 if sel else 0)
        L1.text(x, y + 22, name, f_row, FG if sel or i < 2 else FG2)
        L1.text(x, y + 41, sub, f_sub, FG3)
        L1.text(PT_W - MX, y + 36, price + NB + '\u20ac', f_price, ACC if sel else FG2, anchor='rs')
        L1.hline(MX, PT_W - MX, y + 56)

    # ================================================================== calque 2 : navigation
    L2 = Canvas()
    f_clock = font(INTER, 16.5, 600)
    L2.text(66, 35, '09:41', f_clock, FG, anchor='ms')
    # réseau, wifi, batterie (oreille droite, centrée vers x = 322)
    bx = 293
    for i in range(4):
        hb = 4.2 + 2.4 * i
        L2.rect(bx + i * 4.6, 33 - hb, bx + i * 4.6 + 3.1, 33, FG, r=0.8)
    wx, wy = 322, 33.5
    for r_ in (11.5, 7.6):
        L2.arc(wx, wy, r_, 225, 315, FG, 2.2)
    L2.poly([(wx - 2.6, wy - 2.6), (wx, wy), (wx + 2.6, wy - 2.6), (wx, wy - 5.2)], FG)
    L2.rect(339, 23.5, 362.5, 34.5, (237, 237, 240, 110), r=3.4)
    L2.rect(340.6, 25.1, 360.9, 32.9, BG + (255,), r=2.4)
    L2.rect(341.8, 26.3, 356.5, 31.7, FG, r=1.6)
    L2.rect(363.3, 27.3, 364.8, 30.7, (237, 237, 240, 110), r=0.7)
    # boutons de navigation (aplats sombres, pas de flou)
    for cx in (40, PT_W - 40):
        L2.ellipse(cx, 80, 19, 19, (13, 13, 16, 200))
    L2.poly([(43.5, 72.5), (35.5, 80), (43.5, 87.5)], FG, width=2.1, closed=False)
    bm_x = PT_W - 40
    L2.poly([(bm_x - 6, 71.5), (bm_x + 6, 71.5), (bm_x + 6, 89), (bm_x, 84), (bm_x - 6, 89)], FG,
            width=1.8)
    # barre d'onglets : aplat, filet, onglets typographiques
    tab_y = 752
    L2.rect(0, tab_y, PT_W, PT_H, BG + (255,))
    L2.hline(0, PT_W, tab_y, (237, 237, 240, 34), 0.7)
    tabs = ['R\u00c9SERVER', 'RENDEZ-VOUS', 'BOUTIQUE', 'COMPTE']
    tw = PT_W / 4
    f_tab = font(MONO, 10.5)
    for i, t in enumerate(tabs):
        cx = tw * (i + 0.5)
        L2.text(cx, tab_y + 30, t, f_tab, FG if i == 0 else FG3, anchor='ms', track=1.3)
        if i == 0:
            L2.rect(cx - 20, tab_y, cx + 20, tab_y + 2.2, ACC)
    L2.rect(PT_W / 2 - 67, PT_H - 13, PT_W / 2 + 67, PT_H - 8, FG, r=2.5)

    # ================================================================== calque 3 : éléments flottants
    L3 = Canvas()
    # notification : créneau retenu
    ty0, ty1 = 110, 168
    L3.rect(16, ty0, PT_W - 16, ty1, (236, 236, 239, 255), r=4)
    L3.rect(16, ty0, 19, ty1, ACC, r=0)
    L3.text(32, ty0 + 22, 'CR\u00c9NEAU BLOQU\u00c9  4:59', font(MONO, 9.5), ACC_DARK, track=1.2)
    L3.text(32, ty0 + 44, 'Mar. 13 oct. \u00e0 10:30, avec In\u00e8s', font(INTER, 15, 560), INK)
    L3.text(PT_W - 32, ty0 + 44, 'Annuler', font(INTER, 14, 500), (90, 90, 98), anchor='rs')
    # bouton d'action principal
    cy0, cy1 = 694, 742
    # fond du pied (fondu puis aplat jusqu'aux onglets) : la liste passe dessous
    fy0, fy1 = 662, 688
    fade = Image.linear_gradient('L').resize((CW, int(P(fy1 - fy0))))
    band = Image.new('RGBA', fade.size, BG + (0,))
    band.putalpha(fade)
    L3.im.alpha_composite(band, dest=(0, int(P(fy0))))
    L3.rect(0, fy1, PT_W, 753, BG + (255,))
    L3.rect(MX, cy0, PT_W - MX, cy1, ACC, r=4)
    f_cta = font(INTER, 17, 600)
    L3.text(MX + 18, cy0 + 31, 'R\u00e9server mar. 13, 10:30', f_cta, ACC_INK)
    L3.text(PT_W - MX - 48, cy0 + 31, '38' + NB + '\u20ac', f_cta, ACC_INK, anchor='rs')
    ax, ay = PT_W - MX - 30, cy0 + 25
    L3.poly([(ax - 7, ay), (ax + 7, ay)], ACC_INK, width=2.0, closed=False)
    L3.poly([(ax + 1.5, ay - 5.5), (ax + 7, ay), (ax + 1.5, ay + 5.5)], ACC_INK, width=2.0, closed=False)

    # ================================================================== export
    os.makedirs(TEX_DIR, exist_ok=True)
    mask = screen_mask()
    layers = [L0.im, L1.im, L2.im, L3.im]

    # écran assemblé : calques + îlot caméra, hors forme = noir
    comp = Image.new('RGBA', (CW, CH), BG + (255,))
    for im in layers:
        comp.alpha_composite(im)
    isl = Canvas()
    isl.rect(PT_W / 2 - 61, 11, PT_W / 2 + 61, 47, (0, 0, 0, 255), r=18)
    comp.alpha_composite(isl.im)
    black = Image.new('RGBA', (CW, CH), (0, 0, 0, 255))
    black.paste(comp, (0, 0), mask)
    screen = black.convert('RGB').resize((IMG_W, IMG_H), Image.LANCZOS)

    # calques : plaque de verre teintée + filet de bord (vue éclatée), contenu par-dessus
    rim_outer = screen_mask()
    rim_inner = screen_mask(inset=1.3)
    rim = Image.fromarray((np.asarray(rim_outer, np.int16) - np.asarray(rim_inner, np.int16)).clip(0, 255)
                          .astype(np.uint8), 'L')
    outs = []
    for i, im in enumerate(layers):
        plate = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        if i > 0:
            tint = Image.new('RGBA', (CW, CH), (190, 236, 238, 0))
            tint.putalpha(mask.point(lambda v: v * 5 // 255))
            plate.alpha_composite(tint)
        plate.alpha_composite(im)
        edge = Image.new('RGBA', (CW, CH), (205, 240, 242, 0))
        edge.putalpha(rim.point(lambda v: v * (150 if i else 90) // 255))
        plate.alpha_composite(edge)
        a = np.asarray(plate.getchannel('A'), np.uint16) * np.asarray(mask, np.uint16) // 255
        plate.putalpha(Image.fromarray(a.astype(np.uint8), 'L'))
        outs.append(plate.resize((IMG_W, IMG_H), Image.LANCZOS))

    def save(img, name, q, lossless=False):
        path = os.path.join(TEX_DIR, name + '.webp')
        img.save(path, 'WEBP', quality=q, method=6, lossless=lossless, exact=False)
        kb = os.path.getsize(path) / 1024
        print(f'  {name:10s} {img.size[0]}x{img.size[1]} {img.mode}  {kb:6.1f} Ko')
        return kb

    total = save(screen, 'screen', 88)
    for i, im in enumerate(outs):
        total += save(im, f'layer{i}', 86)

    # rugosité du métal brossé : stries le long du cadre (u), variation dans la hauteur (v)
    rng = np.random.default_rng(11)
    bw, bh = 512, 256
    rows = rng.normal(0, 1, bh)
    rows = np.convolve(rows, [0.25, 0.5, 0.25], mode='same')
    long = rng.normal(0, 1, (bh, 24))
    long = np.asarray(Image.fromarray(((long - long.min()) / np.ptp(long) * 255).astype(np.uint8))
                      .resize((bw, bh), Image.BICUBIC), np.float32) / 255 - 0.5
    fine = rng.normal(0, 1, (bh, bw // 16))
    fine = np.asarray(Image.fromarray(((fine - fine.min()) / np.ptp(fine) * 255).astype(np.uint8))
                      .resize((bw, bh), Image.BICUBIC), np.float32) / 255 - 0.5
    rough = 0.24 + 0.06 * rows[:, None] + 0.06 * long + 0.05 * fine
    g = (np.clip(rough, 0.12, 0.55) * 255).astype(np.uint8)
    full = np.full_like(g, 255)
    brushed = Image.fromarray(np.stack([full, g, full], -1), 'RGB')
    total += save(brushed, 'brushed', 90)
    print(f'TEXTURES {TEX_DIR}  total {total:.0f} Ko')


if not IN_BLENDER:
    ui_main()
    sys.exit(0)

# ############################################################################### Blender
import subprocess  # noqa: E402

ARGS = cli_args()
SAMPLES = int(ARGS.get('samples', 256))
RES = int(ARGS.get('res', 1200))
YAW = float(ARGS.get('yaw', -0.45))    # vue de départ de la visionneuse (src/scene/landing/views.ts)
SIZE = float(ARGS.get('size', 2.9))

if not os.path.exists(os.path.join(TEX_DIR, 'layer3.webp')) or ARGS.get('textures'):
    subprocess.run(['python', os.path.abspath(__file__)], check=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

# =============================================================================== matériaux
IMG = {}


def tex(name, non_color=False):
    if name not in IMG:
        IMG[name] = load_image(os.path.join(TEX_DIR, name + '.webp'), non_color=non_color, name=name)
    return IMG[name]


def ui_mat(name, image, alpha=True, rough=0.06, strength=1.0):
    """Écran / calque : base noire, brillante (reflets de verre), image en émission (+ alpha du calque).
    Exporté en glTF : emissiveTexture + baseColorTexture (alpha) avec baseColorFactor noir."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (0, 0, 0, 1)
    p.inputs['Roughness'].default_value = rough
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = image
    t.interpolation = 'Cubic'
    nt.links.new(t.outputs['Color'], p.inputs['Emission Color'])
    p.inputs['Emission Strength'].default_value = strength
    if alpha:
        # couleur de base = image × noir : l'exporteur garde UNE image (baseColorTexture pour l'alpha,
        # baseColorFactor noir) au lieu d'en écrire une seconde rien que pour l'alpha
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(t.outputs['Color'], next(i for i in mix.inputs if i.name == 'A' and i.type == 'RGBA'))
        next(i for i in mix.inputs if i.name == 'B' and i.type == 'RGBA').default_value = (0, 0, 0, 1)
        nt.links.new(next(o for o in mix.outputs if o.type == 'RGBA'), p.inputs['Base Color'])
        nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
        m.surface_render_method = 'BLENDED'
    m.diffuse_color = (0.05, 0.05, 0.06, 1)
    return m


M = {}


def materials():
    M['brushed'] = pbr('App_MetalBrushed', '#b9bbbf', rough=0.24, metal=1.0, rough_map=tex('brushed', True))
    M['polished'] = pbr('App_MetalPolished', '#d3d5d8', rough=0.06, metal=1.0)
    M['antenna'] = pbr('App_Antenna', '#8d8f93', rough=0.5)
    M['glass'] = pbr('App_GlassFront', '#020203', rough=0.02)
    M['back'] = pbr('App_GlassBack', '#34373b', rough=0.34)
    M['bump'] = pbr('App_CameraGlass', '#34373b', rough=0.06)
    M['lens'] = pbr('App_LensGlass', '#070912', rough=0.02, coat=1.0, coat_rough=0.0)
    lp = next(n for n in M['lens'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    if 'Thin Film Thickness' in lp.inputs:          # traitement antireflet (reflets violet / vert)
        lp.inputs['Thin Film Thickness'].default_value = 380.0
        lp.inputs['Thin Film IOR'].default_value = 1.38
    M['barrel'] = pbr('App_LensBarrel', '#4a4d55', rough=0.28, metal=1.0)
    M['well'] = pbr('App_LensWell', '#060607', rough=0.7)
    M['flash'] = pbr('App_Flash', '#e6dfca', rough=0.3)
    M['port'] = pbr('App_Port', '#050506', rough=0.65)
    M['screen'] = ui_mat('App_Screen', tex('screen'), alpha=False, rough=0.05)
    M['edge'] = pbr('App_LayerEdge', '#d8f3f4', rough=0.15, emit='#9fdfe3', strength=0.2, alpha=0.32,
                    blend='BLEND')
    for i in range(4):
        M[f'layer{i}'] = ui_mat(f'App_Layer{i}', tex(f'layer{i}'), alpha=i > 0, rough=0.1)


# =============================================================================== géométrie (bmesh, Y-up)
def loft(poly, total, profile, cap_end=False, cap_start=False, mat_of=None, uv_of=None, cap_mat=0,
         cap_uv=None):
    """Lissage d'un contour fermé `poly` [(x, y, s)] le long d'un profil [(retrait, z)] : chaque anneau est
    le contour décalé vers l'intérieur de `retrait`, à la hauteur z. Faces d'extrémité en n-gones."""
    bm = bmesh.new()
    n = len(poly)
    nrm = outline_normals([(p[0], p[1]) for p in poly])
    uvl = bm.loops.layers.uv.new('UVMap') if (uv_of or cap_uv) else None
    rings = [[bm.verts.new((x - d * nx, y - d * ny, z)) for (x, y, _), (nx, ny) in zip(poly, nrm)]
             for d, z in profile]
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(n):
            i2 = (i + 1) % n
            f = bm.faces.new((a[i], a[i2], b[i2], b[i]))
            s0, s1 = poly[i][2], (poly[i2][2] if i2 else total)
            if mat_of:
                f.material_index = mat_of(j, 0.5 * (s0 + s1))
            if uvl is not None and uv_of:
                for loop, (s, jj) in zip(f.loops, ((s0, j), (s1, j), (s1, j + 1), (s0, j + 1))):
                    loop[uvl].uv = uv_of(s, profile[jj])
    caps = []
    if cap_end:
        caps.append(bm.faces.new(rings[-1]))
    if cap_start:
        caps.append(bm.faces.new(rings[0]))
    for f in caps:
        f.material_index = cap_mat
        if uvl is not None:
            for loop in f.loops:
                loop[uvl].uv = cap_uv(loop.vert.co) if cap_uv else (0.0, 0.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm, caps


def revolve(profile, segs=48, cx=0.0, cy=0.0, mat_of=None):
    """Révolution d'un profil [(r, z)] autour de l'axe parallèle à Z passant par (cx, cy)."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-7:
            rings.append([bm.verts.new((cx, cy, z))])
        else:
            rings.append([bm.verts.new((cx + r * math.cos(2 * math.pi * k / segs),
                                         cy + r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)])
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        for k in range(segs):
            k2 = (k + 1) % segs
            if len(b) == 1:
                f = bm.faces.new((a[k], a[k2], b[0]))
            elif len(a) == 1:
                f = bm.faces.new((a[0], b[k2], b[k]))
            else:
                f = bm.faces.new((a[k], a[k2], b[k2], b[k]))
            if mat_of:
                f.material_index = mat_of(j)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def merge_into(dst, src):
    """Ajoute le bmesh `src` (libéré) à `dst`."""
    me_tmp = bpy.data.meshes.new('tmp')
    src.to_mesh(me_tmp)
    src.free()
    dst.from_mesh(me_tmp)
    bpy.data.meshes.remove(me_tmp)


def to_obj(bm, name, mats, parent, sharp=32.0, flat=False, sharp_faces=(), loc=(0, 0, 0)):
    """bmesh (Y-up) -> objet. Arêtes vives au-delà de `sharp` degrés + bords des faces `sharp_faces`
    (n-gones plans : normales non moyennées avec le chanfrein voisin)."""
    for f in bm.faces:
        f.smooth = not flat
    if not flat:
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(sharp):
                e.smooth = False
        for f in sharp_faces:
            for e in f.edges:
                e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m)
    me.transform(YUP)
    ob = bpy.data.objects.new(name, me)
    COLL.objects.link(ob)
    assert ob.name == name, ob.name
    ob.location = W(*loc)
    if parent is not None:
        ob.parent = parent
    return ob


# =============================================================================== modèle
COLL = None


def build():
    global COLL
    COLL = new_coll('Smartphone')
    materials()
    root = empty('App_Root', COLL)
    phone = empty('App_Phone', COLL)
    phone.parent = root
    out = [root, phone]

    # ------------------------------------------------------------------ contour du boîtier
    hw, hh = BODY_W / 2, BODY_H / 2
    poly0, total = squircle(BODY_W, BODY_H, E_BODY, k=28)
    q = total / 4                      # milieu du bord haut ; total / 2 milieu gauche ; 3q milieu bas
    AW = 0.011                         # largeur des coupures d'antenne
    ant_s = [0.66, total - 0.66, 2 * q - 0.66, 2 * q + 0.66, q - 0.21, 3 * q - 0.24, 3 * q + 0.24]
    ants = [(s - AW / 2, s + AW / 2) for s in ant_s]
    poly, total = squircle(BODY_W, BODY_H, E_BODY, k=28, breaks=[b / total for a in ants for b in a])

    def in_ant(s):
        return any(a <= s <= b for a, b in ants)

    # ------------------------------------------------------------------ cadre
    C = 0.0055                         # chanfrein poli à 45°
    ZF = 0.0455                        # arête haute (sous le verre)
    frame_prof = [(0.0062, ZF), (C, ZF), (0.0, ZF - C), (0.0, 0.0), (0.0, -(ZF - C)), (C, -ZF), (0.0062, -ZF)]
    BRUSH, POLISH, ANT = 0, 1, 2

    def frame_mat(j, s):
        if j in (1, 2, 3, 4) and in_ant(s):
            return ANT
        return BRUSH if j in (2, 3) else POLISH

    bm, _ = loft(poly, total, frame_prof, mat_of=frame_mat, uv_of=lambda s, p: (s * 0.5, p[1] * 1.5 + 0.5))
    out.append(to_obj(bm, 'App_Frame', [M['brushed'], M['polished'], M['antenna']], phone, sharp=30))

    # ------------------------------------------------------------------ verre avant (bord arrondi 2.5D)
    zf = Z_FRONT
    glass_prof = [(0.0050, ZF - 0.0025), (0.0050, ZF + 0.0008), (0.0056, zf - 0.0040), (0.0070, zf - 0.0022),
                  (0.0094, zf - 0.0010), (0.0128, zf - 0.0003), (0.0170, zf)]
    bm, caps = loft(poly0, total, glass_prof, cap_end=True)
    out.append(to_obj(bm, 'App_Glass', M['glass'], phone, sharp=40, sharp_faces=caps))

    # ------------------------------------------------------------------ dos en verre dépoli
    zb = Z_BACK
    back_prof = [(0.0050, -(ZF - 0.0025)), (0.0050, -(ZF + 0.0008)), (0.0058, zb + 0.0036),
                 (0.0076, zb + 0.0018), (0.0108, zb + 0.0006), (0.0150, zb)]
    bm, caps = loft(poly0, total, back_prof, cap_end=True)
    out.append(to_obj(bm, 'App_Body', M['back'], phone, sharp=40, sharp_faces=caps))

    # ------------------------------------------------------------------ écran (UV 0..1 sur l'image)
    spoly, stotal = squircle(W_S, H_S, E_SCREEN, k=32)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    f = bm.faces.new([bm.verts.new((x, y, 0.0)) for x, y, _ in spoly])
    bm.normal_update()
    if f.normal.z < 0:
        f.normal_flip()
    for loop in f.loops:
        loop[uvl].uv = (loop.vert.co.x / W_S + 0.5, loop.vert.co.y / H_S + 0.5)
    out.append(to_obj(bm, 'App_Screen', M['screen'], phone, flat=True, loc=(0, 0, Z_SCREEN)))

    # caméra frontale (dans l'îlot dessiné sur l'écran)
    fx, fy = pt_to_xy(PT_W / 2 + 61 - 18, 29)
    bm = revolve([(0.0105, -0.0002), (0.0105, 0.0002), (0.0068, 0.00025), (0.0060, 0.0003), (0.0, 0.0005)],
                 segs=32, cx=fx, cy=fy, mat_of=lambda j: 0 if j < 2 else 1)
    out.append(to_obj(bm, 'App_CameraFront', [M['barrel'], M['lens']], phone, loc=(0, 0, Z_SCREEN)))

    # ------------------------------------------------------------------ boutons latéraux
    def button(name, side, yc, length, thick=0.030):
        bpoly, btotal = squircle(length, thick, thick / 2, n=2.0, k=10)
        prof = [(0.0, -0.002), (0.0, 0.0042), (0.0010, 0.0060), (0.0028, 0.0068), (0.0060, 0.0070)]
        bm, caps = loft(bpoly, btotal, prof, cap_end=True, mat_of=lambda j, s: 1 if j >= 2 else 0)
        # repère local (u = long, v = épaisseur, h = saillie) -> monde : x = ±(hw + h), y = yc + u, z = v
        for v in bm.verts:
            u, w, h = v.co
            v.co = (side * (hw + h), yc + u, w * side)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return to_obj(bm, name, [M['brushed'], M['polished']], phone, sharp=35, sharp_faces=caps)

    MM = BODY_H / 147.0                 # 1 mm
    out.append(button('App_ButtonPower', 1, hh - 52 * MM, 17 * MM))
    out.append(button('App_ButtonAction', -1, hh - 33 * MM, 7 * MM))
    out.append(button('App_ButtonVolumeUp', -1, hh - 50 * MM, 11 * MM))
    out.append(button('App_ButtonVolumeDown', -1, hh - 64 * MM, 11 * MM))

    # ------------------------------------------------------------------ port USB-C et haut-parleurs (bas)
    bm = bmesh.new()

    def bottom_hole(xc, w_, h_, rim_mat, depth=0.0004, k=10):
        p_, t_ = squircle(w_, h_, h_ / 2 - 1e-6, n=2.0, k=k)
        prof = [(0.0, -0.001), (0.0, depth), (0.0011, depth), (0.0013, depth * 0.5)]
        b2, caps = loft(p_, t_, prof, cap_end=True, mat_of=lambda j, s: rim_mat if j < 2 else 1)
        for f_ in caps:
            f_.material_index = 1
        for v in b2.verts:            # (x, z) dans le plan du dessous, saillie vers -y
            a_, c_, h2 = v.co
            v.co = (xc + a_, -hh - h2, c_)
        merge_into(bm, b2)

    bottom_hole(0.0, 8.4 * MM, 2.6 * MM, 0)
    for side in (-1, 1):
        for k in range(5):
            bottom_hole(side * (0.13 + k * 0.026), 0.0125, 0.0125, 1, depth=0.0002, k=3)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    out.append(to_obj(bm, 'App_Port', [M['polished'], M['port']], phone, sharp=35))

    # ------------------------------------------------------------------ bloc photo (dos)
    bs = 0.47
    bx, by = hw - 0.035 - bs / 2, hh - 0.035 - bs / 2
    bpoly, btotal = squircle(bs, bs, 0.17, k=20)
    bpoly = [(x + bx, y + by, s) for x, y, s in bpoly]
    z0 = zb + 0.0006
    bump_prof = [(0.0, z0), (0.0, zb - 0.0070), (0.0012, zb - 0.0088), (0.0034, zb - 0.0097),
                 (0.0070, zb - 0.0100)]
    ZB = zb - 0.0100
    bm, caps = loft(bpoly, btotal, bump_prof, cap_end=True)
    out.append(to_obj(bm, 'App_CameraBump', M['bump'], phone, sharp=40, sharp_faces=caps))

    lens_at = [(bx + 0.106, by + 0.106), (bx + 0.106, by - 0.106), (bx - 0.104, by)]
    R = 0.091
    # bague polie en saillie, puits noir, bagues internes anodisées, lentille bombée traitée
    lens_prof = [(R, ZB + 0.0015), (R, ZB - 0.0090), (R - 0.0012, ZB - 0.0108), (R - 0.0040, ZB - 0.0116),
                 (R - 0.0100, ZB - 0.0116), (R - 0.0135, ZB - 0.0106), (R - 0.0150, ZB - 0.0088),   # 0..5
                 (R - 0.0152, ZB - 0.0040), (0.066, ZB - 0.0034),                                     # 6, 7 puits
                 (0.063, ZB - 0.0040), (0.058, ZB - 0.0042), (0.0555, ZB - 0.0036),                  # 8..10 bague
                 (0.050, ZB - 0.0030), (0.044, ZB - 0.0028),                                         # 11, 12 puits
                 (0.042, ZB - 0.0033), (0.039, ZB - 0.0035),                                         # 13, 14 bague
                 (0.036, ZB - 0.0036), (0.027, ZB - 0.0046), (0.016, ZB - 0.0053), (0.0, ZB - 0.0056)]

    def lens_mat(j):
        if j <= 5:
            return 0           # bague polie
        if j in (6, 7, 11, 12):
            return 3           # puits noir mat
        if j in (8, 9, 10, 13, 14):
            return 2           # bagues anodisées
        return 1               # lentille

    for i, (lx, ly) in enumerate(lens_at):
        bm = revolve(lens_prof, segs=56, cx=lx, cy=ly, mat_of=lens_mat)
        out.append(to_obj(bm, f'App_CameraLens{i}', [M['polished'], M['lens'], M['barrel'], M['well']], phone,
                          sharp=40))

    # flash, capteur de profondeur, micro
    bm = bmesh.new()
    for (cx_, cy_, r_, mi) in ((bx - 0.150, by + 0.150, 0.034, 0), (bx - 0.150, by - 0.150, 0.030, 1),
                               (bx - 0.020, by + 0.180, 0.0075, 2)):
        prof = [(r_, ZB + 0.001), (r_, ZB - 0.0004), (r_ * 0.94, ZB - 0.0008), (0.0, ZB - 0.0010)]
        merge_into(bm, revolve(prof, segs=32, cx=cx_, cy=cy_, mat_of=lambda j, mi=mi: mi))
    out.append(to_obj(bm, 'App_CameraFlash', [M['flash'], M['lens'], M['port']], phone, sharp=40))

    # ------------------------------------------------------------------ calques de l'interface
    for i in range(4):
        bm, caps = loft(spoly, stotal, [(0.0, -LAYER_T / 2), (0.0, LAYER_T / 2)], cap_end=True, cap_mat=1,
                        mat_of=lambda j, s: 0, uv_of=lambda s, p: (0.0, 0.0),
                        cap_uv=lambda co: (co.x / W_S + 0.5, co.y / H_S + 0.5))
        ob = to_obj(bm, f'App_Layer{i}', [M['edge'], M[f'layer{i}']], root, sharp=40, sharp_faces=caps,
                    loc=(0, 0, Z_SCREEN + LAYER_GAP * (i + 1)))
        ob['explodeGap'] = LAYER_GAP
        ob['screenZ'] = Z_SCREEN
        out.append(ob)
    return out


OBJS = build()
MESHES = [o for o in OBJS if o.type == 'MESH']
print('TRIANGLES')
TRIS = report(MESHES)
os.makedirs(BLEND_DIR, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
KB = export_glb(OBJS, GLB, webp_quality=86)


# =============================================================================== rendus
def view_transform(objs, yaw, size):
    """Repère de la visionneuse -> repère du modèle (cf. viewer_camera de landing_common)."""
    lo, hi = bbox_yup(objs)
    w, h, d = (hi[0] - lo[0]), (hi[1] - lo[1]), (hi[2] - lo[2])
    s = size / max(h, math.hypot(w, d))
    c = [(lo[k] + hi[k]) / 2 for k in range(3)]

    def to_model(p, vec=False):
        x, y, z = p[0] / s, p[1] / s, p[2] / s
        cy, sy = math.cos(-yaw), math.sin(-yaw)
        o = (0, 0, 0) if vec else c
        return (o[0] + cy * x + sy * z, o[1] + y, o[2] - sy * x + cy * z)
    return to_model, s, lo, hi


def studio(coll, objs, yaw, size, lamps=True):
    """Éclairage de la visionneuse (src/scene/landing/Studio.tsx) : Lightformers = plans émissifs
    (invisibles à la caméra, vus dans les reflets), environmentIntensity 0.85, et les deux
    directionnelles en soleils (si `lamps`)."""
    to_model, s, lo, hi = view_transform(objs, yaw, size)
    w = bpy.data.worlds.new('World')
    bpy.context.scene.world = w
    bgn = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
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
    if lamps:
        for k, (pos, inten, col) in enumerate((((3.5, 5, 4), 1.5, '#ffffff'), ((-4, 2.5, -5), 1.1, '#c9d6ff'))):
            d = bpy.data.lights.new(f'Sun{k}', 'SUN')
            d.energy = inten
            d.color = lin(col)
            d.angle = math.radians(3)
            o = bpy.data.objects.new(f'Sun{k}', d)
            coll.objects.link(o)
            dirv = W(*to_model(pos, vec=True))
            o.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()
    return lo, hi


def render_view(objs, path, samples, res, lamps=True, hdri=None, catcher=True):
    sc = setup_cycles(samples=samples, res=res, transparent=True)
    sc.cycles.use_adaptive_sampling = True
    rig = new_coll('Rig')
    if hdri:
        world_hdri(ph_hdri(hdri), strength=1.0)
        lo, _ = bbox_yup(objs)
    else:
        lo, _ = studio(rig, objs, YAW, SIZE, lamps=lamps)
    viewer_camera(rig, objs, YAW, SIZE)
    if catcher:
        shadow_catcher(rig, y=lo[1])
    return render_png(path)


PREVIEW = ARGS.get('preview')
if PREVIEW or ARGS.get('poster'):
    import tempfile
    if ARGS.get('poster'):
        png = os.path.join(PREVIEW or tempfile.gettempdir(), 'smartphone_poster.png')
        render_view(MESHES, png, SAMPLES, RES)
        png_to_webp(png, POSTER, max_kb=120)
    else:
        render_view(MESHES, os.path.join(PREVIEW, 'preview.png'), int(ARGS.get('samples', 64)),
                    int(ARGS.get('res', 700)))

DETAIL = ARGS.get('detail')
if DETAIL:
    # vues de contrôle du téléphone seul (calques masqués) : face, dos, macros (même éclairage)
    def fit_size(objs, field):
        lo, hi = bbox_yup(objs)
        return 3.9 / field * max(hi[1] - lo[1], math.hypot(hi[0] - lo[0], hi[2] - lo[2]))

    by_name = {o.name: o for o in MESHES}
    phone_objs = [o for o in MESHES if not o.name.startswith('App_Layer')]
    for o in MESHES:
        if o.name.startswith('App_Layer'):
            o.hide_render = True
    shots = [('front', phone_objs, -0.55, 2.7), ('back', phone_objs, math.pi - 0.6, 2.7),
             ('corner', [by_name['App_CameraFront']], -0.7, None),
             ('bump', [by_name['App_CameraBump']], math.pi - 0.5, None),
             ('side', [by_name['App_ButtonPower']], -1.25, None)]
    for name, objs, yaw, size in shots:
        if size is None:
            size = fit_size(objs, {'corner': 0.75, 'bump': 0.75, 'side': 0.6}[name])
        for c in list(bpy.data.collections):
            if c.name.startswith('Rig'):
                for ob in list(c.objects):
                    bpy.data.objects.remove(ob, do_unlink=True)
                bpy.data.collections.remove(c)
        sc = setup_cycles(samples=int(ARGS.get('samples', 64)), res=int(ARGS.get('res', 700)), transparent=True)
        rig = new_coll('Rig')
        studio(rig, phone_objs if size and name in ('front', 'back') else objs, yaw, size)
        viewer_camera(rig, objs, yaw, size)
        render_png(os.path.join(DETAIL, f'detail_{name}.png'))

CHECK = ARGS.get('glbcheck')
if CHECK:
    # GLB réimporté, sans aucune lampe : HDRI seul, puis Lightformers seuls (environnement du site)
    for mode in ('hdri', 'studio'):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=GLB)
        objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        render_view(objs, os.path.join(CHECK, f'glb_{mode}.png'), int(ARGS.get('samples', 64)),
                    int(ARGS.get('res', 700)), lamps=False,
                    hdri='studio_small_09' if mode == 'hdri' else None, catcher=False)
