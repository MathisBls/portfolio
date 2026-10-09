// Page d'atterrissage (référencement local, français seulement) : une page DOM légère, sans la scène 3D de
// l'accueil, ni Lenis, ni apparition au scroll. Seul le visuel du haut (LandingModel) charge, en différé,
// une petite visionneuse 3D par-dessus son poster. Contenu : src/content/seo/ (un fichier par page) ; <head> et JSON-LD :
// landingSchema.ts. Même nav (ancres de l'accueil) et même footer que le reste du site. Tout le texte et
// tous les liens sont dans le HTML prérendu : la page se lit sans JS ; le JS n'ajoute que le menu mobile,
// le masquage de la nav, l'indicateur de scroll et la visionneuse 3D.
// Ordre : fil d'Ariane, titre, intro, appels à l'action, fiche ; blocs numérotés (pour qui, inclus, prix,
// méthode, exemples…) ; questions fréquentes ; appel final vers le formulaire de l'accueil ; voir aussi.
import type { ReactNode } from 'react'
import {
  LANDING_IDS,
  LANDING_ROUTES,
  type LandingId,
  type Locale,
  ROUTES,
} from '../../content/locales'
import { LANDINGS } from '../../content/seo'
import { landingNav } from '../../content/seo/nav'
import { customQuote, servicePrice } from '../../content/seo/prices'
import type { Example, Fact, LandingBlock, PriceItem, Term } from '../../content/seo/types'
import { landingUi as ui } from '../../content/seo/ui'
import { site } from '../../content/site'
import { useContent } from '../../content/useContent'
import { displayUrl, telHref } from '../../lib/content'
import { ArrowIcon } from '../../ui/ArrowIcon'
import { Button } from '../../ui/Button'
import { Footer } from '../../ui/Footer'
import { Nav } from '../../ui/Nav'
import { ScrollProgress } from '../../ui/ScrollProgress'
import styles from './LandingPage.module.css'
import { LandingModel } from './LandingModel'

const EXTERNAL = { target: '_blank', rel: 'noopener' } as const

/**
 * Ancre d'un projet sur l'accueil : titre du chapitre (ui/ProjectChapter.tsx, id `project-<slug>`). Le
 * prerender vérifie que chaque ancre de l'accueil visée par ces pages existe (scripts/prerender.mjs).
 */
const projectAnchor = (slug: string): string => `${ROUTES.fr.home}#project-${slug}`

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Titre dont les mots composés (« faut-il », « Île-de-France ») ne se coupent pas après le trait d'union :
 * chaque mot à trait d'union est enveloppé dans un span insécable. Le texte reste identique.
 */
function Keep({ children }: { children: string }) {
  return children.split(/(\S*\p{L}-\p{L}\S*)/u).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={styles.keep}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}

/** Flèche typographique d'un lien interne. Décorative. */
function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      →
    </span>
  )
}

function Price({ lead, value }: { lead?: string; value: string }) {
  return (
    <p className={styles.price}>
      {lead && <span className={styles.priceLead}>{lead} </span>}
      <span className={styles.priceValue}>{value}</span>
    </p>
  )
}

function FactValue({ value }: { value: Fact['value'] }) {
  const { text } = useContent()
  if (typeof value === 'string') return value
  if ('service' in value) {
    const { lead, value: amount } = servicePrice(value.service)
    return lead ? `${lead} ${amount}` : amount
  }
  return (
    <a className={styles.link} href={value.url} {...EXTERNAL}>
      {displayUrl(value.url)}
      <ArrowIcon className={styles.external} />
      <span className="sr-only"> {text.projects.newTab}</span>
    </a>
  )
}

function TermList({ items }: { items: Term[] }) {
  return (
    <dl className={styles.terms}>
      {items.map(({ term, text }) => (
        <div key={term} className={styles.termRow}>
          <dt className={styles.term}>
            <Keep>{term}</Keep>
          </dt>
          <dd className={styles.termText}>{text}</dd>
        </div>
      ))}
    </dl>
  )
}

function PriceRow({ item }: { item: PriceItem }) {
  const { text } = useContent()
  const isService = 'service' in item
  const name = isService ? text.services.items[item.service].title : item.name
  const price = isService ? servicePrice(item.service) : { value: customQuote() }
  return (
    <li className={styles.priceRow}>
      <div>
        <h3 className={styles.priceName}>
          <Keep>{name}</Keep>
        </h3>
        <p className={styles.priceText}>{item.text}</p>
      </div>
      <Price {...price} />
    </li>
  )
}

function ExampleRow({ item }: { item: Example }) {
  const { projects, text } = useContent()
  const project = projects.find((p) => p.slug === item.project)
  if (!project) return null
  const year = project.year ?? text.projects.inDevelopment
  return (
    <li className={styles.example}>
      <p className={styles.exampleMeta}>
        {year} · {project.context}
      </p>
      <h3 className={styles.exampleName}>{project.name}</h3>
      <p className={styles.exampleText}>{item.text}</p>
      <p className={styles.exampleLinks}>
        <a className={styles.link} href={projectAnchor(project.slug)}>
          {ui.projectLink}
          <span className="sr-only"> {project.name}</span>
          <Arrow />
        </a>
        {item.caseStudy && (
          <a className={styles.link} href={LANDING_ROUTES[item.caseStudy]}>
            {ui.caseStudyLink}
            <span className="sr-only"> {project.name}</span>
            <Arrow />
          </a>
        )}
      </p>
    </li>
  )
}

function BlockBody({ block }: { block: LandingBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className={styles.prose}>
          {block.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              <Keep>{paragraph}</Keep>
            </p>
          ))}
        </div>
      )
    case 'terms':
      return (
        <>
          {block.intro && <p className={styles.blockIntro}>{block.intro}</p>}
          <TermList items={block.items} />
        </>
      )
    case 'pricing':
      return (
        <>
          <ul className={styles.prices}>
            {block.items.map((item) => (
              <PriceRow key={'service' in item ? item.service : item.name} item={item} />
            ))}
          </ul>
          <p className={styles.note}>{block.note}</p>
        </>
      )
    case 'steps':
      return (
        <ol className={styles.steps}>
          {block.steps.map(({ term, text }, i) => (
            <li key={term} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {pad(i + 1)}
              </span>
              <h3 className={styles.stepTitle}>
                <Keep>{term}</Keep>
              </h3>
              <p className={styles.stepText}>{text}</p>
            </li>
          ))}
        </ol>
      )
    case 'examples':
      return (
        <ul className={styles.examples}>
          {block.items.map((item) => (
            <ExampleRow key={item.project} item={item} />
          ))}
        </ul>
      )
  }
}

/** Section numérotée : étiquette mono et titre à gauche (collés au scroll sur grand écran), contenu à droite. */
function Section({
  index,
  label,
  title,
  children,
}: {
  index: number
  label: string
  title: string
  children: ReactNode
}) {
  const titleId = `section-${pad(index)}`
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHead}>
        <p className={styles.label} aria-hidden="true">
          <span className={styles.labelNumber}>{pad(index)}</span> / {label}
        </p>
        <h2 id={titleId} className={styles.heading}>
          <Keep>{title}</Keep>
        </h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

export function LandingPage({ id }: { id: LandingId }) {
  const { text, identity, routes } = useContent()
  const landing = LANDINGS[id]
  const path = LANDING_ROUTES[id]
  const name = landingNav.links[id]
  // Page en français seul : le sélecteur mène à la page elle-même (FR) ou à l'accueil anglais (EN)
  const langRoutes: Record<Locale, string> = { fr: path, en: ROUTES.en.home }
  const contactHref = `${routes.home}#${site.sections.contact.id}`
  const workHref = `${routes.home}#${site.sections.projects.id}`
  const faqIndex = landing.blocks.length + 1
  const others = LANDING_IDS.filter((other) => other !== id)

  return (
    <>
      <a className="skip-link" href="#contenu">
        {text.skipLink}
      </a>
      <ScrollProgress />
      <Nav away={{ home: routes.home, homeLabel: ui.homeLink, langRoutes }} />
      <main id="contenu" tabIndex={-1} className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headText}>
            <nav aria-label={ui.breadcrumb} className={styles.breadcrumb}>
              <ol>
                <li>
                  <a href={routes.home}>{ui.home}</a>
                  <span aria-hidden="true"> / </span>
                </li>
                {landing.parent && (
                  <li>
                    <a href={landing.parent.href}>{landing.parent.name}</a>
                    <span aria-hidden="true"> / </span>
                  </li>
                )}
                <li aria-current="page">{name}</li>
              </ol>
            </nav>
            <p className={styles.kicker}>{landing.kicker}</p>
            <h1 className={styles.title}>
              <Keep>{landing.title}</Keep>
            </h1>
            <p className={styles.intro}>{landing.intro}</p>
            <div className={styles.actions}>
              <Button href={contactHref}>{ui.ctaPrimary}</Button>
              <Button href={workHref} variant="ghost">
                {ui.ctaSecondary}
              </Button>
            </div>
          </div>

          {landing.visual && (
            <LandingModel
              className={styles.visual}
              model={landing.visual.model}
              alt={landing.visual.alt}
            />
          )}

          <dl className={styles.facts} aria-label={ui.factsLabel}>
            {landing.facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt className={styles.factLabel}>{fact.label}</dt>
                <dd className={styles.factValue}>
                  <FactValue value={fact.value} />
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {landing.blocks.map((block, i) => (
          <Section key={block.label} index={i + 1} label={block.label} title={block.title}>
            <BlockBody block={block} />
          </Section>
        ))}

        <Section index={faqIndex} label={ui.faq.label} title={ui.faq.title}>
          <div className={styles.faq}>
            {landing.faq.map(({ question, answer }) => (
              <div key={question} className={styles.faqItem}>
                <h3 className={styles.question}>
                  <Keep>{question}</Keep>
                </h3>
                <p className={styles.answer}>{answer}</p>
              </div>
            ))}
          </div>
        </Section>

        <section className={styles.cta} aria-labelledby="appel-titre">
          <h2 id="appel-titre" className={styles.ctaTitle}>
            <Keep>{landing.cta.title}</Keep>
          </h2>
          <p className={styles.ctaText}>{landing.cta.text}</p>
          <div className={styles.actions}>
            <Button href={contactHref}>{ui.ctaContact}</Button>
          </div>
          <p className={styles.direct}>
            <span>{ui.direct}</span>
            <a className={styles.link} href={`mailto:${identity.email}`}>
              {identity.email}
            </a>
            <a className={styles.link} href={telHref(identity.phone)}>
              {identity.phone}
            </a>
          </p>
        </section>

        <nav className={styles.seeAlso} aria-labelledby="voir-aussi">
          <p id="voir-aussi" className={styles.label}>
            {ui.seeAlso}
          </p>
          <ul className={styles.seeAlsoList}>
            {others.map((other) => (
              <li key={other}>
                <a className={styles.seeAlsoLink} href={LANDING_ROUTES[other]}>
                  {landingNav.links[other]}
                  <Arrow />
                </a>
              </li>
            ))}
            <li>
              <a className={styles.seeAlsoLink} href={routes.home}>
                {ui.allWork}
                <Arrow />
              </a>
            </li>
          </ul>
        </nav>
      </main>
      <Footer landing={{ path, langRoutes }} />
    </>
  )
}
