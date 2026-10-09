// Arrivée sur l'accueil par une ancre (/#work, /#contact…), depuis le menu d'une autre page (pages
// locales, mentions légales). Demande de Mathis du 2026-10-10 : on arrive sur l'accueil et la page défile
// toute seule jusqu'à la section.
// Le saut natif du navigateur ne convient pas : il a lieu pendant le chargement, avant que les sections
// épinglées (hero, chapitres) n'ajoutent leur hauteur ; la page s'arrêtait au mauvais endroit (en dev,
// le contenu n'existe même pas encore : elle restait en haut). Donc :
// 1. Script inline du <head> (head.ts, après la détection de langue) : si l'ancre est une section, il la
//    garde de côté et la retire de l'URL, ce qui empêche le saut natif.
// 2. HomePage, une fois les polices chargées et les triggers recalculés : défilement doux jusqu'à la
//    section (goToAnchor, Lenis), puis l'ancre revient dans l'URL.
import { site } from '../content/site'

/** Sections joignables par une ancre depuis une autre page (le haut de page n'en a pas besoin). */
export const ANCHOR_SECTIONS = [
  site.sections.projects.id,
  site.sections.services.id,
  site.sections.about.id,
  site.sections.contact.id,
] as const

/** Variable globale posée par le script inline (même nom que dans takeHomeAnchor). */
const HELD = '__homeAnchor'

/** Code du script inline (sans balise) qui retient l'ancre d'une section et la retire de l'URL. */
export function homeAnchorScript(): string {
  return `(function(i){try{var h=location.hash.slice(1);if(i.indexOf(h)<0)return;window.${HELD}=h;history.replaceState(history.state,"",location.pathname+location.search)}catch(e){}})(${JSON.stringify(ANCHOR_SECTIONS)})`
}

/** Section demandée à l'arrivée : retenue par le script inline, sinon l'ancre de l'URL (dev). Lue une fois. */
export function takeHomeAnchor(): string | null {
  const w = window as Window & { __homeAnchor?: string }
  const held = w.__homeAnchor
  w.__homeAnchor = undefined
  const id = held ?? location.hash.slice(1)
  return (ANCHOR_SECTIONS as readonly string[]).includes(id) ? id : null
}
