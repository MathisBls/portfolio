// Phase 0 : page vide mais sémantique. Contenu complet en Phase 4 (données depuis identity).
import { site } from '../content/site'
import { Footer } from '../ui/Footer'
import styles from './LegalPage.module.css'

export function LegalPage() {
  return (
    <>
      <a className="skip-link" href="#contenu">
        {site.skipLink}
      </a>
      <main id="contenu" tabIndex={-1} className={styles.main}>
        <h1>{site.footer.legal}</h1>
        <p>
          <a href="/">{site.footer.home}</a>
        </p>
      </main>
      <Footer isLegalPage />
    </>
  )
}
