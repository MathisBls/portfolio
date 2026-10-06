# Assets de l'easter egg (code Konami) depuis les modèles BoulardTV de Mathis, NOM NEUTRALISÉ :
# - arena.glb : REMPLACÉ le 2026-10-06 par scripts/blender/model_easter_arena.py (salon de jeu modélisé
#   par script) ; le mode 'arena' ci-dessous n'est plus utilisé et écraserait le nouveau modèle.
# - cards.glb : 3 cartes (COMMON, RARE, LEGENDARY), dos « PRISM », récompenses neutres
# - b_logo.glb : le B (logo) en 3D, pour la plongée finale
# Les fichiers sources ne sont pas modifiés (pas de sauvegarde). Textes convertis en maillages.
# Usage :
#   "D:/Blender/blender.exe" -b <BoulardTV_models>/btv_cartes.blend --python scripts/blender/easter_assets.py -- cards
#   "D:/Blender/blender.exe" -b <BoulardTV_models>/btv_cartes.blend --python scripts/blender/easter_assets.py -- logo
import bpy, os, sys

MODE = sys.argv[sys.argv.index('--') + 1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'models', 'easter')
os.makedirs(OUT, exist_ok=True)

TEXTS = {
    'BOULARD TV': 'PRISM',
    'COMMUNE': 'COMMON',
    'LÉGENDAIRE': 'LEGENDARY',
    '+5 crédits IA': '+5 lumens',
    '+15 crédits IA': '+15 lumens',
    '+100 crédits IA': '+100 lumens',
}


def neutralize_texts():
    for o in bpy.data.objects:
        if o.type == 'FONT' and o.data.body in TEXTS:
            o.data.body = TEXTS[o.data.body]
    left = [o.data.body for o in bpy.data.objects if o.type == 'FONT' and 'BOULARD' in o.data.body.upper()]
    assert not left, f'nom non neutralisé : {left}'


def to_mesh(objs):
    """Courbes et textes -> maillages (l'export glTF les ignore sinon)."""
    bpy.ops.object.select_all(action='DESELECT')
    convert = [o for o in objs if o.type in ('FONT', 'CURVE')]
    for o in convert:
        o.hide_set(False)
        o.select_set(True)
    if convert:
        bpy.context.view_layer.objects.active = convert[0]
        bpy.ops.object.convert(target='MESH')


def export(objs, name):
    keep = [o for o in objs if o.type in ('MESH', 'EMPTY')]
    # Objets d'une collection exclue du view layer : on les relie à la scène pour pouvoir les sélectionner
    for o in keep:
        if o.name not in bpy.context.view_layer.objects and bpy.context.scene.collection not in o.users_collection:
            bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep:
        o.hide_set(False)
        o.select_set(True)
    path = os.path.join(OUT, name)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True,
        export_yup=True, export_materials='EXPORT', export_image_format='NONE',
        export_animations=False, export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6)
    print('EXPORT', name, len(keep), 'objets', round(os.path.getsize(path) / 1024, 1), 'Ko')


neutralize_texts()

if MODE == 'arena':
    # Remplacé par model_easter_arena.py : on refuse d'écraser le nouveau arena.glb
    raise SystemExit('mode arena remplacé : lancer scripts/blender/model_easter_arena.py')
    objs = [o for o in bpy.data.objects if o.name.startswith('B_') and o.type != 'LIGHT']
    to_mesh(objs)
    objs = [o for o in bpy.data.objects if o.name.startswith('B_') and o.type in ('MESH', 'EMPTY')]
    export(objs, 'arena.glb')
elif MODE == 'cards':
    roots = [bpy.data.objects[n] for n in ('CARD_common', 'CARD_rare', 'CARD_legendary')]
    objs = [o for r in roots for o in [r, *r.children_recursive]]
    to_mesh(objs)
    objs = [o for r in roots for o in [r, *r.children_recursive]]
    export(objs, 'cards.glb')
elif MODE == 'logo':
    # Le B source vit dans une collection masquée : copie de son maillage dans un objet visible, centré
    src = bpy.data.objects['BTV_logo_src']
    logo = bpy.data.objects.new('B_Logo', src.data.copy())
    bpy.context.scene.collection.objects.link(logo)
    print('LOGO', len(logo.data.vertices), 'sommets', [m.name for m in logo.data.materials])
    export([logo], 'b_logo.glb')
else:
    raise SystemExit(f'mode inconnu : {MODE}')
