// Pied de page commun. Sur les pages françaises, une rubrique « Services à Paris » mène aux pages
// d'atterrissage (content/locales.ts, LANDING_ROUTES ; noms courts dans content/seo/nav.ts, sans le contenu
// complet des pages). En dessous : nom, sélecteur de langue, mentions légales.
import { LANDING_IDS, LANDING_ROUTES, type Locale } from '../content/locales'
import { landingNav } from '../content/seo/nav'
import { useContent } from '../content/useContent'
import { LangSwitch } from './LangSwitch'
import styles from './Footer.module.css'

const SERVICES_TITLE_ID = 'footer-services'

type Props = {
  isLegalPage?: boolean
  /**
   * Page d'atterrissage courante (français seul) : son lien de la rubrique porte aria-current, et le
   * sélecteur de langue suit `langRoutes` (FR : la page, EN : l'accueil anglais).
   */
  landing?: { path: string; langRoutes: Record<Locale, string> }
}

export function Footer({ isLegalPage = false, landing }: Props) {
  const { locale, text, identity, routes } = useContent()
  return (
    <footer className={styles.footer}>
      {locale === 'fr' && (
        <nav className={styles.services} aria-labelledby={SERVICES_TITLE_ID}>
          <p id={SERVICES_TITLE_ID} className={styles.servicesTitle}>
            {landingNav.title}
          </p>
          <ul className={styles.servicesList}>
            {LANDING_IDS.map((id) => (
              <li key={id}>
                <a
                  href={LANDING_ROUTES[id]}
                  className={styles.servicesLink}
                  aria-current={landing?.path === LANDING_ROUTES[id] ? 'page' : undefined}
                >
                  {landingNav.links[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={styles.bar}>
        <p>{identity.name}</p>
        <LangSwitch
          kind={isLegalPage ? 'legal' : 'home'}
          routes={landing?.langRoutes}
          variant="footer"
        />
        <a href={routes.legal} aria-current={isLegalPage ? 'page' : undefined}>
          {text.footer.legal}
        </a>
      </div>
    </footer>
  )
}
