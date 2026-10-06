# Fenêtre de navigateur du projet Meme Rina (ajout du 2026-10-06) : cadre sombre, barre d'onglet avec
# 3 points, écran 2:1 où le site réel s'affiche (captures appliquées côté R3F). Ajoutée à la collection
# 'pizza' existante (la part n'est pas touchée), sous un empty parent Pizza_Browser_Root.
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/model_pizza_browser.py
# Exporte public/models/pizza.glb (Draco) et sauvegarde le .blend. Skill blender-assets.
import bpy, bmesh, os
from mathutils import Vector

exec(bpy.data.texts['helpers'].as_string())

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
c = bpy.data.collections['pizza']
off = Vector(c['offset'])

# Idempotent : retire un navigateur déjà créé
for o in list(c.objects):
    if o.name.startswith('Pizza_Browser') or o.name.startswith('Pizza_Site') or o.name.startswith('Pizza_Dot'):
        bpy.data.objects.remove(o, do_unlink=True)

frame = mat('BrowserFrame', (0.035, 0.035, 0.045), rough=0.4)
bar = mat('BrowserBar', (0.07, 0.07, 0.085), rough=0.5)
site = mat('BrowserSite', (1, 1, 1), rough=0.2, emit=(1, 1, 1))
dots = [mat('BrowserDotR', (0.8, 0.12, 0.1)), mat('BrowserDotY', (0.95, 0.65, 0.1)), mat('BrowserDotG', (0.2, 0.7, 0.3))]

# Écran 2:1 ; cadre + barre au-dessus
SW, SH, BAR, PAD = 2.0, 1.0, 0.11, 0.05
ORIGIN = (0.8, 0.9, 0.75)  # derrière la part (y = profondeur Blender), au-dessus de la table


def site_plane(name, loc):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    w, h = SW / 2, SH / 2
    pts = [(-w, -h, 0, 0), (w, -h, 1, 0), (w, h, 1, 1), (-w, h, 0, 1)]
    face = bm.faces.new([bm.verts.new((x, 0, z)) for x, z, _, _ in pts])
    for loop, (_, _, u, v) in zip(face.loops, pts):
        loop[uv].uv = (u, v)
    return add_mesh(name, bm, c, site, loc)


ox, oy, oz = ORIGIN
parts = [
    box('Pizza_BrowserFrame', c, (SW + 2 * PAD, 0.05, SH + BAR + 2 * PAD), (ox, oy + 0.03, oz + BAR / 2), frame, bevel=0.02),
    box('Pizza_BrowserBar', c, (SW, 0.02, BAR), (ox, oy - 0.005, oz + SH / 2 + BAR / 2), bar),
    site_plane('Pizza_Site', (ox, oy - 0.006, oz)),
]
for i, m in enumerate(dots):
    parts.append(cyl(f'Pizza_Dot{i}', c, 0.022, 0.02, 12,
                     (ox - SW / 2 + 0.08 + i * 0.07, oy - 0.02, oz + SH / 2 + BAR / 2), (1.5708, 0, 0), m))

root = bpy.data.objects.new('Pizza_Browser_Root', None)
root.location = Vector(ORIGIN) + off
link(root, c)
bpy.context.view_layer.update()
for p in parts:
    mw = p.matrix_world.copy()
    p.parent = root
    p.matrix_parent_inverse = root.matrix_world.inverted()
    p.matrix_world = mw
bpy.context.view_layer.update()

roots = [o for o in c.objects if o.parent is None]
for o in roots:
    o.location -= off
bpy.ops.object.select_all(action='DESELECT')
for o in c.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'public', 'models', 'pizza.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT',
    export_animations=False, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6)
for o in roots:
    o.location += off
bpy.ops.wm.save_mainfile()
print('BROWSER OK', len(c.objects), 'objets dans pizza')
