import { identity } from '../content/services'
import { site } from '../content/site'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>{identity.name}</p>
      <a href="/mentions-legales/">{site.footer.legal}</a>
    </footer>
  )
}
