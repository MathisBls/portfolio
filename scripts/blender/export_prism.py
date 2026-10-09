# Export du prisme SANS Draco (2026-10-09) : c'est le seul modèle affiché au chargement de la page.
# Compressé, il obligeait à télécharger et initialiser le décodeur Draco (≈ 250 Ko de wasm + un worker)
# avant la première image 3D ; brut, il pèse quelques dizaines de Ko et se lit tout de suite. Les autres
# modèles (projets, easter egg) gardent Draco : ils se chargent plus tard, hors du chemin critique.
# Usage : "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/export_prism.py
# Réglages identiques au script d'export du skill blender-assets, sauf la compression.
import bpy, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
col = bpy.data.collections['prism']
off = Vector(col['offset'])
roots = [o for o in col.objects if o.parent is None]
for o in roots:
    o.location -= off
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, 'public', 'models', 'prism.glb'), export_format='GLB', use_selection=True,
    export_apply=True, export_yup=True, export_materials='EXPORT', export_animations=False,
    export_draco_mesh_compression_enable=False)
for o in roots:
    o.location += off
print('PRISM EXPORT OK (sans Draco)')
