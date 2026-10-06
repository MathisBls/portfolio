# PNG (public/posters/*.png, intermédiaires non versionnés) -> WebP < 60 Ko. Lancer après posters.py :
#   "D:/Blender/blender.exe" -b --python scripts/blender/posters_webp.py
import bpy, os
d = r'C:\Users\Asuki\Documents\perso\Vitrine\portfolio\public\posters'
scene = bpy.context.scene
s = scene.render.image_settings
print('FORMATS', [i.identifier for i in s.bl_rna.properties['file_format'].enum_items if 'WEB' in i.identifier])
# Les PNG ont déjà leur transformation de vue : ne pas la réappliquer
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
s.file_format = 'WEBP'; s.color_mode = 'RGBA'
for n in ['prism','zephyr','wegir','quorin','gamefactory','pizza','fitness']:
    img = bpy.data.images.load(os.path.join(d, n + '.png'))
    for q in (80, 70, 60, 50):
        s.quality = q
        p = os.path.join(d, n + '.webp')
        img.save_render(p, scene=scene)
        kb = os.path.getsize(p) / 1024
        if kb < 60: break
    print('WEBP', n, q, round(kb, 1))
