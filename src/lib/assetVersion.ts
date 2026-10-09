// URL versionnée des modèles 3D : « /models/pizza.glb?v=<empreinte du contenu> » (vite.config.ts, define).
// Les GLB gardent un nom stable et le serveur les met en cache une semaine (public/.htaccess). Sans ce
// paramètre, un visiteur revenu après un déploiement gardait l'ancien GLB avec le nouveau code : le
// 2026-10-10, l'ancienne part de pizza (nœuds absents) a fait planter toute la page. L'empreinte change
// seulement quand le fichier change : le cache reste efficace d'un déploiement à l'autre.

/** Chemin public d'un GLB, suivi de ?v= quand son empreinte est connue (sinon inchangé). */
export function versioned(path: string): string {
  const version = __MODEL_VERSIONS__[path]
  return version ? `${path}?v=${version}` : path
}
