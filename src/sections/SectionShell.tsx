import type { ReactNode } from 'react'
import { type SectionKey, site } from '../content/site'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Section.module.css'

type Props = { section: Exclude<SectionKey, 'hero'>; children?: ReactNode }

/** Section sémantique : label mono + h2 relié par aria-labelledby. */
export function SectionShell({ section, children }: Props) {
  const { id, label, title } = site.sections[section]
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      <RevealTitle id={`${id}-titre`} className={styles.title}>
        {title}
      </RevealTitle>
      {children}
    </section>
  )
}
