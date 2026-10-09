// Fond de formes du chargement : l'équivalent DOM, sans image à télécharger, du champ d'éclats de la
// scène 3D (lib/shardBackdrop.ts). Il occupe les ~1,5 s avant la scène : visible dès le premier rendu
// (rendu serveur compris), puis il disparaît en fondu quand la scène pose html.has-scene.
// Fixe, au-dessus du canvas (monté après SceneMount : même z-index, il passe devant le temps du fondu) et
// derrière le contenu. aria-hidden, sans pointer-events.
// Sans WebGL, has-scene n'arrive jamais : le fond reste, comme décor derrière les posters.
// Une fois la scène apparue, il ne revient plus (retour de l'easter egg, remontage de la scène) :
// l'attribut data-gone est posé en DOM direct, hors du rendu React.
import { useEffect, useRef } from 'react'
import { BACKDROP_VIEWS, type BackdropView, layoutBackdrop } from '../lib/shardBackdrop'
import styles from './ShardBackdrop.module.css'

const VIEWS = Object.keys(BACKDROP_VIEWS) as BackdropView[]
const LAYOUTS = Object.fromEntries(VIEWS.map((view) => [view, layoutBackdrop(view)])) as Record<
  BackdropView,
  ReturnType<typeof layoutBackdrop>
>

/** Verre neutre de ShardField (SHARD_LOOK.glass) ; la teinte du spectre se mélange à 65 %. */
const GLASS = '#dfe6f5'
const tintColor = (tint: number) => `color-mix(in srgb, var(--ray-${String(tint)}) 65%, ${GLASS})`

export function ShardBackdrop() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const check = () => {
      if (!root.classList.contains('has-scene')) return false
      el.dataset.gone = ''
      return true
    }
    if (check()) return
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect()
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className={styles.backdrop} aria-hidden="true">
      {VIEWS.map((view) => {
        const { width, height } = BACKDROP_VIEWS[view]
        return (
          <svg
            key={view}
            className={styles[view]}
            viewBox={`0 0 ${String(width)} ${String(height)}`}
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            {LAYOUTS[view].map((shard, i) => (
              <g
                key={i}
                opacity={shard.opacity}
                // stroke en attribut : repli si color-mix n'est pas connu (la déclaration inline est alors ignorée)
                stroke={GLASS}
                style={shard.tint === null ? undefined : { stroke: tintColor(shard.tint) }}
              >
                <path className={styles.outline} d={shard.outline} />
                <path className={styles.facets} d={shard.facets} />
              </g>
            ))}
          </svg>
        )
      })}
    </div>
  )
}
