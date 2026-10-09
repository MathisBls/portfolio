import type { ReactNode } from 'react'
import { type SectionKey, site } from '../content/site'
import { useContent } from '../content/useContent'
import { RevealTitle } from '../ui/RevealTitle'
import { SectionLabel } from '../ui/SectionLabel'
import styles from './Section.module.css'

type Props = { section: Exclude<SectionKey, 'hero'>; children?: ReactNode }

/** Section sémantique : label mono + h2 relié par aria-labelledby. */
export function SectionShell({ section, children }: Props) {
  const { text } = useContent()
  const { id } = site.sections[section]
  const { label, title } = text.sections[section]
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
