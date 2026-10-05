// Card projet (docs/storyboards/projects.md, rubriques 2 et 4).
// Deux zones : l'emplacement visuel [data-slot] (4:3, sans fond : le canvas 3D se voit au travers,
// poster WebP par défaut) et le corps (fond --bg-2). L'emplacement n'a ni data-reveal ni transform :
// la scène l'ancre en px, le moindre décalage se verrait sur l'objet 3D.
// Lien principal étiré sur le titre (site, sinon store, sinon GitHub), liens secondaires au-dessus.
import { type CSSProperties, useEffect, useLayoutEffect, useRef } from 'react'
import type { Project } from '../content/projects'
import { site } from '../content/site'
import { displayUrl, isFilled } from '../lib/content'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import { registerAnchor, setAnchorMetrics, setProgress, useScene } from '../scene/store'
import styles from './ProjectCard.module.css'

type LinkKey = keyof Project['links']
/** Ordre de priorité : le premier lien renseigné est le lien principal. */
const LINK_ORDER: readonly LinkKey[] = ['site', 'store', 'github']

type Props = {
  project: Project
  /** Position dans la liste, à partir de 0 (affichée sur 2 chiffres). */
  index: number
}

function ArrowIcon() {
  return (
    <svg
      className={styles.arrow}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 12 12 4M5.5 4H12v6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProjectCard({ project, index }: Props) {
  const { slug, name, tagline, description, stack, links, model, accent, year } = project
  const { stackLabel, newTab, links: linkLabels } = site.projects
  const reducedMotion = useReducedMotion()
  const cardRef = useRef<HTMLElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)

  // Une valeur "TODO:" n'est jamais un lien
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

  // Survol et focus : la scène réagit (objet 3D). Écouteurs natifs sur l'article (comme la Nav) : un
  // <article> n'est pas interactif pour jsx-a11y. focusout remonte à chaque changement de lien dans la
  // card : on ne quitte que si le focus sort. Remis à null au démontage si la card était active.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const enter = () => {
      useScene.getState().setHovered(slug)
    }
    const leave = () => {
      useScene.getState().setHovered(null)
    }
    const focusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) leave()
    }
    card.addEventListener('mouseenter', enter)
    card.addEventListener('mouseleave', leave)
    card.addEventListener('focusin', enter)
    card.addEventListener('focusout', focusOut)
    return () => {
      card.removeEventListener('mouseenter', enter)
      card.removeEventListener('mouseleave', leave)
      card.removeEventListener('focusin', enter)
      card.removeEventListener('focusout', focusOut)
      if (useScene.getState().hovered === slug) leave()
    }
  }, [slug])

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

      <div data-reveal className={styles.reveal}>
        <div className={styles.body}>
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
            {stack.map((item) => (
              <li key={item} className={styles.chip}>
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
                  <ArrowIcon />
                </span>
              </span>
              {secondary.length > 0 && (
                <ul className={styles.links}>
                  {secondary.map(({ key, url }) => (
                    <li key={key}>
                      <a href={url} className={styles.link} {...external}>
                        {linkLabels[key]}
                        <span className="sr-only"> {newTab}</span>
                        <ArrowIcon />
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
