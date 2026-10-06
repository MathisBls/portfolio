# Textures PBR de l'arène de l'easter egg (plateau de jeu, scripts/blender/model_easter_arena.py) :
# téléchargées depuis Poly Haven (CC0, https://polyhaven.com, API https://api.polyhaven.com) en 2K JPG,
# puis converties en WebP dans public/textures/easter/arena/. Reproductible : relancer ce script
# régénère exactement les mêmes fichiers (mêmes assets, mêmes réglages).
#
# Usage : python scripts/arena_textures.py [dossier de cache des sources]
# Dépendances : Python 3.11, Pillow (WebP), numpy. Les sources sont gardées dans le cache (pas dans le dépôt).
#
# Choix (docs/models.md, « arena.glb ») :
# - velours du tapis (velour_velvet) : couleur ramenée en niveaux de gris (teinte violette posée en code,
#   le velours garde ses zones de poil couché), normale et ARM (AO, rugosité, métal) ; 1K, la texture est
#   répétée tous les 3 m du plateau.
# - bois laqué (rosewood_veneer1) : couleur seule, 2K (1K sur mobile) ; sa normale et son ARM sont
#   presque uniformes (placage poncé), le vernis vient du clearcoat posé en code.
# - cuir capitonné de la bande (leather_white) : normale et ARM 1K (couleur unie posée en code).
# - sol en marbre à damier (floor_tiles_06) : couleur 2K (1K sur mobile), normale et ARM 1K.
# Les normales sont au format OpenGL (nor_gl), comme three.js.
import io
import json
import os
import sys
import urllib.request

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'textures', 'easter', 'arena')
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'node_modules', '.cache', 'polyhaven')
API = 'https://api.polyhaven.com/files/'
UA = {'User-Agent': 'portfolio-mathis-boulais/arena-textures'}

# nom de sortie -> (asset Poly Haven, carte, tailles [(suffixe, côté)], qualité WebP, traitement)
JOBS = [
    ('velvet-color', 'velour_velvet', 'Diffuse', [('', 1024)], 82, 'gray'),
    ('velvet-normal', 'velour_velvet', 'nor_gl', [('', 1024)], 86, None),
    ('velvet-arm', 'velour_velvet', 'arm', [('', 1024)], 80, None),
    ('wood-color', 'rosewood_veneer1', 'Diffuse', [('', 2048), ('-1k', 1024)], 82, None),
    ('leather-normal', 'leather_white', 'nor_gl', [('', 1024)], 86, None),
    ('leather-arm', 'leather_white', 'arm', [('', 1024)], 80, None),
    ('marble-color', 'floor_tiles_06', 'Diffuse', [('', 2048), ('-1k', 1024)], 82, None),
    ('marble-normal', 'floor_tiles_06', 'nor_gl', [('', 1024)], 86, None),
    ('marble-arm', 'floor_tiles_06', 'arm', [('', 1024)], 80, None),
]


def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    return path


def files(asset):
    path = os.path.join(CACHE, asset + '.json')
    fetch(API + asset, path)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def source(asset, kind):
    info = files(asset)[kind]['2k']['jpg']
    return fetch(info['url'], os.path.join(CACHE, asset, os.path.basename(info['url'])))


def gray(img):
    """Luminance recentrée (moyenne 0.7, contraste x2.6) : une teinte posée en code la colore."""
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255
    y = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    y = np.clip((y - y.mean()) * 2.6 + 0.7, 0, 1)
    g = (y * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(np.stack([g, g, g], axis=-1))


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, asset, kind, sizes, quality, treat in JOBS:
        img = Image.open(source(asset, kind)).convert('RGB')
        if treat == 'gray':
            img = gray(img)
        for suffix, side in sizes:
            out = img if img.size == (side, side) else img.resize((side, side), Image.LANCZOS)
            path = os.path.join(OUT, f'{name}{suffix}.webp')
            buf = io.BytesIO()
            out.save(buf, 'WEBP', quality=quality, method=6)
            with open(path, 'wb') as f:
                f.write(buf.getvalue())
            kb = len(buf.getvalue()) / 1024
            total += kb
            print(f'{name}{suffix}.webp  {side}px  q{quality}  {kb:.0f} Ko')
    print(f'total {total:.0f} Ko')


if __name__ == '__main__':
    main()
