// GSAP + ScrollTrigger, plugins enregistrés une seule fois. Importer gsap depuis ici, jamais depuis 'gsap'.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  // La barre d'adresse mobile qui se replie ne doit pas relancer un refresh (sauts de pin)
  ScrollTrigger.config({ ignoreMobileResize: true })
}

export { gsap, ScrollTrigger }
