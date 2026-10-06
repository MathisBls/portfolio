// Chapitre projet plein écran (refonte de la section Projets). Desktop : un <article> de 180svh, une .stage
// collée (sticky) de 100svh, texte à ~34 % sans boîte, emplacement visuel [data-slot] à ~66 % où la scène
// dessine le modèle 3D en grand. Mobile : pas de sticky, poster puis texte.
// L'emplacement n'a ni data-reveal ni transform : la scène l'ancre au pixel près (position live mesurée à
// chaque tick du ScrollTrigger, le sticky casse tout calcul linéaire).
// Liens : le premier renseigné (site, store, GitHub) est le Button principal, les autres sont des liens.
import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import type { Project } from '../content/projects'
import { site } from '../content/site'
import { isFilled } from '../lib/content'
import { ScrollTrigger, gsap } from '../lib/gsap'
import { stagger } from '../lib/stagger'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { registerAnchor, setAnchorMetrics, setProgress } from '../scene/store'
import { ArrowIcon } from './ArrowIcon'
import { Button } from './Button'
import styles from './ProjectChapter.module.css'
import { RevealTitle } from './RevealTitle'
import { useSceneHover } from './useSceneHover'

type LinkKey = keyof Project['links']
/** Ordre de priorité : le premier lien renseigné est le lien principal. */
const LINK_ORDER: readonly LinkKey[] = ['site', 'store', 'github']

const EXTERNAL = { target: '_blank', rel: 'noopener' } as const

type Props = {
  project: Project
  /** Position dans la liste, à partir de 0 (affichée sur 2 chiffres). */
  index: number
}

/** Étoile du badge « highlight ». Décorative : le texte du badge porte l'information. */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 1.2 9.9 5.7l4.9.4-3.7 3.2 1.1 4.8L8 11.6l-4.2 2.5 1.1-4.8L1.2 6.1l4.9-.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ProjectChapter({ project, index }: Props) {
  const { slug, name, tagline, description, stack, links, model, accent, year, highlight } = project
  const { stackLabel, newTab, links: linkLabels } = site.projects
  // Garde prefersReducedMotion : useReducedMotion vaut false pendant l'hydratation (snapshot serveur)
  const reducedMotion = useReducedMotion() || prefersReducedMotion()
  const articleRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)

  // Liens renseignés, dans l'ordre de priorité : une valeur "TODO:" n'est jamais un lien
  const available = LINK_ORDER.flatMap((key) => {
    const url = links[key]
    return isFilled(url) ? [{ key, url }] : []
  })
  const [primary, ...secondary] = available

  // Ancre + progress du chapitre. L'ancre est enregistrée même en reduced-motion (la scène sait où est
  // l'emplacement) ; le ScrollTrigger scrubé (0 : le haut du chapitre entre par le bas, 1 : son bas sort par
  // le haut) n'existe que hors reduced-motion. Aucun lissage : l'objet 3D reste collé au DOM.
  useLayoutEffect(() => {
    const article = articleRef.current
    const slot = slotRef.current
    if (!article || !slot) return
    const id = `project:${slug}` as const
    registerAnchor(id, slot)

    if (reducedMotion) {
      return () => {
        registerAnchor(id, null)
      }
    }

    // Position live de l'emplacement dans le viewport (le sticky le déplace sans que le scroll soit linéaire)
    const measure = () => {
      const { left, top, width, height } = slot.getBoundingClientRect()
      setAnchorMetrics(id, { left, top, width, height, viewportH: window.innerHeight })
    }
    const sync = (self: ScrollTrigger) => {
      setProgress(id, self.progress)
      measure()
    }

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        id,
        trigger: article,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: sync,
        onRefresh: sync,
      })
      sync(trigger)
    }, article)

    return () => {
      ctx.revert()
      registerAnchor(id, null)
    }
  }, [slug, reducedMotion])

  // Survol de la scène du chapitre et focus clavier dans l'article : la scène réagit (setHovered)
  useSceneHover({ pointer: stageRef, focus: articleRef }, slug)

  const number = String(index + 1).padStart(2, '0')
  const titleId = `project-${slug}`

  return (
    <article
      ref={articleRef}
      className={styles.chapter}
      data-side={index % 2 === 0 ? 'left' : 'right'}
      aria-labelledby={titleId}
      style={{ '--accent-project': accent } as CSSProperties}
    >
      <div ref={stageRef} className={styles.stage}>
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

        <div className={styles.text}>
          <p className={styles.label} data-reveal style={stagger(0)}>
            <span aria-hidden="true">{number} / </span>
            {/* Une année « TODO: » n'est pas une date : texte simple, sans <time> */}
            {isFilled(year) ? <time dateTime={year}>{year}</time> : year}
          </p>

          <RevealTitle as="h3" id={titleId} className={styles.name}>
            {name}
          </RevealTitle>

          {highlight && (
            <p className={styles.highlight} data-reveal style={stagger(1)}>
              <span className={styles.dot} aria-hidden="true" />
              <StarIcon className={styles.star} />
              {highlight}
            </p>
          )}

          <p className={styles.tagline} data-reveal style={stagger(2)}>
            {tagline}
          </p>
          <p className={styles.description} data-reveal style={stagger(3)}>
            {description}
          </p>

          <ul className={styles.stack} aria-label={stackLabel} data-reveal style={stagger(4)}>
            {stack.map((item) => (
              <li key={item} className={styles.chip}>
                {item}
              </li>
            ))}
          </ul>

          {primary && (
            <div className={styles.actions} data-reveal style={stagger(5)}>
              <Button href={primary.url} {...EXTERNAL}>
                <span className={styles.cta}>
                  {linkLabels[primary.key]}
                  <ArrowIcon />
                </span>
                <span className="sr-only"> {newTab}</span>
              </Button>
              {secondary.map(({ key, url }) => (
                <a key={key} href={url} className={styles.link} {...EXTERNAL}>
                  {linkLabels[key]}
                  <span className="sr-only"> {newTab}</span>
                  <ArrowIcon className={styles.arrow} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
