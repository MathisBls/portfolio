// Nav fixe et transparente. motion (LazyMotion + m) pour le masquage au scroll et le panneau mobile.
// Responsive en media queries seulement : le rendu serveur (prerender) n'a pas de window. Sous 1024 px,
// le <nav> du panneau n'existe que menu ouvert ; au-dessus, le <nav> en ligne (masqué en display: none
// sous 1024 px, donc absent de l'arbre d'accessibilité).
// Les effets vivent dans ui/nav/ : masquage au scroll, focus dans la barre, fermeture du menu.
// Sélecteur de langue (LangSwitch) dans la barre desktop et dans le menu mobile.
import { useCallback, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { AnimatePresence, LazyMotion, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import type { Locale } from '../content/locales'
import { site } from '../content/site'
import { useContent } from '../content/useContent'
import { onAnchorClick } from '../lib/anchors'
import { useReducedMotion } from '../lib/useReducedMotion'
import { Button } from './Button'
import { LangSwitch } from './LangSwitch'
import { useFocusWithin } from './nav/useFocusWithin'
import { useHideOnScroll } from './nav/useHideOnScroll'
import { useMenuDismiss } from './nav/useMenuDismiss'
import styles from './Nav.module.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const PANEL_ID = 'menu-mobile'
/** Liens de la nav, dans l'ordre : sections de la page (ancres communes aux deux langues). */
const NAV_SECTIONS = ['projects', 'services', 'about', 'contact'] as const

type Props = {
  /**
   * Nav hors de l'accueil (pages d'atterrissage, src/app/pages/) : le nom mène à l'accueil `home`
   * (`homeLabel` : nom accessible), les liens et le CTA visent les ancres de l'accueil (`/#work`…), le
   * sélecteur de langue suit `langRoutes`. Absent : nav de l'accueil, ancres de la page.
   */
  away?: { home: string; homeLabel: string; langRoutes: Record<Locale, string> }
}

export function Nav({ away }: Props) {
  const { text, identity } = useContent()
  const { label, home, cta, menuOpen, menuClose } = text.nav
  // Préfixe des ancres : rien sur l'accueil, son URL ailleurs (onAnchorClick laisse alors naviguer)
  const base = away?.home ?? ''
  const ctaHref = `${base}#${site.sections.contact.id}`
  const links = NAV_SECTIONS.map((key) => ({
    href: `${base}#${site.sections[key].id}`,
    label: text.nav.links[key],
  }))
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { hidden, scrolled } = useHideOnScroll()
  const focusWithin = useFocusWithin(headerRef)

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])
  useMenuDismiss(open, closeMenu, headerRef, buttonRef)

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu()
    onAnchorClick(event)
  }

  // Masquée en descendant, de retour en remontant. Jamais en reduced-motion, menu ouvert ou focus dedans.
  const shown = !hidden || reduced || open || focusWithin
  const transition = reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }

  return (
    <LazyMotion features={domAnimation}>
      <header ref={headerRef} className={styles.header} data-scrolled={scrolled ? '' : undefined}>
        <m.div
          className={styles.bar}
          initial={false}
          animate={{ y: shown ? '0%' : '-100%' }}
          transition={transition}
        >
          <a
            href={away ? away.home : `#${site.sections.hero.id}`}
            aria-label={away?.homeLabel ?? home}
            className={styles.home}
            onClick={onLinkClick}
          >
            {identity.name}
          </a>

          <nav aria-label={label} className={styles.desktop}>
            <ul className={styles.list}>
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link} onClick={onAnchorClick}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <LangSwitch kind="home" routes={away?.langRoutes} />
            <Button href={ctaHref} size="sm">
              {cta}
            </Button>
          </nav>

          <button
            ref={buttonRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={PANEL_ID}
            aria-label={open ? menuClose : menuOpen}
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            <span className={styles.bars} data-open={open} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </m.div>

        <AnimatePresence>
          {open && (
            <m.div
              key="panel"
              id={PANEL_ID}
              className={styles.panel}
              data-lenis-prevent
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <nav aria-label={label} className={styles.mobile}>
                <ul className={styles.mobileList}>
                  {links.map((link, i) => (
                    <m.li
                      key={link.href}
                      initial={reduced ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduced ? transition : { ...transition, delay: 0.08 + i * 0.06 }}
                    >
                      <a href={link.href} className={styles.mobileLink} onClick={onLinkClick}>
                        {link.label}
                      </a>
                    </m.li>
                  ))}
                </ul>
                <div className={styles.mobileCta}>
                  <LangSwitch
                    kind="home"
                    routes={away?.langRoutes}
                    variant="panel"
                    onNavigate={closeMenu}
                  />
                  <Button href={ctaHref} onClick={closeMenu}>
                    {cta}
                  </Button>
                </div>
              </nav>
            </m.div>
          )}
        </AnimatePresence>
      </header>
    </LazyMotion>
  )
}
