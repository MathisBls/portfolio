import { useEffect } from 'react'
import { site } from '../content/site'
import { ScrollTrigger } from '../lib/gsap'
import { startLenis } from '../lib/lenis'
import { observeReveals } from '../lib/reveal'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { SceneMount } from '../scene/SceneMount'
import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { Services } from '../sections/Services'
import { Footer } from '../ui/Footer'
import { Nav } from '../ui/Nav'

export function HomePage() {
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

  return (
    <>
      <a className="skip-link" href="#contenu">
        {site.skipLink}
      </a>
      <SceneMount />
      <Nav />
      <main id="contenu" tabIndex={-1}>
        <Hero />
        <Projects />
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
