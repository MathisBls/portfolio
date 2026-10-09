// Point d'entrée des pages d'atterrissage (français seulement : creation-site-internet-paris/index.html,
// site-internet-artisan/index.html, application-mobile-sur-mesure/index.html,
// realisations/meme-rina/index.html) : ni scène, ni Lenis. La page vient de l'URL, comme au prerender.
// URL inconnue : rien n'est monté, le HTML prérendu reste tel quel.
import { mount } from './app/mount'
import { LandingPage } from './app/pages/LandingPage'
import { landingFromPath } from './content/locales'
import { LANDINGS } from './content/seo'

const id = landingFromPath(window.location.pathname)
if (id) mount(<LandingPage id={id} />, LANDINGS[id].meta.title)
