// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, beats 1 à 7, et « Découpage » :
// D3 monte <MajesticEnv/> de D4) : le monde du second niveau, monté dans le Canvas unique au déclenchement
// (stage 'majestic') sous son propre Suspense : la séquence (le final du parc) continue de s'afficher le
// temps que le GLB soit prêt. Affiché seulement quand E.shot === SHOT.majestic (majesticOn). Contenu :
// la montagne et son sommet (Mountain, Summit), le chœur (Choir), l'environnement de D4 (sol, fissures,
// ciel, poussière, débris, faisceaux, spectre, aurore, plasma). Sa racine est enregistrée (ready.ts) une
// fois tous les enfants montés : useMajestic la précompile pendant le beat 0 (warmUpSubtree).
// MajesticPreload, monté avec la séquence : télécharge le GLB et les textures pendant le parc, après les
// textures du parc.
import { useFrame } from '@react-three/fiber'
import { Suspense, use, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { texturesSettled } from '../park/loader'
import { E, SHOT } from '../state'
import { preloadMajestic } from './assets'
import { MajesticEnv } from './env'
import { type EasterGLTFNodes, majesticModel, resolveMajestic, useMajesticGLTF } from './model'
import { setMajesticRoot } from './ready'
import { Choir, Mountain } from './Sanctuary'
import { majesticOn } from './state'

export type MajesticProps = { mobile: boolean; reducedMotion: boolean; bloom: boolean }

function World({
  model,
  mobile,
  reducedMotion,
  bloom,
}: MajesticProps & { model: EasterGLTFNodes }) {
  const nodes = useMemo(() => resolveMajestic(model), [model])
  useEffect(() => nodes.dispose, [nodes])
  // Relief exact de la montagne et formes des débris pour l'environnement de D4 (lecture seule)
  const mountain = useMemo(() => nodes.get('Mountain'), [nodes])
  const rocks = useMemo(() => [model?.Rock_A, model?.Rock_B, model?.Rock_C], [model])
  const root = useRef<Group>(null)
  // Effet du parent : exécuté après ceux des enfants (textures et ressources de D4 déjà demandées)
  useEffect(() => {
    setMajesticRoot(root.current)
    return () => {
      setMajesticRoot(null)
    }
  }, [])
  useFrame(() => {
    if (root.current) root.current.visible = majesticOn()
  })
  return (
    <group ref={root} visible={false}>
      <Mountain nodes={nodes} mobile={mobile} bloom={bloom} />
      <Choir nodes={nodes} mobile={mobile} bloom={bloom} />
      <MajesticEnv
        mobile={mobile}
        reducedMotion={reducedMotion}
        bloom={bloom}
        mountain={mountain}
        rocks={rocks}
      />
    </group>
  )
}

function WithModel(props: MajesticProps) {
  const { nodes } = useMajesticGLTF()
  return <World {...props} model={nodes} />
}

function Resolved(props: MajesticProps) {
  // Fichier absent (pas encore livré) : remplacements construits en code
  const available = use(majesticModel())
  return available ? <WithModel {...props} /> : <World {...props} model={null} />
}

export function MajesticWorld(props: MajesticProps) {
  return (
    <Suspense fallback={null}>
      <Resolved {...props} />
    </Suspense>
  )
}

/** Préchargement du second niveau pendant le parc, une fois ses textures décodées (une fois). */
export function MajesticPreload({ mobile }: { mobile: boolean }) {
  const started = useRef(false)
  useFrame(() => {
    if (started.current || E.shot !== SHOT.park) return
    started.current = true
    void texturesSettled(8000).then(() => {
      preloadMajestic(mobile)
    })
  })
  return null
}
