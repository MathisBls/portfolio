import { useEffect, useLayoutEffect } from 'react'
import { useContent } from '../content/useContent'
import { EasterOverlay } from '../easter/EasterOverlay'
import { ScrollTrigger } from '../lib/gsap'
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
