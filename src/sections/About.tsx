// À propos (docs/storyboards/about-legal.md) : 4 lignes, stack déduite des projets, disponibilité.
// Pas de pin : un ScrollTrigger scrubé écrit seulement le progress 'about' lu par la scène (calme ici).
// Les apparitions passent par [data-reveal] (CSS + IntersectionObserver, lib/reveal.ts).
// Portrait de Mathis : noir et blanc, un filet du spectre le traverse en biais (pseudo-élément CSS),
// la couleur revient au survol et au focus (About.module.css).
import { Fragment, useRef } from 'react'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { useContent } from '../content/useContent'
import { uniqueStack } from '../lib/stack'
import { stagger } from '../lib/stagger'
import { useSectionProgress } from '../lib/useSectionProgress'
import { AvailabilityLine } from '../ui/AvailabilityLine'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './About.module.css'

const stack = uniqueStack(projects)

// Photo déjà optimisée (public/images/about) : trois largeurs, carré à l'origine, recadrée en 4:5 par le CSS.
const PORTRAIT = {
  src: '/images/about/mathis-800.webp',
  srcSet:
    '/images/about/mathis-480.webp 480w, /images/about/mathis-800.webp 800w, /images/about/mathis-1200.webp 1200w',
  // Largeur affichée : colonne de droite dès 1024 px (environ 32 vw, 470 px au plus), 24 rem sur tablette, 20 rem sur mobile
  sizes: '(min-width: 1024px) min(32vw, 470px), (min-width: 640px) 24rem, min(100vw, 20rem)',
  // Dimensions du cadre affiché (4:5) : le navigateur réserve la place avant le chargement
  width: 960,
  height: 1200,
} as const

// Liens de la ligne « Open source » (faits vérifiés : docs/projets-contexte.md, §6)
const EXTERNAL = { target: '_blank', rel: 'noopener' } as const
const OPEN_SOURCE_URLS = {
  fix: 'https://github.com/OpenCut-app/OpenCut/pull/518',
  plugin: 'https://github.com/MathisBls/NicePrice',
} as const

export function About() {
  const { text } = useContent()
  const { id } = site.sections.about
  const { label, title } = text.sections.about
  const { lines, stackLabel, openSource, portrait } = text.about
  const { newTab } = text.projects
  const sectionRef = useRef<HTMLElement>(null)

  // Progress de la section pour la scène (reduced-motion : 0 puis 1, sans scrub)
  useSectionProgress('about', sectionRef)

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.about}>
      <SectionLabel>{label}</SectionLabel>
      <RevealTitle id={`${id}-titre`} className={styles.title}>
        {title}
      </RevealTitle>

      <div className={styles.body}>
        {/* Avant le texte dans le DOM : au-dessus sur mobile, à droite sur desktop (grille) */}
        <figure className={styles.portrait} data-reveal style={stagger(0)}>
          <picture className={styles.frame}>
            <img
              className={styles.photo}
              src={PORTRAIT.src}
              srcSet={PORTRAIT.srcSet}
              sizes={PORTRAIT.sizes}
              width={PORTRAIT.width}
              height={PORTRAIT.height}
              loading="lazy"
              decoding="async"
              alt={portrait.alt}
            />
          </picture>
          <figcaption className={styles.caption}>{portrait.caption}</figcaption>
        </figure>

        <div className={styles.lines}>
          {lines.map((line, i) => (
            <Fragment key={line}>
              {/* L'open source se place avant la dernière ligne, qui reste la conclusion */}
              {i === lines.length - 1 && (
                <p className={styles.line} data-reveal style={stagger(i)}>
                  {openSource.lead}{' '}
                  <a className={styles.link} href={OPEN_SOURCE_URLS.fix} {...EXTERNAL}>
                    {openSource.fix}
                    <span className="sr-only"> {newTab}</span>
                  </a>{' '}
                  {openSource.stars}{' '}
                  <a className={styles.link} href={OPEN_SOURCE_URLS.plugin} {...EXTERNAL}>
                    {openSource.plugin}
                    <span className="sr-only"> {newTab}</span>
                  </a>
                  {openSource.rest}
                </p>
              )}
              <p
                className={styles.line}
                data-reveal
                style={stagger(i + (i === lines.length - 1 ? 1 : 0))}
              >
                {line}
              </p>
            </Fragment>
          ))}
        </div>

        <div className={styles.stack}>
          <h3 id={`${id}-stack`} className={styles.stackTitle} data-reveal>
            {stackLabel}
          </h3>
          <ul className={styles.chips} aria-labelledby={`${id}-stack`}>
            {stack.map((tech, i) => (
              <li key={tech} className={styles.chip} data-reveal style={stagger(i + 1)}>
                {tech}
              </li>
            ))}
          </ul>
        </div>

        <AvailabilityLine placement="about" />
      </div>
    </section>
  )
}
