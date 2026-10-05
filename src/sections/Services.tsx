// Services (docs/storyboards/services-contact.md) : trois cartes (prix, pour qui, inclus) puis le CTA.
// Le progress 'services' (scrub, sans pin) pilote la rétractation des rayons dans la scène.
// Reduced-motion : pas de trigger, la scène affiche son état statique.
import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { services } from '../content/services'
import { site } from '../content/site'
import { ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'
import { setProgress } from '../scene/store'
import { Button } from '../ui/Button'
import styles from './Services.module.css'

/** Stagger des [data-reveal] (global.css : delay = --reveal-i x 60 ms). */
const reveal = (i: number): CSSProperties & { '--reveal-i': number } => ({ '--reveal-i': i })

/** 'à partir de 900 €' -> petit label + montant en grand. 'sur devis' reste entier. */
function splitPrice(from: string): { lead: string | undefined; value: string } {
  const match = /^(à partir de)\s+(.+)$/i.exec(from)
  return match?.[1] && match[2]
    ? { lead: match[1], value: match[2] }
    : { lead: undefined, value: from }
}

export function Services() {
  const { id, label, title } = site.sections.services
  const { intro, forLabel, includesLabel, cta } = site.services
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || reduced) return
    const trigger = ScrollTrigger.create({
      id: 'services',
      trigger: section,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setProgress('services', self.progress)
      },
    })
    return () => {
      trigger.kill()
    }
  }, [reduced])

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.section}>
      <p className={styles.label} aria-hidden="true">
        {label}
      </p>
      <h2 id={`${id}-titre`} className={styles.title}>
        {title}
      </h2>
      <p className={styles.intro}>{intro}</p>

      <ul className={styles.list}>
        {services.map((service, i) => {
          const { lead, value } = splitPrice(service.from)
          const titleId = `${id}-${service.id}`
          return (
            <li key={service.id} className={styles.item} data-reveal style={reveal(i)}>
              <article className={styles.card} aria-labelledby={titleId}>
                <div className={styles.head}>
                  <p className={styles.index} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
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
                    {service.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      <div className={styles.cta} data-reveal style={reveal(0)}>
        <Button href={cta.href}>{cta.label}</Button>
      </div>
    </section>
  )
}
