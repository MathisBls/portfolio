# Outils communs aux modèles réalistes des pages d'atterrissage et à la part de pizza de Meme Rina
# (agent B4, 2026-10-09). Importé par scripts/blender/model_landing_*.py et model_pizza_real.py :
#   sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from landing_common import *
#
# Conventions :
#   - tout est modélisé par script depuis une scène vide (`blender -b --factory-startup --python ...`) ;
#   - repère « monde » Y-up (x à droite, y en haut, +z vers le spectateur), en mètres-scène, converti en
#     Blender Z-up par W() / YUP ; l'export glTF Y-up rend les coordonnées d'origine ;
#   - textures CC0 Poly Haven téléchargées dans node_modules/.cache/polyhaven (même cache que l'easter egg),
#     intégrées au GLB en WebP (EXT_texture_webp) : un modèle = un fichier, chargé tel quel par useGLTF ;
#   - export Draco 6, sans animation ; les pièces animables sont des objets séparés au nom stable ;
#   - poster : Cycles (OptiX), 1200 × 1200, fond transparent, WebP ≤ 120 Ko.
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'polyhaven')
MODELS = os.path.join(ROOT, 'public', 'models', 'landing')
POSTERS = os.path.join(ROOT, 'public', 'posters', 'landing')
TEXTURES = os.path.join(ROOT, 'public', 'textures', 'landing')
BLEND_DIR = os.path.join(ROOT, 'blender')
PH_API = 'https://api.polyhaven.com/files/'
UA = {'User-Agent': 'portfolio-mathis-boulais/landing-models'}


def cli_args():
    """Arguments après `--` : {'render': dossier, 'poster': True, ...} (--clé valeur ou --drapeau)."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out, i = {}, 0
    while i < len(argv):
        k = argv[i].lstrip('-')
        if i + 1 < len(argv) and not argv[i + 1].startswith('--'):
            out[k] = argv[i + 1]
            i += 2
        else:
            out[k] = True
            i += 1
    return out


# =============================================================================== Poly Haven (CC0)
def ph_fetch(url, path):
    import urllib.request
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
            data = r.read()
        tmp = f'{path}.{os.getpid()}.part'   # écriture atomique : plusieurs scripts partagent le cache
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, path)
    return path


def ph_info(asset):
    meta = os.path.join(CACHE, asset + '.json')
    ph_fetch(PH_API + asset, meta)
    with open(meta, encoding='utf-8') as f:
        return json.load(f)


def ph_map(asset, kind, res='1k'):
    """Carte d'une texture Poly Haven (kind : Diffuse, nor_gl, Rough, arm, AO, Displacement), en JPG."""
    info = ph_info(asset)[kind][res]
    entry = info['jpg'] if 'jpg' in info else info['png']
    return ph_fetch(entry['url'], os.path.join(CACHE, asset, os.path.basename(entry['url'])))


def ph_hdri(asset, res='1k'):
    info = ph_info(asset)['hdri'][res]['hdr']
    return ph_fetch(info['url'], os.path.join(CACHE, asset, os.path.basename(info['url'])))


def lin(c):
    """Couleur hex sRGB (ou tuple déjà linéaire) -> RVB linéaire."""
    if not isinstance(c, str):
        return tuple(c)
    h = c.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in s)


try:
    import bpy
    import bmesh
    from mathutils import Matrix, Vector
    IN_BLENDER = True
except ImportError:
    IN_BLENDER = False

if IN_BLENDER:
    # Monde Y-up -> Blender Z-up (rotation +90° sur X) ; W(x, y, z) convertit un point.
    YUP = Matrix.Rotation(math.pi / 2, 4, 'X')

    def W(x, y, z):
        return Vector((x, -z, y))

    def clean_scene():
        for ob in list(bpy.data.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        for c in list(bpy.data.collections):
            bpy.data.collections.remove(c)
        for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras,
                       bpy.data.images, bpy.data.curves):
            for b in list(blocks):
                blocks.remove(b)

    def new_coll(name):
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
        return c

    # ------------------------------------------------------------------- matériaux (exportables en glTF)
    def _inp(node, name):
        return node.inputs[name]

    def load_image(path, non_color=False, name=None):
        img = bpy.data.images.load(path, check_existing=True)
        if name:
            img.name = name
        img.colorspace_settings.name = 'Non-Color' if non_color else 'sRGB'
        return img

    def pbr(name, color='#808080', rough=0.5, metal=0.0, color_map=None, normal_map=None, rough_map=None,
            arm_map=None, metal_map=None, normal=1.0, emit=None, strength=1.0, emit_map=None, alpha=None,
            alpha_map=False, transmission=0.0, ior=1.45, coat=0.0, coat_rough=0.05, sheen=None,
            sss=0.0, sss_radius=(1.0, 0.5, 0.3), aniso=0.0, uv=None, blend=None):
        """Principled BSDF à câblage glTF : Image -> Base Color, Image -> Normal Map, Image (rugosité en
        niveaux de gris ou canal G d'une ARM) -> Roughness. Les cartes sont des chemins ou des bpy Image.
        Les teintes `color` ne s'appliquent que sans color_map (le glTF n'a pas de multiplication)."""
        m = bpy.data.materials.new(name)
        nt = m.node_tree
        p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        c = lin(color)
        p.inputs['Base Color'].default_value = (*c, 1)
        p.inputs['Metallic'].default_value = metal
        p.inputs['Roughness'].default_value = rough
        p.inputs['IOR'].default_value = ior
        uvn = None
        if uv:
            uvn = nt.nodes.new('ShaderNodeUVMap')
            uvn.uv_map = uv

        def tex(src, non_color):
            n = nt.nodes.new('ShaderNodeTexImage')
            n.image = src if not isinstance(src, str) else load_image(src, non_color)
            if non_color:
                n.image.colorspace_settings.name = 'Non-Color'
            if uvn:
                nt.links.new(uvn.outputs['UV'], n.inputs['Vector'])
            return n

        if color_map:
            t = tex(color_map, False)
            nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
            if alpha_map:
                nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
        if arm_map or rough_map or metal_map:
            src = arm_map or rough_map or metal_map
            t = tex(src, True)
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(t.outputs['Color'], sep.inputs[0])
            if arm_map or rough_map:
                nt.links.new(sep.outputs[1], p.inputs['Roughness'])
            if metal_map or arm_map and metal > 0:
                nt.links.new(sep.outputs[2], p.inputs['Metallic'])
        if normal_map:
            t = tex(normal_map, True)
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nm.inputs['Strength'].default_value = normal
            if uv:
                nm.uv_map = uv
            nt.links.new(t.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
        if emit is not None or emit_map is not None:
            p.inputs['Emission Strength'].default_value = strength
            if emit_map is not None:
                t = tex(emit_map, False)
                nt.links.new(t.outputs['Color'], p.inputs['Emission Color'])
            else:
                p.inputs['Emission Color'].default_value = (*lin(emit), 1)
        if alpha is not None:
            p.inputs['Alpha'].default_value = alpha
        if transmission:
            p.inputs['Transmission Weight'].default_value = transmission
        if coat:
            p.inputs['Coat Weight'].default_value = coat
            p.inputs['Coat Roughness'].default_value = coat_rough
        if sheen:
            p.inputs['Sheen Weight'].default_value = 1.0
            p.inputs['Sheen Tint'].default_value = (*lin(sheen[0]), 1)
            p.inputs['Sheen Roughness'].default_value = sheen[1]
        if sss:
            p.inputs['Subsurface Weight'].default_value = sss
            p.inputs['Subsurface Radius'].default_value = sss_radius
        if aniso:
            p.inputs['Anisotropic'].default_value = aniso
        if blend:   # 'BLEND' ou 'HASHED' (alpha), exporté en alphaMode BLEND / MASK
            try:
                m.surface_render_method = 'BLENDED' if blend == 'BLEND' else 'DITHERED'
            except Exception:
                pass
        m.diffuse_color = (*c, 1)
        return m

    # ------------------------------------------------------------------- objets
    def bm_obj(bm, name, mats, coll, sharp=None, smooth=True, yup=True, free=True):
        """bmesh (coordonnées monde Y-up) -> objet Blender. mats : matériau ou liste (index des faces)."""
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        if free:
            bm.free()
        for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
            me.materials.append(m)
        if yup:
            me.transform(YUP)
        if smooth:
            me.shade_smooth()
            if sharp is not None:
                me.set_sharp_from_angle(angle=math.radians(sharp))
        else:
            me.shade_flat()
        ob = bpy.data.objects.new(name, me)
        coll.objects.link(ob)
        assert ob.name == name, f'nom en double : {ob.name}'
        return ob

    def parent_keep(child, parent):
        bpy.context.view_layer.update()
        mw = child.matrix_world.copy()
        child.parent = parent
        child.matrix_parent_inverse = parent.matrix_world.inverted()
        child.matrix_world = mw

    def empty(name, coll, loc=(0, 0, 0)):
        ob = bpy.data.objects.new(name, None)
        ob.location = W(*loc)
        coll.objects.link(ob)
        return ob

    def tri_count(ob):
        dg = bpy.context.evaluated_depsgraph_get()
        me = ob.evaluated_get(dg).to_mesh()
        n = sum(len(p.vertices) - 2 for p in me.polygons)
        ob.evaluated_get(dg).to_mesh_clear()
        return n

    def report(objs):
        total = 0
        for ob in objs:
            if ob.type == 'MESH':
                n = tri_count(ob)
                total += n
                print(f'  {ob.name:28s} {n:7d} tris  {[m.name for m in ob.data.materials if m]}')
        print(f'  TOTAL {total} triangles')
        return total

    # ------------------------------------------------------------------- export
    def export_glb(objs, path, webp_quality=82):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.hide_set(False)
            o.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
            export_materials='EXPORT', export_image_format='WEBP', export_image_quality=webp_quality,
            export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
            export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
        kb = os.path.getsize(path) / 1024
        print(f'EXPORT {path}  {kb:.0f} Ko')
        return kb

    # ------------------------------------------------------------------- rendu Cycles
    def setup_cycles(samples=256, res=1200, transparent=True, exposure=0.0, look='AgX - Medium High Contrast'):
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA'):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                for d in prefs.devices:
                    d.use = d.type == kind
                sc.cycles.device = 'GPU'
                break
            except Exception:
                continue
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        sc.cycles.max_bounces = 12
        sc.cycles.transparent_max_bounces = 16
        sc.cycles.transmission_bounces = 12
        sc.render.resolution_x = sc.render.resolution_y = res
        sc.render.resolution_percentage = 100
        sc.render.film_transparent = transparent
        sc.render.image_settings.file_format = 'PNG'
        sc.render.image_settings.color_mode = 'RGBA'
        try:
            sc.view_settings.view_transform = 'AgX'
            sc.view_settings.look = look
        except TypeError:
            pass
        sc.view_settings.exposure = exposure
        return sc

    def world_hdri(path, strength=1.0, rot_deg=0.0, bg=None):
        """Éclairage HDRI ; bg (hex) : couleur vue par la caméra (sinon l'HDRI, ou transparent via le film)."""
        w = bpy.data.worlds.new('World')
        bpy.context.scene.world = w
        nt = w.node_tree
        out = next(n for n in nt.nodes if n.type == 'OUTPUT_WORLD')
        bgn = next(n for n in nt.nodes if n.type == 'BACKGROUND')
        env = nt.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(path, check_existing=True)
        mp = nt.nodes.new('ShaderNodeMapping')
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp.inputs['Rotation'].default_value[2] = math.radians(rot_deg)
        nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
        nt.links.new(env.outputs['Color'], bgn.inputs['Color'])
        bgn.inputs['Strength'].default_value = strength
        if bg:
            cam_bg = nt.nodes.new('ShaderNodeBackground')
            cam_bg.inputs['Color'].default_value = (*lin(bg), 1)
            lp = nt.nodes.new('ShaderNodeLightPath')
            mix = nt.nodes.new('ShaderNodeMixShader')
            nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
            nt.links.new(bgn.outputs['Background'], mix.inputs[1])
            nt.links.new(cam_bg.outputs['Background'], mix.inputs[2])
            nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
        return w

    def area_light(name, coll, pos, target, energy, color='#ffffff', size=1.0, size_y=None, spread=None):
        d = bpy.data.lights.new(name, 'AREA')
        d.energy = energy
        d.color = lin(color)
        if size_y:
            d.shape = 'RECTANGLE'
            d.size, d.size_y = size, size_y
        else:
            d.size = size
        if spread:
            d.spread = math.radians(spread)
        o = bpy.data.objects.new(name, d)
        coll.objects.link(o)
        o.location = W(*pos)
        o.rotation_euler = (W(*target) - o.location).to_track_quat('-Z', 'Y').to_euler()
        return o

    def camera(coll, eye, target, lens=50.0, name='Cam', shift=(0.0, 0.0)):
        cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
        coll.objects.link(cam)
        cam.location = W(*eye)
        cam.rotation_euler = (W(*target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = lens
        cam.data.shift_x, cam.data.shift_y = shift
        cam.data.clip_start, cam.data.clip_end = 0.01, 200
        bpy.context.scene.camera = cam
        return cam

    def bbox_yup(objs):
        """Boîte englobante (monde Y-up) des maillages : (min, max) en tuples."""
        dg = bpy.context.evaluated_depsgraph_get()
        lo, hi = [1e9] * 3, [-1e9] * 3
        for ob in objs:
            if ob.type != 'MESH':
                continue
            ev = ob.evaluated_get(dg)
            me = ev.to_mesh()
            mw = ob.matrix_world
            for v in me.vertices:
                p = mw @ v.co
                q = (p.x, p.z, -p.y)
                for k in range(3):
                    lo[k] = min(lo[k], q[k])
                    hi[k] = max(hi[k], q[k])
            ev.to_mesh_clear()
        return tuple(lo), tuple(hi)

    def viewer_camera(coll, objs, yaw, size, eye=(0.0, 1.1, 7.2), target=(0.0, 0.0, 0.0), fov=30.0,
                      name='PosterCam'):
        """Caméra du poster = vue de départ de la visionneuse des pages d'atterrissage
        (src/scene/landing : LandingViewer + Fit + views.ts) : modèle recentré sur le centre de sa boîte,
        mis à l'échelle pour que max(hauteur, diagonale au sol) = size, tourné de `yaw` autour de Y ;
        caméra three.js en `eye` qui regarde `target`, fov vertical `fov` (image carrée). On place ici la
        caméra dans le repère du modèle (inverse de cette transformation) : même image, au pixel près."""
        lo, hi = bbox_yup(objs)
        w, h, d = (hi[0] - lo[0]), (hi[1] - lo[1]), (hi[2] - lo[2])
        s = size / max(h, math.hypot(w, d))
        c = [(lo[k] + hi[k]) / 2 for k in range(3)]

        def to_model(p):
            x, y, z = p[0] / s, p[1] / s, p[2] / s
            cy, sy = math.cos(-yaw), math.sin(-yaw)
            return (c[0] + cy * x + sy * z, c[1] + y, c[2] - sy * x + cy * z)

        cam = camera(coll, to_model(eye), to_model(target), name=name)
        cam.data.sensor_fit = 'VERTICAL'
        cam.data.angle_y = math.radians(fov)
        print(f'VIEW yaw {yaw} size {size}  bbox {tuple(round(v, 3) for v in lo)} -> '
              f'{tuple(round(v, 3) for v in hi)}  échelle {s:.4f}  sol (repère vue) {-h / 2 * s:.3f}')
        return cam

    def shadow_catcher(coll, y=0.0, size=40.0, name='ShadowCatcher'):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size / 2)
        ob = bm_obj(bm, name, pbr('CatcherMat', '#202020'), coll, yup=False)
        ob.location = W(0, y, 0)
        ob.is_shadow_catcher = True
        return ob

    def render_png(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('RENDER', path)
        return path

    def png_to_webp(png, out, max_kb=120, q0=90, q_min=40):
        """PNG (RVBA) -> WebP sous max_kb Ko, qualité décroissante. Retourne (Ko, qualité)."""
        os.makedirs(os.path.dirname(out), exist_ok=True)
        img = bpy.data.images.load(png, check_existing=False)
        sc = bpy.context.scene
        s = sc.render.image_settings
        old = (s.file_format, s.color_mode, s.quality)
        vs = sc.view_settings
        old_view = (vs.view_transform, vs.look, vs.exposure, vs.gamma)
        vs.view_transform, vs.look, vs.exposure, vs.gamma = 'Standard', 'None', 0.0, 1.0   # PNG déjà affiché
        s.file_format, s.color_mode = 'WEBP', 'RGBA'
        q, kb = q0, None
        while True:
            s.quality = q
            img.save_render(out, scene=sc)
            kb = os.path.getsize(out) / 1024
            if kb <= max_kb or q <= q_min:
                break
            q -= 5
        s.file_format, s.color_mode, s.quality = old
        vs.view_transform, vs.look, vs.exposure, vs.gamma = old_view
        bpy.data.images.remove(img)
        print(f'POSTER {out}  {kb:.0f} Ko  q{q}')
        return kb, q
