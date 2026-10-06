// Mentions légales (docs/storyboards/about-legal.md) : générées depuis identity et site.legal, aucun
// texte en dur. Cette page ne monte ni la scène, ni Lenis, ni GSAP.
// Une valeur "TODO:" reste du texte, jamais un lien, et s'affiche dans un cadre pointillé pour ne pas
// passer inaperçue.
import { type ReactNode, useId } from 'react'
import { identity } from '../content/services'
import { site } from '../content/site'
import { displayUrl, isFilled, telHref } from '../lib/content'
import { Footer } from '../ui/Footer'
import styles from './LegalPage.module.css'

const { legal } = site

/** Texte courant : la partie "TODO: ..." (jusqu'au point final) est isolée dans un cadre pointillé. */
function Text({ children }: { children: string }) {
  const index = children.indexOf('TODO')
  if (index === -1) return children
  const tail = children.slice(index)
  const todo = tail.replace(/\.$/, '')
  return (
    <>
      {children.slice(0, index)}
      <span className={styles.todo}>{todo}</span>
      {tail.slice(todo.length)}
    </>
  )
}

/** Valeur d'une `<dl>` : lien seulement si la valeur est renseignée. */
function Value({ value, href }: { value: string; href?: string }) {
  if (href !== undefined && isFilled(value)) {
    return (
      <a className={styles.link} href={href}>
        {href.startsWith('http') ? displayUrl(value) : value}
      </a>
    )
  }
  return <Text>{value}</Text>
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{label}</dt>
      <dd className={styles.detail}>{children}</dd>
    </div>
  )
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.heading}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Paragraphs({ items }: { items: readonly string[] }) {
  return items.map((text) => (
    <p key={text} className={styles.text}>
      <Text>{text}</Text>
    </p>
  ))
}

export function LegalPage() {
  const { host } = identity

  return (
    <>
      <a className="skip-link" href="#contenu">
        {site.skipLink}
      </a>
      <main id="contenu" tabIndex={-1} className={styles.main}>
        <h1 className={styles.title}>{site.footer.legal}</h1>
        <p className={styles.intro}>{legal.intro}</p>

        <LegalSection title={legal.editor}>
          <dl className={styles.list}>
            <Row label={legal.labels.name}>
              <Value value={identity.name} />
            </Row>
            <Row label={legal.labels.status}>
              <Value value={identity.status} />
            </Row>
            <Row label={legal.labels.siren}>
              <Value value={identity.siren} />
            </Row>
            <Row label={legal.labels.address}>
              <Value value={identity.address} />
            </Row>
            <Row label={legal.labels.email}>
              <Value value={identity.email} href={`mailto:${identity.email}`} />
            </Row>
            <Row label={legal.labels.phone}>
              <Value
                value={identity.phone}
                href={isFilled(identity.phone) ? telHref(identity.phone) : undefined}
              />
            </Row>
            <Row label={legal.labels.website}>
              <Value value={site.url} href={site.url} />
            </Row>
          </dl>
        </LegalSection>

        <LegalSection title={legal.publisher}>
          <p className={styles.text}>
            <Text>{identity.name}</Text>
          </p>
        </LegalSection>

        <LegalSection title={legal.host}>
          <dl className={styles.list}>
            <Row label={legal.labels.name}>
              <Value value={host.name} />
            </Row>
            <Row label={legal.labels.address}>
              <Value value={host.address} />
            </Row>
            <Row label={legal.labels.website}>
              <Value value={host.url} href={host.url} />
            </Row>
          </dl>
        </LegalSection>

        <LegalSection title={legal.data.title}>
          <Paragraphs items={legal.data.text} />
        </LegalSection>

        <LegalSection title={legal.cookies.title}>
          <p className={styles.text}>
            <Text>{legal.cookies.text}</Text>
          </p>
        </LegalSection>

        <LegalSection title={legal.ip.title}>
          <Paragraphs items={legal.ip.text} />
        </LegalSection>

        <p className={styles.back}>
          <a className={styles.link} href="/">
            {site.footer.home}
          </a>
        </p>
      </main>
      <Footer isLegalPage />
    </>
  )
}
