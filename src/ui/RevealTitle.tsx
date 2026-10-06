// Titre de section dont les mots montent un à un, masqués par leur ligne (overflow: clip).
// Déclenchement par le mécanisme commun : data-reveal="words" -> observeReveals ajoute .is-in -> le CSS
// anime les mots (RevealTitle.module.css). Aucune animation sans JS (état caché sous html.has-reveal).
// Lecteurs d'écran : de vrais espaces séparent les mots, aucun aria-hidden, le titre se lit d'un bloc.
import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import styles from './RevealTitle.module.css'

type Props = {
  children: string
  as?: 'h2' | 'h3'
  id?: string
  className?: string
}

export function RevealTitle({ children, as: Tag = 'h2', id, className }: Props) {
  // Espace simple seulement : une espace insécable (typographie française) reste collée à son mot
  const words = children.split(' ').filter((word) => word !== '')
  return (
    <Tag
      id={id}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-reveal="words"
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${String(i)}`}>
          {i > 0 && ' '}
          <span className={styles.word}>
            <span className={styles.inner} style={{ '--word-i': i } as CSSProperties}>
              {word}
            </span>
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}
