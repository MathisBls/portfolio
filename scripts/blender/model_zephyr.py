# Modèle « zephyr » (projet Zephyr, gestionnaire de mods open source, refonte du 2026-10-06 demandée
# par Mathis) : le logo Zephyr en relief, une étoile GitHub et le logo Git, séparés pour être animés en
# code (src/scene/objects/Zephyr.tsx).
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/model_zephyr.py [-- <logo.png>]
# Le PNG passé en argument est copié dans public/textures/zephyr/logo.png ; sans argument, cette copie
# versionnée sert de source. Vide/recrée la collection 'zephyr' (offset x = 6), exporte
# public/models/zephyr.glb (Draco) et sauvegarde le .blend. Skill blender-assets : helpers du text block
# 'helpers', aucune animation.
#
# Logo : silhouette tracée sur l'alpha (marching squares au seuil 0.5, Douglas-Peucker 1 px), coupée en
# 4 facettes selon les couleurs du « Z » (barre haute, demi-bande bleue, demi-bande cyan, barre basse),
# extrudées à des profondeurs décalées. Face avant texturée (UV planaires calées sur l'image), flancs et
# dos bleu profond. La texture embarquée est le PNG dont le RGB est étendu au-delà des bords (pixels
# semi-transparents assombris sinon : liseré sombre au filtrage) et rendu opaque.
import bpy, bmesh, math, os, shutil, sys, tempfile
import numpy as np
from mathutils import Matrix, Vector

exec(bpy.data.texts['helpers'].as_string())

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGO = os.path.join(ROOT, 'public', 'textures', 'zephyr', 'logo.png')
if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1:
    os.makedirs(os.path.dirname(LOGO), exist_ok=True)
    shutil.copyfile(sys.argv[sys.argv.index('--') + 1], LOGO)

c = coll('zephyr', (6, 0, 0))
off = Vector(c['offset'])
for me in [m for m in bpy.data.meshes if m.users == 0]:
    bpy.data.meshes.remove(me)

# Dimensions (unités monde ; face avant vers -Y, soit +Z vers la caméra après l'export Y-up)
LOGO_WIDTH = 1.6
LOGO_DEPTH = 0.16
# Facettes : avancée de la face avant. La bande passe au-dessus des barres, sa moitié cyan au-dessus
# de la bleue (ombres portées visibles sur l'image).
LIFT = {'top': 0.0, 'upper': 0.025, 'lower': 0.05, 'bottom': 0.0}
BEVEL = 0.012
STAR = {'R': 0.29, 'ratio': 0.5, 'depth': 0.07, 'dome': 0.045}
GIT = {'apothem': 0.25, 'depth': 0.08}
# Composition au repos (repère Blender : x, profondeur y, hauteur z) : étoile en haut à droite,
# logo Git en bas à gauche, légèrement devant le logo
STAR_AT, STAR_YAW = (0.98, -0.28, 0.55), -0.35
GIT_AT, GIT_YAW = (-1.0, -0.22, -0.42), 0.4

# Matériaux (couleurs linéaires)
side = mat('ZepLogoSide', (0.004, 0.035, 0.22), rough=0.38, metal=0.2)
star_m = mat('ZepStar', (0.768, 0.451, 0.053), rough=0.3, metal=0.55, emit=(0.768, 0.451, 0.053))
star_m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.35
orange = mat('ZepGitOrange', (0.871, 0.08, 0.033), rough=0.4)  # #f05033
white = mat('ZepGitWhite', (0.92, 0.92, 0.92), rough=0.35, emit=(1, 1, 1))
white.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.2


# --- Image : alpha + RGB étendu -------------------------------------------------------------------
src = bpy.data.images.load(LOGO, check_existing=True)
src.reload()
W, H = src.size
px = np.empty(W * H * 4, dtype=np.float32)
src.pixels.foreach_get(px)
px = px.reshape(H, W, 4)  # lignes du bas vers le haut : y vers le haut
alpha = px[..., 3].copy()

rgb = px[..., :3].copy()
valid = alpha >= 0.98
for _ in range(6):
    pad_rgb = np.pad(rgb * valid[..., None], ((1, 1), (1, 1), (0, 0)))
    pad_ok = np.pad(valid.astype(np.float32), 1)
    acc = np.zeros_like(rgb)
    cnt = np.zeros((H, W), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                acc += pad_rgb[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx]
                cnt += pad_ok[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx]
    grow = (~valid) & (cnt > 0)
    rgb[grow] = acc[grow] / cnt[grow][:, None]
    valid |= grow
old = bpy.data.images.get('ZepLogoTex')
if old:
    bpy.data.images.remove(old)
tex_img = bpy.data.images.new('ZepLogoTex', W, H, alpha=False)
tex_img.pixels.foreach_set(np.dstack([rgb, np.ones((H, W), np.float32)]).astype(np.float32).ravel())
# Empaquetée en JPEG q92 (~7 Ko, contre ~30 Ko en PNG) : l'export glTF reprend ces octets tels quels
tmp = os.path.join(tempfile.gettempdir(), 'zephyr_logo_tex.jpg')
tex_img.file_format = 'JPEG'
tex_img.save(filepath=tmp, quality=92)
tex_img.filepath = tmp
tex_img.source = 'FILE'
tex_img.reload()
tex_img.pack()
tex_img.filepath = '//zephyr_logo_tex.jpg'
os.remove(tmp)

face = mat('ZepLogoFace', (1, 1, 1), rough=0.32)
nt = face.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
for n in [n for n in nt.nodes if n.type == 'TEX_IMAGE']:
    nt.nodes.remove(n)
tex = nt.nodes.new('ShaderNodeTexImage')
tex.image = tex_img
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
# Couleurs du logo lisibles quel que soit l'éclairage : léger émissif de la même image
nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value = 0.3


# --- Silhouette : marching squares + Douglas-Peucker ----------------------------------------------
def trace(a, level=0.5):
    """Plus grand contour fermé de a > level, en pixels (centres en k + 0.5, y vers le haut), CCW."""
    h, w = a.shape
    A = np.zeros((h + 2, w + 2), np.float32)
    A[1:-1, 1:-1] = a
    ins = (A > level).tolist()
    Al = A.tolist()
    nbr = {}

    def connect(e0, e1):
        nbr.setdefault(e0, []).append(e1)
        nbr.setdefault(e1, []).append(e0)

    for j in range(h + 1):
        for i in range(w + 1):
            b0, b1, b2, b3 = ins[j][i], ins[j][i + 1], ins[j + 1][i + 1], ins[j + 1][i]
            code = b0 | b1 << 1 | b2 << 2 | b3 << 3
            if code in (0, 15):
                continue
            eB, eR, eT, eL = ('h', i, j), ('v', i + 1, j), ('h', i, j + 1), ('v', i, j)
            cross = [e for e, (p, q) in ((eB, (b0, b1)), (eR, (b1, b2)), (eT, (b2, b3)), (eL, (b3, b0))) if p != q]
            if len(cross) == 2:
                connect(*cross)
            else:  # col : le centre de la cellule tranche
                center = (Al[j][i] + Al[j][i + 1] + Al[j + 1][i + 1] + Al[j + 1][i]) / 4 > level
                if (code == 5) == center:
                    connect(eB, eR); connect(eT, eL)
                else:
                    connect(eL, eB); connect(eR, eT)

    def point(e):
        kind, i, j = e
        i1, j1 = (i + 1, j) if kind == 'h' else (i, j + 1)
        a0, a1 = Al[j][i], Al[j1][i1]
        t = (level - a0) / (a1 - a0)
        return (i + t * (i1 - i) - 0.5, j + t * (j1 - j) - 0.5)

    loops, seen = [], set()
    for start in nbr:
        if start in seen:
            continue
        loop, prev, cur = [], None, start
        while True:
            loop.append(cur)
            seen.add(cur)
            a_, b_ = nbr[cur]
            nxt = b_ if a_ == prev else a_
            prev, cur = cur, nxt
            if cur == start:
                break
        loops.append(np.array([point(e) for e in loop]))
    best = max(loops, key=lambda p: abs(area(p)))
    print('CONTOURS', len(loops), 'points', len(best))
    return best if area(best) > 0 else best[::-1]


def area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def simplify(p, eps):
    """Douglas-Peucker sur un contour fermé (coupé au point 0 et au point le plus éloigné)."""
    far = int(np.argmax(((p - p[0]) ** 2).sum(1)))

    def run(seq):
        keep = np.zeros(len(seq), bool)
        keep[0] = keep[-1] = True
        stack = [(0, len(seq) - 1)]
        while stack:
            s, e = stack.pop()
            if e <= s + 1:
                continue
            a, d = seq[s], seq[e] - seq[s]
            seg = seq[s + 1:e]
            ln = math.hypot(*d)
            dist = (np.abs(d[0] * (seg[:, 1] - a[1]) - d[1] * (seg[:, 0] - a[0])) / ln if ln > 1e-9
                    else np.hypot(*(seg - a).T))
            k = int(np.argmax(dist))
            if dist[k] > eps:
                keep[s + 1 + k] = True
                stack += [(s, s + 1 + k), (s + 1 + k, e)]
        return seq[keep]

    return np.vstack([run(p[:far + 1])[:-1], run(np.vstack([p[far:], p[:1]]))[:-1]])


# --- Facettes : arêtes de la bande diagonale (alpha) et frontière cyan / bleu (couleur) -----------
def crossing(row, k0, k1):
    """Abscisse (px) où l'alpha passe 0.5 entre les pixels k0 et k1 voisins."""
    a0, a1 = row[k0], row[k1]
    return k0 + 0.5 + (0.5 - a0) / (a1 - a0) * (k1 - k0)


mask = alpha > 0.5
band_rows = []
for j in range(H):
    xs = np.nonzero(mask[j])[0]
    if len(xs) and xs[-1] - xs[0] + 1 == len(xs) and len(xs) < 0.45 * W:
        band_rows.append(j)
band_rows = band_rows[4:-4]
ys, lefts, rights, cuts, cut_ys = [], [], [], [], []
for j in band_rows:
    xs = np.nonzero(mask[j])[0]
    l, r = int(xs[0]), int(xs[-1])
    ys.append(j + 0.5)
    lefts.append(crossing(alpha[j], l - 1, l))
    rights.append(crossing(alpha[j], r + 1, r))
    # Cyan (G/B ~0.93) à gauche, bleu (~0.55) à droite : premier pixel bleu
    gb = px[j, l:r + 1, 1] / np.maximum(px[j, l:r + 1, 2], 1e-3)
    k = int(np.argmax(gb < 0.75))
    if 2 < k < r - l - 2:
        g0, g1 = gb[k - 1], gb[k]
        cuts.append(l + k - 1 + 0.5 + (g0 - 0.75) / (g0 - g1))
        cut_ys.append(j + 0.5)
L_LEFT = np.polyfit(ys, lefts, 1)
L_RIGHT = np.polyfit(ys, rights, 1)
L_CUT = np.polyfit(cut_ys, cuts, 1)
print('LINES left', L_LEFT, 'right', L_RIGHT, 'cut', L_CUT, len(cut_ys), 'rangs')

outline = simplify(trace(alpha), 1.0)
lo, hi = outline.min(0), outline.max(0)
CX, CY = (lo + hi) / 2
S = LOGO_WIDTH / (hi[0] - lo[0])
print('LOGO px', lo, hi, 'echelle', S, 'sommets', len(outline))


def clip(poly, f):
    """Sutherland-Hodgman : partie de poly où f(p) >= 0 (demi-plan)."""
    out = []
    n = len(poly)
    for k in range(n):
        p, q = poly[k], poly[(k + 1) % n]
        fp, fq = f(p), f(q)
        if fp >= 0:
            out.append(p)
        if (fp >= 0) != (fq >= 0):
            out.append(p + (q - p) * (fp / (fp - fq)))
    clean = []
    for p in out:
        if not clean or np.hypot(*(p - clean[-1])) > 0.05:
            clean.append(p)
    if len(clean) > 1 and np.hypot(*(clean[0] - clean[-1])) <= 0.05:
        clean.pop()
    return np.array(clean)


left_of = lambda L: (lambda p: (L[0] * p[1] + L[1]) - p[0])
right_of = lambda L: (lambda p: p[0] - (L[0] * p[1] + L[1]))
band = clip(clip(outline, right_of(L_LEFT)), left_of(L_RIGHT))
FACETS = {
    'top': clip(clip(outline, left_of(L_LEFT)), lambda p: p[1] - CY),
    'upper': clip(band, right_of(L_CUT)),
    'lower': clip(band, left_of(L_CUT)),
    'bottom': clip(clip(outline, right_of(L_RIGHT)), lambda p: CY - p[1]),
}


# --- Géométrie --------------------------------------------------------------------------------------
def prism(bm, poly, y0, y1, bevel):
    """Extrusion d'un polygone (x, z) CCW vu de face : face avant en y0 (vers -Y), dos en y1, arêtes
    des deux faces biseautées. Renvoie les faces créées."""
    before = set(bm.faces)
    front = [bm.verts.new((x, y0, z)) for x, z in poly]
    back = [bm.verts.new((x, y1, z)) for x, z in poly]
    f0 = bm.faces.new(front)
    f1 = bm.faces.new(back[::-1])
    n = len(poly)
    for k in range(n):
        bm.faces.new((front[k], back[k], back[(k + 1) % n], front[(k + 1) % n]))
    new = [f for f in bm.faces if f not in before]
    bmesh.ops.recalc_face_normals(bm, faces=new)
    edges = list(set(f0.edges) | set(f1.edges))
    bmesh.ops.bevel(bm, geom=edges, offset=bevel, offset_type='OFFSET', segments=2, profile=0.5,
                    affect='EDGES', clamp_overlap=True)
    return [f for f in bm.faces if f not in before]


def fillet(poly, radii, segs=4):
    """Arrondit chaque sommet (rayon par sommet, angles saillants ou rentrants)."""
    out = []
    n = len(poly)
    for k in range(n):
        p, a, b = Vector(poly[k]), Vector(poly[k - 1]), Vector(poly[(k + 1) % n])
        u, v = (a - p).normalized(), (b - p).normalized()
        half = u.angle(v) / 2
        r = radii[k]
        s0 = p + u * (r / math.tan(half))
        s1 = p + v * (r / math.tan(half))
        ctr = p + (u + v).normalized() * (r / math.sin(half))
        a0 = math.atan2(s0.y - ctr.y, s0.x - ctr.x)
        a1 = math.atan2(s1.y - ctr.y, s1.x - ctr.x)
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        out += [(ctr.x + r * math.cos(a0 + da * i / segs), ctr.y + r * math.sin(a0 + da * i / segs))
                for i in range(segs + 1)]
    return out


def split_mesh(name, bm, index, m, parent=None, uv=None):
    """Objet `name` fait des faces de bm dont material_index == index (UV planaires facultatives)."""
    part = bm.copy()
    bmesh.ops.delete(part, geom=[f for f in part.faces if f.material_index != index], context='FACES')
    if uv:
        layer = part.loops.layers.uv.new('UVMap')
        for f in part.faces:
            for loop in f.loops:
                loop[layer].uv = uv(loop.vert.co)
    for f in part.faces:
        f.material_index = 0
    o = add_mesh(name, part, c, m)
    if parent:
        attach(o, parent)
    return o


def empty(name, loc, yaw=0.0):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.2
    o.location = Vector(loc) + off
    o.rotation_euler = (0, 0, yaw)
    link(o, c)
    return o


def attach(o, parent):
    """Enfant au même transform que son parent (transform local identité, exporté tel quel)."""
    o.parent = parent
    o.matrix_parent_inverse = Matrix.Identity(4)
    o.location = (0, 0, 0)
    o.rotation_euler = (0, 0, 0)


# Logo : 4 facettes, face avant (et son biseau) texturée, le reste bleu profond
bm = bmesh.new()
for key, poly in FACETS.items():
    world = [((x - CX) * S, (y - CY) * S) for x, y in poly]
    for f in prism(bm, world, -LOGO_DEPTH / 2 - LIFT[key], LOGO_DEPTH / 2, BEVEL):
        f.normal_update()
        f.material_index = 0 if f.normal.y < -0.3 else 1
    print('FACETTE', key, len(poly), 'sommets')
logo_root = empty('Zep_Logo_Root', (0, 0, 0))
logo_uv = lambda co: ((co.x / S + CX) / W, (co.z / S + CY) / H)
split_mesh('Zep_Logo_Face', bm, 0, face, logo_root, logo_uv)
split_mesh('Zep_Logo_Side', bm, 1, side, logo_root)
bm.free()

# Étoile GitHub : 5 branches arrondies, extrudée, biseautée, faces en pointe douce des deux côtés
pts = []
for k in range(10):
    ang = math.pi / 2 + k * math.pi / 5
    r = STAR['R'] if k % 2 == 0 else STAR['R'] * STAR['ratio']
    pts.append((r * math.cos(ang), r * math.sin(ang)))
bm = bmesh.new()
prism(bm, fillet(pts, [0.03 if k % 2 == 0 else 0.015 for k in range(10)], 3),
      -STAR['depth'] / 2, STAR['depth'] / 2, BEVEL)
caps = sorted(bm.faces, key=lambda f: f.calc_area())[-2:]
bmesh.ops.poke(bm, faces=caps, offset=STAR['dome'])
star = add_mesh('Zep_Star', bm, c, star_m, STAR_AT)
star.rotation_euler = (0, 0, STAR_YAW)

# Logo Git : losange (carré arrondi à 45°) orange, graphe de branche blanc en relief sur les deux faces
# (lisible pendant la rotation). Mesures du logo officiel, en apothème a : disques r = 0.207a, traits
# 0.17a ; A (haut) = (0, 0.58a), B (bas) = (0, −0.54a), C (droite) = (0.54a, 0) ; le trait AC se
# prolonge vers le bord haut gauche.
a = GIT['apothem']
s = a * math.sqrt(2)
git_root = empty('Zep_Git_Root', GIT_AT, GIT_YAW)
bm = bmesh.new()
prism(bm, fillet([(s, 0), (0, s), (-s, 0), (0, -s)], [0.17 * a] * 4, 5), -GIT['depth'] / 2, GIT['depth'] / 2, BEVEL)
diamond = add_mesh('Zep_Git_Diamond', bm, c, orange)
attach(diamond, git_root)

A, B, C = Vector((-0.02 * a, 0.58 * a)), Vector((-0.02 * a, -0.54 * a)), Vector((0.54 * a, 0.02 * a))
TAIL = A + Vector((-1, 1)).normalized() * 0.42 * a
bm = bmesh.new()
for side_sign in (-1, 1):  # -1 : face avant (-Y) ; +1 : dos, graphe en miroir
    base = side_sign * (GIT['depth'] / 2 - 0.004)
    mirror = -side_sign

    def at(p, depth):
        return Vector((mirror * p.x, base + side_sign * depth / 2, p.y))

    for p in (A, B, C):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.207 * a, radius2=0.207 * a,
                              depth=0.034, matrix=Matrix.Translation(at(p, 0.034)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    for p, q in ((A, B), (TAIL, C)):
        d = q - p
        m = (Matrix.Translation(at((p + q) / 2, 0.026)) @ Matrix.Rotation(-mirror * math.atan2(d.y, d.x), 4, 'Y')
             @ Matrix.Diagonal((d.length, 0.026, 0.17 * a, 1)))
        bmesh.ops.create_cube(bm, size=1.0, matrix=m)
graph = add_mesh('Zep_Git_Graph', bm, c, white)
attach(graph, git_root)
bpy.context.view_layer.update()

# Export (même réglages que l'export commun du skill), collection zephyr seulement
roots = [o for o in c.objects if o.parent is None]
for o in roots:
    o.location -= off
bpy.ops.object.select_all(action='DESELECT')
for o in c.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'public', 'models', 'zephyr.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
    export_animations=False, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6)
for o in roots:
    o.location += off
bpy.ops.wm.save_mainfile()
print('ZEPHYR OK', len(c.objects), 'objets')
