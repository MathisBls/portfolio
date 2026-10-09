// Sélecteur de langue FR | EN (nav desktop, menu mobile, footer). De vrais liens vers la page équivalente
// dans l'autre langue (content/locales.ts, ROUTES) : fonctionne sans JS. Au clic, le choix est mémorisé
// (localStorage `lang`) : le script de détection (app/langRedirect.ts) le respecte ensuite et ne redirige
// plus d'après le navigateur. Chaque lien porte hreflang et lang ; la langue de la page, aria-current.
import {
  LANG_STORAGE_KEY,
  LANGUAGE_NAMES,
  LOCALES,
  type Locale,
  type PageKind,
  ROUTES,
} from '../content/locales'
import { useContent } from '../content/useContent'
import styles from './LangSwitch.module.css'

function remember(locale: Locale) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, locale)
  } catch {
    // Stockage bloqué (navigation privée stricte) : le lien suffit, le choix vaut pour cette visite
  }
}

type Props = {
  /** Page courante : le lien mène à la même page dans l'autre langue. */
  kind: PageKind
  /** bar : barre de nav ; panel : menu mobile (cibles de 44 px) ; footer : pied de page. */
  variant?: 'bar' | 'panel' | 'footer'
  onNavigate?: () => void
}

export function LangSwitch({ kind, variant = 'bar', onNavigate }: Props) {
  const { locale, text } = useContent()
  return (
    <ul className={styles.switch} data-variant={variant} aria-label={text.lang.label}>
      {LOCALES.map((l) => (
        <li key={l} className={styles.item}>
          <a
            href={ROUTES[l][kind]}
            hrefLang={l}
            lang={l}
            className={styles.link}
            aria-current={l === locale ? 'page' : undefined}
            onClick={() => {
              remember(l)
              onNavigate?.()
            }}
          >
            {l.toUpperCase()}
            <span className="sr-only"> ({LANGUAGE_NAMES[l]})</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
