import { useEffect, useLayoutEffect } from 'react'
import { useContent } from '../content/useContent'
import { EasterOverlay } from '../easter/EasterOverlay'
import { ScrollTrigger } from '../lib/gsap'
import { goToAnchor } from '../lib/anchors'
import { startLenis } from '../lib/lenis'
import { observeReveals } from '../lib/reveal'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { SceneMount } from '../scene/SceneMount'
import { setPageLength, setProgress } from '../scene/store'
import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { Services } from '../sections/Services'
import { Footer } from '../ui/Footer'
import { Marquee } from '../ui/Marquee'
import { Nav } from '../ui/Nav'
import { ScrollProgress } from '../ui/ScrollProgress'
import { ShardBackdrop } from '../ui/ShardBackdrop'
import { takeHomeAnchor } from './homeAnchor'

export function HomePage() {
  const { text } = useContent()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const stopReveals = observeReveals()
    // Les fonts changent la hauteur des titres : recalculer les positions des triggers une fois chargées
    void document.fonts.ready.then(() => {
      ScrollTrigger.refresh()
    })
    return stopReveals
  }, [])

  useEffect(
    () => (reducedMotion || prefersReducedMotion() ? undefined : startLenis()),
    [reducedMotion],
  )

  // Arrivée par une ancre (/#contact depuis le menu d'une autre page) : défilement doux jusqu'à la section
  // une fois les polices chargées et les triggers recalculés (effet ci-dessus, enregistré avant), puis
  // l'ancre revient dans l'URL (homeAnchor.ts). Après le démarrage de Lenis (effet précédent).
  useEffect(() => {
    const id = takeHomeAnchor()
    if (!id) return
    let cancelled = false
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        if (cancelled || !goToAnchor(`#${id}`)) return
        history.replaceState(history.state, '', `#${id}`)
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Scroll global (progress 'page' + longueur en px) pour les effets 3D en parallaxe (formes d'ambiance).
  // Aucun en reduced-motion : les formes d'ambiance n'y sont pas montées.
  useLayoutEffect(() => {
    if (reducedMotion || prefersReducedMotion()) return
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (st) => {
        setProgress('page', st.progress)
      },
      onRefresh: (st) => {
        setPageLength(st.end - st.start)
        setProgress('page', st.progress)
      },
    })
    return () => {
      trigger.kill()
    }
  }, [reducedMotion])

  return (
    <>
      <a className="skip-link" href="#contenu">
        {text.skipLink}
      </a>
      <SceneMount />
      {/* Fond de formes du chargement : après SceneMount (même z-index, il passe devant le canvas le
          temps du fondu), disparaît quand la scène pose html.has-scene */}
      <ShardBackdrop />
      <ScrollProgress />
      <Nav />
      <main id="contenu" tabIndex={-1}>
        <Hero />
        <Projects />
        <Marquee />
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
      {/* Easter egg : écoute le code Konami, overlay pendant la séquence (src/easter/) */}
      <EasterOverlay />
    </>
  )
}
