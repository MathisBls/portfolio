// Card projet (docs/storyboards/projects.md, rubriques 2 et 4).
// Deux zones : l'emplacement visuel [data-slot] (4:3, sans fond : le canvas 3D se voit au travers,
// poster WebP par défaut) et le corps (fond --bg-2). L'emplacement n'a ni data-reveal ni transform :
// la scène l'ancre en px, le moindre décalage se verrait sur l'objet 3D.
// Lien principal étiré sur le titre (site, sinon store, sinon GitHub), liens secondaires au-dessus.
import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import type { Project } from '../content/projects'
import { site } from '../content/site'
import { displayUrl, isFilled } from '../lib/content'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { stagger } from '../lib/stagger'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTilt } from '../lib/useTilt'
import { registerAnchor, setAnchorMetrics, setProgress } from '../scene/store'
import { ArrowIcon } from './ArrowIcon'
import styles from './ProjectCard.module.css'
import { useSceneHover } from './useSceneHover'

type LinkKey = keyof Project['links']
/** Ordre de priorité : le premier lien renseigné est le lien principal. */
const LINK_ORDER: readonly LinkKey[] = ['site', 'store', 'github']

type Props = {
  project: Project
  /** Position dans la liste, à partir de 0 (affichée sur 2 chiffres). */
  index: number
}

/** Inclinaison maximale du corps de la card au survol, en degrés. */
const TILT_MAX = 4

export function ProjectCard({ project, index }: Props) {
  const { slug, name, tagline, description, stack, links, model, accent, year } = project
  const { stackLabel, newTab, links: linkLabels } = site.projects
  const reducedMotion = useReducedMotion()
  const cardRef = useRef<HTMLElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Liens renseignés, dans l'ordre de priorité : une valeur "TODO:" n'est jamais un lien
  const available = LINK_ORDER.flatMap((key) => {
    const url = links[key]
    return isFilled(url) ? [{ key, url }] : []
  })
  const [primary, ...secondary] = available

  // Ancre : la scène mesure l'emplacement (registerAnchor), même sans ScrollTrigger
  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    registerAnchor(`project:${slug}`, slot)
    return () => {
      registerAnchor(`project:${slug}`, null)
    }
  }, [slug])

  // Progress de la card (0 : le haut de l'emplacement entre par le bas, 1 : le bas sort par le haut),
  // sans lissage : l'objet 3D reste collé au DOM. Aucun trigger en reduced-motion (posters seulement).
  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot || reducedMotion) return
    const id = `project:${slug}` as const

    const measure = () => {
      const { left, width, height } = slot.getBoundingClientRect()
      setAnchorMetrics(id, { left, width, height, viewportH: window.innerHeight })
    }

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        id,
        trigger: slot,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          setProgress(id, self.progress)
        },
        onRefresh: measure,
      })
      measure()
      setProgress(id, trigger.progress)
    }, slot)

    return () => {
      ctx.revert()
    }
  }, [slug, reducedMotion])

  // Corps seulement (jamais l'emplacement 4:3 où l'objet 3D est ancré) ; le pointeur est écouté sur le
  // wrapper, qui ne bouge pas, pour que le bord incliné ne fasse pas sortir puis rentrer le pointeur.
  useTilt(bodyRef, { max: TILT_MAX, host: revealRef })
  useSceneHover(cardRef, slug)

  const external = { target: '_blank', rel: 'noopener' } as const
  const number = String(index + 1).padStart(2, '0')

  return (
    <article
      ref={cardRef}
      className={styles.card}
      data-side={index % 2 === 0 ? 'left' : 'right'}
      style={{ '--card-accent': accent } as CSSProperties}
    >
      <div ref={slotRef} data-slot className={styles.slot}>
        <img
          className={styles.poster}
          src={`/posters/${model}.webp`}
          width={800}
          height={800}
          loading="lazy"
          decoding="async"
          alt=""
        />
      </div>

      <div ref={revealRef} data-reveal className={styles.reveal}>
        <div ref={bodyRef} className={styles.body}>
          <p className={styles.label}>
            <span aria-hidden="true">{number} / </span>
            <time dateTime={year}>{year}</time>
          </p>

          <h3 className={styles.title}>
            {primary ? (
              <a href={primary.url} className={styles.titleLink} {...external}>
                {name}
                <span className="sr-only"> {newTab}</span>
              </a>
            ) : (
              name
            )}
          </h3>

          <p className={styles.tagline}>{tagline}</p>
          <p className={styles.description}>{description}</p>

          <ul className={styles.stack} aria-label={stackLabel}>
            {stack.map((item, i) => (
              <li key={item} className={styles.chip} data-reveal style={stagger(i + 1)}>
                {item}
              </li>
            ))}
          </ul>

          {primary && (
            <div className={styles.actions}>
              {/* Indication visuelle du lien principal : le clic traverse jusqu'au lien étiré du titre */}
              <span className={styles.cta} aria-hidden="true">
                {linkLabels[primary.key]}
                <span className={styles.ctaTarget}>
                  <span className={styles.ctaUrl}>{displayUrl(primary.url)}</span>
                  <ArrowIcon className={styles.arrow} />
                </span>
              </span>
              {secondary.length > 0 && (
                <ul className={styles.links}>
                  {secondary.map(({ key, url }) => (
                    <li key={key}>
                      <a href={url} className={styles.link} {...external}>
                        {linkLabels[key]}
                        <span className="sr-only"> {newTab}</span>
                        <ArrowIcon className={styles.arrow} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
