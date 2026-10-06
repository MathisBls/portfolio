// Contact (docs/storyboards/services-contact.md) : coordonnées à gauche, formulaire à droite dès 1024 px.
// Le progress 'contact' (scrub, sans pin) pilote le retour du prisme dans la scène. Reduced-motion : pas de trigger.
import { useRef } from 'react'
import { identity } from '../content/services'
import { site } from '../content/site'
import { isFilled, telHref } from '../lib/content'
import { stagger } from '../lib/stagger'
import { useSectionProgress } from '../lib/useSectionProgress'
import { ContactForm } from '../ui/ContactForm'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Contact.module.css'

export function Contact() {
  const { id, label, title } = site.sections.contact
  const { intro, direct, emailLabel, phoneLabel, locationLabel, sirenLabel } = site.contact
  const sectionRef = useRef<HTMLElement>(null)

  // Progress de la section pour la scène (reduced-motion : 0 puis 1, sans scrub)
  useSectionProgress('contact', sectionRef)

  return (
    <section id={id} ref={sectionRef} aria-labelledby={`${id}-titre`} className={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      <RevealTitle id={`${id}-titre`} className={styles.title}>
        {title}
      </RevealTitle>
      <p className={styles.intro}>{intro}</p>

      <div className={styles.grid}>
        <div className={styles.direct}>
          <p className={styles.directLabel} data-reveal>
            {direct}
          </p>
          <dl className={styles.list}>
            <div className={styles.row} data-reveal style={stagger(1)}>
              <dt className={styles.term}>{emailLabel}</dt>
              <dd className={styles.value}>
                {isFilled(identity.email) ? (
                  <a href={`mailto:${identity.email}`} className={styles.link}>
                    {identity.email}
                  </a>
                ) : (
                  identity.email
                )}
              </dd>
            </div>
            {identity.phone.trim() !== '' && (
              <div className={styles.row} data-reveal style={stagger(2)}>
                <dt className={styles.term}>{phoneLabel}</dt>
                <dd className={styles.value}>
                  {isFilled(identity.phone) ? (
                    <a href={telHref(identity.phone)} className={styles.link}>
                      {identity.phone}
                    </a>
                  ) : (
                    identity.phone
                  )}
                </dd>
              </div>
            )}
            <div className={styles.row} data-reveal style={stagger(3)}>
              <dt className={styles.term}>{locationLabel}</dt>
              <dd className={styles.value}>{identity.location}</dd>
            </div>
          </dl>
          <p className={styles.siren} data-reveal style={stagger(4)}>
            {sirenLabel} {identity.siren}
          </p>
        </div>

        <div className={styles.formCol} data-reveal style={stagger(1)}>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
