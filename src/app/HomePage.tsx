import { useEffect } from 'react'
import { site } from '../content/site'
import { startLenis } from '../lib/lenis'
import { observeReveals } from '../lib/reveal'
import { prefersReducedMotion } from '../lib/useReducedMotion'
import { SceneMount } from '../scene/SceneMount'
import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Hero } from '../sections/Hero'
import { Projects } from '../sections/Projects'
import { Services } from '../sections/Services'
import { Footer } from '../ui/Footer'

export function HomePage() {
  useEffect(() => {
    const stopReveals = observeReveals()
    const stopLenis = prefersReducedMotion() ? undefined : startLenis()
    return () => {
      stopReveals()
      stopLenis?.()
    }
  }, [])

  return (
    <>
      <a className="skip-link" href="#contenu">
        {site.skipLink}
      </a>
      <SceneMount />
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
