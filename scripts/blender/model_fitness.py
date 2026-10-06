# Modèle « fitness » (projet Fitness Kass) : téléphone dont l'écran affiche les captures de l'app
# (textures appliquées côté R3F), deux écrans flottants, anneau de progression, haltère.
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/model_fitness.py
# Crée/vide la collection 'fitness' (offset x = 36), exporte public/models/fitness.glb (Draco) et
# sauvegarde le .blend. Skill blender-assets : helpers du text block 'helpers', aucune animation.
import bpy, bmesh, math, os
from mathutils import Vector

exec(bpy.data.texts['helpers'].as_string())

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
c = coll('fitness', (36, 0, 0))
off = Vector(c['offset'])

dark = mat('FitDark', (0.03, 0.03, 0.035), rough=0.35)
steel = mat('FitSteel', (0.55, 0.56, 0.6), rough=0.25, metal=1.0)
cyan = mat('FitCyan', (0.01, 0.56, 0.65), rough=0.3)
track = mat('FitTrack', (0.06, 0.07, 0.08), rough=0.6)
screen = mat('FitScreen', (1, 1, 1), rough=0.2, emit=(1, 1, 1))
card1 = mat('FitCard1', (1, 1, 1), rough=0.2, emit=(1, 1, 1))
card2 = mat('FitCard2', (1, 1, 1), rough=0.2, emit=(1, 1, 1))

# Écran : proportions des captures (300 x 667)
SW = 0.80
SH = SW * 667 / 300


def screen_plane(name, m, loc, scale=1.0):
    """Plan face à -Y (vers la caméra après export Y-up), UV 0..1 sur toute la capture."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    w, h = SW * scale / 2, SH * scale / 2
    pts = [(-w, 0, -h, 0, 0), (w, 0, -h, 1, 0), (w, 0, h, 1, 1), (-w, 0, h, 0, 1)]
    verts = [bm.verts.new((x, y, z)) for x, y, z, _, _ in pts]
    face = bm.faces.new(verts)
    for loop, (_, _, _, u, v) in zip(face.loops, pts):
        loop[uv].uv = (u, v)
    return add_mesh(name, bm, c, m, loc)


def torus(name, m, R, r, loc, arc=2 * math.pi, segs=48, tube=10):
    """Tore (ou arc de tore) dans le plan XZ, axe selon Y : face à la caméra."""
    bm = bmesh.new()
    n = max(2, round(segs * arc / (2 * math.pi)))
    closed = arc >= 2 * math.pi - 1e-6
    rings = []
    for i in range(n if closed else n + 1):
        a = arc * i / n
        center = Vector((math.cos(a) * R, 0, math.sin(a) * R))
        radial = Vector((math.cos(a), 0, math.sin(a)))
        ring = []
        for j in range(tube):
            b = 2 * math.pi * j / tube
            ring.append(bm.verts.new(center + radial * (math.cos(b) * r) + Vector((0, math.sin(b) * r, 0))))
        rings.append(ring)
    count = len(rings) if closed else len(rings) - 1
    for i in range(count):
        a, b = rings[i], rings[(i + 1) % len(rings)]
        for j in range(tube):
            bm.faces.new((a[j], a[(j + 1) % tube], b[(j + 1) % tube], b[j]))
    if not closed:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = add_mesh(name, bm, c, m, loc, smooth=True)
    return o


# Téléphone
box('Fit_Body', c, (0.88, 0.08, SH + 0.1), (0, 0, 0), dark, bevel=0.04)
screen_plane('Fit_Screen', screen, (0, -0.0415, 0))

# Deux écrans flottants derrière, décalés à droite (animés en éventail en code)
screen_plane('Fit_Card1', card1, (0.55, 0.3, 0.12), scale=0.86)
screen_plane('Fit_Card2', card2, (1.05, 0.6, 0.22), scale=0.74)

# Anneau de progression (piste + arc de 270°), à gauche du téléphone
RING = (-0.82, -0.12, 0.5)
torus('Fit_RingTrack', track, 0.3, 0.03, RING)
torus('Fit_RingArc', cyan, 0.3, 0.042, (RING[0], RING[1] - 0.005, RING[2]), arc=1.5 * math.pi)

# Haltère : empty parent + barre + 2 disques hexagonaux par côté
root = bpy.data.objects.new('Fit_Dumbbell_Root', None)
root.empty_display_size = 0.2
root.location = Vector((0.78, -0.3, -0.7)) + off
link(root, c)
bpy.context.view_layer.update()
parts = [cyl('Fit_Bar', c, 0.022, 0.78, 16, (0.78, -0.3, -0.7), (0, math.pi / 2, 0), steel, smooth=True)]
for side in (-1, 1):
    for k, (r, x) in enumerate(((0.15, 0.25), (0.12, 0.32))):
        m = cyan if k == 1 else dark
        parts.append(
            cyl(f'Fit_Plate{"L" if side < 0 else "R"}{k}', c, r, 0.055, 6,
                (0.78 + side * x, -0.3, -0.7), (0, math.pi / 2, 0), m))
bpy.context.view_layer.update()
for p in parts:
    mw = p.matrix_world.copy()
    p.parent = root
    p.matrix_parent_inverse = root.matrix_world.inverted()
    p.matrix_world = mw
bpy.context.view_layer.update()

# Export (même réglages que l'export commun du skill), collection fitness seulement
roots = [o for o in c.objects if o.parent is None]
for o in roots:
    o.location -= off
bpy.ops.object.select_all(action='DESELECT')
for o in c.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'public', 'models', 'fitness.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
    export_animations=False, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6)
for o in roots:
    o.location += off
bpy.ops.wm.save_mainfile()
print('FITNESS OK', len(c.objects), 'objets')
