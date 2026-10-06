# Posters 800x800, fond transparent, caméra 3/4 identique pour les 6 modèles (commande /posters).
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/posters.py
# Lancé en arrière-plan : le .blend n'est pas sauvegardé.
import bpy, math, os
from mathutils import Vector

OUT = r'C:\Users\Asuki\Documents\perso\Vitrine\portfolio\public\posters'
NAMES = ['prism', 'zephyr', 'wegir', 'quorin', 'gamefactory', 'pizza', 'fitness']
AZ, EL, FOV = math.radians(35), math.radians(24), math.radians(30)
FILL = 0.84  # part du cadre occupée par le modèle

scene = bpy.context.scene
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
for attr, val in (('taa_render_samples', 64), ('use_raytracing', True)):
    try:
        setattr(scene.eevee, attr, val)
    except AttributeError:
        pass

for c in bpy.data.collections:
    if c.name not in NAMES:
        c.hide_render = True

world = bpy.data.worlds.new('poster_world')
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs[0].default_value = (0.03, 0.03, 0.035, 1)
bg.inputs[1].default_value = 1.0
scene.world = world


def sun(name, energy, az, el, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'SUN')
    d.energy, d.color, d.angle = energy, color, math.radians(8)
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.rotation_euler = (math.radians(90) - el, 0, az + math.radians(90))


sun('key', 3.2, math.radians(40), math.radians(50))
sun('fill', 0.9, math.radians(-130), math.radians(20), (0.8, 0.9, 1))
sun('rim', 2.2, math.radians(200), math.radians(35))

cam_data = bpy.data.cameras.new('poster_cam')
cam_data.angle = FOV
cam = bpy.data.objects.new('poster_cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
half = math.tan(FOV / 2)
# Blender Z-up : azimut autour de Z, élévation vers +Z, face = -Y
direction = Vector((math.sin(AZ) * math.cos(EL), -math.cos(AZ) * math.cos(EL), math.sin(EL)))

# Écrans texturés pour le poster (sur le site, les textures sont appliquées en code) : matériau -> capture
SCREENS = {
    'FitScreen': 'fitness/home.webp',
    'FitCard1': 'fitness/programs.webp',
    'FitCard2': 'fitness/progress.webp',
}
TEXTURES = os.path.join(os.path.dirname(OUT), 'textures')


def apply_screens():
    for name, rel in SCREENS.items():
        m = bpy.data.materials.get(name)
        if not m:
            continue
        nodes, links = m.node_tree.nodes, m.node_tree.links
        bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(TEXTURES, rel))
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 0.9


apply_screens()
deps = bpy.context.evaluated_depsgraph_get()
for name in NAMES:
    col = bpy.data.collections[name]
    for other in NAMES:
        bpy.data.collections[other].hide_render = other != name
    pts = []
    for o in col.all_objects:
        if o.type == 'MESH':
            ev = o.evaluated_get(deps)
            pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = (lo + hi) / 2
    dist = max((p - center).length for p in pts) / math.sin(FOV / 2)
    cam_data.shift_x = cam_data.shift_y = 0
    # Cadrage sur la projection 2D réelle : décalage optique pour centrer, distance pour remplir FILL
    for _ in range(4):
        cam.location = center + direction * dist
        cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        cs = [inv @ p for p in pts]
        xs = [c.x / -c.z for c in cs]
        ys = [c.y / -c.z for c in cs]
        ext = max(max(xs) - min(xs), max(ys) - min(ys)) / 2
        cam_data.shift_x = (max(xs) + min(xs)) / 2 / (2 * half)
        cam_data.shift_y = (max(ys) + min(ys)) / 2 / (2 * half)
        dist *= ext / (half * FILL)
    cam.location = center + direction * dist
    scene.render.filepath = os.path.join(OUT, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('POSTER', name, round(dist, 2))
