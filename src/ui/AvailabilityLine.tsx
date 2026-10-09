// Ligne de disponibilité : « Paris, 14:32 · Disponible pour de nouveaux projets ». Texte mono sans fond
// ni bordure (skill design-sans-ia), avec un détail vivant : l'heure réelle de Paris, mise à jour
// chaque minute côté client seulement (lib/parisTime.ts). Au rendu serveur il n'y a pas d'heure :
// « Paris · Disponible… », l'heure arrive après l'hydratation. Un filet fin se dessine au-dessus.
// - placement 'hero' : centré, géré par la timeline du pin (data-intro) ; filet dessiné au chargement ;
// - placement 'about' : à gauche, apparition par data-reveal, filet dessiné quand la ligne entre à l'écran.
// Hero : filet et fondu de l'heure passent par l'API Web Animations sur de vrais éléments, pas par des
// animations CSS ni sur un pseudo-élément. Le pin du hero (ScrollTrigger) déplace le DOM à chaque refresh :
// une animation CSS des descendants se rejoue alors, et une animation WAAPI sur un ::before est perdue.
import { useContent } from '../content/useContent'
import { useParisTime } from '../lib/parisTime'
import { stagger } from '../lib/stagger'
import { prefersReducedMotion } from '../lib/useReducedMotion'
import styles from './AvailabilityLine.module.css'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

type Props = { placement: 'hero' | 'about' }

/** L'heure apparaît en fondu (ref stable : appelée au montage seulement, pas à chaque minute). */
function fadeInTime(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  el.animate({ opacity: [0, 1] }, { duration: 700, easing: EASE })
}

/**
 * Hero : le filet se dessine de gauche à droite, une fois la ligne en place. Replié par le CSS tant que
 * l'animation n'a pas démarré ; `fill: 'both'` le garde tracé ensuite. En reduced-motion, pas
 * d'animation : le CSS le laisse tracé.
 */
function drawHeroRule(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  el.animate(
    { transform: ['scaleX(0)', 'scaleX(1)'] },
    { duration: 900, delay: 500, easing: EASE, fill: 'both' },
  )
}

export function AvailabilityLine({ placement }: Props) {
  const { text, locale } = useContent()
  const { city, status } = text.availability
  const time = useParisTime(locale)

  const hero = placement === 'hero'
  return (
    <p
      className={styles.line}
      data-placement={placement}
      {...(hero ? { 'data-intro': '' } : { 'data-reveal': '', style: stagger(0) })}
    >
      <span ref={hero ? drawHeroRule : undefined} className={styles.rule} aria-hidden="true" />
      <span className={styles.place}>
        {city}
        {time !== null && (
          <span ref={fadeInTime} className={styles.time}>
            {`, ${time}`}
          </span>
        )}
      </span>
      <span className={styles.sep} aria-hidden="true">
        ·
      </span>
      <span>{status}</span>
    </p>
  )
}
