# Parc spatial de l'easter egg v3 (storyboard docs/storyboards/easter-park.md, agent B, 2026-10-06) :
# cockpit de l'Explorer, porte du parc BoulardTV, trois vaisseaux, wagon de montagnes russes, grande roue
# et écran géant. Tout est modélisé ici, depuis une scène vide (bmesh), sans fichier source ni texture :
# le détail vient de la géométrie (biseaux, panneaux, rivets, joints) et des matériaux PBR.
#
# Usage :
#   "D:/Blender/blender.exe" -b --factory-startup --python scripts/blender/model_easter_park.py
#   ... -- --render <dossier> [--shots cockpit,gate,...]   (vignettes EEVEE de contrôle, après l'export)
# Sauvegarde blender/easter_park.blend et exporte public/models/easter/park.glb (Draco 6, Y-up, sans
# animation, sans image). Ne touche pas à blender/portfolio_models.blend.
#
# Repère Blender : Z en haut, avant = +Y. À l'export Y-up, +Y Blender devient -Z glTF : les vaisseaux et le
# wagon « regardent » vers -Z, et tout ce qui fait face à la caméra (écrans, porte, enseigne) regarde -Y
# Blender, soit +Z glTF. Chaque groupe est centré à l'origine ; le code web les place.
# Normales : tout est lissé, arêtes vives au-delà de 48°, puis normales pondérées (modificateur
# WeightedNormal appliqué à l'export) : les biseaux accrochent la lumière, les grandes faces restent planes.
import bpy, bmesh, math, os, re, sys, random
from math import sin, cos, pi, radians, sqrt, atan2, acos, copysign
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLEND = os.path.join(ROOT, 'blender', 'easter_park.blend')
GLB = os.path.join(ROOT, 'public', 'models', 'easter', 'park.glb')
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'
LOGO_SVG = 'C:/Users/Asuki/Documents/perso/BoulardTV_models/btv_logo.svg'
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = ARGS[ARGS.index('--render') + 1] if '--render' in ARGS else None
SHOTS = ARGS[ARGS.index('--shots') + 1].split(',') if '--shots' in ARGS else None

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(1977)


# =============================================================================== matériaux
def lin(c):
    """Couleur hex sRGB -> RVB linéaire (Blender et glTF stockent du linéaire)."""
    if not isinstance(c, str):
        return tuple(c)
    h = c.lstrip('#')
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in s)


MAT = {}


def mat(name, col, rough=0.5, metal=0.0, emit=None, strength=1.0):
    m = bpy.data.materials.new(name)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = lin(col)
    p.inputs['Base Color'].default_value = (*c, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = (*lin(emit), 1)
        p.inputs['Emission Strength'].default_value = strength
    m.diffuse_color = (*c, 1)
    MAT[name] = m
    return m


PINK = '#ff2d78'   # rose BoulardTV
WARM = '#ffd9a8'   # blanc chaud

# Peintures et métaux
mat('HullWhite', '#cfd2d6', 0.34)
mat('HullGraphite', '#2b2e34', 0.42)
mat('HullLight', '#aeb2b8', 0.4)
mat('PaintPink', '#d81e62', 0.36)
mat('Carbon', '#17181b', 0.26)
mat('MetalSteel', '#b8bbbf', 0.3, 1.0)
mat('MetalDark', '#55585e', 0.4, 1.0)
mat('MetalBurnt', '#76645a', 0.36, 1.0)
mat('GoldFoil', '#d9a24a', 0.3, 1.0)
mat('GateMetal', '#3c4047', 0.38, 1.0)
mat('Rubber', '#141414', 0.85)
mat('Plastic', '#26282c', 0.62)
mat('PlasticMid', '#44474d', 0.5)
mat('GuardRed', '#a8141c', 0.42)
mat('Glass', '#0b0e12', 0.05)
mat('Mirror', '#e6e6e6', 0.04, 1.0)
mat('ContainerOrange', '#a8501f', 0.55, 0.2)
mat('ContainerBlue', '#28507a', 0.55, 0.2)
mat('ContainerGrey', '#71757b', 0.5, 0.2)
mat('ContainerTeal', '#1f6e6a', 0.55, 0.2)
# Surfaces d'affichage (le code y pose une texture : emissiveMap/map, flipY = false)
mat('CockpitScreen', '#060708', 0.18, emit='#ffffff', strength=1.0)
mat('ScreenPanel', '#060708', 0.2, emit='#ffffff', strength=1.0)
# Émissifs (intensités indicatives, à régler côté web selon le bloom)
mat('CockpitAccent', '#3a0b1d', 0.4, emit=PINK, strength=1.0)
mat('CockpitIndicator', '#2c1c08', 0.4, emit='#ffb347', strength=4.0)
mat('GateNeon', '#4a1226', 0.35, emit=PINK, strength=8.0)
mat('GateLights', '#4c4334', 0.3, emit=WARM, strength=10.0)
mat('ShipEngine', '#36101f', 0.3, emit='#ff5c9a', strength=12.0)
mat('ShipLights', '#3a0b1d', 0.3, emit=PINK, strength=6.0)
mat('ShipWindows', '#2c2216', 0.2, emit='#ffcf9a', strength=3.0)
mat('CoasterLights', '#3a0b1d', 0.3, emit=PINK, strength=6.0)
mat('CoasterHeadlight', '#4c4334', 0.2, emit=WARM, strength=10.0)
mat('WheelLights', '#3a0b1d', 0.3, emit=PINK, strength=6.0)
mat('WheelLightsWarm', '#4c4334', 0.3, emit=WARM, strength=6.0)
mat('CabinGlow', '#3a3024', 0.3, emit='#ffcf9a', strength=2.5)
mat('ScreenLights', '#3a0b1d', 0.3, emit=PINK, strength=6.0)


# =============================================================================== maths
def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(axis, deg):
    return Matrix.Rotation(radians(deg), 4, axis)


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


MIRROR_X = S(-1, 1, 1)
# Révolution autour de Z -> révolution autour de Y : (x, y, z) -> (x, z, y). L'angle a de la révolution
# devient phi = atan2(z, x) dans le plan XZ (déterminant -1 : Geo.add retourne les faces).
AX = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def frame(o, zdir, yhint=(0, 0, 1)):
    """Repère local : Z selon zdir, Y au plus près de yhint, X = Y x Z (main droite)."""
    Z = Vector(zdir).normalized()
    X = Vector(yhint).cross(Z)
    if X.length < 1e-6:
        X = (Vector((1, 0, 0)) if abs(Z.x) < 0.9 else Vector((0, 1, 0))).cross(Z)
    X.normalize()
    Y = Z.cross(X)
    M = Matrix((X, Y, Z)).transposed().to_4x4()
    M.translation = Vector(o)
    return M


def rpos(r, phi, y):
    return Vector((r * cos(phi), y, r * sin(phi)))


def rframe(r, phi, y):
    """Repère sur un anneau du plan XZ : X tangent (sens horaire), Y = axe +Y, Z radial sortant."""
    X = Vector((sin(phi), 0, -cos(phi)))
    Y = Vector((0, 1, 0))
    Z = Vector((cos(phi), 0, sin(phi)))
    M = Matrix((X, Y, Z)).transposed().to_4x4()
    M.translation = rpos(r, phi, y)
    return M


def linspace(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


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


def rrect(w, h, r, n=3):
    """Rectangle arrondi centré (profil 2D, sens trigonométrique)."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, -h / 2 + r, -90), (w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                       (-w / 2 + r, -h / 2 + r, 180)):
        for k in range(n + 1):
            a = radians(a0 + 90 * k / n)
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def circle2d(r, n=8):
    return [(r * cos(2 * pi * k / n), r * sin(2 * pi * k / n)) for k in range(n)]


# =============================================================================== primitives (bmesh)
def bevel_sharp(bm, off, seg=1, angle=30):
    edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > radians(angle)]
    if edges and off > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=off, offset_type='OFFSET', segments=seg, profile=0.5,
                        affect='EDGES', clamp_overlap=True)
    return bm


def box(sx, sy, sz, bev=0.0, seg=1):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=S(sx, sy, sz))
    if bev > 0:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=min(bev, 0.45 * min(sx, sy, sz)),
                        offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm


def revolve(prof, segs=24, a0=0.0, a1=2 * pi, loop=False):
    """Révolution d'un profil (r, z) autour de Z. loop=True : profil fermé (tore, coque). Les points de
    rayon nul d'un profil ouvert deviennent des pôles. Révolution partielle d'un profil fermé : bouchée."""
    bm = bmesh.new()
    full = abs(a1 - a0) >= 2 * pi - 1e-6
    na = segs if full else segs + 1
    angs = [a0 + (a1 - a0) * j / segs for j in range(na)]
    rings = []
    for r, z in prof:
        if r < 1e-7 and not loop:
            v = bm.verts.new((0, 0, z))
            rings.append([v] * na)
        else:
            rings.append([bm.verts.new((r * cos(a), r * sin(a), z)) for a in angs])
    n = len(prof)
    for i in range(n if loop else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for j in range(segs):
            j2 = (j + 1) % na
            vs = []
            for v in (A[j], A[j2], B[j2], B[j]):
                if v not in vs:
                    vs.append(v)
            if len(vs) >= 3:
                try:
                    bm.faces.new(vs)
                except ValueError:
                    pass
    if loop and not full:
        bm.faces.new([rings[i][0] for i in range(n)])
        bm.faces.new([rings[i][na - 1] for i in range(n)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def cyl(r, h, segs=16, bev=0.0, r2=None):
    """Cylindre (ou tronc de cône) d'axe Z, centré, bords chanfreinés."""
    r2 = r if r2 is None else r2
    b = min(bev, 0.4 * min(r, r2), 0.4 * h)
    if b > 0:
        prof = [(0, -h / 2), (r - b, -h / 2), (r, -h / 2 + b), (r2, h / 2 - b), (r2 - b, h / 2), (0, h / 2)]
    else:
        prof = [(0, -h / 2), (r, -h / 2), (r2, h / 2), (0, h / 2)]
    return revolve(prof, segs)


def tube_between(p0, p1, r, segs=8):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bm = cyl(r, d.length, segs)
    bmesh.ops.transform(bm, matrix=frame((p0 + p1) / 2, d, (0, 0, 1) if abs(d.normalized().z) < 0.9 else (1, 0, 0)),
                        verts=bm.verts)
    return bm


def frames_along(path, up, closed=False):
    n = len(path)
    out = []
    for i in range(n):
        if closed:
            t = path[(i + 1) % n] - path[i - 1]
        else:
            t = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        t.normalize()
        u = up(path[i], i) if callable(up) else Vector(up)
        nn = u - t * u.dot(t)
        if nn.length < 1e-6:
            nn = t.orthogonal()
        nn.normalize()
        out.append((t, nn, t.cross(nn)))
    return out


def sweep(path, prof, up=(0, 0, 1), closed=False, pmats=None):
    """Extrusion d'un profil 2D (px le long de B = T x N, py le long de N) le long d'un chemin."""
    path = [Vector(p) for p in path]
    bm = bmesh.new()
    fr = frames_along(path, up, closed)
    rings = [[bm.verts.new(p + b * px + nn * py) for px, py in prof] for p, (t, nn, b) in zip(path, fr)]
    m, n = len(prof), len(path)
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for j in range(m):
            f = bm.faces.new([A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]])
            if pmats:
                f.material_index = pmats[j]
    if not closed:
        for ring in (rings[0], rings[-1]):
            f = bm.faces.new(ring)
            if pmats:
                f.material_index = pmats[0]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def loft(sections, cap0='ngon', cap1='ngon'):
    """Peau entre sections fermées de même nombre de points. Bouchons : 'ngon', None ou un point (pôle)."""
    bm = bmesh.new()
    rings = [[bm.verts.new(Vector(p)) for p in s] for s in sections]
    m = len(sections[0])
    for A, B in zip(rings, rings[1:]):
        for j in range(m):
            bm.faces.new([A[j], A[(j + 1) % m], B[(j + 1) % m], B[j]])
    for cap, ring in ((cap0, rings[0]), (cap1, rings[-1])):
        if cap == 'ngon':
            bm.faces.new(ring)
        elif cap is not None:
            c = bm.verts.new(Vector(cap))
            for j in range(m):
                bm.faces.new([ring[j], ring[(j + 1) % m], c])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def slab(poly, y0, y1, bev=0.0, seg=1):
    """Polygone (x, z) du plan XZ extrudé en Y de y0 à y1, biseauté sur ses arêtes vives."""
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
    return bevel_sharp(bm, bev, seg)


def sector(r0, r1, a0, a1, gap=0.0, step=1.2):
    """Secteur d'anneau (x, z) entre les rayons r0 et r1 et les angles a0 et a1, joint de largeur gap."""
    r0g, r1g = r0 + gap / 2, r1 - gap / 2
    go, gi = (gap / 2) / max(r1g, 1e-3), (gap / 2) / max(r0g, 1e-3)
    n = max(2, int(abs(a1 - a0) * r1 / step) + 1)
    outer = [(r1g * cos(a), r1g * sin(a)) for a in linspace(a0 + go, a1 - go, n)]
    if r0 < 0.01:
        return outer + [(0.0, 0.0)]
    ni = max(2, int(abs(a1 - a0) * r0 / step) + 1)
    inner = [(r0g * cos(a), r0g * sin(a)) for a in linspace(a1 - gi, a0 + gi, ni)]
    return outer + inner


def xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    if M.to_3x3().determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def dome(r, h, segs=8):
    return revolve([(0, 0), (r, 0), (r * 0.92, h * 0.45), (r * 0.58, h * 0.88), (0, h)], segs)


def airfoil(n=10):
    """Profil NACA symétrique normalisé : (xc ∈ [0,1] du bord d'attaque au bord de fuite, demi-épaisseur
    pour une épaisseur relative de 1)."""
    xs = [0.5 * (1 - cos(pi * i / n)) for i in range(n + 1)]

    def yt(x):
        return 5 * (0.2969 * sqrt(x) - 0.1260 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4)

    return [(x, yt(x)) for x in xs] + [(x, -yt(x)) for x in reversed(xs[1:-1])]


def wing(sections, n=10):
    """sections : (bord d'attaque, vecteur corde BA->BF, direction d'épaisseur, épaisseur)."""
    af = airfoil(n)
    secs = [[Vector(le) + Vector(cv) * xc + Vector(td).normalized() * (v * t) for xc, v in af]
            for le, cv, td, t in sections]
    return loft(secs, 'ngon', 'ngon')


def nozzle(r, length, segs=24):
    """Tuyère d'axe +Z (sortie vers +Z), col à z = 0 : coque convergente-divergente avec lèvre."""
    L = length
    prof = [(r * 0.98, 0.0), (r * 1.05, L * 0.3), (r * 1.02, L * 0.9), (r * 0.97, L), (r * 0.91, L * 0.98),
            (r * 0.86, L * 0.45), (r * 0.74, L * 0.1), (r * 0.74, 0.0)]
    return revolve(prof, segs, loop=True)


def glow(r, segs=24):
    """Disque de flamme légèrement bombé vers +Z."""
    return revolve([(0, 0), (r, 0), (r * 0.85, r * 0.1), (r * 0.5, r * 0.2), (0, r * 0.24)], segs)


def quad_uv(w, h):
    """Plan w x h centré, face +Z, UV 0..1 (u vers +X, v vers +Y)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    pts = [(-w / 2, -h / 2, 0, 0), (w / 2, -h / 2, 1, 0), (w / 2, h / 2, 1, 1), (-w / 2, h / 2, 0, 1)]
    f = bm.faces.new([bm.verts.new((x, y, 0)) for x, y, _, _ in pts])
    for loop, (_, _, u, v) in zip(f.loops, pts):
        loop[uv].uv = (u, v)
    return bm


def curve_fill(polys, depth, bevel=0.0):
    """Polygones 2D (plan XY) remplis (pair-impair) et extrudés en Z (±depth/2), convertis en bmesh."""
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


def text_bm(ch, font, depth, bevel, offset=0.0, res=5):
    cu = bpy.data.curves.new('tmp_txt', 'FONT')
    cu.body = ch
    cu.font = font
    cu.size = 1.0
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    cu.offset = offset
    cu.resolution_u = res
    return _curve_to_bm(cu)


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


def svg_shapes(path, steps=14):
    """Chemins d'un SVG simple (M, L, H, V, C, Z absolus) -> [(couleur, [polygones])], y vers le haut."""
    txt = open(path, encoding='utf-8').read()
    shapes = []
    for m in re.finditer(r'<path[^>]*?\sd="([^"]+)"[^>]*?fill="([^"]+)"', txt):
        toks = re.findall(r'[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?', m.group(1))
        polys, cur, pts, cmd, i = [], (0.0, 0.0), [], None, 0
        while i < len(toks):
            t = toks[i]
            if t.isalpha():
                cmd = t
                i += 1
                if cmd in 'Zz':
                    if pts:
                        polys.append(pts)
                    pts = []
                continue
            nargs = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6}.get(cmd, 0)
            f = [float(x) for x in toks[i:i + nargs]]
            if cmd == 'M':
                if pts:
                    polys.append(pts)
                cur = (f[0], f[1])
                pts = [cur]
                i += 2
                cmd = 'L'
            elif cmd == 'L':
                cur = (f[0], f[1])
                pts.append(cur)
                i += 2
            elif cmd == 'H':
                cur = (f[0], cur[1])
                pts.append(cur)
                i += 1
            elif cmd == 'V':
                cur = (cur[0], f[0])
                pts.append(cur)
                i += 1
            elif cmd == 'C':
                p0, p1, p2, p3 = cur, (f[0], f[1]), (f[2], f[3]), (f[4], f[5])
                for k in range(1, steps + 1):
                    s = k / steps
                    a, b, c, d = (1 - s) ** 3, 3 * (1 - s) ** 2 * s, 3 * (1 - s) * s * s, s ** 3
                    pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
                cur = p3
                i += 6
            else:
                raise SystemExit(f'commande SVG non gérée : {cmd}')
        if pts:
            polys.append(pts)
        clean = []
        for p in polys:
            if len(p) > 2 and (Vector(p[0]) - Vector(p[-1])).length < 1e-4:
                p = p[:-1]
            clean.append([(x, -y) for x, y in p])
        shapes.append((m.group(2).lower(), clean))
    return shapes


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

    def add(self, src, M=None, mat='MetalDark', matfn=None, uv=None, free=True):
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
            if matfn:
                name = matfn((NM @ f.normal).normalized(), M @ f.calc_center_median())
            elif names:
                name = names[min(f.material_index, len(names) - 1)]
            else:
                name = mat
            nf.material_index = self.mi(name)
            if self.uv is not None:
                for l, sl in zip(nf.loops, loops):
                    if uv:
                        l[self.uv].uv = uv(l.vert.co)
                    elif src_uv is not None:
                        l[self.uv].uv = sl[src_uv].uv
        if free:
            src.free()


COLLS = {}
PARK = []


def new_coll(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    COLLS[name] = c
    return c


def finish(geo, name, coll, parent=None, origin=None, sharp=48, wn=True):
    me = bpy.data.meshes.new(name + '_Mesh')
    geo.bm.to_mesh(me)
    geo.bm.free()
    for n in geo.mats:
        me.materials.append(MAT[n])
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    if origin is not None:
        me.transform(T(*(-Vector(origin))))
        ob.location = Vector(origin)
    me.set_sharp_from_angle(angle=radians(sharp))
    if wn:
        m = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL')
        m.keep_sharp = True
        m.mode = 'FACE_AREA'
    if parent is not None:
        ob.parent = parent
        bpy.context.view_layer.update()
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
    assert ob.name == name, f'nom en double : {ob.name}'
    PARK.append(ob)
    # Emprise en coordonnées glTF (x, y = z Blender, z = -y Blender), origine du nœud incluse
    o = ob.location
    pts = [(v.co.x + o.x, v.co.z + o.z, -(v.co.y + o.y)) for v in me.vertices]
    lo = [round(min(p[i] for p in pts), 2) for i in range(3)]
    hi = [round(max(p[i] for p in pts), 2) for i in range(3)]
    print(f'  {name:18s} {len(me.vertices):7d} sommets  {len(me.polygons):7d} faces  gltf {lo} -> {hi}  {geo.mats}')
    return ob


# =============================================================================== COCKPIT
# Caméra à l'origine, regard +Y Blender (-Z glTF), champ vertical 60°, 16:9 : u = x/y ∈ ±1.026,
# v = z/y ∈ ±0.577. Le bord du tableau de bord (lèvre de l'auvent) est à v ≈ -0.31 (23 % de l'image).
def build_cockpit():
    C = new_coll('Cockpit')
    radial = lambda p, i: p.normalized()   # « haut » des profils = s'éloigner de l'œil

    # ---------------------------------------------------------------- Cockpit_Frame
    F = Geo()
    prof = [(-0.036, 0.0), (0.036, 0.0), (0.041, 0.010), (0.041, 0.030), (0.023, 0.038), (0.023, 0.095),
            (-0.023, 0.095), (-0.023, 0.038), (-0.041, 0.030), (-0.041, 0.010)]
    pm = [0, 0, 0, 1, 1, 1, 1, 1, 0, 0]
    fm = ['HullGraphite', 'MetalDark']
    half = [(-0.86, 0.985, -0.33), (-0.80, 0.935, -0.12), (-0.745, 0.89, 0.03), (-0.63, 0.80, 0.20),
            (-0.46, 0.715, 0.318), (-0.23, 0.668, 0.360), (0.0, 0.656, 0.371)]
    arch = catmull(half + [(-x, y, z) for x, y, z in reversed(half[:-1])], 5)
    F.add(sweep(arch, prof, radial, pmats=pm), mat=fm)
    for s in (-1, 1):
        sill = catmull([(0.86 * s, 0.985, -0.33), (0.81 * s, 0.55, -0.315), (0.76 * s, 0.0, -0.295),
                        (0.72 * s, -0.6, -0.27)], 5)
        F.add(sweep(sill, prof, radial, pmats=pm), mat=fm)
    F.add(sweep(catmull([(0, 0.656, 0.371), (0, 0.35, 0.47), (0, -0.1, 0.52), (0, -0.6, 0.47)], 5), prof,
                radial, pmats=pm), mat=fm)
    rear = [(-0.75, -0.1, -0.29), (-0.66, -0.12, 0.22), (-0.36, -0.13, 0.46), (0, -0.14, 0.52)]
    F.add(sweep(catmull(rear + [(-x, y, z) for x, y, z in reversed(rear[:-1])], 4), prof, radial, pmats=pm),
          mat=fm)
    # Rivets sur la face intérieure de l'arceau, en deux files
    fr = frames_along(arch, radial)
    rivet = dome(0.0052, 0.0038, 8)
    for i in range(1, len(arch) - 1):
        p, (t, nn, b) = arch[i], fr[i]
        for k in (-1, 1):
            F.add(rivet.copy(), frame(p + b * (0.027 * k), -nn, t), 'MetalDark')
            if i < len(arch) - 2:
                q = (arch[i] + arch[i + 1]) / 2
                F.add(rivet.copy(), frame(q + b * (0.027 * k), -nn, t), 'MetalDark')
    rivet.free()
    # Filet LED rose au centre de l'arceau (haut et montants)
    led = [p for p in arch if p.z > -0.16]
    F.add(sweep(led, [(-0.0018, -0.002), (0.0018, -0.002), (0.0018, 0.0005), (-0.0018, 0.0005)], radial),
          mat='CockpitAccent')
    # Joints caoutchouc de vitrage le long des deux bords de l'arceau
    for k in (-1, 1):
        F.add(sweep(arch, [(k * 0.041 - 0.003, 0.03), (k * 0.041 + 0.003, 0.03), (k * 0.041 + 0.003, 0.04),
                           (k * 0.041 - 0.003, 0.04)], radial), mat='Rubber')
    # Poignées de maintien sur l'arceau
    for target_x in (-0.34, 0.34):
        i = min(range(len(arch)), key=lambda k: abs(arch[k].x - target_x) + (0 if arch[k].z > 0 else 9))
        p, (t, nn, b) = arch[i], fr[i]
        pts = [p + t * s - nn * h for s, h in ((-0.06, -0.002), (-0.06, 0.026), (-0.046, 0.038),
                                              (0.046, 0.038), (0.06, 0.026), (0.06, -0.002))]
        F.add(sweep(catmull(pts, 3), circle2d(0.0075, 8), lambda q, k: b), mat='Rubber')
        for s in (-0.06, 0.06):
            F.add(cyl(0.012, 0.006, 10, 0.002), frame(p + t * s - nn * 0.002, -nn, t), 'MetalDark')
    finish(F, 'Cockpit_Frame', C)

    # ---------------------------------------------------------------- Cockpit_Dash
    D = Geo()
    # Auvent (glare shield) : bourrelet caoutchouc à l'avant, dessus mat, cintré vers le pilote sur les côtés
    # Le dessus de l'auvent descend sous la ligne de visée de la lèvre : on n'en voit que le bourrelet (2.6 cm)
    hood_path = [Vector((x, 0.56 + 0.12 * (x / 0.92) ** 2, -0.1835 - 0.04 * (x / 0.92) ** 2))
                 for x in linspace(-1.02, 1.02, 33)]
    hood = [(0.000, -0.008), (0.004, 0.003), (0.014, 0.0105), (0.030, 0.0125), (0.06, 0.0), (0.12, -0.016),
            (0.45, -0.115), (0.45, -0.175), (0.15, -0.05), (0.05, -0.0175), (0.02, -0.0145), (0.005, -0.0125)]
    D.add(sweep(hood_path, [(-dy, dz) for dy, dz in hood], (0, 0, 1), pmats=[1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1]),
          mat=['Plastic', 'Rubber'])
    D.add(sweep([p + Vector((0, -0.0012, -0.003)) for p in hood_path[5:-5]],
                [(-0.0008, -0.0012), (0.0008, -0.0012), (0.0008, 0.0012), (-0.0008, 0.0012)], (0, 0, 1)),
          mat='CockpitAccent')
    # Face du tableau de bord : cylindre autour de l'œil, inclinée pour faire face au regard
    PC = Vector((0.585, -0.255))                         # (rho, z) du centre de la face
    el0 = atan2(PC.y, PC.x)
    K = Vector((cos(el0), sin(el0)))                     # œil -> face
    Fu = Vector((-sin(el0), cos(el0)))                   # le long de la face, vers le haut
    face = [Fu * 0.085, -Fu * 0.33, -Fu * 0.33 + K * 0.05, Fu * 0.085 + K * 0.05]
    panel_path = [Vector((PC.x * sin(radians(a)), PC.x * cos(radians(a)), PC.y)) for a in linspace(-66, 66, 45)]
    D.add(sweep(panel_path, [(-q.x, q.y) for q in face], (0, 0, 1)), mat='Plastic')

    def on_dash(theta, elev, lift=0.0):
        """Repère posé sur la face du tableau : Z vers l'œil, Y vers le haut, X vers la droite."""
        e = radians(elev)
        c, s = cos(e), sin(e)
        det = c * (-Fu.y) - s * (-Fu.x)
        d = (PC.x * (-Fu.y) - PC.y * (-Fu.x)) / det
        th = radians(theta)
        dirv = Vector((sin(th) * c, cos(th) * c, s))
        return frame(dirv * (d - lift), -dirv, (0, 0, 1))

    def button(M, x, y, w=0.014, h=0.011, lit=False):
        D.add(box(w, h, 0.006, 0.0022, 2), M @ T(x, y, 0.003), 'PlasticMid')
        if lit:
            D.add(box(w * 0.6, 0.0016, 0.001), M @ T(x, y + h * 0.18, 0.0062), 'CockpitIndicator')

    screens = {}

    def dzus(M):
        D.add(cyl(0.0042, 0.0016, 10, 0.0006), M @ T(0, 0, 0.0008), 'MetalDark')
        D.add(box(0.0056, 0.0009, 0.0008), M @ T(0, 0, 0.0017) @ R('Z', random.uniform(0, 180)), 'Rubber')
    # Écrans entre v = -0.353 (sous la lèvre) et v = -0.553 (au-dessus du bord bas) : 9.5° de haut
    for name, theta, w, h in (('Cockpit_ScreenL', -21.0, 0.135, 0.1015), ('Cockpit_ScreenC', 0.0, 0.18, 0.1015),
                              ('Cockpit_ScreenR', 21.0, 0.135, 0.1015)):
        M = on_dash(theta, -24.2)
        mx, top, bot = 0.032, 0.012, 0.024
        W, H = w + 2 * mx, h + top + bot
        cy = (top - bot) / 2
        D.add(box(W, H, 0.012, 0.003), M @ T(0, cy, 0.006), 'Plastic')                    # dos
        D.add(box(mx, H, 0.028, 0.004, 2), M @ T(-(w + mx) / 2, cy, 0.014), 'Plastic')     # montants
        D.add(box(mx, H, 0.028, 0.004, 2), M @ T((w + mx) / 2, cy, 0.014), 'Plastic')
        D.add(box(w + 0.002, top, 0.028, 0.004, 2), M @ T(0, (h + top) / 2, 0.014), 'Plastic')
        D.add(box(w + 0.002, bot, 0.028, 0.004, 2), M @ T(0, -(h + bot) / 2, 0.014), 'Plastic')
        for sx in (-1, 1):
            for sy in (-1, 1):
                dzus(M @ T(sx * (W / 2 - 0.008), cy + sy * (H / 2 - 0.007), 0.028))
        for side in (-1, 1):                                                               # touches MFD
            for k, yy in enumerate(linspace(-h * 0.36, h * 0.36, 4)):
                button(M @ T(0, 0, 0.028), side * (w / 2 + mx / 2), yy, 0.015, 0.012, lit=(k == 1))
        for xx in linspace(-w * 0.38, w * 0.38, 5):
            button(M @ T(0, 0, 0.028), xx, -(h / 2 + bot / 2), 0.016, 0.009)
        for side in (-1, 1):                                                               # molettes
            D.add(cyl(0.0055, 0.008, 12, 0.0012), M @ T(side * (w / 2 + mx / 2), h / 2 + top / 2, 0.032),
                  'PlasticMid')
        scr = Geo(uv=True)
        scr.add(quad_uv(w, h), M @ T(0, 0, 0.021), 'CockpitScreen')
        screens[name] = scr

    # Panneaux d'interrupteurs latéraux (bord de l'image) : interrupteurs, cache rouge, potentiomètres,
    # voyants, manettes, cadran
    toggle_base = revolve([(0, 0), (0.0078, 0), (0.0078, 0.0035), (0.0050, 0.0045), (0, 0.0045)], 6)
    knob = revolve([(0, 0), (0.0135, 0), (0.0135, 0.003), (0.0108, 0.004), (0.0108, 0.015), (0.0094, 0.0175),
                    (0, 0.0175)], 16)
    for sgn in (-1, 1):
        M = on_dash(36 * sgn, -24.0)
        D.add(box(0.19, 0.13, 0.012, 0.004, 2), M @ T(0, 0, 0.006), 'Plastic')
        D.add(box(0.196, 0.136, 0.006, 0.002), M @ T(0, 0, 0.002), 'MetalDark')
        for sx in (-1, 1):
            for sy in (-1, 1):
                dzus(M @ T(sx * 0.087, sy * 0.057, 0.012))
        for j, xx in enumerate((-0.06, -0.025, 0.01)):
            P = M @ T(xx, 0.032, 0.012)
            D.add(toggle_base.copy(), P, 'MetalSteel')
            lever = P @ R('X', -18)
            D.add(cyl(0.0021, 0.022, 8, r2=0.0016), lever @ T(0, 0, 0.0145), 'MetalSteel')
            D.add(dome(0.0032, 0.005, 8), lever @ T(0, 0, 0.0245), 'MetalSteel')
            D.add(box(0.016, 0.004, 0.0008), M @ T(xx, 0.012, 0.0124), 'HullWhite')
        P = M @ T(0.055, 0.032, 0.012)                                     # interrupteur sous cache rouge
        D.add(toggle_base.copy(), P, 'MetalSteel')
        D.add(cyl(0.0021, 0.02, 8), P @ R('X', -18) @ T(0, 0, 0.013), 'MetalSteel')
        for gx in (-0.011, 0.011):
            D.add(box(0.0022, 0.03, 0.022, 0.0008), P @ T(gx, 0, 0.011), 'GuardRed')
        D.add(box(0.0242, 0.03, 0.0022, 0.0008), P @ T(0, 0, 0.0225) @ R('X', -6), 'GuardRed')
        for xx in (-0.05, -0.01):                                          # potentiomètres
            D.add(knob.copy(), M @ T(xx, -0.03, 0.012), 'PlasticMid')
            D.add(box(0.0018, 0.009, 0.001), M @ T(xx, -0.025, 0.0298), 'HullWhite')
        for k, xx in enumerate((0.03, 0.048, 0.066)):                      # voyants
            D.add(dome(0.0042, 0.003, 10), M @ T(xx, -0.03, 0.012), 'CockpitIndicator' if k != 1 else 'CockpitAccent')
        for xx in linspace(-0.07, 0.07, 6):                                # bandeau d'alarmes
            D.add(box(0.02, 0.008, 0.002, 0.0006), M @ T(xx, 0.058, 0.013),
                  'CockpitIndicator' if abs(xx) < 0.03 else 'PlasticMid')
        M2 = on_dash(50 * sgn, -23.0)                                      # cadran et manettes (bord)
        D.add(box(0.16, 0.13, 0.012, 0.004, 2), M2 @ T(0, 0, 0.006), 'Plastic')
        G = M2 @ T(-0.035 * sgn, 0.01, 0.012)
        D.add(revolve([(0.026, 0), (0.033, 0), (0.033, 0.008), (0.029, 0.011), (0.026, 0.009)], 24, loop=True),
              G, 'MetalSteel')
        D.add(cyl(0.027, 0.003, 24), G @ T(0, 0, 0.0015), 'Rubber')
        D.add(box(0.0016, 0.022, 0.001), G @ T(0, 0.008, 0.0035) @ R('Z', 35), 'PaintPink')
        D.add(cyl(0.0265, 0.0015, 24), G @ T(0, 0, 0.0075), 'Glass')
        for k, xx in enumerate((0.03, 0.055)):
            L = M2 @ T(xx * sgn, -0.01, 0.012)
            D.add(box(0.012, 0.07, 0.003, 0.001), L, 'MetalDark')
            arm = L @ T(0, -0.01 + 0.02 * k, 0) @ R('X', -25 + 30 * k)
            D.add(box(0.006, 0.006, 0.05, 0.0015), arm @ T(0, 0, 0.025), 'MetalSteel')
            D.add(revolve([(0, 0), (0.009, 0.002), (0.011, 0.01), (0.008, 0.018), (0, 0.02)], 12),
                  arm @ T(0, 0, 0.05), 'PlasticMid' if k else 'PaintPink')
    toggle_base.free()
    knob.free()
    # Bas du tableau, consoles latérales, manette des gaz (hors champ au repos, pour les mouvements de tête)
    D.add(box(1.5, 0.2, 0.34, 0.02, 2), T(0, 0.52, -0.66), 'Plastic')
    for sgn in (-1, 1):
        D.add(box(0.26, 0.95, 0.24, 0.015, 2), T(0.53 * sgn, 0.02, -0.53), 'Plastic')
        D.add(box(0.24, 0.9, 0.012, 0.003), T(0.53 * sgn, 0.02, -0.405), 'MetalDark')
        for yy in linspace(-0.3, 0.3, 4):
            D.add(cyl(0.012, 0.016, 12, 0.002), T(0.5 * sgn, yy, -0.39), 'PlasticMid')
    for k, xx in enumerate((-0.585, -0.535)):
        D.add(box(0.03, 0.2, 0.03, 0.006), T(xx, 0.12, -0.39), 'MetalDark')
        arm = T(xx, 0.14 + 0.03 * k, -0.38) @ R('X', 12)
        D.add(box(0.016, 0.016, 0.14, 0.004), arm @ T(0, 0, 0.07), 'MetalSteel')
        D.add(box(0.045, 0.075, 0.06, 0.018, 3), arm @ T(0, 0.01, 0.16), 'Rubber')
    finish(D, 'Cockpit_Dash', C)
    for name in ('Cockpit_ScreenL', 'Cockpit_ScreenC', 'Cockpit_ScreenR'):
        finish(screens[name], name, C, wn=False)

    # ---------------------------------------------------------------- Cockpit_Stick
    St = Geo()
    B0 = T(0, 0.25, -0.70)
    St.add(revolve([(0, 0), (0.095, 0), (0.09, 0.025), (0.06, 0.06), (0.035, 0.11), (0.03, 0.14), (0, 0.14)], 20),
           B0, 'Rubber')
    St.add(cyl(0.012, 0.12, 12), B0 @ T(0, 0, 0.19), 'MetalSteel')
    grip = B0 @ T(0, 0, 0.24) @ R('X', -10)
    secs = []
    for h, rx, ry in ((0.0, 0.019, 0.024), (0.04, 0.022, 0.03), (0.09, 0.024, 0.033), (0.13, 0.021, 0.03),
                      (0.155, 0.017, 0.022)):
        secs.append([Vector((rx * cos(a), ry * sin(a) + 0.004 * (h / 0.155), h)) for a in linspace(0, 2 * pi, 17)[:-1]])
    St.add(loft(secs, 'ngon', (0, 0.006, 0.168)), grip, 'Rubber')
    St.add(box(0.012, 0.018, 0.03, 0.004), grip @ T(0, 0.034, 0.09) @ R('X', 15), 'PlasticMid')
    St.add(cyl(0.007, 0.01, 10, 0.002), grip @ T(0, 0.004, 0.168), 'PlasticMid')
    St.add(cyl(0.005, 0.008, 10, 0.0015), grip @ T(0.012, -0.008, 0.16) @ R('Y', 20), 'GuardRed')
    finish(St, 'Cockpit_Stick', C)


# =============================================================================== PORTE DU PARC
# Anneau dans le plan XZ Blender (XY glTF), axe Y ; la face avant (vers le vaisseau qui arrive) regarde -Y
# Blender = +Z glTF. Ouverture intérieure : rayon 30 m. Corps : r 30 -> 38.5, ép. 7 m ; habitats et
# radiateurs jusqu'à r ≈ 41 m (diamètre hors tout ≈ 82 m). Enseigne en arc au-dessus, jusqu'à r ≈ 52 m.
R_IN = 30.0
DOOR_R = 29.85     # rayon des battants (jeu de 15 cm avec l'anneau)
HINGE_X = 29.9     # charnière verticale de chaque battant (x = ∓29.9)
SEAM = 0.06        # demi-joint au centre


def uv_ramp(co):
    """UV des feux : u = angle depuis le bas de l'anneau / pi (0 en bas, 1 en haut, symétrique G/D)."""
    r = max(sqrt(co.x * co.x + co.z * co.z), 1e-6)
    return (acos(max(-1.0, min(1.0, -co.z / r))) / pi, 0.0)


def build_gate():
    C = new_coll('Gate')
    G = Geo()
    L = Geo(uv=True)
    NMOD = 16
    DA = 2 * pi / NMOD
    HG = 0.03   # demi-joint angulaire entre modules (rad)
    body = [(31.0, -3.5), (37.2, -3.5), (38.5, -2.3), (38.5, 2.3), (37.2, 3.5), (32.6, 3.5), (31.0, 2.4),
            (30.0, 1.0), (30.0, -2.6)]
    collar = [(30.9, -3.8), (37.3, -3.8), (38.9, -2.4), (38.9, 2.4), (37.3, 3.8), (32.7, 3.8), (30.95, 2.5),
              (29.97, 1.0), (29.97, -2.68)]
    panel_mats = ['HullWhite'] * 9 + ['HullLight'] * 4 + ['HullGraphite'] + ['GoldFoil']
    bolt = cyl(0.13, 0.12, 8, 0.03)
    for k in range(NMOD):
        a0, a1 = k * DA, (k + 1) * DA
        ac = (a0 + a1) / 2
        G.add(revolve(body, 6, a0 + HG, a1 - HG, loop=True), AX, 'GateMetal')
        G.add(revolve(collar, 2, a0 - HG * 1.25, a0 + HG * 1.25, loop=True), AX, 'HullGraphite')
        for rr in linspace(31.6, 36.6, 5):                                    # boulons du collier
            for dy in (-1, 1):
                G.add(bolt.copy(), frame(rpos(rr, a0 + dy * HG * 0.6, -3.86), (0, -1, 0)), 'MetalSteel')
        # Panneaux de la face avant (2 couronnes x 3), face arrière et flanc extérieur
        for r0, r1 in ((31.35, 34.05), (34.35, 37.0)):
            for j in range(3):
                b0 = a0 + HG * 1.4 + (a1 - a0 - HG * 2.8) * j / 3
                b1 = a0 + HG * 1.4 + (a1 - a0 - HG * 2.8) * (j + 1) / 3
                g = 0.16 / r1
                prof = [(r0, -3.5), (r1, -3.5), (r1, -3.585), (r1 - 0.05, -3.64), (r0 + 0.05, -3.64), (r0, -3.585)]
                G.add(revolve(prof, 3, b0 + g, b1 - g, loop=True), AX, random.choice(panel_mats))
        for j in range(2):
            b0 = a0 + HG * 1.4 + (a1 - a0 - HG * 2.8) * j / 2
            b1 = a0 + HG * 1.4 + (a1 - a0 - HG * 2.8) * (j + 1) / 2
            g = 0.16 / 37
            G.add(revolve([(33.0, 3.5), (36.9, 3.5), (36.9, 3.6), (33.0, 3.6)], 4, b0 + g, b1 - g, loop=True), AX,
                  'HullGraphite')
            for y0, y1 in ((-2.1, -0.15), (0.15, 2.1)):
                G.add(revolve([(38.5, y0), (38.62, y0), (38.62, y1), (38.5, y1)], 4, b0 + g, b1 - g, loop=True), AX,
                      random.choice(['HullWhite', 'HullWhite', 'HullGraphite']))
        # Feu de position sur chaque collier (anneau extérieur) et petits feux du bord intérieur
        P = rframe(38.9, a0, 0)
        G.add(cyl(0.42, 0.3, 12, 0.06), P @ T(0, 0, 0.15), 'MetalDark')
        L.add(dome(0.34, 0.32, 12), P @ T(0, 0, 0.3), 'GateLights', uv=uv_ramp)
        for j in range(4):
            phi = a0 + DA * (j + 0.5) / 4
            n_in = Vector((-0.669 * cos(phi), -0.743, -0.669 * sin(phi)))
            L.add(box(0.7, 0.22, 0.12, 0.04), frame(rpos(30.5, phi, -3.05) + n_in * 0.04, n_in, (0, -1, 0)),
                  'GateLights', uv=uv_ramp)
        for j in range(3):
            phi = a0 + DA * (j + 0.5) / 3
            n_out = Vector((0.678 * cos(phi), -0.735, 0.678 * sin(phi)))
            L.add(dome(0.2, 0.16, 8), frame(rpos(37.85, phi, -2.9), n_out, (0, 1, 0)), 'GateLights', uv=uv_ramp)
        # Flanc extérieur : habitats (pairs) ou radiateurs (impairs), plus quelques greebles
        if k % 2 == 0 and k not in (4,):
            H = rframe(39.95, ac, -0.6) @ R('Y', 90)
            G.add(revolve([(0, -3.7), (0.7, -3.62), (1.15, -3.25), (1.3, -2.8), (1.3, 2.8), (1.15, 3.25),
                           (0.7, 3.62), (0, 3.7)], 16), H, 'HullWhite')
            for zz in (-1.7, 1.7):
                G.add(revolve([(1.28, zz - 0.18), (1.4, zz - 0.18), (1.4, zz + 0.18), (1.28, zz + 0.18)], 16,
                              loop=True), H, 'GateMetal')
            for zz in linspace(-2.6, 2.6, 6):
                if abs(abs(zz) - 1.7) > 0.4:
                    L.add(box(0.5, 0.16, 0.34, 0.05), H @ R('Z', 90) @ T(0, -1.27, zz) @ R('X', 90), 'GateLights',
                          uv=uv_ramp)
            for sgn in (-1, 1):
                G.add(box(1.0, 1.0, 1.3, 0.1), rframe(38.9, ac + sgn * 0.07, -0.6), 'GateMetal')
        elif k % 2 == 1:
            for yy in (-1.55, 1.55):
                Rm = rframe(38.5, ac, yy)
                G.add(box(6.2, 0.14, 2.6, 0.04), Rm @ T(0, 0, 1.3), 'HullWhite')
                for xx in linspace(-2.8, 2.8, 8):
                    G.add(box(0.12, 0.24, 2.5, 0.03), Rm @ T(xx, 0, 1.3), 'GateMetal')
                G.add(box(6.4, 0.5, 0.35, 0.08), Rm @ T(0, 0, 0.15), 'GateMetal')
        for _ in range(5):
            phi = a0 + HG * 2 + random.random() * (DA - HG * 4)
            sx, sy, sz = random.uniform(0.5, 1.6), random.uniform(0.6, 2.2), random.uniform(0.25, 0.7)
            if k % 2 == 0 and abs(phi - ac) < 0.12:
                continue
            G.add(box(sx, sy, sz, 0.06), rframe(38.5 + sz / 2, phi, random.uniform(-1.8, 1.8)),
                  random.choice(['GateMetal', 'HullGraphite', 'HullWhite']))
    bolt.free()
    # Projecteurs (8) sur la face avant, braqués vers l'avant et un peu vers l'extérieur
    drum = [(0, -1.2), (0.9, -1.2), (1.05, -1.0), (1.05, 0.85), (1.22, 0.98), (1.22, 1.18), (0, 1.18)]
    for k in range(8):
        phi = DA / 2 + k * 2 * DA
        rad = Vector((cos(phi), 0, sin(phi)))
        Mb = frame(rpos(35.6, phi, -3.64), (0, -1, 0), rad)
        G.add(box(2.7, 2.7, 0.35, 0.08), Mb @ T(0, 0, 0.17), 'HullGraphite')
        for sx in (-1, 1):
            G.add(box(0.32, 1.1, 2.1, 0.06), Mb @ T(sx * 1.35, 0, 1.25), 'GateMetal')
        aim = (Vector((0, -1, 0)) * cos(radians(14)) + rad * sin(radians(14))).normalized()
        Md = frame(rpos(35.6, phi, -3.64) + Vector((0, -1.9, 0)), aim, rad)
        G.add(revolve(drum, 24), Md, 'GateMetal')
        for zz in linspace(-0.9, 0.5, 6):
            G.add(revolve([(1.05, zz), (1.24, zz), (1.24, zz + 0.07), (1.05, zz + 0.07)], 24, loop=True), Md,
                  'MetalDark')
        G.add(cyl(0.22, 2.9, 10), Md @ R('Y', 90) @ T(0, 0, 0), 'MetalSteel')
        L.add(revolve([(0, 1.12), (1.0, 1.12), (0.86, 1.22), (0, 1.27)], 24), Md, 'GateLights', uv=uv_ramp)
    # Boîtiers de charnière (x = ±29.9), vérins
    for phi in (0.0, pi):
        Hm = rframe(30.7, phi, -0.2)
        G.add(box(7.5, 4.6, 2.6, 0.18, 2), Hm, 'HullGraphite')
        G.add(box(7.0, 0.06, 0.5, 0.02), Hm @ T(0, -2.31, 0.6), 'PaintPink')
        for zz in (-2.4, 2.4):
            G.add(cyl(0.35, 4.4, 12, 0.05), Hm @ T(zz, -1.0, -1.25) @ R('X', 90), 'MetalSteel')
    # Antennes paraboliques en bas
    for phi in (radians(-90 - 22), radians(-90 + 22)):
        M = rframe(38.5, phi, 1.0)
        G.add(box(1.2, 1.2, 1.6, 0.1), M @ T(0, 0, 0.8), 'GateMetal')
        dish = M @ T(0, 0, 2.4) @ R('X', 35)
        G.add(revolve([(0.0, 0.0), (1.2, 0.36), (2.2, 1.21), (2.25, 1.32), (2.1, 1.3), (1.15, 0.47), (0, 0.13)], 24,
                      loop=False), dish, 'HullWhite')
        G.add(cyl(0.08, 2.2, 6), dish @ T(0, 0, 1.1), 'MetalSteel')
        G.add(cyl(0.22, 0.4, 10, 0.05), dish @ T(0, 0, 2.2), 'MetalDark')
    # Support de l'enseigne : treillis en arc derrière les lettres, jambes jusqu'à l'anneau
    RS0, RS1, YS = 43.4, 50.6, 1.15
    span = radians(31)
    arcs = {}
    for rr in (RS0, RS1):
        pts = [rpos(rr, pi / 2 + a, YS) for a in linspace(-span, span, 41)]
        arcs[rr] = pts
        G.add(sweep(pts, circle2d(0.34, 10), (0, 1, 0)), mat='GateMetal')
    for i in range(40):
        p0 = arcs[RS0][i] if i % 2 == 0 else arcs[RS1][i]
        p1 = arcs[RS1][i + 1] if i % 2 == 0 else arcs[RS0][i + 1]
        G.add(tube_between(p0, p1, 0.16, 8), mat='GateMetal')
    for i in range(0, 41, 4):
        G.add(tube_between(arcs[RS0][i], arcs[RS1][i], 0.2, 8), mat='GateMetal')
    for a in (-26, -13, 0, 13, 26):
        phi = pi / 2 + radians(a)
        for yy in (-1.6, 1.6):
            G.add(tube_between(rpos(38.4, phi, yy), rpos(RS0, phi, YS), 0.32, 10), mat='HullGraphite')
        G.add(box(1.6, 3.6, 0.6, 0.1), rframe(38.7, phi, 0), 'GateMetal')

    # ---------------------------------------------------------------- Gate_Sign : BOULARDTV en arc
    S_ = Geo(uv=True)
    font = bpy.data.fonts.load(FONT)
    H = 7.0
    probe = text_bm('B', font, 0.1, 0.0)
    zs = [v.co.y for v in probe.verts]
    s = H / (max(zs) - min(zs))
    probe.free()
    RS = 44.3
    letters = []
    for ch in 'BOULARDTV':
        bm = text_bm(ch, font, 1.1 / s, 0.07 / s, offset=0.03, res=6)
        xs = [v.co.x for v in bm.verts]
        letters.append((bm, min(xs), max(xs)))
    gap = 1.0
    total = sum((x1 - x0) * s for _, x0, x1 in letters) + gap * (len(letters) - 1)
    phi0 = pi / 2 + (total / 2) / RS
    phi1 = pi / 2 - (total / 2) / RS
    cum = 0.0
    sign_uv = lambda co: ((phi0 - atan2(co.z, co.x)) / (phi0 - phi1), 0.5)
    for bm, x0, x1 in letters:
        w = (x1 - x0) * s
        phi = phi0 - (cum + w / 2) / RS
        X = Vector((sin(phi), 0, -cos(phi)))
        Y = Vector((cos(phi), 0, sin(phi)))
        Mr = Matrix((X, Y, Vector((0, -1, 0)))).transposed().to_4x4()
        Mr.translation = rpos(RS, phi, 0)
        M = Mr @ S(s) @ T(-(x0 + x1) / 2, 0, 0)
        S_.add(bm, M, matfn=lambda n, c: 'GateNeon' if n.y < -0.55 else 'GateMetal', uv=sign_uv)
        # pattes de fixation vers le treillis
        for rr in (RS0 + 0.6, RS1 - 1.0):
            G.add(box(0.5, YS + 0.2, 0.5, 0.06), rframe(rr, phi, YS / 2), 'GateMetal')
        cum += w + gap
    finish(G, 'Gate_Ring', C)
    finish(S_, 'Gate_Sign', C)
    finish(L, 'Gate_Lights', C)

    # ---------------------------------------------------------------- Gate_DoorL / Gate_DoorR
    parts = []   # (bmesh dans le repère monde du battant gauche, matériau ou liste)
    a0, a1 = pi / 2, 3 * pi / 2
    parts.append((slab(sector(0, DOOR_R, a0, a1, step=0.9), -0.35, 0.35), 'GateMetal'))
    parts.append((slab(sector(28.3, DOOR_R, a0, a1, step=0.9), -0.62, 0.62, 0.06), 'HullGraphite'))
    parts.append((slab([(0, 28.4), (0, -28.4), (-1.0, -28.38), (-1.0, 28.38)], -0.62, 0.62, 0.06), 'HullGraphite'))
    da = radians(2.75)
    parts.append((slab(sector(27.95, 28.25, a0 + da, a1 - da, step=0.9), -0.66, -0.5), 'GateNeon'))
    parts.append((slab([(-1.05, 27.9), (-1.05, -27.9), (-1.35, -27.9), (-1.35, 27.9)], -0.66, -0.5), 'GateNeon'))
    rings = [(1.6, 7.0, 2), (7.0, 13.0, 3), (13.0, 19.0, 4), (19.0, 24.0, 5), (24.0, 27.9, 6)]
    for ri, (r0, r1, n) in enumerate(rings):
        lo = a0 + math.asin(min(1.0, 1.25 / r0))
        hi = a1 - math.asin(min(1.0, 1.25 / r0))
        for j in range(n):
            b0, b1 = lo + (hi - lo) * j / n, lo + (hi - lo) * (j + 1) / n
            m = random.choice(['HullWhite', 'HullWhite', 'HullWhite', 'HullLight'] if ri % 2 else
                              ['HullLight', 'HullLight', 'HullWhite', 'HullGraphite'])
            parts.append((slab(sector(r0, r1, b0, b1, gap=0.18, step=1.0), -0.56, -0.35, 0.05), m))
            # rivets aux quatre coins de chaque panneau
            for rr_, ph in ((r0 + 0.45, b0 + 0.45 / r0), (r0 + 0.45, b1 - 0.45 / r0), (r1 - 0.45, b0 + 0.45 / r1),
                            (r1 - 0.45, b1 - 0.45 / r1)):
                parts.append((xf(cyl(0.09, 0.06, 6), frame(rpos(rr_, ph, -0.575), (0, -1, 0))), 'MetalSteel'))
        if ri >= 2:   # trappes et évents
            phi = (lo + hi) / 2 + radians(random.uniform(-20, 20))
            rr = (r0 + r1) / 2
            parts.append((xf(box(1.4, 0.12, 0.9, 0.04), frame(rpos(rr, phi, -0.6), (0, -1, 0), (0, 0, 1))), 'GateMetal'))
    for j in range(1, 8):
        phi = a0 + pi * j / 8
        L_ = 28.3 - 1.6
        Mrib = frame(rpos(1.6 + L_ / 2, phi, 0.6), (0, 1, 0), (cos(phi), 0, sin(phi)))
        parts.append((xf(box(0.5, L_, 0.5, 0.08), Mrib), 'GateMetal'))
    for rr in (10.0, 20.0):
        parts.append((slab(sector(rr, rr + 0.5, a0 + 0.1, a1 - 0.1, step=0.9), 0.35, 0.85, 0.05), 'GateMetal'))
    parts.append((xf(cyl(0.75, 9.0, 16, 0.1), T(-HINGE_X + SEAM, 0, 0)), 'MetalSteel'))   # axe de charnière
    # Logo B (SVG de Mathis) en relief, coupé au joint : croissants roses (GateNeon), trait blanc (GateLights)
    shapes = svg_shapes(LOGO_SVG)
    allp = [p for _, polys in shapes for poly in polys for p in poly]
    xs, ys = [p[0] for p in allp], [p[1] for p in allp]
    sc = 26.0 / (max(ys) - min(ys))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    # plan XY du SVG -> plan XZ, relief vers -Y (face avant), à l'endroit vu de face
    logo_M = Matrix(((1, 0, 0, 0), (0, 0, -1, -0.72), (0, 1, 0, 0), (0, 0, 0, 1))) @ S(sc) @ T(-cx, -cy, 0)
    logo_parts = {'L': [], 'R': []}
    for color, polys in shapes:
        m = 'GateLights' if color in ('white', '#fff', '#ffffff') else 'GateNeon'
        base = curve_fill(polys, 0.32 / sc, 0.04 / sc)
        bmesh.ops.transform(base, matrix=logo_M, verts=base.verts)
        for side, sgn in (('L', -1), ('R', 1)):
            half_bm = base.copy()
            geom = half_bm.verts[:] + half_bm.edges[:] + half_bm.faces[:]
            bmesh.ops.bisect_plane(half_bm, geom=geom, dist=1e-5, plane_co=(sgn * SEAM, 0, 0),
                                   plane_no=(-sgn, 0, 0), clear_outer=True)
            bmesh.ops.holes_fill(half_bm, edges=half_bm.edges[:], sides=0)
            bmesh.ops.recalc_face_normals(half_bm, faces=half_bm.faces[:])
            logo_parts[side].append((half_bm, m))
        base.free()
    for side, sgn in (('L', -1), ('R', 1)):
        Dg = Geo()
        Mside = T(-SEAM, 0, 0) if sgn < 0 else MIRROR_X @ T(-SEAM, 0, 0)
        for bm, m in parts:
            Dg.add(bm.copy(), Mside, m)
        for bm, m in logo_parts[side]:
            Dg.add(bm, None, m)
        finish(Dg, f'Gate_Door{side}', C, origin=(sgn * HINGE_X, 0, 0))
    for bm, _ in parts:
        bm.free()


# =============================================================================== VAISSEAUX
def interp_rows(st, sub):
    m = len(st)
    out = []
    for i in range(m - 1):
        for k in range(sub):
            t = k / sub
            row = []
            for c in range(len(st[0])):
                p0, p1, p2, p3 = st[max(i - 1, 0)][c], st[i][c], st[i + 1][c], st[min(i + 2, m - 1)][c]
                row.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                                  + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
            out.append(tuple(row))
    out.append(tuple(st[-1]))
    return out


class Hull:
    """Coque lissée depuis des stations (y, demi-largeur, haut, bas, z du centre, exposant)."""

    def __init__(self, stations, sub=4):
        self.rows = sorted(interp_rows(stations, sub), key=lambda r: -r[0])

    def at(self, y):
        rows = self.rows
        if y >= rows[0][0]:
            return rows[0]
        for r0, r1 in zip(rows, rows[1:]):
            if r0[0] >= y >= r1[0]:
                t = (r0[0] - y) / max(r0[0] - r1[0], 1e-9)
                return tuple(a + (b - a) * t for a, b in zip(r0, r1))
        return rows[-1]

    def x_at(self, y, z):
        _, a, bt, bb, cz, n = self.at(y)
        b = bt if z >= cz else bb
        q = min(abs(z - cz) / b, 0.999)
        return a * (1 - q ** n) ** (1 / n)

    def top(self, y):
        r = self.at(y)
        return r[4] + r[2]

    def mesh(self, segs=32, grooves=(), gd=0.02, ge=0.03, nose=None):
        rows = list(self.rows)
        for yg in grooves:
            p = self.at(yg)
            rows = [r for r in rows if abs(r[0] - yg) > ge * 1.6]
            rows += [(yg + ge,) + p[1:], (yg, p[1] - gd, p[2] - gd, p[3] - gd, p[4], p[5]), (yg - ge,) + p[1:]]
        rows.sort(key=lambda r: -r[0])
        secs = []
        for y, a, bt, bb, cz, n in rows:
            pts = []
            for k in range(segs):
                t = 2 * pi * k / segs
                c, s = cos(t), sin(t)
                pts.append(Vector((a * copysign(abs(c) ** (2 / n), c), y,
                                   cz + (bt if s >= 0 else bb) * copysign(abs(s) ** (2 / n), s))))
            secs.append(pts)
        return loft(secs, nose, 'ngon')


def engine_pair(G, E, pos, r, length, axis=(0, -1, 0)):
    """Tuyère (coque métal brûlé + nervures) dans G, flamme dans E (nœud *_Engine)."""
    M = frame(pos, axis, (0, 0, 1))
    G.add(nozzle(r, length), M, 'MetalBurnt')
    for k in range(12):
        a = 2 * pi * k / 12
        G.add(box(r * 0.08, r * 0.1, length * 0.7, r * 0.02), M @ T(r * 1.03 * cos(a), r * 1.03 * sin(a), length * 0.55)
              @ R('Z', math.degrees(a)), 'MetalDark')
    G.add(cyl(r * 0.76, length * 0.2, 24), M @ T(0, 0, -length * 0.1), 'MetalDark')
    E.add(glow(r * 0.74), M @ T(0, 0, length * 0.08), 'ShipEngine')
    E.add(revolve([(r * 0.74, length * 0.02), (r * 0.86, length * 0.45), (r * 0.82, length * 0.45),
                   (r * 0.70, length * 0.02)], 24, loop=True), M, 'ShipEngine')


def nav_light(G, pos, r=0.08, d=None):
    d = d or ((1 if pos[0] > 0 else -1, 0, 0) if abs(pos[0]) > 0.01 else (0, 0, 1))
    G.add(dome(r, r * 0.8, 10), frame(pos, d), 'ShipLights')


def build_ship_a():
    """Chasseur effilé, ~12.8 m (y de -6.6 à +6.3), envergure 10.6 m."""
    C = COLLS['Ships']
    G, E = Geo(), Geo()
    st = [(6.25, 0.05, 0.05, 0.05, 0.02, 2.0), (5.5, 0.30, 0.20, 0.16, 0.04, 2.2), (4.4, 0.58, 0.38, 0.28, 0.06, 2.4),
          (3.0, 0.82, 0.55, 0.36, 0.08, 2.6), (1.5, 1.0, 0.64, 0.42, 0.08, 2.8), (0.0, 1.12, 0.66, 0.46, 0.06, 3.0),
          (-2.0, 1.22, 0.62, 0.48, 0.04, 3.2), (-4.0, 1.25, 0.58, 0.48, 0.02, 3.2), (-5.4, 1.2, 0.54, 0.46, 0.0, 3.2),
          (-5.9, 1.14, 0.5, 0.44, 0.0, 3.2)]
    hull = Hull(st, 4)
    G.add(hull.mesh(36, grooves=(4.0, 2.25, -0.9, -3.4), gd=0.018, nose=(0, 6.42, 0.02)),
          matfn=lambda n, c: 'PaintPink' if (c.y > 5.25 and c.y < 5.6) else ('Carbon' if n.z < -0.6 else 'HullGraphite'))
    # Verrière (verre fumé) et son arceau
    cst = [(3.95, 0.04, 0.03, 0.2, 0.5, 2.0), (3.4, 0.30, 0.25, 0.2, 0.52, 2.0), (2.5, 0.46, 0.40, 0.2, 0.52, 2.2),
           (1.4, 0.50, 0.42, 0.2, 0.52, 2.2), (0.5, 0.44, 0.32, 0.2, 0.52, 2.2), (0.0, 0.32, 0.18, 0.2, 0.52, 2.2)]
    G.add(Hull(cst, 4).mesh(28, nose=(0, 4.1, 0.52)), mat='Glass')
    bow = [Vector((0.5 * cos(a) * 1.04, 2.05, 0.52 + 0.43 * sin(a) * 1.04)) for a in linspace(0.08, pi - 0.08, 17)]
    G.add(sweep(bow, rrect(0.07, 0.035, 0.012, 2), lambda p, i: p - Vector((0, 2.05, 0.52))), mat='MetalDark')
    canopy = Hull(cst, 4)
    G.add(sweep([Vector((0, y, canopy.top(y) + 0.008)) for y in linspace(3.55, 0.25, 14)],
                rrect(0.045, 0.03, 0.01, 2), (0, 0, 1)), mat='MetalDark')
    # Ailes en flèche, bande rose, saumons
    for sgn in (-1, 1):
        sec = [((sgn * 1.0, 0.8, -0.05), (0, -5.8, 0), (0, 0, 1), 0.3),
               ((sgn * 3.2, -2.0, -0.12), (0, -3.0, 0), (0, 0, 1), 0.16),
               ((sgn * 5.2, -3.75, -0.2), (0, -1.3, 0), (0, 0, 1), 0.08)]
        G.add(wing(sec, 10), matfn=lambda n, c: 'PaintPink' if 3.75 < abs(c.x) < 4.15 else 'HullGraphite')
        G.add(wing([((sgn * 0.85, 3.5, 0.0), (0, -3.2, 0), (0, 0, 1), 0.08),
                    ((sgn * 1.55, 1.1, -0.04), (0, -0.9, 0), (0, 0, 1), 0.03)], 6), mat='HullGraphite')
        G.add(box(0.12, 1.6, 0.14, 0.04), T(sgn * 5.25, -4.25, -0.2), 'MetalDark')
        G.add(cyl(0.05, 1.8, 8), T(sgn * 5.25, -3.4, -0.2) @ R('X', 90), 'MetalSteel')
        nav_light(G, (sgn * 5.32, -4.0, -0.2), 0.07)
        # Dérives jumelles inclinées
        tip = Vector((sgn * 1.38, -4.9, 2.0))
        G.add(wing([((sgn * 0.78, -2.6, 0.45), (0, -3.25, 0), (1, 0, 0), 0.13),
                    ((sgn * 1.12, -3.9, 1.35), (0, -1.75, 0), (1, 0, 0), 0.08),
                    (tip, (0, -1.05, 0), (1, 0, 0), 0.05)], 8),
              matfn=lambda n, c: 'PaintPink' if c.z > 1.55 else 'HullGraphite')
        G.add(dome(0.05, 0.05, 8), T(sgn * 1.38, -5.4, 2.03), 'ShipLights')
        # Entrées d'air latérales
        Mi = T(sgn * 1.02, 0.4, -0.12)
        G.add(box(0.36, 2.8, 0.5, 0.08, 2), Mi, 'Carbon')
        G.add(box(0.28, 0.06, 0.38, 0.03), Mi @ T(0, 1.4, 0), 'Rubber')
        # Tuyères
        engine_pair(G, E, (sgn * 0.56, -5.92, 0.0), 0.44, 0.75)
        # Ports RCS sur le nez
        for yy in (4.6, 4.95):
            G.add(box(0.03, 0.09, 0.06, 0.01), T(sgn * (hull.x_at(yy, 0.06) + 0.005), yy, 0.06), 'MetalDark')
    G.add(box(2.15, 0.25, 0.85, 0.08, 2), T(0, -5.95, 0.0), 'MetalDark')
    G.add(dome(0.16, 0.12, 12), frame((0, 5.6, -0.12), (0, 0.35, -1)), 'Glass')
    for xx in (-0.18, 0.18):
        G.add(box(0.02, 0.5, 0.22, 0.008), T(xx, -1.6, hull.top(-1.6) + 0.1) @ R('X', 18), 'MetalDark')
    ship = finish(G, 'Ship_A', C)
    finish(E, 'Ship_A_Engine', C, parent=ship, wn=False)


def logo_relief(G, center, normal, height, depth, mats, flip=False):
    """Logo B (SVG) en relief, posé à plat sur une surface : X du logo vers +Y monde (l'avant)."""
    shapes = svg_shapes(LOGO_SVG)
    allp = [p for _, polys in shapes for poly in polys for p in poly]
    xs_, ys_ = [p[0] for p in allp], [p[1] for p in allp]
    sc = height / (max(ys_) - min(ys_))
    cx, cy = (max(xs_) + min(xs_)) / 2, (max(ys_) + min(ys_)) / 2
    M = frame(center, normal, (0, 0, 1)) @ S(sc) @ T(-cx, -cy, 0)
    if flip:
        M = M @ S(-1, 1, 1)
    for color, polys in shapes:
        G.add(curve_fill(polys, depth / sc), M, mats[1] if color in ('white', '#fff', '#ffffff') else mats[0])


def build_ship_b():
    """Navette / yacht de croisière, ~32 m (y de -16.4 à +15.8), coque blanche, verrière et bandeaux fumés."""
    C = COLLS['Ships']
    G, E = Geo(), Geo()
    st = [(15.6, 0.05, 0.04, 0.04, 0.05, 2.0), (14.8, 0.9, 0.5, 0.42, 0.05, 2.2), (12.8, 1.9, 1.1, 0.85, 0.08, 2.4),
          (9.0, 2.95, 1.7, 1.2, 0.1, 2.6), (4.0, 3.55, 2.05, 1.4, 0.1, 2.7), (-3.0, 3.7, 2.15, 1.45, 0.05, 2.8),
          (-9.0, 3.45, 2.0, 1.4, 0.0, 2.8), (-13.5, 2.95, 1.8, 1.3, 0.0, 2.9), (-15.0, 2.75, 1.7, 1.25, 0.0, 2.9)]
    hull = Hull(st, 5)
    G.add(hull.mesh(48, grooves=(6.6, 0.0, -6.0, -11.0), gd=0.03, ge=0.05, nose=(0, 15.75, 0.05)),
          matfn=lambda n, c: 'HullGraphite' if c.z < -0.85 else 'HullWhite')
    # Verrière de passerelle (verre fumé) posée sur l'avant, arceaux
    cst = []
    for y, a, h in ((12.9, 0.06, 0.04), (12.2, 0.95, 0.4), (10.8, 1.55, 0.68), (9.0, 1.75, 0.78), (7.2, 1.55, 0.66),
                    (6.0, 1.0, 0.36), (5.5, 0.12, 0.05)):
        cst.append((y, a, h + 0.3, 0.3, hull.top(y) - 0.3, 2.3))
    canopy = Hull(cst, 4)
    G.add(canopy.mesh(32, nose=(0, 13.0, hull.top(12.9) - 0.28)), mat='Glass')
    for yy in (10.8, 9.0, 7.2):
        _, a, bt, bb, cz, n = canopy.at(yy)
        arc = []
        for t in linspace(0.12, pi - 0.12, 15):
            c, s = cos(t), sin(t)
            arc.append(Vector((a * copysign(abs(c) ** (2 / n), c) * 1.012, yy, cz + bt * abs(s) ** (2 / n) * 1.012)))
        G.add(sweep(arc, rrect(0.12, 0.05, 0.02, 2), lambda p, i, cz=cz, yy=yy: p - Vector((0, yy, cz))), mat='HullWhite')
    for sgn in (-1, 1):
        # Bandeau vitré latéral épousant la coque, hublots éclairés, filet rose émissif
        secs = []
        for y in linspace(6.2, -10.4, 34):
            xa, xb = hull.x_at(y, 0.36), hull.x_at(y, 1.04)
            secs.append([Vector((sgn * (xa + 0.018), y, 0.36)), Vector((sgn * (xb + 0.018), y, 1.04)),
                         Vector((sgn * (xb - 0.06), y, 1.04)), Vector((sgn * (xa - 0.06), y, 0.36))])
        G.add(loft(secs), mat='Glass')
        for yy in linspace(-9.6, 5.6, 14):
            x = hull.x_at(yy, 0.7)
            G.add(box(0.03, 0.86, 0.4, 0.012), T(sgn * (x + 0.024), yy, 0.7), 'ShipWindows')
        stripe = [Vector((sgn * (hull.x_at(y, -0.3) + 0.008), y, -0.3)) for y in linspace(14.2, -14.6, 48)]
        G.add(sweep(stripe, [(-0.012, -0.035), (0.012, -0.035), (0.012, 0.035), (-0.012, 0.035)], (0, 0, 1)),
              mat='ShipLights')
        # Nacelles moteur latérales sur pylônes en flèche
        pod = Hull([(-1.6, 0.06, 0.06, 0.06, 0.0, 2.0), (-2.6, 0.55, 0.55, 0.55, 0.0, 2.0), (-4.6, 0.85, 0.85, 0.85, 0.0, 2.0),
                    (-11.0, 0.95, 0.95, 0.95, 0.0, 2.0), (-15.0, 0.88, 0.88, 0.88, 0.0, 2.0)], 4)
        G.add(pod.mesh(24, grooves=(-5.5, -10.0), nose=(0, -1.45, 0)), T(sgn * 4.9, 0, -0.75),
              matfn=lambda n, c: 'PaintPink' if -8.4 < c.y < -7.8 else 'HullWhite')
        G.add(wing([((sgn * 2.6, -4.6, -0.55), (0, -6.4, 0), (0, 0, 1), 0.5),
                    ((sgn * 4.9, -6.4, -0.75), (0, -4.6, 0), (0, 0, 1), 0.34)], 8), mat='HullWhite')
        engine_pair(G, E, (sgn * 4.9, -15.0, -0.75), 0.78, 1.0)
        nav_light(G, (sgn * 5.86, -9.0, -0.75), 0.11)
        # Sas latéral, propulseurs d'attitude
        x = hull.x_at(-1.5, -0.25)
        G.add(slab(rrect(1.5, 2.1, 0.32, 3), -0.05, 0.0, 0.015),
              frame((sgn * (x + 0.012), -1.5, -0.3), (sgn, 0, 0), (0, 0, 1)) @ R('X', 90), 'HullLight')
        for yy in (11.0, -12.5):
            xx = hull.x_at(yy, 0.2)
            G.add(box(0.22, 0.6, 0.34, 0.06), T(sgn * (xx + 0.06), yy, 0.2), 'MetalDark')
            for d in ((sgn, 0, 0), (0, 0, 1), (0, 0, -1)):
                G.add(nozzle(0.07, 0.1, 8), frame(Vector((sgn * (xx + 0.06), yy, 0.2)) + Vector(d) * 0.17, d), 'MetalBurnt')
        # B de BoulardTV peint sur la dérive (croissants roses, trait graphite)
        logo_relief(G, (sgn * 0.19, -10.1, 3.3), (sgn, 0, 0), 2.3, 0.06, ('PaintPink', 'HullGraphite'), flip=sgn < 0)
    # Carénage dorsal à radiateurs (devant la dérive), trappe de service, capteur ventral
    for yy in linspace(-0.5, -4.2, 6):
        G.add(box(1.5, 0.5, 0.14, 0.04), T(0, yy, hull.top(yy) + 0.02), 'HullLight')
        for xx in linspace(-0.6, 0.6, 7):
            G.add(box(0.05, 0.46, 0.08, 0.015), T(xx, yy, hull.top(yy) + 0.12), 'MetalDark')
    G.add(slab(rrect(1.2, 1.6, 0.2, 3), -0.04, 0.0, 0.012), T(0, 2.2, hull.top(2.2) + 0.005) @ R('X', 90) @ AX @ AX,
          'HullLight')
    G.add(dome(0.45, 0.3, 16), frame((0, 9.0, hull.at(9.0)[4] - hull.at(9.0)[3] + 0.02), (0, 0, -1)), 'Glass')
    for sgn in (-1, 1):
        G.add(revolve([(0.5, 0.0), (0.66, 0.0), (0.7, 0.12), (0.5, 0.12)], 24, loop=True),
              frame((sgn * 4.9, -2.55, -0.75), (0, 1, 0)), 'MetalDark')
    # Dérive dorsale
    G.add(wing([((0, -4.5, 1.9), (0, -9.0, 0), (1, 0, 0), 0.5), ((0, -10.5, 4.2), (0, -4.6, 0), (1, 0, 0), 0.3),
                ((0, -13.6, 5.2), (0, -1.6, 0), (1, 0, 0), 0.18)], 10),
          matfn=lambda n, c: 'PaintPink' if c.z > 4.75 else 'HullWhite')
    G.add(dome(0.1, 0.1, 8), T(0, -14.4, 5.25), 'ShipLights')
    # Moteurs principaux, poupe
    G.add(box(4.6, 0.5, 2.6, 0.2, 2), T(0, -15.05, 0.1), 'HullGraphite')
    engine_pair(G, E, (-1.1, -15.3, 0.2), 0.88, 1.15)
    engine_pair(G, E, (1.1, -15.3, 0.2), 0.88, 1.15)
    # Antennes, feux
    for k, yy in enumerate((-1.0, -1.8, -2.6)):
        G.add(cyl(0.035, 0.9 - k * 0.2, 6), T(0.7, yy, hull.top(yy) + 0.4 - k * 0.1), 'MetalSteel')
    G.add(dome(0.1, 0.08, 8), T(0, 15.0, hull.at(15.0)[4] + hull.at(15.0)[2] - 0.02), 'ShipLights')
    ship = finish(G, 'Ship_B', C)
    finish(E, 'Ship_B_Engine', C, parent=ship, wn=False)



def build_ship_c():
    """Cargo / barge, ~41.5 m (y de -21.3 à +20.4), conteneurs, poutre, bloc moteur à 4 tuyères."""
    C = COLLS['Ships']
    G, E = Geo(), Geo()
    cab = Hull([(20.4, 1.2, 0.8, 0.9, 0.6, 4.0), (19.8, 2.5, 1.9, 1.7, 0.45, 4.0), (18.4, 3.0, 2.25, 1.95, 0.35, 4.5),
                (15.0, 3.1, 2.3, 2.0, 0.25, 5.0), (12.6, 3.0, 2.2, 2.0, 0.2, 5.0)], 4)
    G.add(cab.mesh(40, grooves=(17.2, 14.6), gd=0.03, ge=0.05),
          matfn=lambda n, c: 'Glass' if (c.y > 18.6 and c.z > 0.9 and n.y > 0.1) else
          ('PaintPink' if 15.6 < c.y < 16.2 else ('HullGraphite' if c.z < -0.8 else 'HullWhite')))
    # Poutre centrale, treillis latéral, conduites
    G.add(box(2.4, 26.0, 2.4, 0.12, 2), T(0, 0, 0), 'HullGraphite')
    for sgn in (-1, 1):
        for i, yy in enumerate(linspace(12.0, -12.0, 13)):
            G.add(box(0.25, 2.0, 0.25, 0.04), T(sgn * 1.3, yy, 0) @ R('X', 45 if i % 2 else -45), 'MetalDark')
        G.add(cyl(0.22, 25.0, 10), T(sgn * 0.65, 0, 1.38) @ R('X', 90), 'MetalSteel')
    # Conteneurs (6 m) de part et d'autre, deux niveaux
    cmats = ['ContainerOrange', 'ContainerBlue', 'ContainerGrey', 'ContainerTeal', 'HullWhite', 'ContainerOrange',
             'ContainerGrey', 'PaintPink']
    k = 0
    for yy in (9.3, 3.1, -3.1, -9.3):
        for sgn in (-1, 1):
            for zz in (-1.32, 1.32):
                m = cmats[(k * 5 + 3) % len(cmats)]
                k += 1
                M = T(sgn * 2.75, yy, zz)
                G.add(box(2.5, 6.0, 2.6, 0.05), M, m)
                for cx_ in (-1.2, 1.2):
                    for cy_ in (-2.95, 2.95):
                        for cz_ in (-1.25, 1.25):
                            G.add(box(0.18, 0.18, 0.18, 0.02), M @ T(cx_, cy_, cz_), 'MetalDark')
                for ry in linspace(-2.6, 2.6, 10):
                    G.add(box(0.07, 0.22, 2.36, 0.02), M @ T(sgn * 1.25, ry, 0), m)
                for rz in (-0.9, 0.0, 0.9):
                    G.add(box(2.2, 0.06, 0.12, 0.02), M @ T(0, 3.0 * (1 if yy > 0 else -1), rz), m)
    # Bloc moteur, radiateurs, tuyères
    eng = Hull([(-12.6, 3.2, 2.6, 2.4, 0.0, 6.0), (-13.4, 3.6, 3.0, 2.8, 0.0, 6.0), (-19.0, 3.6, 3.0, 2.8, 0.0, 6.0),
                (-20.0, 3.3, 2.7, 2.5, 0.0, 6.0)], 3)
    G.add(eng.mesh(40, grooves=(-15.2, -17.4), gd=0.035, ge=0.05),
          matfn=lambda n, c: 'PaintPink' if (c.z > 2.5 and -14.4 < c.y < -13.9) else 'HullGraphite')
    for sgn in (-1, 1):
        for yy in (-14.5, -17.5):
            Rm = T(sgn * 3.6, yy, 0.6)
            G.add(box(5.0, 2.2, 0.1, 0.03), Rm @ T(sgn * 2.5, 0, 0), 'HullWhite')
            for xx in linspace(0.4, 4.6, 6):
                G.add(box(0.08, 2.1, 0.2, 0.02), Rm @ T(sgn * xx, 0, 0), 'MetalDark')
        for zz in (-1.4, 1.4):
            engine_pair(G, E, (sgn * 1.6, -20.0, zz), 1.2, 1.3)
    # Propulseurs d'attitude aux coins de la cabine, mât d'antenne, feux
    for sx in (-1, 1):
        for sz in (-1, 1):
            P = T(sx * 3.05, 16.5, 0.3 + sz * 1.7)
            G.add(box(0.6, 0.8, 0.6, 0.1), P, 'MetalDark')
            for d in ((sx, 0, 0), (0, 0, sz), (0, 1, 0)):
                G.add(nozzle(0.12, 0.2, 10), frame(Vector(P.translation) + Vector(d) * 0.3, d), 'MetalBurnt')
        nav_light(G, (sx * 3.2, 13.0, 0.4), 0.14)
        nav_light(G, (sx * 3.65, -19.5, 2.4), 0.14)
    G.add(cyl(0.06, 2.4, 6), T(0.8, 15.5, 2.5 + 1.2), 'MetalSteel')
    G.add(cyl(0.03, 1.6, 6), T(-0.8, 15.0, 2.5 + 0.8), 'MetalSteel')
    G.add(dome(0.14, 0.12, 8), T(0.8, 15.5, 4.95), 'ShipLights')
    ship = finish(G, 'Ship_C', C)
    finish(E, 'Ship_C_Engine', C, parent=ship, wn=False)


# =============================================================================== WAGON
# Rail tubulaire de rayon 0.18 m centré à l'origine, selon Y (Z glTF). Les bogies l'enserrent : roues
# porteuses dessus, galets de guidage sur les côtés, roues anti-soulèvement dessous ; le dessous reste
# libre sur |x| < 0.12 m pour les supports du rail.
RAIL_R = 0.18


def build_coaster():
    C = new_coll('Coaster')
    G = Geo()
    # Caisse d'un seul tenant : nez bas, bosse de capot à l'avant, assise plate, dosseret arrière
    st = [(1.68, 0.05, 0.03, 0.03, 0.64, 2.0), (1.56, 0.3, 0.13, 0.12, 0.66, 2.2), (1.3, 0.52, 0.25, 0.2, 0.7, 2.5),
          (0.98, 0.64, 0.42, 0.22, 0.72, 2.8), (0.66, 0.68, 0.33, 0.24, 0.72, 3.2), (0.3, 0.68, 0.26, 0.24, 0.72, 3.4),
          (-0.9, 0.68, 0.26, 0.24, 0.72, 3.4), (-1.18, 0.66, 0.36, 0.24, 0.72, 3.0), (-1.36, 0.56, 0.3, 0.22, 0.72, 2.6),
          (-1.44, 0.38, 0.18, 0.15, 0.72, 2.2)]
    body = Hull(st, 5)
    G.add(body.mesh(40, grooves=(1.12, -1.05), gd=0.006, ge=0.01, nose=(0, 1.71, 0.64)),
          matfn=lambda n, c: 'Carbon' if c.z < 0.58 else ('PaintPink' if 1.16 < c.y < 1.3 else 'HullWhite'))
    # Saute-vent fumé sur la bosse avant
    G.add(wing([((-0.42, 0.86, 1.1), (0, -0.16, 0.13), (0, 0.6, 0.8), 0.02),
                ((0.0, 0.88, 1.12), (0, -0.16, 0.14), (0, 0.6, 0.8), 0.02),
                ((0.42, 0.86, 1.1), (0, -0.16, 0.13), (0, 0.6, 0.8), 0.02)], 6), mat='Carbon')
    # Sièges (2 rangées de 2), appuie-tête, harnais en U
    seat_back = Hull([(0.08, 0.1, 0.42, 0.04, 0.0, 3.0), (0.0, 0.24, 0.5, 0.05, 0.0, 3.5), (-0.1, 0.24, 0.5, 0.05, 0.0, 3.5),
                      (-0.16, 0.18, 0.44, 0.04, 0.0, 3.0)], 2)
    for yy in (0.32, -0.62):
        for sgn in (-1, 1):
            Ms = T(sgn * 0.3, yy, 0.98)
            G.add(box(0.46, 0.5, 0.12, 0.04, 2), Ms @ T(0, 0.08, 0.0), 'Rubber')
            G.add(seat_back.mesh(16), Ms @ T(0, -0.2, 0.0) @ R('X', -12), 'Rubber')
            G.add(box(0.28, 0.12, 0.2, 0.05, 2), Ms @ T(0, -0.3, 0.62) @ R('X', -12), 'Rubber')
            bar = [Ms @ Vector(p) for p in ((-0.2, -0.12, 0.62), (-0.2, 0.1, 0.5), (-0.17, 0.3, 0.22), (0.17, 0.3, 0.22),
                                            (0.2, 0.1, 0.5), (0.2, -0.12, 0.62))]
            G.add(sweep(catmull(bar, 4), circle2d(0.022, 8), lambda p, i: Vector((0, 0, 1))), mat='MetalSteel')
            G.add(sweep([Ms @ Vector((x, 0.31, 0.22)) for x in linspace(-0.13, 0.13, 4)], circle2d(0.032, 10),
                        (0, 0, 1)), mat='PaintPink')
        G.add(box(1.3, 0.08, 0.3, 0.03), T(0, yy - 0.52, 1.1), 'HullWhite')
    # Bande LED et phares
    for sgn in (-1, 1):
        strip = [Vector((sgn * (body.x_at(y, 0.66) + 0.006), y, 0.66)) for y in linspace(1.25, -1.2, 24)]
        G.add(sweep(strip, [(-0.006, -0.012), (0.006, -0.012), (0.006, 0.012), (-0.006, 0.012)], (0, 0, 1)),
              mat='CoasterLights')
        G.add(box(0.14, 0.05, 0.05, 0.02), frame((sgn * 0.24, 1.47, 0.66), (sgn * 0.3, 1, 0), (0, 0, 1)),
              'CoasterHeadlight')
    G.add(box(0.12, 0.04, 0.03, 0.01), T(0, -1.36, 0.82), 'CoasterLights')
    # Châssis et bogies
    G.add(box(0.42, 2.3, 0.14, 0.03), T(0, 0.1, 0.48), 'MetalSteel')
    wheel = revolve([(0, -0.035), (0.09, -0.035), (0.11, -0.02), (0.11, 0.02), (0.09, 0.035), (0, 0.035)], 16)
    hubc = cyl(0.045, 0.08, 10, 0.01)
    for yb in (0.85, -0.65):
        B = T(0, yb, 0)
        G.add(box(0.7, 0.36, 0.07, 0.02), B @ T(0, 0, 0.43), 'MetalSteel')
        for sgn in (-1, 1):
            G.add(box(0.06, 0.36, 0.86, 0.02), B @ T(sgn * 0.38, 0, 0.02), 'MetalSteel')
            G.add(box(0.27, 0.36, 0.06, 0.02), B @ T(sgn * 0.24, 0, -0.39), 'MetalSteel')
            for dy in (-0.11, 0.11):
                G.add(wheel.copy(), B @ T(sgn * 0.075, dy, RAIL_R + 0.11) @ R('Y', 90), 'Rubber')
                G.add(hubc.copy(), B @ T(sgn * 0.075, dy, RAIL_R + 0.11) @ R('Y', 90), 'MetalSteel')
            G.add(wheel.copy(), B @ T(sgn * (RAIL_R + 0.09), 0, 0) @ S(0.85), 'Rubber')
            G.add(cyl(0.03, 0.2, 8), B @ T(sgn * (RAIL_R + 0.09), 0, 0.12), 'MetalSteel')
            G.add(wheel.copy(), B @ T(sgn * 0.075, 0, -(RAIL_R + 0.085)) @ R('Y', 90) @ S(0.75), 'Rubber')
    wheel.free()
    hubc.free()
    for yy in (1.38, -1.3):
        G.add(box(0.3, 0.12, 0.12, 0.03), T(0, yy, 0.5), 'MetalSteel')
    finish(G, 'Coaster_Car', C)


# =============================================================================== GRANDE ROUE
# Plan de la roue : XZ Blender (XY glTF), axe Y (Z glTF). Rayon d'accroche des cabines : 30 m,
# 24 cabines tous les 15° à partir de phi = 0 (sur +X), dans le plan médian (z glTF = 0).
WHEEL_R = 30.0
CABINS = 24


def build_wheel():
    C = new_coll('Wheel')
    G = Geo()
    YR = 2.4
    for yy in (-YR, YR):
        G.add(revolve([(WHEEL_R + 0.32 * cos(a), yy + 0.32 * sin(a)) for a in linspace(0, 2 * pi, 9)[:-1]], 120,
                      loop=True), AX, 'HullWhite')
        G.add(revolve([(28.2 + 0.24 * cos(a), yy + 0.24 * sin(a)) for a in linspace(0, 2 * pi, 9)[:-1]], 120,
                      loop=True), AX, 'HullWhite')
        n = 96
        for i in range(n):
            a, b = 2 * pi * i / n, 2 * pi * (i + 1) / n
            p0 = rpos(WHEEL_R if i % 2 == 0 else 28.2, a, yy)
            p1 = rpos(28.2 if i % 2 == 0 else WHEEL_R, b, yy)
            G.add(tube_between(p0, p1, 0.11, 6), mat='MetalSteel')
        for i in range(n // 2):
            a = 2 * pi * i / (n // 2)
            G.add(dome(0.2, 0.16, 6), frame(rpos(WHEEL_R + 0.3, a, yy), (cos(a), 0, sin(a))), 'WheelLights')
    for i in range(CABINS):
        a = 2 * pi * i / CABINS
        G.add(tube_between(rpos(WHEEL_R, a, -YR), rpos(WHEEL_R, a, YR), 0.24, 10), mat='HullWhite')
        G.add(cyl(0.4, 0.5, 12, 0.05), frame(rpos(WHEEL_R, a, 0), (0, 1, 0)), 'MetalDark')
        b = a + pi / CABINS
        G.add(tube_between(rpos(28.2, b, -YR), rpos(28.2, b, YR), 0.18, 8), mat='HullWhite')
    # Rayons (câbles) depuis les flasques, croisés
    for yh, yr in ((-4.2, -YR), (4.2, YR), (-4.2, YR), (4.2, -YR)):
        for i in range(16):
            a = 2 * pi * (i + (0.5 if yh * yr < 0 else 0)) / 16
            G.add(tube_between(rpos(2.9, a, yh), rpos(28.2, a, yr), 0.06, 6), mat='MetalSteel')
    for i in range(8):
        a = 2 * pi * i / 8
        for t in linspace(0.18, 0.92, 7):
            p = rpos(2.9 + (28.2 - 2.9) * t, a, -4.2 + (-YR + 4.2) * t)
            G.add(dome(0.14, 0.12, 6), frame(p, (0, -1, 0)), 'WheelLightsWarm')
    # Moyeu tournant : flasques et tambour
    for yy in (-4.2, 4.2):
        G.add(revolve([(1.4, -0.25), (3.2, -0.25), (3.3, -0.1), (3.3, 0.1), (3.2, 0.25), (1.4, 0.25)], 32, loop=True),
              T(0, yy, 0) @ AX, 'HullGraphite')
    G.add(revolve([(1.5, -4.0), (1.7, -3.8), (1.7, 3.8), (1.5, 4.0)], 32, loop=True), AX, 'HullWhite')
    finish(G, 'Wheel_Rim', C)

    # ---------------------------------------------------------------- Wheel_Hub : axe, paliers, pylônes, socle
    Hb = Geo()
    Hb.add(cyl(1.25, 16.0, 24, 0.1), frame((0, 0, 0), (0, 1, 0)), 'MetalSteel')
    for yy in (-6.6, 6.6):
        Hb.add(box(3.6, 1.8, 3.6, 0.25, 2), T(0, yy, 0), 'HullGraphite')
        Hb.add(cyl(2.0, 2.0, 24, 0.12), frame((0, yy, 0), (0, 1, 0)), 'GateMetal')
        for sx in (-1, 1):
            foot = Vector((sx * 17.0, yy * 1.5, -38.0))
            top = Vector((sx * 1.2, yy, -1.2))
            Hb.add(sweep([top, foot], rrect(1.3, 1.0, 0.18, 2), (0, 1, 0)), mat='HullWhite')
            Hb.add(box(2.6, 2.6, 1.2, 0.12), T(foot.x, foot.y, -38.0), 'GateMetal')
            for t in (0.35, 0.7):
                p = top.lerp(foot, t)
                q = Vector((-p.x, p.y, p.z))
                if sx > 0:
                    Hb.add(tube_between(p, q, 0.35, 10), mat='HullWhite')
            if yy > 0:
                mid = top.lerp(foot, 0.5)
                Hb.add(tube_between(mid, Vector((mid.x, -mid.y, mid.z)), 0.25, 8), mat='MetalSteel')
    Hb.add(slab(rrect(46, 30, 3.0, 4), -0.6, 0.6, 0.15), T(0, 0, -38.6) @ R('X', 90) @ S(1, 1, 1), 'HullGraphite')
    for x in linspace(-21, 21, 15):
        for yy in (-14.0, 14.0):
            Hb.add(dome(0.18, 0.12, 6), T(x, yy, -38.0), 'WheelLightsWarm')
    finish(Hb, 'Wheel_Hub', C)

    # ---------------------------------------------------------------- Wheel_Cabin (origine = point d'accroche)
    Cb = Geo()
    Cb.add(cyl(0.34, 1.7, 14, 0.05), frame((0, 0, 0), (0, 1, 0)), 'MetalDark')
    for yy in (-0.7, 0.7):
        Cb.add(sweep([Vector((0, yy, 0)), Vector((0, yy * 1.05, -0.45)), Vector((0, yy * 1.15, -0.85))],
                     rrect(0.16, 0.08, 0.03, 2), (1, 0, 0)), mat='MetalDark')
    prof = [(0, -3.5), (0.85, -3.45), (1.18, -3.25), (1.3, -2.85), (1.33, -2.2), (1.28, -1.5), (1.1, -1.05),
            (0.72, -0.82), (0, -0.78)]

    def cab_mat(n, c):
        if -2.72 < c.z < -1.25:
            return 'CabinGlow'
        if -2.95 < c.z < -2.72:
            return 'PaintPink'
        return 'HullWhite'

    Cb.add(revolve(prof, 24), None, matfn=cab_mat)
    for k in range(8):
        a = 2 * pi * k / 8 + pi / 8
        pts = [Vector(((r + 0.03) * cos(a), (r + 0.03) * sin(a), z)) for r, z in
               ((1.31, -2.72), (1.335, -2.2), (1.29, -1.5), (1.17, -1.22))]
        Cb.add(sweep(catmull(pts, 3), rrect(0.09, 0.05, 0.015, 2), lambda p, i: Vector((p.x, p.y, 0)).normalized()),
               mat='MetalDark')
    Cb.add(revolve([(1.3, -2.95), (1.45, -2.95), (1.45, -2.82), (1.3, -2.82)], 32, loop=True), None, 'WheelLights')
    Cb.add(revolve([(0, -0.8), (0.4, -0.8), (0.38, -0.66), (0, -0.62)], 16), None, 'MetalDark')
    finish(Cb, 'Wheel_Cabin', C)


# =============================================================================== ÉCRAN GÉANT
SCREEN_W, SCREEN_H = 16.0, 9.0


def build_screen():
    C = new_coll('Screen')
    G = Geo()
    w, h = SCREEN_W, SCREEN_H
    # Cadre : profil balayé sur un rectangle arrondi (sens trigo vu de face). px vers l'extérieur, py vers
    # l'avant (-Y). La lèvre intérieure recouvre le bord de la dalle de 6 cm ; face avant à y = -0.9.
    rr = 0.22
    path = []
    for cx, cz, a0 in ((w / 2 - rr, -h / 2 + rr, -90), (w / 2 - rr, h / 2 - rr, 0), (-w / 2 + rr, h / 2 - rr, 90),
                       (-w / 2 + rr, -h / 2 + rr, 180)):
        for k in range(4):
            a = radians(a0 + 90 * k / 3)
            path.append(Vector((cx + rr * cos(a), 0, cz + rr * sin(a))))
    prof = [(-0.06, 0.6), (-0.06, 0.66), (0.0, 0.74), (0.18, 0.86), (0.62, 0.9), (0.78, 0.84), (0.86, 0.7),
            (0.86, -0.55), (0.8, -0.62), (-0.04, -0.62)]
    G.add(sweep(path, prof, (0, -1, 0), closed=True), mat='HullGraphite')
    G.add(sweep(path, [(0.3, 0.885), (0.5, 0.885), (0.5, 0.91), (0.3, 0.91)], (0, -1, 0), closed=True),
          mat='MetalDark')
    # Rivets sur la face avant du cadre, voyants de statut en haut
    fr = frames_along(path, (0, -1, 0), closed=True)
    total = 0.0
    for i in range(len(path)):
        p, (t, nn, b) = path[i], fr[i]
        seg = (path[(i + 1) % len(path)] - p).length
        n = max(1, int(seg / 1.0))
        for k in range(n):
            q = p + (path[(i + 1) % len(path)] - p) * (k / n)
            for off in (0.12, 0.7):
                G.add(dome(0.035, 0.025, 6), frame(q + b * off + nn * 0.878, nn), 'MetalSteel')
    for x in linspace(-1.2, 1.2, 5):
        G.add(box(0.28, 0.05, 0.1, 0.02), T(x, -0.9, h / 2 + 0.42), 'ScreenLights' if abs(x) < 0.1 else 'PlasticMid')
    # Caisson arrière nervuré, cornières, module de commande, radiateur
    G.add(box(w + 1.2, 1.0, h + 1.2, 0.14, 2), T(0, 0.12, 0), 'HullGraphite')
    for x in linspace(-w / 2, w / 2, 9):
        G.add(box(0.32, 0.5, h + 0.9, 0.06), T(x, 0.85, 0), 'GateMetal')
    for z in (-h / 3, 0, h / 3):
        G.add(box(w + 0.8, 0.42, 0.32, 0.06), T(0, 0.88, z), 'GateMetal')
    for sx in (-1, 1):
        for sz in (-1, 1):
            G.add(tube_between((sx * (w / 2 - 0.3), 1.1, sz * (h / 2 - 0.3)), (sx * 1.2, 2.2, sz * 1.2), 0.12, 8),
                  mat='MetalSteel')
    G.add(box(3.4, 2.2, 3.4, 0.22, 2), T(0, 2.1, 0), 'HullWhite')
    G.add(box(3.44, 0.12, 3.44, 0.04), T(0, 1.5, 0), 'PaintPink')
    G.add(cyl(1.0, 1.0, 24, 0.1), frame((0, 3.6, 0), (0, 1, 0)), 'GateMetal')
    for k in range(7):
        G.add(box(0.06, 1.4, 1.2, 0.02), T(-1.0 + 0.33 * k, 2.1, 1.75), 'MetalDark')
    G.add(box(5.0, 0.12, 2.4, 0.04), T(0, 3.4, 2.6) @ R('X', 20), 'HullWhite')
    # Pods de propulseurs d'attitude aux quatre coins, sur bras
    for sx in (-1, 1):
        for sz in (-1, 1):
            P = Vector((sx * (w / 2 + 1.25), 0.25, sz * (h / 2 + 0.9)))
            G.add(tube_between((sx * (w / 2 + 0.5), 0.25, sz * (h / 2 + 0.3)), P, 0.22, 10), mat='GateMetal')
            G.add(box(1.6, 1.8, 1.6, 0.36, 3), T(*P), 'HullWhite')
            G.add(box(1.64, 0.16, 1.64, 0.05), T(P.x, P.y + 0.55, P.z), 'HullGraphite')
            for d in ((sx, 0, 0), (0, 0, sz), (0, 1, 0), (0, -1, 0)):
                for k in ((-0.22, 0.22) if d[1] == 0 else (0.0,)):
                    side = Vector((0, 1, 0)) if d[1] == 0 else Vector((1, 0, 0))
                    o = P + Vector(d) * (0.78 if d[1] == 0 else 0.88) + side * k
                    G.add(nozzle(0.13, 0.2, 10), frame(o, d), 'MetalBurnt')
            G.add(dome(0.12, 0.1, 8), frame(P + Vector((0, 0, sz * 0.62)) + Vector((sx * 0.35, 0, 0)), (0, 0, sz)),
                  'ScreenLights')
    # Filet rose sous l'écran, antenne
    G.add(box(w - 1.0, 0.05, 0.08, 0.02), T(0, -0.93, -h / 2 - 0.42), 'ScreenLights')
    G.add(cyl(0.05, 2.6, 6), T(w / 2 - 1.2, 0.6, h / 2 + 1.9), 'MetalSteel')
    G.add(dome(0.12, 0.1, 8), T(w / 2 - 1.2, 0.6, h / 2 + 3.2), 'ScreenLights')
    finish(G, 'Screen_Frame', C)
    P = Geo(uv=True)
    P.add(quad_uv(w, h), frame((0, -0.62, 0), (0, -1, 0), (0, 0, 1)), 'ScreenPanel')
    finish(P, 'Screen_Panel', C, wn=False)



# =============================================================================== construction + export
print('PARK : construction')
build_cockpit()
build_gate()
new_coll('Ships')
build_ship_a()
build_ship_b()
build_ship_c()
build_coaster()
build_wheel()
build_screen()

os.makedirs(os.path.dirname(GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.object.select_all(action='DESELECT')
for o in PARK:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
    export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_cameras=False,
    export_lights=False, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('PARK EXPORT', len(PARK), 'nœuds', round(os.path.getsize(GLB) / 1024, 1), 'Ko')


# =============================================================================== vignettes de contrôle
def render_previews(out):
    os.makedirs(out, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 48
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new('preview')
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.004, 0.005, 0.009, 1)
    scene.world = world
    try:
        tree = bpy.data.node_groups.new('PreviewComp', 'CompositorNodeTree')
        tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        rl = tree.nodes.new('CompositorNodeRLayers')
        gl = tree.nodes.new('CompositorNodeGlare')
        out_n = tree.nodes.new('NodeGroupOutput')
        for key, val in (('Type', 'Bloom'), ('Quality', 'High')):
            if key in gl.inputs:
                try:
                    gl.inputs[key].default_value = val
                except Exception:
                    pass
        if 'Threshold' in gl.inputs:
            gl.inputs['Threshold'].default_value = 1.0
        if 'Size' in gl.inputs:
            try:
                gl.inputs['Size'].default_value = 0.6
            except Exception:
                pass
        tree.links.new(rl.outputs['Image'], gl.inputs['Image'])
        tree.links.new(gl.outputs['Image'], out_n.inputs[0])
        scene.compositing_node_group = tree
    except Exception as e:
        print('PREVIEW glare indisponible :', e)

    def sun(name, energy, rot, color=(1, 1, 1)):
        d = bpy.data.lights.new(name, 'SUN')
        d.energy, d.color, d.angle = energy, color, radians(3)
        o = bpy.data.objects.new(name, d)
        scene.collection.objects.link(o)
        o.rotation_euler = [radians(a) for a in rot]
        return o

    # Contrôle des UV des écrans : rouge = u (vers la droite), vert = v (vers le haut)
    for name in ('CockpitScreen', 'ScreenPanel'):
        nt = MAT[name].node_tree
        p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        comb = nt.nodes.new('ShaderNodeCombineXYZ')
        nt.links.new(tc.outputs['UV'], sep.inputs[0])
        nt.links.new(sep.outputs[0], comb.inputs[0])
        nt.links.new(sep.outputs[1], comb.inputs[1])
        comb.inputs[2].default_value = 0.08
        nt.links.new(comb.outputs[0], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = 0.6

    sun('key', 4.0, (50, 10, 30), (1.0, 0.96, 0.9))
    sun('fill', 0.6, (110, 0, 200), (0.75, 0.6, 1.0))
    sun('rim', 2.0, (-60, 0, 160), (0.8, 0.9, 1.0))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.clip_start, cam.data.clip_end = 0.02, 5000

    roots = {c: [o for o in COLLS[c].objects if o.parent is None] for c in COLLS}

    def shot(name, colls, eye, target, vfov, res=(1280, 720), offsets=None):
        if SHOTS and name not in SHOTS:
            return
        for cn, c in COLLS.items():
            c.hide_render = cn not in colls
        moved = []
        for oname, off in (offsets or {}).items():
            o = bpy.data.objects[oname]
            o.location += Vector(off)
            moved.append((o, Vector(off)))
        for cn, c in COLLS.items():
            if cn in colls:
                for o in c.objects:
                    o.hide_render = False
        scene.render.resolution_x, scene.render.resolution_y = res
        cam.location = Vector(eye)
        cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.angle_y = radians(vfov)
        scene.render.filepath = os.path.join(out, name + '.png')
        bpy.ops.render.render(write_still=True)
        for o, off in moved:
            o.location -= off
        print('RENDER', name)

    hide = lambda names: {n: (0, 0, -10000) for n in names}
    shot('cockpit', ['Cockpit', 'Gate'], (0, 0, 0), (0, 1, 0), 60,
         offsets={'Gate_Ring': (0, 260, 30), 'Gate_DoorL': (0, 260, 30), 'Gate_DoorR': (0, 260, 30),
                  'Gate_Sign': (0, 260, 30), 'Gate_Lights': (0, 260, 30)})
    shot('cockpit_3q', ['Cockpit'], (-0.55, -0.35, 0.25), (0.15, 0.6, -0.2), 70, offsets=hide(['Cockpit_Stick']))
    shot('gate', ['Gate'], (-70, -150, 25), (0, 0, 6), 38)
    shot('gate_doors', ['Gate'], (18, -55, -8), (-2, 0, 2), 50)
    shot('ship_a', ['Ships'], (11, 13, 6), (0, 0, 0), 40, offsets=hide(['Ship_B', 'Ship_C']))
    shot('ship_a_rear', ['Ships'], (-8, -14, 3), (0, -3, 0), 40, offsets=hide(['Ship_B', 'Ship_C']))
    shot('ship_b', ['Ships'], (28, 30, 12), (0, 0, 0), 40, offsets=hide(['Ship_A', 'Ship_C']))
    shot('ship_c', ['Ships'], (38, 42, 18), (0, 0, 0), 40, offsets=hide(['Ship_A', 'Ship_B']))
    shot('ship_c_rear', ['Ships'], (-30, -40, 12), (0, -5, 0), 40, offsets=hide(['Ship_A', 'Ship_B']))
    shot('coaster', ['Coaster'], (2.6, 3.4, 1.9), (0, 0, 0.55), 40)
    shot('wheel', ['Wheel'], (-60, -95, 5), (0, 0, -6), 50, offsets={'Wheel_Cabin': (0, 0, 30)})
    shot('wheel_cabin', ['Wheel'], (5, -8, 28), (0, 0, 28.5), 45, offsets={'Wheel_Cabin': (0, 0, 30)})
    shot('screen', ['Screen'], (9, -20, 4), (0, 0, 0), 45)


if RENDER:
    render_previews(RENDER)
print('PARK OK')
