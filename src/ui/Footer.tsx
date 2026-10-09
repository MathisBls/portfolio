import { useContent } from '../content/useContent'
import { LangSwitch } from './LangSwitch'
import styles from './Footer.module.css'

export function Footer({ isLegalPage = false }: { isLegalPage?: boolean }) {
  const { text, identity, routes } = useContent()
  return (
    <footer className={styles.footer}>
      <p>{identity.name}</p>
      <LangSwitch kind={isLegalPage ? 'legal' : 'home'} variant="footer" />
      <a href={routes.legal} aria-current={isLegalPage ? 'page' : undefined}>
        {text.footer.legal}
      </a>
    </footer>
  )
}
