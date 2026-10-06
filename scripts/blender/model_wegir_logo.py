# Logo Wegir en 3D (ajout du 2026-10-06, demande de Mathis) : le « W » turquoise tracé depuis l'alpha du
# PNG fourni (contours + creux intérieurs, marching squares), rempli et extrudé via une courbe 2D
# (remplissage pair-impair : les creux restent ouverts), biseau léger, puis converti en maillage.
# Ajouté à la collection 'wegir' existante (route et voitures intactes) sous le nom Weg_Logo.
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/model_wegir_logo.py -- "<png>"
# Exporte public/models/wegir.glb (Draco) et sauvegarde le .blend. Skill blender-assets.
import bpy, math, os, sys
sys.setrecursionlimit(10000)
import numpy as np
from mathutils import Vector

exec(bpy.data.texts['helpers'].as_string())

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PNG = sys.argv[sys.argv.index('--') + 1]
WIDTH = 2.4        # largeur du logo (unités monde)
DEPTH = 0.07       # demi-épaisseur d'extrusion
STEP = 2           # sous-échantillonnage du PNG pour le tracé (px)
EPS = 0.8          # tolérance de simplification (px sous-échantillonnés)

c = bpy.data.collections['wegir']
off = Vector(c['offset'])
for o in list(c.objects):
    if o.name.startswith('Weg_Logo'):
        bpy.data.objects.remove(o, do_unlink=True)

# --- Masque alpha (lignes de Blender de bas en haut : y croît vers le haut, comme le repère monde)
img = bpy.data.images.load(PNG)
w, h = img.size
px = np.empty(w * h * 4, dtype=np.float32)
img.pixels.foreach_get(px)
alpha = px.reshape(h, w, 4)[::STEP, ::STEP, 3]
alpha = np.pad(alpha, 1)  # bord transparent : tous les contours se ferment
H, W = alpha.shape


# --- Marching squares (iso 0.5) : segments par cellule, puis chaînage en boucles fermées
def interp(a, b):
    return 0.5 if a == b else (0.5 - a) / (b - a)


segs = {}
for y in range(H - 1):
    for x in range(W - 1):
        tl, tr, br, bl = alpha[y + 1, x], alpha[y + 1, x + 1], alpha[y, x + 1], alpha[y, x]
        idx = (tl > 0.5) << 3 | (tr > 0.5) << 2 | (br > 0.5) << 1 | (bl > 0.5)
        if idx in (0, 15):
            continue
        T = (x + interp(tl, tr), y + 1)
        R = (x + 1, y + interp(br, tr))
        B = (x + interp(bl, br), y)
        L = (x, y + interp(bl, tl))
        table = {1: [(L, B)], 2: [(B, R)], 3: [(L, R)], 4: [(R, T)], 5: [(L, T), (R, B)], 6: [(B, T)],
                 7: [(L, T)], 8: [(T, L)], 9: [(T, B)], 10: [(T, R), (B, L)], 11: [(T, R)], 12: [(R, L)],
                 13: [(R, B)], 14: [(B, L)]}
        for a, b in table[idx]:
            segs.setdefault((round(a[0], 4), round(a[1], 4)), []).append((round(b[0], 4), round(b[1], 4)))

loops = []
while segs:
    start = next(iter(segs))
    loop = [start]
    cur = start
    while True:
        nxt = segs[cur].pop()
        if not segs[cur]:
            del segs[cur]
        if nxt == start:
            break
        loop.append(nxt)
        cur = nxt
        if cur not in segs:
            break
    if len(loop) > 8:
        loops.append(loop)


def simplify(pts, eps):
    """Douglas-Peucker sur une polyligne."""
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0]), np.array(pts[-1])
    ab = b - a
    n = np.linalg.norm(ab) or 1e-9
    d = [abs(np.cross(ab, np.array(p) - a)) / n for p in pts[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps:
        return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)
    return [pts[0], pts[-1]]


def simplify_loop(loop, eps):
    """Boucle fermée : coupée au point le plus éloigné du départ, chaque moitié simplifiée."""
    p0 = np.array(loop[0])
    k = int(np.argmax([np.linalg.norm(np.array(p) - p0) for p in loop]))
    first = simplify(loop[:k + 1], eps)
    second = simplify(loop[k:] + [loop[0]], eps)
    return first[:-1] + second[:-1]


loops = [simplify_loop(l, EPS) for l in loops]
def area(loop):
    """Aire signée (formule du lacet), en px² sous-échantillonnés."""
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(loop, loop[1:] + loop[:1]))


# Contours parasites (pointes fines, anti-crénelage) : on garde les vrais contours et creux du dessin
loops = [l for l in loops if len(l) >= 3]
largest = max(abs(area(l)) for l in loops)
loops = [l for l in loops if abs(area(l)) >= 0.02 * largest]
print('WEGIR CONTOURS', sorted(round(abs(area(l))) for l in loops))

# --- Courbe 2D remplie et extrudée, centrée, mise à l'échelle
xs = [p[0] for l in loops for p in l]
ys = [p[1] for l in loops for p in l]
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
scale = WIDTH / (max(xs) - min(xs))

cu = bpy.data.curves.new('Weg_Logo', 'CURVE')
cu.dimensions = '2D'
cu.fill_mode = 'BOTH'
cu.extrude = DEPTH
cu.bevel_depth = 0.012
cu.bevel_resolution = 2
for l in loops:
    sp = cu.splines.new('POLY')
    sp.points.add(len(l) - 1)
    for p, (x, y) in zip(sp.points, l):
        p.co = ((x - cx) * scale, (y - cy) * scale, 0, 1)
    sp.use_cyclic_u = True

logo = bpy.data.objects.new('Weg_Logo', cu)
link(logo, c)
teal = mat('WegirTeal', (0.012, 0.76, 0.6), rough=0.22, metal=0.35)
teal.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (0.012, 0.76, 0.6, 1)
teal.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.35
cu.materials.append(teal)
# Debout face caméra (plan XZ, face vers -Y), au-dessus du centre de la route
logo.rotation_euler = (math.pi / 2, 0, 0)
logo.location = Vector((-0.6, 0.3, 1.3)) + off

bpy.context.view_layer.objects.active = logo
bpy.ops.object.select_all(action='DESELECT')
logo.select_set(True)
bpy.ops.object.convert(target='MESH')
print('WEGIR LOGO', len(loops), 'contours', len(logo.data.vertices), 'sommets')

# --- Export de la collection wegir (réglages du skill)
roots = [o for o in c.objects if o.parent is None]
for o in roots:
    o.location -= off
bpy.ops.object.select_all(action='DESELECT')
for o in c.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'public', 'models', 'wegir.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
    export_animations=False, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6)
for o in roots:
    o.location += off
bpy.ops.wm.save_mainfile()
print('WEGIR EXPORT OK')
