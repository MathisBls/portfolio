---
name: design-tokens
description: Direction artistique du portfolio (palette, typographie, espacements, motion) et le fichier tokens.css de référence. À lire avant d'écrire du CSS ou de choisir une couleur/police.
---
# Direction artistique

**Mot-clé : prisme.** Noir profond, lumière blanche, un spectre qui apparaît par touches. Sobre partout, spectaculaire à un seul endroit à la fois.

## Palette (`src/styles/tokens.css`)
```css
:root {
  --bg: #0a0a0c;         --bg-2: #121216;      --line: rgba(237,237,240,.08);
  --fg: #ededf0;         --fg-2: #a0a0a8;      --fg-3: #65656e;
  --accent: #12b5bd;     /* teal, hérité de Zephyr */
  --spectrum: linear-gradient(90deg,#ff3b3b,#ff9f1a,#ffe14d,#4cff6a,#2aa7ff,#6a4cff,#b44cff);
  --radius: 14px;        --radius-lg: 24px;
  --ease: cubic-bezier(.22,1,.36,1);  --dur: .6s;
  --space-1: .25rem; --space-2: .5rem; --space-3: 1rem; --space-4: 2rem; --space-5: 4rem; --space-6: 8rem;
  --text-xs: .75rem; --text-sm: .875rem; --text-md: 1rem; --text-lg: 1.25rem;
  --text-xl: clamp(2rem, 4vw, 3.5rem); --text-2xl: clamp(3rem, 8vw, 8rem);
}
```
Pas de mode clair.

## Typographie
- Display : **Instrument Serif** (italique pour un mot clé par titre) ou **Clash Display** si tu veux plus géométrique. Une seule des deux.
- Texte : **Inter** ou système. Mono : **JetBrains Mono** pour les labels `01 / PROJET`, stacks, dates.
- Hero : nom en `--text-2xl`, interlettrage -0.03em, line-height .95. Sous-titre mono xs en majuscules, espacé .12em.

## Composants
- **Card projet** : fond `--bg-2`, bordure `--line`, radius-lg, 1px de lueur `--accent` au hover, le canvas/poster en haut (ratio 4:3), label mono, titre display, tagline, stack en chips mono. Toute la card est un lien.
- **Boutons** : pill, fond `--fg` texte `--bg` pour le primaire ; ghost bordé pour le secondaire. Pas d'ombre portée.
- **Curseur** : point custom 8px qui grossit sur les liens (desktop uniquement).
- **Nav** : fixe, transparente, 3 liens + CTA "Discuter d'un projet". Se masque au scroll vers le bas, réapparaît vers le haut.

## Motion
- Entrées : translateY 24px → 0 + opacité, `--dur` `--ease`, stagger 60 ms.
- Titres : split en mots, chaque mot monte avec un clip-path.
- Rien ne bouge en boucle dans le DOM (la 3D s'en charge). Respecter reduced-motion partout.
