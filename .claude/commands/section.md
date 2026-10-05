Construis la section **$ARGUMENTS** du portfolio de bout en bout.

Enchaîne obligatoirement :
1. Agent `architecte` : plan + storyboard scroll pour cette section. Attends son plan avant d'écrire du code.
2. Agent `motion-3d` : scène/objets/timeline de la section, selon le plan (skill `r3f-scroll-scene`).
3. Agent `ui-dev` : DOM, contenu depuis `src/content/`, responsive, reduced-motion (skill `design-tokens`).
4. `npm run typecheck && npm run lint && npm run build`.
5. Agent `reviewer` : si À CORRIGER, corrige les bloquants et repasse en review, max 2 tours.

Termine par un résumé de 5 lignes : ce qui est livré, ce qui reste TODO dans le contenu, poids du bundle, commande pour voir le résultat.
