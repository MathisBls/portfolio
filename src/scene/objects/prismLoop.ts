// Boucles de rendu du prisme (frameloop "demand"), sorties de Prism.tsx.
// - Storyboard hero (docs/storyboards/hero.md §2) : flottement continu, desktop, quand le hero ou le
//   Contact est à l'écran.
// - docs/storyboards/story-v2.md, beat « Contact (envoi réussi) : le faisceau blanc entre dans le prisme
//   et le spectre jaillit (≈ 2 s), puis se pose » ; Budget : « La rafale de succès : 2 s de rendu
//   continu, puis retour en frameloop "demand" ». Timings purs : lib/burst.ts. ideaSentAt (store.ts) est
//   posé par ContactForm au succès ; le prisme et le faisceau lisent le temps écoulé dans useFrame
//   (ideaElapsed), ce hook ne fait que demander les frames.
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { site } from '../../content/site'
import { BURST } from '../../lib/burst'
import { gsap } from '../../lib/gsap'
import { range } from '../../lib/math'
import { useAnchor, useContinuousInvalidate, useInView } from '../hooks'
import { getTimeline, useScene } from '../store'

/** Secondes depuis l'envoi réussi ; −1 avant ; Infinity en reduced-motion (spectre posé d'emblée). */
export function ideaElapsed(reducedMotion: boolean): number {
  const at = useScene.getState().ideaSentAt
  if (at === null) return -1
  return reducedMotion ? Infinity : (performance.now() - at) / 1000
}

/**
 * Part de la rafale dans l'état du prisme : 1 au Contact (prisme redescendu), 0 ailleurs. Si le
 * visiteur remonte après l'envoi, le prisme reprend son état normal (rayons rétractés, hero).
 */
export function burstWeight(elapsed: number): number {
  return elapsed < 0 ? 0 : range(getTimeline(), 4, 4.5)
}

/** Flottement (desktop, hero ou Contact à l'écran) et rafale de l'envoi (2 s, ticker GSAP). */
export function usePrismLoop(floating: boolean, reducedMotion: boolean) {
  const heroTitle = useAnchor('hero-title')
  const heroSection = useMemo(() => heroTitle?.closest('section') ?? null, [heroTitle])
  const contactSection = useMemo(() => document.getElementById(site.sections.contact.id), [])
  const heroInView = useInView(heroSection)
  const contactInView = useInView(contactSection, false)
  useContinuousInvalidate(floating && (heroInView || contactInView))

  const invalidate = useThree((s) => s.invalidate)
  const sentAt = useScene((s) => s.ideaSentAt)
  useEffect(() => {
    if (sentAt === null) return
    invalidate()
    if (reducedMotion) return
    const tween = gsap.to(
      {},
      { duration: BURST.duration + 0.2, onUpdate: invalidate, onComplete: invalidate },
    )
    return () => {
      tween.kill()
    }
  }, [sentAt, reducedMotion, invalidate])
}
