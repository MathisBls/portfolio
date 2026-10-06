// Easter egg v3 (code Konami, docs/storyboards/easter-park.md, toute la séquence) : scène de la séquence,
// chunk lazy chargé seulement au déverrouillage (Scene.tsx, React.lazy), avec ses GLB (models.ts) et ses
// textures. Monté dans le Canvas unique ; il remplace le contenu normal (prisme, éclats, objets) et
// CameraRig : c'est la séquence qui pilote la caméra. Beats 1 à 3 : prisme, arène, cartes, route ;
// beats 4 à 7 : espace (space/) ; beats 8 et 9 : le parc (park/, D2).
// Étapes (store.ts, easterStage) :
// - 'loading' : chunk et modèles ; la scène normale reste affichée, la page aussi.
// - 'compiling' : frameloop "never" (dernière image figée), scène normale démontée, objets de la
//   séquence montés, shaders précompilés (compileAsync), comme Warmup.
// - 'running' : rendu continu, timeline (useSequence) ; la page s'efface (overlay, html.easter-live).
// Paliers : desktop (bloom, transmission absente), mobile (moins d'objets, sans postprocessing),
// reduced-motion (fondus seulement : ni éclatement, ni plongée, route immobile, ni traînées, ni
// postprocessing). Modèles chargés pendant 'loading' : les GLB de l'easter egg, le prisme, les cinq
// projets de la route (useModel, docs/models.md) avec l'écran de l'app fitness, et le ciel de l'espace.
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useContinuousInvalidate } from '../scene/hooks'
import { useScene } from '../scene/store'
import { useScreenTextures } from '../scene/objects/useScreenCycle'
import { type ModelName, preloadModel, useModel } from '../scene/useModel'
import { Arena } from './Arena'
import { Atmosphere } from './Atmosphere'
import { Cards } from './Cards'
import { EasterCamera } from './EasterCamera'
import { EasterEffects } from './EasterEffects'
import { EasterLights } from './EasterLights'
import { type EasterGLTF, preloadEasterModels, useEasterModel } from './models'
import { Park } from './park/Park'
import { Road } from './Road'
import { Roadside } from './Roadside'
import { Shatter } from './Shatter'
import { Cockpit } from './space/Cockpit'
import { Gate } from './space/Gate'
import { Sky } from './space/Sky'
import { useSpaceParts } from './space/useSpaceParts'
import { resetEaster } from './state'
import { Streaks } from './Streaks'
import { useSequence } from './useSequence'

const PROJECTS: readonly ModelName[] = ['wegir', 'zephyr', 'fitness', 'gamefactory', 'pizza']
const FITNESS_HOME = ['/textures/fitness/home.webp']

preloadEasterModels()
PROJECTS.forEach(preloadModel)

type EasterSceneProps = { mobile: boolean; reducedMotion: boolean }
type WorldProps = EasterSceneProps & { park: EasterGLTF }

/** Précompilation des shaders de la séquence, puis départ (stage 'running'). */
function Compile() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (cancelled) return
      setFrameloop('demand')
      useScene.getState().setEasterStage('running')
    }
    gl.compileAsync(scene, camera).then(start, start)
    return () => {
      cancelled = true
      setFrameloop('demand')
    }
  }, [gl, scene, camera, setFrameloop])
  return null
}

function World({ mobile, reducedMotion, park }: WorldProps) {
  const stage = useScene((s) => s.easterStage)
  const running = stage === 'running' || stage === 'finale'
  const bloom = !mobile && !reducedMotion
  useSequence(running, reducedMotion, bloom)
  useContinuousInvalidate(running)
  const space = useSpaceParts(park.nodes)
  return (
    <>
      <EasterCamera />
      <Atmosphere mobile={mobile} reducedMotion={reducedMotion} />
      <EasterLights mobile={mobile} />
      <Shatter mobile={mobile} reducedMotion={reducedMotion} />
      <Arena bloom={bloom} mobile={mobile} />
      <Cards bloom={bloom} reducedMotion={reducedMotion} />
      <Road mobile={mobile} reducedMotion={reducedMotion} />
      <Roadside reducedMotion={reducedMotion} />
      {!reducedMotion && <Streaks mobile={mobile} />}
      <Sky mobile={mobile} reducedMotion={reducedMotion} />
      <Gate nodes={space} bloom={bloom} />
      <Cockpit
        nodes={space}
        model={park.nodes}
        mobile={mobile}
        bloom={bloom}
        reducedMotion={reducedMotion}
      />
      <Park mobile={mobile} reducedMotion={reducedMotion} bloom={bloom} />
      {bloom && <EasterEffects />}
      {stage === 'compiling' && <Compile />}
    </>
  )
}

export default function EasterScene({ mobile, reducedMotion }: EasterSceneProps) {
  // Suspend jusqu'au chargement de tous les modèles (le prisme est déjà en cache)
  useEasterModel('arena')
  useEasterModel('cards')
  useEasterModel('logo')
  const park = useEasterModel('park')
  useModel('prism')
  useModel('wegir')
  useModel('zephyr')
  useModel('fitness')
  useModel('gamefactory')
  useModel('pizza')
  useScreenTextures(FITNESS_HOME)
  const stage = useScene((s) => s.easterStage)
  const setFrameloop = useThree((s) => s.setFrameloop)

  useEffect(() => {
    if (stage !== 'loading') return
    resetEaster(reducedMotion, !mobile && !reducedMotion)
    setFrameloop('never')
    useScene.getState().setEasterStage('compiling')
  }, [stage, reducedMotion, mobile, setFrameloop])

  if (stage === 'loading') return null
  return <World mobile={mobile} reducedMotion={reducedMotion} park={park} />
}
