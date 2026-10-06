# Arène de l'easter egg (beat 2 et 3, docs/storyboards/easter-park.md) : le salon de jeu privé BoulardTV
# où les trois cartes sont distribuées puis retournées. Refonte du 2026-10-06 (retour de Mathis : « un vrai
# plateau où tu poses les cartes, un truc stylé de fou ») : remplace l'ancien asset tiré de btv_arene_v2
# (mode 'arena' de easter_assets.py). Tout est modélisé ici depuis une scène vide (bmesh), sans fichier
# source : table de jeu en stade (tapis de velours violet, piste en bois de rose laqué, bande de cuir
# capitonné, filets et coins en laiton), médaillon du B incrusté en or, trois
# emplacements de cartes (liseré d'or + filet lumineux), sabot du paquet, jetons et pions, puis la salle :
# sol en marbre à damier, colonnes de marbre noir à chapiteaux de laiton, rideaux de velours, chandeliers
# et projecteurs au sol.
#
# Usage :
#   "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_easter_arena.py
#   ... -- --render <dossier> [--shots descent,cards,...]   (vignettes EEVEE de contrôle, après l'export)
# Sauvegarde blender/easter_arena.blend et exporte public/models/easter/arena.glb (Draco 6, Y-up, sans
# animation, sans image : les textures PBR de public/textures/easter/arena/ sont chargées en code, voir
# scripts/arena_textures.py et docs/models.md).
#
# Repère : tout est construit en coordonnées « monde » Y-up (celles du site : x à droite, y en haut, +z
# vers le joueur), puis tourné de +90° sur X à la fin (Blender Z-up). Les cotes partagées avec le code
# (TABLE_Y, emplacements, paquet) sont dans src/easter/layout.ts : elles sont rappelées et imprimées ici.
# Répétitions (colonnes, rideaux, chandeliers, flammes, projecteurs, jetons, pions) : doublons liés (même
# maillage, sans modificateur), exportés en un seul maillage glTF partagé ; le code les regroupe en
# InstancedMesh (src/easter/arena/instancing.ts). Teinte des jetons : propriété `tint` (extras glTF).
import bpy, bmesh, math, os, re, sys, random
from math import sin, cos, pi, radians, sqrt, atan2, hypot
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLEND = os.path.join(ROOT, 'blender', 'easter_arena.blend')
GLB = os.path.join(ROOT, 'public', 'models', 'easter', 'arena.glb')
TEX = os.path.join(ROOT, 'public', 'textures', 'easter', 'arena')
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = ARGS[ARGS.index('--render') + 1] if '--render' in ARGS else None
SHOTS = ARGS[ARGS.index('--shots') + 1].split(',') if '--shots' in ARGS else None

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(2026)

# =============================================================================== cotes (monde Y-up)
TABLE_Y = 0.42          # dessus du tapis (layout.ts)
FLOOR_Y = -5.6          # sol de la salle
L = 5.0                 # demi-longueur droite du stade
R_FELT = 4.6            # tapis
R_WOOD = 5.2            # piste en bois (4.6 -> 5.2)
R_RAIL = 5.775          # axe de la bande capitonnée (5.2 -> 6.35)
RAIL_HW = 0.575
RAIL_YC = TABLE_Y + 0.40
RAIL_HH = 0.34
RAIL_Y0 = TABLE_Y + 0.08
R_APRON = 6.28
SLOT_Z = 1.55           # emplacements des cartes (layout.ts, SLOTS)
SLOT_X = (-3.6, 0.0, 3.6)
SLOT_W, SLOT_H, SLOT_R = 2.95, 4.05, 0.28
MEDAL = (0.0, -2.35)    # médaillon du B
DECK = (7.6, 1.4)       # sabot du paquet (centre)
TRAY_H = 0.30
STACK_TOP = TABLE_Y + 0.36
COLS = 12
R_COL = 30.0
R_CURTAIN = 31.6
R_CANDLE = 14.5


# =============================================================================== matériaux
def lin(c):
    """Couleur hex sRGB -> RVB linéaire (Blender et glTF stockent du linéaire)."""
    if not isinstance(c, str):
        return tuple(c)
    h = c.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in s)


MAT = {}


def _input(node, name, kind=None):
    return next(i for i in node.inputs if i.name == name and (kind is None or i.type == kind))


def _tex(nt, name, colorspace):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(os.path.join(TEX, name + '.webp'), check_existing=True)
    n.image.colorspace_settings.name = colorspace
    return n


def mat(name, col, rough=0.5, metal=0.0, color_map=None, normal_map=None, arm_map=None, normal=1.0,
        rough_scale=1.0, sheen=None, coat=None, emit=None, strength=1.0, tint=False):
    """Matériau PBR. Les cartes (color_map, normal_map, arm_map) ne servent qu'aux vignettes : l'export
    est sans image, le code recharge les mêmes WebP (src/easter/arena/materials.ts)."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    c = lin(col)
    p.inputs['Base Color'].default_value = (*c, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    base = None
    if color_map:
        t = _tex(nt, color_map, 'sRGB')
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(t.outputs['Color'], _input(mix, 'A', 'RGBA'))
        _input(mix, 'B', 'RGBA').default_value = (*c, 1)
        base = mix.outputs[2]
    if tint:
        info = nt.nodes.new('ShaderNodeObjectInfo')
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        if base is not None:
            nt.links.new(base, _input(mix, 'A', 'RGBA'))
        else:
            _input(mix, 'A', 'RGBA').default_value = (*c, 1)
        nt.links.new(info.outputs['Color'], _input(mix, 'B', 'RGBA'))
        base = mix.outputs[2]
    if base is not None:
        nt.links.new(base, p.inputs['Base Color'])
    if arm_map:
        t = _tex(nt, arm_map, 'Non-Color')
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(t.outputs['Color'], sep.inputs[0])
        mul = nt.nodes.new('ShaderNodeMath')
        mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = rough_scale
        nt.links.new(sep.outputs[1], mul.inputs[0])
        nt.links.new(mul.outputs[0], p.inputs['Roughness'])
    if normal_map:
        t = _tex(nt, normal_map, 'Non-Color')
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    if sheen:
        p.inputs['Sheen Weight'].default_value = 1.0
        p.inputs['Sheen Tint'].default_value = (*lin(sheen[0]), 1)
        p.inputs['Sheen Roughness'].default_value = sheen[1]
    if coat:
        p.inputs['Coat Weight'].default_value = 1.0
        p.inputs['Coat Roughness'].default_value = coat
    if emit:
        p.inputs['Emission Color'].default_value = (*lin(emit), 1)
        p.inputs['Emission Strength'].default_value = strength
    m.diffuse_color = (*c, 1)
    MAT[name] = m
    return m


PINK = '#ff2d78'   # rose BoulardTV
# Noms = contrat avec le code (src/easter/arena/materials.ts, qui les remplace par ses propres matériaux)
mat('ArenaFelt', '#4a1a78', 0.9, color_map='velvet-color', normal_map='velvet-normal', arm_map='velvet-arm',
    normal=0.6, sheen=('#ff4d9a', 0.35))
mat('ArenaCurtain', '#5c0c34', 0.85, color_map='velvet-color', normal_map='velvet-normal',
    arm_map='velvet-arm', normal=0.8, sheen=('#ff6aa8', 0.4))
mat('ArenaWood', '#d8a088', 0.42, color_map='wood-color', coat=0.05)
mat('ArenaLeather', '#22101f', 0.5, normal_map='leather-normal', arm_map='leather-arm', normal=1.0,
    rough_scale=0.85)
mat('ArenaBrass', '#c99b4c', 0.3, 1.0)
mat('ArenaGold', '#ffcb63', 0.16, 1.0)
mat('ArenaObsidian', '#0d0a12', 0.14, coat=0.04)
mat('ArenaEnamel', '#5c0b30', 0.4)
mat('ArenaMarble', '#4a4650', 0.5, color_map='marble-color', normal_map='marble-normal', arm_map='marble-arm',
    rough_scale=0.5)
mat('ArenaLed', '#2a0614', 0.4, emit=PINK, strength=6.0)
mat('ArenaSlotGlow', '#2a1a06', 0.3, emit='#ffcf7a', strength=3.0)
mat('ArenaLens', '#1c0d33', 0.2, emit='#b07dff', strength=8.0)
mat('ArenaWax', '#efe3cc', 0.55)
mat('ArenaFlame', '#ffb347', 0.5, emit='#ffa040', strength=14.0)
mat('ArenaCrystal', '#ff3d8b', 0.06, emit=PINK, strength=1.2)
mat('ArenaCardEdge', '#ece4d6', 0.7)
mat('ArenaChip', '#ffffff', 0.38, coat=0.3, tint=True)
mat('ArenaChipInlay', '#f3ead8', 0.45)


# =============================================================================== maths
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(radians(deg), 4, axis)


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


YUP = R('X', 90)      # monde Y-up -> Blender : (x, y, z) -> (x, -z, y)
ZTOY = R('X', -90)    # primitives d'axe Z -> axe Y : (x, y, z) -> (x, z, -y)


def W(x, y, z):
    """Point du monde Y-up -> Blender."""
    return Vector((x, -z, y))


def basis(o, right, up, normal):
    """Matrice de colonnes right, up, normal, translation o (monde Y-up)."""
    r, u, n = Vector(right), Vector(up), Vector(normal)
    return Matrix(((r.x, u.x, n.x, o[0]), (r.y, u.y, n.y, o[1]), (r.z, u.z, n.z, o[2]), (0, 0, 0, 1)))


def linspace(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def catmull(pts, n=6, closed=False):
    P = [Vector(p) for p in pts]
    m = len(P)
    out = []
    for i in range(m if closed else m - 1):
        p1, p2 = P[i], P[(i + 1) % m]
        p0 = P[(i - 1) % m] if closed else P[max(i - 1, 0)]
        p3 = P[(i + 2) % m] if closed else P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(P[-1].copy())
    return out


def rrect(w, h, r, n=4):
    """Rectangle arrondi centré (profil 2D, sens trigonométrique)."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, -h / 2 + r, -90), (w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                       (-w / 2 + r, -h / 2 + r, 180)):
        for k in range(n + 1):
            a = radians(a0 + 90 * k / n)
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


# =============================================================================== primitives (bmesh)
def box(sx, sy, sz, bev=0.0, seg=1):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=S(sx, sy, sz))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=min(bev, 0.45 * min(sx, sy, sz)),
                        offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm


def revolve(prof, segs=24, loop=False):
    """Révolution d'un profil (r, z) autour de Z. Les points de rayon nul deviennent des pôles."""
    bm = bmesh.new()
    rings = []
    for r, z in prof:
        if r < 1e-7 and not loop:
            v = bm.verts.new((0, 0, z))
            rings.append([v] * segs)
        else:
            rings.append([bm.verts.new((r * cos(2 * pi * j / segs), r * sin(2 * pi * j / segs), z))
                          for j in range(segs)])
    n = len(prof)
    for i in range(n if loop else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
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


def lathe(prof, segs=24):
    """Révolution d'un profil (r, y) autour de l'axe Y du monde."""
    return xf(revolve(prof, segs), ZTOY)


def cyl(r, h, segs=16, bev=0.0):
    b = min(bev, 0.4 * r, 0.4 * h)
    if b > 0:
        prof = [(0, -h / 2), (r - b, -h / 2), (r, -h / 2 + b), (r, h / 2 - b), (r - b, h / 2), (0, h / 2)]
    else:
        prof = [(0, -h / 2), (r, -h / 2), (r, h / 2), (0, h / 2)]
    return revolve(prof, segs)


def dome(r, h, segs=8):
    return revolve([(0, 0), (r, 0), (r * 0.92, h * 0.45), (r * 0.58, h * 0.88), (0, h)], segs)


def xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    if M.to_3x3().determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def frames_along(path, up):
    n = len(path)
    out = []
    for i in range(n):
        t = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        t.normalize()
        u = Vector(up)
        nn = u - t * u.dot(t)
        if nn.length < 1e-6:
            nn = t.orthogonal()
        nn.normalize()
        out.append((t, nn, t.cross(nn)))
    return out


def tube(path, r, segs=8, up=(0, 1, 0)):
    """Tube de rayon r le long d'un chemin ouvert (monde), bouché aux deux bouts."""
    path = [Vector(p) for p in path]
    bm = bmesh.new()
    rings = []
    for p, (t, nn, b) in zip(path, frames_along(path, up)):
        rings.append([bm.verts.new(p + (b * cos(2 * pi * k / segs) + nn * sin(2 * pi * k / segs)) * r)
                      for k in range(segs)])
    for A, B in zip(rings, rings[1:]):
        for k in range(segs):
            bm.faces.new([A[k], A[(k + 1) % segs], B[(k + 1) % segs], B[k]])
    bm.faces.new(rings[0])
    bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def slab(poly, y0, y1):
    """Polygone (x, z) extrudé en Y de y0 à y1."""
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in poly]
    b = [bm.verts.new((x, y1, z)) for x, z in poly]
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([a[i], a[j], b[j], b[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def band(outer, inner, y0, y1):
    """Bande fermée entre deux contours (x, z) de même nombre de points, extrudée de y0 à y1."""
    bm = bmesh.new()
    n = len(outer)
    ob = [bm.verts.new((x, y0, z)) for x, z in outer]
    ot = [bm.verts.new((x, y1, z)) for x, z in outer]
    ib = [bm.verts.new((x, y0, z)) for x, z in inner]
    it = [bm.verts.new((x, y1, z)) for x, z in inner]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([ot[i], ot[j], it[j], it[i]])
        bm.faces.new([ob[i], ib[i], ib[j], ob[j]])
        bm.faces.new([ob[i], ob[j], ot[j], ot[i]])
        bm.faces.new([ib[i], it[i], it[j], ib[j]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def annulus(r0, r1, y0, y1, segs=96, cx=0.0, cz=0.0):
    outer = [(cx + r1 * cos(2 * pi * k / segs), cz + r1 * sin(2 * pi * k / segs)) for k in range(segs)]
    inner = [(cx + r0 * cos(2 * pi * k / segs), cz + r0 * sin(2 * pi * k / segs)) for k in range(segs)]
    return band(outer, inner, y0, y1)


def disc(r, y0, y1, segs=96, cx=0.0, cz=0.0):
    return slab([(cx + r * cos(2 * pi * k / segs), cz + r * sin(2 * pi * k / segs)) for k in range(segs)], y0, y1)


def _curve_to_bm(cu):
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
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    return bm


def curve_fill(polys, depth, bevel=0.0):
    """Polygones 2D (plan XY) remplis (pair-impair) et extrudés en Z (±depth/2)."""
    cu = bpy.data.curves.new('tmp_fill', 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = 1
    for poly in polys:
        sp = cu.splines.new('POLY')
        sp.points.add(len(poly) - 1)
        for p, (x, y) in zip(sp.points, poly):
            p.co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    return _curve_to_bm(cu)


def text_bm(ch, font, depth, bevel, res=4):
    cu = bpy.data.curves.new('tmp_txt', 'FONT')
    cu.body = ch
    cu.font = font
    cu.size = 1.0
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = 1
    cu.resolution_u = res
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    return _curve_to_bm(cu)


# Logo B de BoulardTV (btv_logo.svg de Mathis, 128 × 197, recopié ici pour que le script se suffise) :
# deux panses et le fût. Courbes de Bézier cubiques absolues.
LOGO_SVG = [
    'M87.2761 52.7363C89.3387 11.4023 54.6181 0.458078 37 0.152715C67.0797 -1.31303 127.387 7.15164 127.976 '
    '52.7363C128.565 98.3209 67.5708 104.465 37 101.839C52.8993 102.694 85.2135 94.0703 87.2761 52.7363Z',
    'M87.2761 146.736C89.3387 105.402 54.6181 94.4581 37 94.1527C67.0797 92.687 127.387 101.152 127.976 '
    '146.736C128.565 192.321 67.5708 198.465 37 195.839C52.8993 196.694 85.2135 188.07 87.2761 146.736Z',
    'M4.99763 19C13.5003 89.5 13.5003 91.5 -0.000134242 174C24.5003 95.5 42.5 103.5 85.9999 100C41.5 90.5 '
    '27.0003 93 4.99763 19Z',
]


def svg_path(d, steps=16):
    """Chemin SVG (M, L, C, Z absolus) -> polygones, y vers le haut."""
    toks = re.findall(r'[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?', d)
    polys, pts, cur, cmd, i = [], [], (0.0, 0.0), None, 0
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd == 'Z' and pts:
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
            for k in range(1, steps + 1):
                s = k / steps
                a, b, c, e = (1 - s) ** 3, 3 * (1 - s) ** 2 * s, 3 * (1 - s) * s * s, s ** 3
                pts.append((a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0],
                            a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]))
            cur = p3
            i += 6
        else:
            raise SystemExit(f'commande SVG non gérée : {cmd}')
    if pts:
        polys.append(pts)
    out = []
    for p in polys:
        if len(p) > 2 and (Vector(p[0]) - Vector(p[-1])).length < 1e-4:
            p = p[:-1]
        out.append([(x, -y) for x, y in p])
    return out


# =============================================================================== stade (table)
def ring_pts(r, n_line, n_arc, half=L):
    """Contour d'un stade (demi-longueur droite `half`, rayon r) : [(x, z, ox, oz)] avec la normale
    sortante. Même nombre de points quel que soit r (lofts). Départ en (-half, -r), côté adverse."""
    pts = []
    for i in range(n_line):
        pts.append((-half + 2 * half * i / n_line, -r, 0.0, -1.0))
    for j in range(n_arc):
        a = -pi / 2 + pi * j / n_arc
        pts.append((half + r * cos(a), r * sin(a), cos(a), sin(a)))
    for i in range(n_line):
        pts.append((half - 2 * half * i / n_line, r, 0.0, 1.0))
    for j in range(n_arc):
        a = pi / 2 + pi * j / n_arc
        pts.append((-half + r * cos(a), r * sin(a), cos(a), sin(a)))
    return pts


def counts(r, step, half=L):
    return max(2, round(2 * half / step)), max(4, round(pi * r / step))


def arclen(ring):
    S = [0.0]
    for i in range(1, len(ring) + 1):
        a, b = ring[i - 1], ring[i % len(ring)]
        S.append(S[-1] + hypot(b[0] - a[0], b[1] - a[1]))
    return S


def prof_info(prof):
    """Abscisse curviligne et normales sortantes 2D d'un profil fermé (px, py)."""
    m = len(prof)
    Tt = [0.0]
    for j in range(1, m + 1):
        a, b = prof[j - 1], prof[j % m]
        Tt.append(Tt[-1] + hypot(b[0] - a[0], b[1] - a[1]))
    area = sum(prof[j][0] * prof[(j + 1) % m][1] - prof[(j + 1) % m][0] * prof[j][1] for j in range(m)) / 2
    sgn = 1 if area > 0 else -1
    nrm = []
    for j in range(m):
        a, b = prof[j - 1], prof[(j + 1) % m]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = hypot(tx, ty) or 1.0
        nrm.append((sgn * ty / l, -sgn * tx / l))
    return Tt, nrm


def stadium_sweep(r_c, prof, step, uv_s=1.0, uv_t=1.0, swap=False, disp=None, half=L, n=None):
    """Profil fermé (px vers l'extérieur, py vers le haut, relatif à TABLE_Y... ou absolu) balayé le long
    d'un stade de rayon r_c. disp(s, t) : décalage selon la normale du profil. UV : (s/uv_s, t/uv_t), ou
    inversées (swap : le fil du bois suit le chemin). UV par coin : pas de couture d'ombrage."""
    n_line, n_arc = n or counts(r_c, step, half)
    ring = ring_pts(r_c, n_line, n_arc, half)
    S = arclen(ring)
    Tt, nrm = prof_info(prof)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    verts = []
    for i, (x, z, ox, oz) in enumerate(ring):
        row = []
        for j, (px, py) in enumerate(prof):
            d = disp(S[i], Tt[j]) if disp else 0.0
            qx, qy = px + nrm[j][0] * d, py + nrm[j][1] * d
            row.append(bm.verts.new((x + ox * qx, qy, z + oz * qx)))
        verts.append(row)
    N, m = len(ring), len(prof)
    for i in range(N):
        i2 = (i + 1) % N
        for j in range(m):
            j2 = (j + 1) % m
            f = bm.faces.new((verts[i][j], verts[i2][j], verts[i2][j2], verts[i][j2]))
            for loop, (si, tj) in zip(f.loops, ((S[i], Tt[j]), (S[i + 1], Tt[j]), (S[i + 1], Tt[j + 1]),
                                                 (S[i], Tt[j + 1]))):
                u, v = si / uv_s, tj / uv_t
                loop[uvl].uv = (v, u) if swap else (u, v)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def stadium_fill(r, y, step=0.25, half=L, uv_scale=None, down=False):
    """Face plane du stade (un n-gone convexe), UV planes (x, z) / uv_scale."""
    ring = ring_pts(r, *counts(r, step, half), half)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap') if uv_scale else None
    vs = [bm.verts.new((x, y, z)) for x, z, _, _ in ring]
    f = bm.faces.new(vs if down else vs[::-1])
    if uvl:
        for loop in f.loops:
            loop[uvl].uv = (loop.vert.co.x / uv_scale, loop.vert.co.z / uv_scale)
    f.normal_update()
    if (f.normal.y < 0) != down:
        bmesh.ops.reverse_faces(bm, faces=[f])
    return bm


def stadium_loft(sections, n_line, n_arc, half=L, uv_s=4.0, uv_y=4.0, cap_top=True, cap_bottom=False):
    """Peau entre des contours de stade [(y, r)] (même topologie), UV (s/uv_s, y/uv_y)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    rows, Ss = [], []
    for y, r in sections:
        ring = ring_pts(r, n_line, n_arc, half)
        Ss.append(arclen(ring))
        rows.append([bm.verts.new((x, y, z)) for x, z, _, _ in ring])
    N = len(rows[0])
    for k in range(len(rows) - 1):
        A, B = rows[k], rows[k + 1]
        ya, yb = sections[k][0], sections[k + 1][0]
        for i in range(N):
            i2 = (i + 1) % N
            f = bm.faces.new((A[i], A[i2], B[i2], B[i]))
            for loop, (s, y) in zip(f.loops, ((Ss[k][i], ya), (Ss[k][i + 1], ya), (Ss[k + 1][i + 1], yb),
                                               (Ss[k + 1][i], yb))):
                loop[uvl].uv = (s / uv_s, y / uv_y)
    if cap_top:
        bm.faces.new(rows[-1] if sections[-1][0] > sections[0][0] else rows[-1][::-1])
    if cap_bottom:
        bm.faces.new(rows[0])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


# =============================================================================== assemblage
class Geo:
    """Un maillage final (un nœud glTF), multi-matériaux, construit en ajoutant des primitives."""

    def __init__(self, uv=False):
        self.bm = bmesh.new()
        self.mats = []
        self.uv = self.bm.loops.layers.uv.new('UVMap') if uv else None

    def mi(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def add(self, src, M=None, mat='ArenaBrass', uv=None):
        """uv : None (UV de la source), 'box' (projection selon la normale, en unités monde / 2),
        ou une fonction de la position."""
        M = Matrix.Identity(4) if M is None else M
        flip = M.to_3x3().determinant() < 0
        NM = M.to_3x3().inverted_safe().transposed()
        vs = [self.bm.verts.new(M @ v.co) for v in src.verts]
        src.verts.index_update()
        src_uv = src.loops.layers.uv.active
        names = mat if isinstance(mat, (list, tuple)) else None
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
            nf.material_index = self.mi(names[min(f.material_index, len(names) - 1)] if names else mat)
            if self.uv is not None:
                n = (NM @ f.normal).normalized()
                for l, sl in zip(nf.loops, loops):
                    co = l.vert.co
                    if uv == 'box':
                        ax = max(range(3), key=lambda k: abs(n[k]))
                        a, b = ((co.z, co.y), (co.x, co.z), (co.x, co.y))[ax]
                        l[self.uv].uv = (a / 2.0, b / 2.0)
                    elif callable(uv):
                        l[self.uv].uv = uv(co)
                    elif src_uv is not None:
                        l[self.uv].uv = sl[src_uv].uv
        src.free()


COLLS = {}
EXPORT = []


def new_coll(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    COLLS[name] = c
    return c


def to_mesh(geo, name, sharp=40):
    me = bpy.data.meshes.new(name + '_Mesh')
    geo.bm.to_mesh(me)
    geo.bm.free()
    for n in geo.mats:
        me.materials.append(MAT[n])
    me.transform(YUP)
    me.set_sharp_from_angle(angle=radians(sharp))
    return me


def finish(geo, name, coll, sharp=40, wn=True):
    """Objet unique (maillage propre), normales pondérées appliquées à l'export."""
    me = to_mesh(geo, name, sharp)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    if wn:
        m = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
        m.keep_sharp = True
        m.mode = 'FACE_AREA'
    assert ob.name == name, f'nom en double : {ob.name}'
    EXPORT.append(ob)
    report(ob)
    return ob


def instances(geo, proto, coll, placements, sharp=40):
    """Doublons liés d'un même maillage (sans modificateur : le maillage glTF reste partagé).
    placements : [(nom, (x, y, z) monde, lacet en radians, extras ou None)]."""
    me = to_mesh(geo, proto, sharp)
    out = []
    for name, pos, yaw, extra in placements:
        ob = bpy.data.objects.new(name, me)
        coll.objects.link(ob)
        ob.location = W(*pos)
        ob.rotation_euler = (0.0, 0.0, yaw)
        if extra:
            for k, v in extra.items():
                ob[k] = v
            if 'tint' in extra:
                ob.color = (*lin(extra['tint']), 1.0)
        assert ob.name == name, f'nom en double : {ob.name}'
        EXPORT.append(ob)
        out.append(ob)
    print(f'  {proto:22s} x{len(out):3d}  {len(me.vertices):6d} sommets  {[m.name for m in me.materials]}')
    return out


def report(ob):
    me = ob.data
    print(f'  {ob.name:22s} {len(me.vertices):7d} sommets  {len(me.polygons):7d} faces  '
          f'{[m.name for m in me.materials]}')


# =============================================================================== table
def rail_profile(m=56):
    """Section de la bande capitonnée : super-ellipse aplatie dessous, départ au milieu du dessous."""
    pts = []
    for k in range(m):
        a = -pi / 2 + 2 * pi * k / m
        c, s = cos(a), sin(a)
        px = RAIL_HW * math.copysign(abs(c) ** (2 / 2.8), c)
        py = RAIL_YC + RAIL_HH * math.copysign(abs(s) ** (2 / 2.8), s)
        pts.append((px, max(py, RAIL_Y0)))
    return pts


def build_table():
    C = new_coll('Table')
    brass = Geo()
    gold = Geo()
    wood = Geo(uv=True)
    obsidian = Geo()
    led = Geo()
    gems = Geo()

    # ------------------------------------------------------------ tapis de velours
    F = Geo(uv=True)
    F.add(stadium_fill(R_FELT + 0.02, TABLE_Y, 0.2, uv_scale=3.2), mat='ArenaFelt')
    finish(F, 'Arena_Felt', C, wn=False)

    # ------------------------------------------------------------ filet de laiton tapis / bois
    brass.add(stadium_sweep(R_FELT, [(-0.045, TABLE_Y - 0.03), (0.045, TABLE_Y - 0.03)]
                            + [(0.045 * cos(a), TABLE_Y + 0.045 * sin(a)) for a in linspace(0, pi, 9)],
                            0.12), mat='ArenaBrass')

    # ------------------------------------------------------------ piste en bois de rose laqué
    rc = (R_FELT + R_WOOD) / 2
    prof = [(-0.30, TABLE_Y - 0.10), (0.42, TABLE_Y - 0.10), (0.42, TABLE_Y + 0.09), (-0.22, TABLE_Y + 0.09),
            (-0.27, TABLE_Y + 0.075), (-0.30, TABLE_Y + 0.03)]
    wood.add(stadium_sweep(rc, prof, 0.12, uv_s=6.0, uv_t=1.6, swap=True), mat='ArenaWood')
    # Deux filets de laiton incrustés dans la piste
    for r in (4.80, 5.02):
        brass.add(stadium_sweep(r, [(-0.013, TABLE_Y + 0.085), (0.013, TABLE_Y + 0.085), (0.013, TABLE_Y + 0.097),
                                    (-0.013, TABLE_Y + 0.097)], 0.12), mat='ArenaBrass')

    # ------------------------------------------------------------ bande de cuir capitonnée
    prof = rail_profile()
    Tt, nrm = prof_info(prof)
    total = Tt[-1]
    # Bande capitonnée : du flanc extérieur (sous le milieu) au flanc intérieur haut
    m = len(prof)
    ang = [-pi / 2 + 2 * pi * k / m for k in range(m)]
    t_a = Tt[min(range(m), key=lambda k: abs(ang[k] - (-0.12 * pi)))]
    t_b = Tt[min(range(m), key=lambda k: abs(ang[k] - 0.86 * pi))]
    n_line, n_arc = counts(R_RAIL, 0.075)
    ring = ring_pts(R_RAIL, n_line, n_arc)
    Sr = arclen(ring)
    P = Sr[-1]
    cells = round(P / 0.95)
    Ls = P / cells
    rows = 3
    Lt = (t_b - t_a) / rows
    t_mid = (t_a + t_b) / 2
    DEPTH = 0.085

    def tuft(s, t):
        if t <= t_a or t >= t_b:
            return 0.0
        w = smooth(0, 0.06, t - t_a) * smooth(0, 0.06, t_b - t)
        u, v = s / Ls, (t - t_mid) / Lt
        puff = abs(sin(pi * (u + v)) * sin(pi * (u - v))) ** 0.35
        return DEPTH * (puff - 1.0) * w

    Rg = Geo(uv=True)
    Rg.add(stadium_sweep(R_RAIL, prof, 0.075, uv_s=2.2, uv_t=2.2, disp=tuft, n=(n_line, n_arc)),
           mat='ArenaLeather')

    def ring_at(s):
        s = s % P
        for i in range(len(ring)):
            if Sr[i + 1] >= s:
                k = (s - Sr[i]) / max(1e-9, Sr[i + 1] - Sr[i])
                a, b = ring[i], ring[(i + 1) % len(ring)]
                o = Vector((a[2] + (b[2] - a[2]) * k, 0, a[3] + (b[3] - a[3]) * k)).normalized()
                return Vector((a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k)), o
        return Vector((ring[0][0], 0, ring[0][1])), Vector((ring[0][2], 0, ring[0][3]))

    def prof_at(t):
        for j in range(m):
            if Tt[j + 1] >= t:
                k = (t - Tt[j]) / max(1e-9, Tt[j + 1] - Tt[j])
                a, b = prof[j], prof[(j + 1) % m]
                na, nb = nrm[j], nrm[(j + 1) % m]
                n = Vector((na[0] + (nb[0] - na[0]) * k, na[1] + (nb[1] - na[1]) * k)).normalized()
                return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k), n
        return prof[0], Vector(nrm[0])

    def surface(s, t, lift=0.0):
        c, o = ring_at(s)
        (px, py), n2 = prof_at(t)
        d = tuft(s, t) + lift
        pos = c + o * (px + n2.x * d) + Vector((0, py + n2.y * d, 0))
        nor = (o * n2.x + Vector((0, n2.y, 0))).normalized()
        return pos, nor

    # Boutons gainés de cuir aux croisements des plis, passepoils le long des bords de la bande
    button = dome(0.055, 0.03, 10)
    nb = 0
    for k in range(-rows - 2, 2 * cells + rows + 2):
        for mm in range(-rows - 2, 2 * cells + rows + 2):
            u, v = (k + mm) / 2, (k - mm) / 2
            if u < 0 or u >= cells:
                continue
            t = t_mid + v * Lt
            if t < t_a + 0.08 or t > t_b - 0.08:
                continue
            pos, nor = surface(u * Ls, t, 0.004)
            Z = nor
            X = Vector((0, 1, 0)).cross(Z)
            if X.length < 1e-6:
                X = Vector((1, 0, 0))
            X.normalize()
            Y = Z.cross(X)
            M = Matrix((X, Y, Z)).transposed().to_4x4()
            M.translation = pos
            Rg.add(button.copy(), M, 'ArenaLeather')
            nb += 1
    button.free()
    for t in (t_a, t_b):
        path = [surface(s, t, 0.0)[0] for s in linspace(0, P, int(P / 0.12) + 1)]
        path[-1] = path[0].copy()
        Rg.add(tube(path, 0.028, 8), mat='ArenaLeather')
    finish(Rg, 'Arena_Rail', C)
    print('  boutons du capitonnage :', nb, ' cellules :', cells, ' Ls', round(Ls, 3), ' Lt', round(Lt, 3))

    # ------------------------------------------------------------ ceinture (bois laqué), jonc de laiton
    prof = [(-0.12, TABLE_Y - 0.86), (0.0, TABLE_Y - 0.86), (0.0, TABLE_Y - 0.68), (0.035, TABLE_Y - 0.64),
            (0.035, TABLE_Y - 0.22), (0.0, TABLE_Y - 0.18), (0.02, TABLE_Y - 0.10), (0.0, TABLE_Y + 0.10),
            (-0.12, TABLE_Y + 0.10)]
    wood.add(stadium_sweep(R_APRON, prof, 0.12, uv_s=6.0, uv_t=1.6, swap=True), mat='ArenaWood')
    brass.add(stadium_sweep(R_APRON, [(0.0, TABLE_Y - 0.80), (0.05, TABLE_Y - 0.80), (0.05, TABLE_Y - 0.72),
                                      (0.0, TABLE_Y - 0.72)], 0.12), mat='ArenaBrass')
    brass.add(stadium_sweep(R_APRON, [(0.0, TABLE_Y - 0.205), (0.05, TABLE_Y - 0.205), (0.05, TABLE_Y - 0.175),
                                      (0.0, TABLE_Y - 0.175)], 0.12), mat='ArenaBrass')
    # Dessous : plateau noir, filet lumineux rose (lumière rasante sur le sol)
    obsidian.add(stadium_fill(R_APRON - 0.08, TABLE_Y - 0.86, 0.25, down=True), mat='ArenaObsidian')
    led.add(stadium_sweep(5.85, [(-0.035, TABLE_Y - 0.91), (0.035, TABLE_Y - 0.91), (0.035, TABLE_Y - 0.86),
                                 (-0.035, TABLE_Y - 0.86)], 0.15), mat='ArenaLed')

    # ------------------------------------------------------------ pied central (bois), socle (marbre noir)
    HALF_P = 3.4
    nl, na = 16, 20
    y_top, y_bot = TABLE_Y - 0.86, FLOOR_Y + 0.75
    sec = [(y_top, 2.0), (y_top - 0.25, 1.9), (y_top - 0.8, 1.55), (-2.6, 1.32), (-3.6, 1.5), (-4.3, 1.95),
           (y_bot, 2.32)]
    wood.add(stadium_loft(sec[::-1], nl, na, HALF_P, cap_top=True), mat='ArenaWood')
    for y, r in ((y_top - 0.06, 2.02), (-2.6, 1.34), (y_bot + 0.05, 2.33)):
        brass.add(stadium_sweep(r, [(-0.02, y - 0.05), (0.02, y - 0.05)]
                                + [(0.02 + 0.05 * cos(a), y + 0.05 * sin(a)) for a in linspace(-pi / 2, pi / 2, 7)]
                                + [(0.02, y + 0.05), (-0.02, y + 0.05)], 0.2, half=HALF_P), mat='ArenaBrass')
    obsidian.add(stadium_loft([(FLOOR_Y, 3.0), (FLOOR_Y + 0.62, 3.0), (y_bot, 2.86)], nl, na, HALF_P,
                              cap_top=True), mat='ArenaObsidian')
    brass.add(stadium_sweep(2.9, [(-0.02, y_bot - 0.12), (0.06, y_bot - 0.12), (0.06, y_bot - 0.08),
                                  (-0.02, y_bot - 0.08)], 0.2, half=HALF_P), mat='ArenaBrass')

    # ------------------------------------------------------------ écussons de laiton sur la ceinture
    shield = [(0.0, 0.36), (0.26, 0.24), (0.33, 0.0), (0.26, -0.24), (0.0, -0.36), (-0.26, -0.24), (-0.33, 0.0),
              (-0.26, 0.24)]
    shield = catmull(shield + [shield[0]], 4, closed=False)[:-1]
    shield2d = [(p.x, p.y) for p in shield]
    spots = [((-L, -R_APRON - 0.035), (0, 0, -1)), ((L, -R_APRON - 0.035), (0, 0, -1)),
             ((-L, R_APRON + 0.035), (0, 0, 1)), ((L, R_APRON + 0.035), (0, 0, 1)),
             ((L + R_APRON + 0.035, 0.0), (1, 0, 0)), ((-L - R_APRON - 0.035, 0.0), (-1, 0, 0))]
    for (x, z), nrm3 in spots:
        n3 = Vector(nrm3)
        right = Vector((0, 1, 0)).cross(n3)
        M = basis((x, TABLE_Y - 0.44, z), right, (0, 1, 0), n3)
        plate = curve_fill([shield2d], 0.04, 0.012)
        brass.add(plate, M, 'ArenaBrass')
        rim = curve_fill([[(px * 1.15, py * 1.15) for px, py in shield2d], [(px * 0.95, py * 0.95) for px, py in shield2d]],
                         0.06, 0.008)
        brass.add(rim, M, 'ArenaBrass')
        gems.add(dome(0.11, 0.09, 16), M @ T(0, 0, 0.02), 'ArenaCrystal')

    # ------------------------------------------------------------ emplacements des cartes
    for i, x in enumerate(SLOT_X):
        outer = rrect(SLOT_W, SLOT_H, SLOT_R, 5)
        inner = rrect(SLOT_W - 0.1, SLOT_H - 0.1, SLOT_R - 0.05, 5)
        gold.add(band([(x + a, SLOT_Z + b) for a, b in outer], [(x + a, SLOT_Z + b) for a, b in inner],
                      TABLE_Y - 0.01, TABLE_Y + 0.008), mat='ArenaGold')
        o2 = rrect(SLOT_W - 0.30, SLOT_H - 0.30, SLOT_R - 0.15, 5)
        i2 = rrect(SLOT_W - 0.33, SLOT_H - 0.33, SLOT_R - 0.165, 5)
        gold.add(band([(x + a, SLOT_Z + b) for a, b in o2], [(x + a, SLOT_Z + b) for a, b in i2],
                      TABLE_Y - 0.01, TABLE_Y + 0.004), mat='ArenaGold')
        # Losanges d'or aux quatre coins, à l'extérieur du liseré
        for sx in (-1, 1):
            for sz in (-1, 1):
                cx, cz = x + sx * (SLOT_W / 2 + 0.12), SLOT_Z + sz * (SLOT_H / 2 + 0.12)
                d = 0.09
                gold.add(slab([(cx + d, cz), (cx, cz + d), (cx - d, cz), (cx, cz - d)], TABLE_Y - 0.01,
                              TABLE_Y + 0.01), mat='ArenaGold')
        # Filet lumineux : allumé par le code quand la carte se pose (Arena_Slot<i>_Glow)
        o3 = rrect(SLOT_W - 0.16, SLOT_H - 0.16, SLOT_R - 0.08, 5)
        i3 = rrect(SLOT_W - 0.22, SLOT_H - 0.22, SLOT_R - 0.11, 5)
        G = Geo()
        G.add(band([(x + a, SLOT_Z + b) for a, b in o3], [(x + a, SLOT_Z + b) for a, b in i3],
                   TABLE_Y - 0.01, TABLE_Y + 0.003), mat='ArenaSlotGlow')
        finish(G, f'Arena_Slot{i}_Glow', C, wn=False)

    # ------------------------------------------------------------ médaillon du B (or, émail rose sombre, néon)
    cx, cz = MEDAL
    enamel = Geo()
    enamel.add(disc(1.30, TABLE_Y - 0.01, TABLE_Y + 0.004, 96, cx, cz), mat='ArenaEnamel')
    finish(enamel, 'Arena_Enamel', C, wn=False)
    gold.add(annulus(1.30, 1.40, TABLE_Y - 0.01, TABLE_Y + 0.014, 96, cx, cz), mat='ArenaGold')
    gold.add(annulus(1.72, 1.765, TABLE_Y - 0.01, TABLE_Y + 0.008, 120, cx, cz), mat='ArenaGold')
    led.add(annulus(1.17, 1.205, TABLE_Y - 0.01, TABLE_Y + 0.006, 96, cx, cz), mat='ArenaLed')
    # Le B : lisible depuis le joueur (haut du B vers -z)
    polys = [p for d in LOGO_SVG for p in svg_path(d)]
    hB = 1.5
    k = hB / 197.0
    for poly in polys:
        pts2 = [((x - 64.0) * k, (y + 98.5) * k) for x, y in poly]
        bmB = curve_fill([pts2], 0.035, 0.006)
        gold.add(bmB, basis((cx, TABLE_Y + 0.015, cz), (1, 0, 0), (0, 0, -1), (0, 1, 0)), 'ArenaGold')
    # BOULARDTV gravé en arc côté adverse, petits losanges côté joueur
    font = bpy.data.fonts.load(FONT)
    word = 'BOULARDTV'
    r_txt = 1.56
    span = radians(84)
    for i, ch in enumerate(word):
        th = -span / 2 + span * i / (len(word) - 1)
        right = Vector((cos(th), 0, sin(th)))
        up = Vector((sin(th), 0, -cos(th)))
        o = Vector((cx, TABLE_Y + 0.006, cz)) + up * r_txt
        M = basis(o, right, up, (0, 1, 0)) @ S(0.3)
        gold.add(text_bm(ch, font, 0.04, 0.0), M, 'ArenaGold')
    for i in range(9):
        th = pi + radians(-56 + 14 * i)
        up = Vector((sin(th), 0, -cos(th)))
        o = Vector((cx, 0, cz)) + up * r_txt
        d = 0.05 if i % 2 else 0.075
        gold.add(slab([(o.x + d, o.z), (o.x, o.z + d), (o.x - d, o.z), (o.x, o.z - d)], TABLE_Y - 0.01,
                      TABLE_Y + 0.01), mat='ArenaGold')

    # ------------------------------------------------------------ sabot du paquet (bois, laiton) et cartes
    dx, dz = DECK
    ow, od, th = 1.62, 2.12, 0.12
    walls = [((0, -od / 2 + th / 2), (ow, th)), ((0, od / 2 - th / 2), (ow, th)),
             ((-ow / 2 + th / 2, 0), (th, od - 2 * th)), ((ow / 2 - th / 2, 0), (th, od - 2 * th))]
    for (ax, az), (sx, sz) in walls:
        wood.add(box(sx, TRAY_H, sz, 0.015), T(dx + ax, TABLE_Y + TRAY_H / 2, dz + az), 'ArenaWood', uv='box')
        brass.add(box(sx + 0.02, 0.025, sz + 0.02, 0.008), T(dx + ax, TABLE_Y + TRAY_H + 0.0125, dz + az),
                  'ArenaBrass')
    wood.add(box(ow - 0.02, 0.06, od - 0.02, 0.01), T(dx, TABLE_Y + 0.03, dz), 'ArenaWood', uv='box')
    for sx in (-1, 1):
        for sz in (-1, 1):
            brass.add(box(0.2, TRAY_H + 0.04, 0.2, 0.02), T(dx + sx * (ow / 2 - 0.07), TABLE_Y + TRAY_H / 2 + 0.01,
                                                           dz + sz * (od / 2 - 0.07)), 'ArenaBrass')
    St = Geo()
    St.add(box(1.24, STACK_TOP - TABLE_Y - 0.06, 1.74, 0.02), T(dx, (STACK_TOP + TABLE_Y + 0.06) / 2, dz),
           'ArenaCardEdge')
    finish(St, 'Arena_DeckStack', C, wn=False)

    # ------------------------------------------------------------ bouton du donneur (ivoire, or, B)
    D = Geo()
    bx, bz = -3.1, -3.2
    D.add(xf(cyl(0.7, 0.18, 48, 0.03), ZTOY), T(bx, TABLE_Y + 0.09, bz), 'ArenaChipInlay')
    D.add(annulus(0.56, 0.62, TABLE_Y + 0.17, TABLE_Y + 0.186, 64, bx, bz), mat='ArenaGold')
    for poly in polys:
        pts2 = [((x - 64.0) * 0.0042, (y + 98.5) * 0.0042) for x, y in poly]
        D.add(curve_fill([pts2], 0.02, 0.0), basis((bx, TABLE_Y + 0.185, bz), (1, 0, 0), (0, 0, -1), (0, 1, 0)),
              'ArenaGold')
    finish(D, 'Arena_Dealer', C, wn=False)

    # ------------------------------------------------------------ anneaux de laiton incrustés dans le sol
    brass.add(annulus(15.0, 15.12, FLOOR_Y - 0.02, FLOOR_Y + 0.004, 256), mat='ArenaBrass')
    brass.add(annulus(15.42, 15.47, FLOOR_Y - 0.02, FLOOR_Y + 0.004, 256), mat='ArenaBrass')

    finish(wood, 'Arena_Wood', C)
    finish(brass, 'Arena_Brass', C)
    finish(gold, 'Arena_Gold', C, sharp=30)
    finish(obsidian, 'Arena_Obsidian', C)
    finish(led, 'Arena_Led', C, wn=False)
    finish(gems, 'Arena_Gems', C, wn=False)


# =============================================================================== jetons et pions
CHIP_R, CHIP_H = 0.6, 0.11
TINTS = {'pink': '#ff2d78', 'violet': '#6c2fe0', 'black': '#1a1420', 'ivory': '#efe6f2'}
STACKS = [
    ((-7.4, 2.0), 'pink', 9), ((-6.6, 3.0), 'violet', 6), ((-8.1, 1.2), 'black', 12), ((-6.2, 1.85), 'ivory', 4),
    ((5.8, -3.0), 'black', 7), ((6.6, -2.3), 'pink', 11), ((7.0, -3.05), 'violet', 5),
    ((-5.9, -3.0), 'ivory', 8), ((-6.8, -2.1), 'pink', 5),
]


def build_chips():
    C = new_coll('Chips')
    G = Geo()
    G.add(xf(cyl(CHIP_R, CHIP_H, 48, 0.014), ZTOY), mat='ArenaChip')
    # Huit plaquettes ivoire sur la tranche, disque central et anneau d'or sur les deux faces
    for k in range(8):
        a = 2 * pi * k / 8
        M = T(CHIP_R * cos(a), 0, CHIP_R * sin(a)) @ R('Y', -math.degrees(a))
        G.add(box(0.03, CHIP_H + 0.004, 0.17, 0.006), M, 'ArenaChipInlay')
    for sy in (-1, 1):
        G.add(disc(0.34, sy * CHIP_H / 2 - sy * 0.004, sy * (CHIP_H / 2 + 0.003), 40), mat='ArenaChipInlay')
        G.add(annulus(0.36, 0.40, sy * CHIP_H / 2 - sy * 0.004, sy * (CHIP_H / 2 + 0.004), 48), mat='ArenaGold')
    placements = []
    n = 0
    for (x, z), tint, count in STACKS:
        for k in range(count):
            jx, jz = random.uniform(-0.025, 0.025), random.uniform(-0.025, 0.025)
            pos = (x + jx, TABLE_Y + CHIP_H / 2 + 0.003 + k * (CHIP_H + 0.004), z + jz)
            placements.append((f'Arena_Chip_{n:03d}', pos, random.uniform(0, 2 * pi), {'tint': TINTS[tint]}))
            n += 1
    instances(G, 'Arena_ChipMesh', C, placements, sharp=50)

    P = Geo()
    P.add(lathe([(0, 0), (0.46, 0), (0.46, 0.06), (0.4, 0.1), (0.28, 0.16), (0.2, 0.26), (0.17, 0.42),
                 (0.26, 0.48), (0.27, 0.53), (0.2, 0.56), (0, 0.56)], 32), mat='ArenaBrass')
    gem = [(0, 0.5)] + [(0.27, 0.78)] + [(0.2, 1.25)] + [(0, 1.42)]
    P.add(lathe(gem, 8), mat='ArenaCrystal')
    instances(P, 'Arena_PawnMesh', C, [('Arena_Pawn_0', (3.1, TABLE_Y, -3.3), 0.3, None),
                                       ('Arena_Pawn_1', (-8.4, TABLE_Y, -0.5), 1.1, None)], sharp=30)


# =============================================================================== salle
def col_angle(k):
    return radians(15 + 30 * k)


def build_room():
    C = new_coll('Room')
    # ------------------------------------------------------------ sol : marbre à damier poli
    # Une seule face plane (le code en fait un miroir : src/easter/arena/mirror.ts), UV = monde / 16
    Fl = Geo(uv=True)
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((60.0 * cos(-2 * pi * k / 128), FLOOR_Y, 60.0 * sin(-2 * pi * k / 128)))
                      for k in range(128)])
    f.normal_update()
    if f.normal.y < 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    Fl.add(bm, mat='ArenaMarble', uv=lambda co: (co.x / 16.0, co.z / 16.0))
    finish(Fl, 'Arena_Floor', C, wn=False)

    # ------------------------------------------------------------ colonnes cannelées
    G = Geo()
    G.add(box(2.6, 0.6, 2.6, 0.05, 2), T(0, 0.3, 0), 'ArenaObsidian')
    G.add(lathe([(0, 0.6), (1.18, 0.6), (1.18, 0.72), (1.1, 0.78), (1.16, 0.86), (1.12, 0.94), (1.0, 1.0),
                 (0.97, 1.12), (0, 1.12)], 48), mat='ArenaBrass')
    flutes, depth, R0 = 20, 0.07, 0.94
    ring = []
    nseg = flutes * 6
    for k in range(nseg):
        a = 2 * pi * k / nseg
        f = (0.5 + 0.5 * cos(flutes * a)) ** 3
        r = R0 - depth * f
        ring.append((r * cos(a), r * sin(a)))
    shaft = bmesh.new()
    rows = []
    for y, s in ((1.1, 1.0), (14.0, 1.0), (30.0, 0.96), (40.0, 0.92)):
        rows.append([shaft.verts.new((x * s, y, z * s)) for x, z in ring])
    for A, B in zip(rows, rows[1:]):
        for k in range(nseg):
            shaft.faces.new([A[k], A[(k + 1) % nseg], B[(k + 1) % nseg], B[k]])
    bmesh.ops.recalc_face_normals(shaft, faces=shaft.faces[:])
    G.add(shaft, mat='ArenaObsidian')
    G.add(lathe([(0, 39.9), (0.9, 39.9), (0.95, 40.1), (1.05, 40.35), (1.25, 40.8), (1.45, 41.15),
                 (1.5, 41.25), (0, 41.25)], 48), mat='ArenaBrass')
    G.add(box(3.1, 0.45, 3.1, 0.04), T(0, 41.48, 0), 'ArenaObsidian')
    G.add(lathe([(0, 2.2), (1.0, 2.2), (1.03, 2.28), (1.0, 2.36), (0, 2.36)], 48), mat='ArenaBrass')
    instances(G, 'Arena_ColumnMesh', C,
              [(f'Arena_Column_{k:02d}', (R_COL * cos(col_angle(k)), FLOOR_Y, R_COL * sin(col_angle(k))),
                -col_angle(k), None) for k in range(COLS)], sharp=50)

    # ------------------------------------------------------------ rideaux de velours entre les colonnes
    width, height, folds = 2 * R_CURTAIN * sin(radians(15)) + 2.4, 42.0, 13
    nx, ny = folds * 10, 9
    lam = width / folds
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    grid = []
    for j in range(ny):
        y = height * j / (ny - 1)
        amp = 0.30 + 0.16 * (1 - y / height) ** 2
        row = []
        for i in range(nx + 1):
            x = -width / 2 + width * i / nx
            z = amp * sin(2 * pi * x / lam) + 0.25 * (1 - y / height) ** 3 * cos(pi * x / width)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(ny - 1):
        for i in range(nx):
            f = bm.faces.new([grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]])
            for loop in f.loops:
                loop[uvl].uv = (loop.vert.co.x / 4.0, loop.vert.co.y / 4.0)
    for f in bm.faces:
        f.normal_update()
        if f.normal.z < 0:
            f.normal_flip()
    G = Geo(uv=True)
    G.add(bm, mat='ArenaCurtain')
    place = []
    for k in range(COLS):
        a = radians(30 * k)
        yaw = atan2(-cos(a), -sin(a))
        place.append((f'Arena_Curtain_{k:02d}', (R_CURTAIN * cos(a), FLOOR_Y, R_CURTAIN * sin(a)), yaw, None))
    instances(G, 'Arena_CurtainMesh', C, place, sharp=80)

    # ------------------------------------------------------------ projecteurs au pied des colonnes
    G = Geo()
    G.add(xf(cyl(0.3, 0.12, 24, 0.02), ZTOY), T(0, 0.06, 0), 'ArenaBrass')
    can = xf(cyl(0.24, 0.42, 24, 0.03), ZTOY)
    G.add(can, T(0, 0.12, 0) @ R('X', 22) @ T(0, 0.21, 0), 'ArenaBrass')
    G.add(xf(cyl(0.2, 0.02, 24), ZTOY), T(0, 0.12, 0) @ R('X', 22) @ T(0, 0.43, 0), 'ArenaLens')
    place = []
    for k in range(COLS):
        a = col_angle(k)
        # Le projecteur penche (+z local) vers la colonne : lacet qui aligne +z local sur la direction sortante
        yaw = atan2(cos(a), sin(a))
        place.append((f'Arena_Uplight_{k:02d}', ((R_COL - 1.9) * cos(a), FLOOR_Y, (R_COL - 1.9) * sin(a)), yaw, None))
    instances(G, 'Arena_UplightMesh', C, place)

    # ------------------------------------------------------------ chandeliers de laiton, bougies, flammes
    G = Geo()
    G.add(lathe([(0, 0), (1.05, 0), (1.05, 0.07), (0.95, 0.12), (0.7, 0.22), (0.45, 0.38), (0.32, 0.55),
                 (0.3, 0.75), (0.42, 0.85), (0.42, 0.95), (0.25, 1.05), (0.13, 1.3), (0.11, 3.5), (0.2, 3.65),
                 (0.24, 3.8), (0.2, 3.95), (0.11, 4.1), (0.1, 6.6), (0.2, 6.75), (0.26, 6.95), (0.2, 7.15),
                 (0.12, 7.3), (0.12, 7.75), (0.32, 7.8), (0.36, 7.92), (0.12, 7.95), (0, 7.95)], 32), mat='ArenaBrass')
    cups = [(0.0, 7.95)]
    for k in range(4):
        a = radians(45 + 90 * k)
        d = Vector((cos(a), 0, sin(a)))
        pts = [Vector((0, 7.2, 0)) + d * 0.1, Vector((0, 7.0, 0)) + d * 0.6, Vector((0, 7.25, 0)) + d * 1.05,
               Vector((0, 7.75, 0)) + d * 1.18]
        G.add(tube(catmull(pts, 6), 0.065, 8), mat='ArenaBrass')
        c = Vector((0, 7.78, 0)) + d * 1.18
        G.add(lathe([(0, 0), (0.12, 0), (0.28, 0.08), (0.3, 0.13), (0.12, 0.13), (0, 0.13)], 24), T(*c), 'ArenaBrass')
        cups.append((c, 7.91))
    tips = []
    for item in cups:
        if isinstance(item[0], Vector):
            c, y0 = item
            x, z = c.x, c.z
        else:
            x, z, y0 = 0.0, 0.0, 7.95
        hgt = 0.9 if (x, z) != (0.0, 0.0) else 1.15
        G.add(xf(cyl(0.11, hgt, 20, 0.02), ZTOY), T(x, y0 + hgt / 2, z), 'ArenaWax')
        G.add(xf(cyl(0.008, 0.08, 6), ZTOY), T(x, y0 + hgt + 0.04, z), 'ArenaObsidian')
        tips.append(Vector((x, y0 + hgt + 0.05, z)))
    cand_angles = [radians(a) for a in (32, 148, 212, 328)]
    place = []
    flames = []
    for i, a in enumerate(cand_angles):
        p = Vector((R_CANDLE * cos(a), FLOOR_Y, R_CANDLE * sin(a)))
        yaw = random.uniform(0, pi / 2)
        place.append((f'Arena_Candelabra_{i}', tuple(p), yaw, None))
        rot = Matrix.Rotation(yaw, 3, 'Y')
        for tip in tips:
            q = p + rot @ tip
            flames.append(q)
    instances(G, 'Arena_CandelabraMesh', C, place)
    Fg = Geo()
    Fg.add(lathe([(0, 0), (0.07, 0.05), (0.095, 0.15), (0.075, 0.3), (0.035, 0.43), (0, 0.52)], 12),
           mat='ArenaFlame')
    instances(Fg, 'Arena_FlameMesh', C, [(f'Arena_Flame_{i:02d}', tuple(q), 0.0, None)
                                         for i, q in enumerate(flames)], sharp=80)


# =============================================================================== construction + export
print('ARENA : construction')
build_table()
build_chips()
build_room()

os.makedirs(os.path.dirname(BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.object.select_all(action='DESELECT')
for o in EXPORT:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
    export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_cameras=False,
    export_lights=False, export_extras=True, export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6)
print('ARENA EXPORT', len(EXPORT), 'nœuds', round(os.path.getsize(GLB) / 1024, 1), 'Ko')
print(f'  repères : TABLE_Y {TABLE_Y}  FLOOR_Y {FLOOR_Y}  slots x {SLOT_X} z {SLOT_Z}  '
      f'paquet ({DECK[0]}, {STACK_TOP}, {DECK[1]})  médaillon {MEDAL}')


# =============================================================================== vignettes de contrôle
def render_previews(out):
    os.makedirs(out, exist_ok=True)
    scene = bpy.context.scene
    try:
        scene.render.engine = 'BLENDER_EEVEE'
    except TypeError as e:
        print('moteur :', e)
    scene.eevee.taa_render_samples = 48
    try:
        scene.eevee.use_raytracing = True
        scene.eevee.ray_tracing_options.resolution_scale = '1'
    except Exception as e:
        print('raytracing indisponible :', e)
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    try:
        scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except TypeError:
        pass
    world = bpy.data.worlds.new('preview')
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.006, 0.004, 0.012, 1)
    bg.inputs[1].default_value = 1.0
    vol = world.node_tree.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = 0.0035
    wo = next(n for n in world.node_tree.nodes if n.type == 'OUTPUT_WORLD')
    world.node_tree.links.new(vol.outputs[0], wo.inputs['Volume'])
    scene.world = world
    P = new_coll('Preview')

    def light(name, kind, pos, energy, color, size=0.5, target=None, spot=None):
        d = bpy.data.lights.new(name, kind)
        d.energy, d.color = energy, lin(color)
        if kind in ('POINT', 'SPOT'):
            d.shadow_soft_size = size
        if spot:
            d.spot_size, d.spot_blend = spot
        o = bpy.data.objects.new(name, d)
        P.objects.link(o)
        o.location = W(*pos)
        if target:
            o.rotation_euler = (W(*target) - o.location).to_track_quat('-Z', 'Y').to_euler()
        return o

    light('key', 'SPOT', (0, 26, 3), 52000, '#ffe2c4', 1.5, (0, TABLE_Y, 1.0), (radians(58), 0.6))
    light('rim', 'POINT', (0, 5, -17), 9000, PINK, 2.0)
    light('fill', 'POINT', (-17, 7, 7), 6000, '#7a4cff', 2.0)
    for a in (32, 148, 212, 328):
        light(f'candle{a}', 'POINT', (R_CANDLE * cos(radians(a)), 4.0, R_CANDLE * sin(radians(a))), 900,
              '#ffa84f', 0.6)
    for k in range(COLS):
        a = col_angle(k)
        light(f'up{k}', 'SPOT', ((R_COL - 1.9) * cos(a), FLOOR_Y + 0.5, (R_COL - 1.9) * sin(a)), 4000, '#a65cff',
              0.3, (R_COL * cos(a), FLOOR_Y + 14, R_COL * sin(a)), (radians(40), 0.8))
    # Cartes factices (contrôle des emplacements), hors export
    for x in SLOT_X:
        b = bpy.data.meshes.new('card')
        bm = box(2.6, 0.08, 3.7, 0.04)
        bmesh.ops.transform(bm, matrix=YUP @ T(x, TABLE_Y + 0.2, SLOT_Z), verts=bm.verts)
        bm.to_mesh(b)
        bm.free()
        b.materials.append(MAT['ArenaObsidian'])
        o = bpy.data.objects.new('card', b)
        P.objects.link(o)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    P.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.clip_start, cam.data.clip_end = 0.05, 400

    def shot(name, eye, target, vfov=35):
        if SHOTS and name not in SHOTS:
            return
        cam.location = W(*eye)
        cam.rotation_euler = (W(*target) - W(*eye)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.angle_y = radians(vfov)
        scene.render.filepath = os.path.join(out, name + '.png')
        bpy.ops.render.render(write_still=True)
        print('RENDER', name)

    shot('top', (0, 32, 6), (0, 0, -1))
    shot('descent', (-10, 20, 12), (0, 0.4, 0))
    shot('wide', (-8, 11, 16.5), (0.5, 0.4, 0.5))
    shot('deal', (6.5, 10.5, 13.5), (6.0, 0.6, 1.6))
    shot('cards', (0.5, 11.2, 11.0), (0, 0.4, 1.3))
    shot('close', (3.6, 7.0, 8.4), (3.6, 0.8, 1.6))
    shot('rail', (-9.5, 2.6, 9.5), (-6.5, 0.6, 3.0), 40)
    shot('low', (16, 2.5, 20), (0, 1.0, 0), 40)
    shot('room', (0, 9, 26), (0, 3, -20), 50)


if RENDER:
    render_previews(RENDER)
print('ARENA OK')
