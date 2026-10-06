# Textures d'écrans des modèles (captures fournies par Mathis) -> public/textures/<projet>/*.webp.
# Usage : "D:/Blender/blender.exe" -b --python scripts/blender/textures.py -- "<dossier des captures>"
# Le dossier contient fitness_kass/ (planche de 5 écrans), wegir/ (écrans mobile), memerina/ (site).
import bpy, os, sys
import numpy as np

SRC = sys.argv[sys.argv.index('--') + 1]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public', 'textures')
scene = bpy.context.scene
s = scene.render.image_settings
s.file_format = 'WEBP'
s.color_mode = 'RGB'
s.quality = 86
# Couleurs inchangées : pas de transformation de vue (AgX assombrit et désature les captures)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, w, 4), img


def save(arr, path, width=None):
    h, w = arr.shape[:2]
    out = bpy.data.images.new('out', w, h, alpha=False)
    out.pixels.foreach_set(np.ascontiguousarray(arr).ravel())
    if width and w > width:
        out.scale(width, round(h * width / w))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save_render(path, scene=scene)
    bpy.data.images.remove(out)
    print('TEX', os.path.relpath(path, OUT), round(os.path.getsize(path) / 1024, 1), 'Ko')


# Fitness : planche 1500x667 de 5 écrans de 300 px -> un fichier par écran
fit_dir = os.path.join(SRC, 'fitness_kass')
sheet = sorted(f for f in os.listdir(fit_dir) if f.lower().endswith('.png'))[0]
px, _ = load(os.path.join(fit_dir, sheet))
names = ['home', 'programs', 'nutrition', 'progress', 'profile']
col = px.shape[1] // len(names)
for i, n in enumerate(names):
    save(px[:, i * col:(i + 1) * col], os.path.join(OUT, 'fitness', n + '.webp'))

# Wegir : écrans mobile 1179x2556 -> 480 px de large
for f in sorted(os.listdir(os.path.join(SRC, 'wegir'))):
    if f.lower().endswith(('.jpg', '.jpeg', '.png')):
        px, _ = load(os.path.join(SRC, 'wegir', f))
        slug = os.path.splitext(f)[0].replace(' ', '-').lower()
        save(px, os.path.join(OUT, 'wegir', slug + '.webp'), width=480)

# Meme Rina : captures du site -> 1280 px de large
for i, f in enumerate(sorted(os.listdir(os.path.join(SRC, 'memerina')))):
    if f.lower().endswith('.png'):
        px, _ = load(os.path.join(SRC, 'memerina', f))
        save(px, os.path.join(OUT, 'memerina', f'site-{i + 1}.webp'), width=1280)
