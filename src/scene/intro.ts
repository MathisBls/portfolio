// docs/storyboards/story-v2.md, beat « Chargement (≈ 1.5 s) : des éclats de verre convergent et
// s'assemblent en prisme ». État partagé hors React, comme le progress (store.ts) : ShardField l'écrit
// pendant l'intro d'assemblage, le prisme le lit dans useFrame pour apparaître avec elle.
// 1 = prisme entièrement visible. C'est la valeur par défaut : sans intro (reduced-motion, page
// rechargée plus bas, ShardField absent), rien n'est caché.

let reveal = 1

/** Apparition du prisme (0 invisible, 1 entier), à lire dans useFrame. */
export function getPrismReveal(): number {
  return reveal
}

export function setPrismReveal(value: number) {
  reveal = value
}
