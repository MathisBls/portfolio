// Détection de la langue : petit script inline, posé dans le <head> des deux pages d'accueil par
// head.ts (avant tout rendu, avant le CSS et le JS). Règles, dans l'ordre :
// 1. Robot (pas de navigator.languages, ou user-agent de robot) : jamais redirigé.
// 2. Choix mémorisé par le sélecteur de langue (localStorage `lang`) : il l'emporte.
// 3. Sinon, navigateur : sur `/`, aucune langue fr* -> `/en/` ; sur `/en/`, première langue fr* -> `/`.
//    Les deux conditions s'excluent : aucune boucle possible.
// La requête et l'ancre (#contact…) sont gardées. localStorage est lu dans un try/catch (navigation
// privée, stockage bloqué). Pas de cookie, rien d'envoyé.
// CSP : si la CSP de public/.htaccess est activée un jour, autoriser ce script par son empreinte
// sha256 (affichée par scripts/prerender.mjs).
import { LANG_STORAGE_KEY, type Locale, ROUTES } from '../content/locales'

/** User-agents à ne jamais rediriger : moteurs, aperçus de liens, audits (Lighthouse), navigateurs headless. */
export const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless|bingpreview/i

/** Code du script (sans balise) pour la page d'accueil de `locale`. */
export function langRedirectScript(locale: Locale): string {
  const config = JSON.stringify({
    here: locale,
    key: LANG_STORAGE_KEY,
    fr: ROUTES.fr.home,
    en: ROUTES.en.home,
  })
  return `(function(c){try{var n=navigator,l=n.languages;if(!l||!l.length||${BOT_UA.toString()}.test(n.userAgent||""))return;var s=null;try{s=localStorage.getItem(c.key)}catch(e){}var f=function(x){return/^fr(-|$)/i.test(x)},w;if(s==="fr"||s==="en")w=s;else if(c.here==="fr")w=Array.prototype.some.call(l,f)?"fr":"en";else w=f(l[0])?"fr":"en";if(w!==c.here)location.replace(c[w]+location.search+location.hash)}catch(e){}})(${config})`
}
