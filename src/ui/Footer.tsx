import { identity } from '../content/services'
import { site } from '../content/site'
import styles from './Footer.module.css'

export function Footer({ onLegalPage = false }: { onLegalPage?: boolean }) {
  return (
    <footer className={styles.footer}>
      <p>{identity.name}</p>
      <a href="/mentions-legales/" aria-current={onLegalPage ? 'page' : undefined}>
        {site.footer.legal}
      </a>
    </footer>
  )
}
