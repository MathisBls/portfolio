// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Préchargement ») : tout ce que
// le second niveau télécharge, lancé pendant le parc (MajesticPreload) une fois les textures du parc
// décodées : majestic.glb (model.ts), les textures du Sanctuaire (textures.ts, agent B2), décodées hors
// du fil principal dans le cache partagé du parc (park/loader.ts) : leur envoi au GPU se fait pendant la
// précompilation du beat 0 (warmUpSubtree), jamais pendant la séquence ; et le flux de MajesticBTV
// (audio.ts, preloadMajesticMusic : l'élément est débloqué ensuite dans le geste du mot de passe).
import { preloadMajesticMusic } from '../audio'
import { preloadMajesticModel } from './model'
import { preloadMajesticTextures } from './textures'

/** Lance le téléchargement du GLB et le décodage des textures du second niveau (idempotent). */
export function preloadMajestic(mobile: boolean): void {
  preloadMajesticModel()
  preloadMajesticMusic()
  preloadMajesticTextures(mobile)
}
