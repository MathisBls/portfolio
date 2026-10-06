// Easter egg v3 : sous-titres des voix (Houston, la speakeuse), façon cinéma en bas de l'overlay.
// L'index vient du store (easterSubtitle, posé par la timeline aux repères SUBTITLES de voice.ts), le texte
// de site.easter.subtitles (en français, lang="fr"). Fond sombre translucide (contraste AA sur n'importe
// quelle image), fondu court à l'apparition et à la disparition, aucun en reduced-motion.
// Accessibilité : le texte affiché est aria-hidden. Son coupé, chaque sous-titre est annoncé par la région
// aria-live de l'overlay (onAnnounce) ; son allumé, la voix suffit, rien n'est doublé.
// Bundle initial : DOM seulement, aucun import de three.
import { useEffect, useState } from 'react'
import { site } from '../content/site'
import { useScene } from '../scene/store'
import styles from './EasterOverlay.module.css'

type EasterSubtitlesProps = {
  /** Son allumé : pas d'annonce (la voix est entendue). */
  soundOn: boolean
  onAnnounce: (text: string) => void
}

export function EasterSubtitles({ soundOn, onAnnounce }: EasterSubtitlesProps) {
  const index = useScene((s) => s.easterSubtitle)
  // Dernier sous-titre affiché : son texte reste pendant le fondu de sortie
  const [last, setLast] = useState(index)
  if (index >= 0 && index !== last) setLast(index)
  const text = site.easter.subtitles[index >= 0 ? index : last] ?? ''
  const visible = index >= 0 && text !== ''

  const current = index >= 0 ? (site.easter.subtitles[index] ?? '') : ''
  useEffect(() => {
    if (!soundOn && current) onAnnounce(current.replace(/\n/g, ' '))
  }, [current, soundOn, onAnnounce])

  if (!text) return null
  return (
    <div className={`${styles.subtitles} ${visible ? styles.subtitlesOn : ''}`} aria-hidden="true">
      <p className={styles.subtitle} lang="fr">
        {text}
      </p>
    </div>
  )
}
