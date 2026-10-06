// Services (docs/storyboards/services-contact.md) : trois cartes (prix, pour qui, inclus) puis le CTA.
// Le progress 'services' (scrub, sans pin) pilote la rétractation des rayons dans la scène.
// Reduced-motion : pas de trigger, la scène affiche son état statique.
import { useRef } from 'react'
import { type Service, services } from '../content/services'
import { site } from '../content/site'
import { stagger } from '../lib/stagger'
import { useSectionProgress } from '../lib/useSectionProgress'
import { useTilt } from '../lib/useTilt'
import { Button } from '../ui/Button'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Services.module.css'

/** Inclinaison maximale d'une carte au survol, en degrés. */
const TILT_MAX = 3

/** Prix : « from » en petit devant le montant (priceFrom), sinon le montant seul (« Custom quote »). */
function splitPrice(service: Service): { lead: string | undefined; value: string } {
  return { lead: service.priceFrom ? site.services.fromLabel : undefined, value: service.price }
}

type ItemProps = { service: Service; index: number; sectionId: string }

function ServiceItem({ service, index, sectionId }: ItemProps) {
  const { forLabel, includesLabel } = site.services
  const { lead, value } = splitPrice(service)
  const titleId = `${sectionId}-${service.id}`
  const itemRef = useRef<HTMLLIElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  // Le pointeur est écouté sur le <li> (qui ne s'incline pas), l'inclinaison s'applique à la carte
  useTilt(cardRef, { max: TILT_MAX, host: itemRef })

  return (
    <li ref={itemRef} className={styles.item} data-reveal style={stagger(index)}>
      <article ref={cardRef} className={styles.card} aria-labelledby={titleId}>
        <div className={styles.head}>
          <p className={styles.index} aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </p>
          <h3 id={titleId} className={styles.name}>
            {service.title}
          </h3>
        </div>

        <p className={styles.price}>
          {lead && <span className={styles.priceLead}>{lead}</span>}
          {lead && ' '}
          <span className={styles.priceValue}>{value}</span>
        </p>

        <div className={styles.for}>
          <p className={styles.blockLabel}>{forLabel}</p>
          <p className={styles.forText}>{service.for}</p>
        </div>

        <div className={styles.includes}>
          <p id={`${titleId}-inclus`} className={styles.blockLabel}>
            {includesLabel}
          </p>
          <ul className={styles.includesList} aria-labelledby={`${titleId}-inclus`}>
            {service.includes.map((item, i) => (
              <li key={item} data-reveal style={stagger(i + 1)}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  )
}

export function Services() {
  const { id, label, title } = site.sections.services
  const { intro, cta } = site.services
  const sectionRef = useRef<HTMLElement>(null)

  // Progress de la section pour la scène (reduced-motion : 0 puis 1, sans scrub)
  useSectionProgress('services', sectionRef)

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      <RevealTitle id={`${id}-titre`} className={styles.title}>
        {title}
      </RevealTitle>
      <p className={styles.intro}>{intro}</p>

      <ul className={styles.list}>
        {services.map((service, i) => (
          <ServiceItem key={service.id} service={service} index={i} sectionId={id} />
        ))}
      </ul>

      <div className={styles.cta} data-reveal>
        <Button href={cta.href}>{cta.label}</Button>
      </div>
    </section>
  )
}
