// GSAP + ScrollTrigger, plugins enregistrés une seule fois. Importer gsap depuis ici, jamais depuis 'gsap'.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
