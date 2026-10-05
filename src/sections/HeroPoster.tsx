// Poster sans WebGL du hero (docs/storyboards/hero.md §5) : prisme en trait, faisceau blanc par la
// gauche, 7 rayons (Spec0 rouge en bas, Spec6 violet en haut) qui sortent par la face droite, éventail
// de ±18°. Coordonnées en dur : même rendu serveur et navigateur, pas de trigonométrie à l'hydratation.
// Visible par défaut, effacé en CSS sous html.has-scene.
import styles from './Hero.module.css'

const RAY_ORIGIN = [554, 263.5] as const
const RAY_ENDS = [
  [982, 402.6],
  [994.2, 357.1],
  [1001.5, 310.5],
  [1004, 263.5],
  [1001.5, 216.5],
  [994.2, 169.9],
  [982, 124.4],
] as const

const fg = { stopColor: 'var(--fg)' } as const

export function HeroPoster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      <svg viewBox="0 -36.5 1000 600" focusable="false">
        <defs>
          <linearGradient
            id="hero-beam"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="446"
            y2="0"
          >
            <stop offset="0" style={fg} stopOpacity="0" />
            <stop offset="1" style={fg} stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id="hero-fade"
            gradientUnits="userSpaceOnUse"
            x1="554"
            y1="0"
            x2="1000"
            y2="0"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
          </linearGradient>
          <mask id="hero-rays" maskUnits="userSpaceOnUse" x="0" y="-100" width="1000" height="800">
            <rect y="-100" width="1000" height="800" fill="url(#hero-fade)" />
          </mask>
        </defs>
        <line
          x1="0"
          y1="263.5"
          x2="446"
          y2="263.5"
          stroke="url(#hero-beam)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="446"
          y1="263.5"
          x2="554"
          y2="263.5"
          style={{ stroke: 'var(--fg)' }}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <path
          d="M500 170 L608 357 L392 357 Z"
          fill="rgba(237, 237, 240, 0.03)"
          stroke="var(--fg-2)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <g mask="url(#hero-rays)" strokeWidth="3" strokeLinecap="round">
          {RAY_ENDS.map(([x, y], i) => (
            <line
              key={i}
              x1={RAY_ORIGIN[0]}
              y1={RAY_ORIGIN[1]}
              x2={x}
              y2={y}
              style={{ stroke: `var(--ray-${String(i)})` }}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
