---
name: blender-assets
description: Comment régénérer ou modifier les modèles 3D du portfolio via le MCP Blender (scripts Python bmesh, une collection par modèle, export GLB Draco centré à l'origine, rendu de preview). À lire avant toute modification d'un .glb ou du .blend.
---
# Assets Blender du portfolio

Source unique : `blender/portfolio_models.blend`. Chaque modèle est une **collection** nommée `prism | zephyr | wegir | quorin | gamefactory | pizza`, avec une custom property `offset` (position sur la grille de travail, espacées de 6 unités en X). Les helpers Python sont stockés dans le text block `helpers` du .blend ; dans tout script : `exec(bpy.data.texts['helpers'].as_string())`.

## Helpers disponibles
`mat(name, rgb, rough, metal, emit, glass)`, `coll(name, offset)` (vide et recrée la collection), `box(name, c, size, loc, m, bevel)`, `cyl(name, c, r, h, segs, loc, rot, m, smooth, r2)`, `sphere(...)`, `add_mesh(name, bmesh, c, m, loc, smooth)`, `M('MatName')`. Toutes les positions `loc` sont **locales à la collection**, l'offset est ajouté automatiquement.

## Règles
- Low-poly, flat shading (sauf rubans/rouleaux). Pas de textures image : couleurs par matériau uniquement, ça tient en < 40 Ko par GLB.
- Aucune animation dans le .blend. Les pièces mobiles sont des objets séparés avec un nom stable (`Car0_Root`, `Die1`, `Wind2`…) : le code web les anime.
- Parenter avec `bpy.context.view_layer.update()` AVANT de poser `matrix_parent_inverse`, sinon les enfants sautent.
- Après modif : rendu de preview Workbench par collection (caméra auto sur la bbox) dans un dossier temporaire, vérifier visuellement, puis exporter.

## Export (toujours ce script)
```python
import bpy, os
from mathutils import Vector
models = r'C:\Users\Asuki\Documents\perso\Vitrine\portfolio\public\models'
for n in ['prism','zephyr','wegir','quorin','gamefactory','pizza']:
    col = bpy.data.collections[n]; off = Vector(col['offset'])
    roots = [o for o in col.objects if o.parent is None]
    for o in roots: o.location -= off
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(models, f'{n}.glb'), export_format='GLB', use_selection=True,
        export_apply=True, export_yup=True, export_materials='EXPORT', export_animations=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    for o in roots: o.location += off
bpy.ops.wm.save_mainfile()
```

## Posters (fallback mobile)
Rendu EEVEE 800×800 fond transparent par collection → `public/posters/<n>.png`, puis `npx sharp-cli` ou squoosh en WebP < 60 Ko.
