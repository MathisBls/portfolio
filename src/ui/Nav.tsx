// Nav fixe et transparente. motion (LazyMotion + m) pour le masquage au scroll et le panneau mobile.
// Responsive en media queries seulement : le rendu serveur (prerender) n'a pas de window. Sous 1024 px,
// le <nav> du panneau n'existe que menu ouvert ; au-dessus, le <nav> en ligne (masqué en display: none
// sous 1024 px, donc absent de l'arbre d'accessibilité).
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { AnimatePresence, LazyMotion, domAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import { identity } from '../content/services'
import { site } from '../content/site'
import { onAnchorClick } from '../lib/anchors'
import { BREAKPOINTS } from '../lib/media'
import { useReducedMotion } from '../lib/useReducedMotion'
import { Button } from './Button'
import styles from './Nav.module.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const PANEL_ID = 'menu-mobile'
/** Défilement minimal (px) avant de changer de direction : évite le clignotement au moindre tremblement. */
const SCROLL_STEP = 8
const TOP_ZONE = 80

export function Nav() {
  const { label, home, links, cta, menuOpen, menuClose } = site.nav
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Masquée en descendant, de retour en remontant. Jamais en reduced-motion, menu ouvert ou focus dedans.
  useEffect(() => {
    let anchor = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (y < TOP_ZONE) {
        setHidden(false)
        anchor = y
        return
      }
      if (Math.abs(y - anchor) < SCROLL_STEP) return
      setHidden(y > anchor)
      anchor = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Le focus clavier dans le header le garde visible (écouteurs natifs : pas de handler sur un <header>)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const onFocusIn = () => {
      setFocusWithin(true)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && header.contains(event.relatedTarget))) {
        setFocusWithin(false)
      }
    }
    header.addEventListener('focusin', onFocusIn)
    header.addEventListener('focusout', onFocusOut)
    return () => {
      header.removeEventListener('focusin', onFocusIn)
      header.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  // Menu mobile ouvert : page figée derrière, Échap ferme et rend le focus au bouton, le focus qui sort
  // du header ferme, repasser au-dessus de 1024 px ferme.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    const wide = window.matchMedia(`(min-width: ${String(BREAKPOINTS.md)}px)`)
    const onWide = () => {
      if (wide.matches) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onFocusIn = (event: FocusEvent) => {
      const header = headerRef.current
      if (header && event.target instanceof Node && !header.contains(event.target)) setOpen(false)
    }
    wide.addEventListener('change', onWide)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      html.style.overflow = previousOverflow
      wide.removeEventListener('change', onWide)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open])

  const closeMenu = () => {
    setOpen(false)
  }
  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu()
    onAnchorClick(event)
  }

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
            href={`#${site.sections.hero.id}`}
            aria-label={home}
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
            <Button href={cta.href} size="sm">
              {cta.label}
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
                  <Button href={cta.href} onClick={closeMenu}>
                    {cta.label}
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
