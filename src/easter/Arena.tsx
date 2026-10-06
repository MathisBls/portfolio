// Easter egg, beat 2 (3.8 s : « Révélation de l'arène : la caméra descend du ciel vers la table ») et
// beat 3 : le salon de jeu privé BoulardTV. arena.glb (table de jeu, salle), préparé et animé par
// arenaRig.ts ; textures PBR Poly Haven (arena/textures.ts) ; reflets : une carte d'environnement propre
// à l'arène, faite de Lightformers (softbox chaude au-dessus de la table, bandes rose et violette, halo des
// bougies), rendue une fois dans une scène à part et posée sur les matériaux de l'arène seulement (le
// reste de la séquence garde celle de Lighting.tsx). Poussière dans le faisceau : arena/Dust.tsx.
// Visible pendant les plans arène. Mobile : sans miroir au sol, matériaux standard, moins de poussière.
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Group, Scene } from 'three'
import { Dust } from './arena/Dust'
import { prepareArenaTextures, releaseArenaTextures, useArenaTextures } from './arena/textures'
import { applyArenaEnvironment, buildArena, disposeArena, updateArena } from './arenaRig'
import { useEasterModel } from './models'
import { E, SHOT } from './state'

type ArenaProps = { bloom: boolean; mobile: boolean; reducedMotion: boolean }

/** Studio de reflets de l'arène (vu depuis la table) : formes lumineuses, fond noir. */
function ArenaLightformers() {
  return (
    <>
      {/* Softbox chaude au-dessus de la table, et une seconde au fond : l'or à plat la reflète vu du joueur */}
      <Lightformer
        form="rect"
        intensity={4}
        color="#ffe3c8"
        position={[0, 9, 1]}
        rotation-x={Math.PI / 2}
        scale={[9, 4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={3.4}
        color="#ffd2a0"
        position={[0, 6, -10]}
        scale={[16, 4, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#ff2d78"
        position={[-9, 2.5, -4]}
        scale={[10, 1.2, 1]}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#8a4dff"
        position={[9, 3, -3]}
        scale={[1.4, 9, 1]}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="ring"
        intensity={2}
        color="#ffa64d"
        position={[-6, 3, 9]}
        scale={1.6}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="ring"
        intensity={2}
        color="#ffa64d"
        position={[6, 3, 9]}
        scale={1.6}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="rect"
        intensity={0.5}
        color="#5a2a80"
        position={[0, -3, 0]}
        rotation-x={-Math.PI / 2}
        scale={[30, 30, 1]}
      />
    </>
  )
}

export function Arena({ bloom, mobile, reducedMotion }: ArenaProps) {
  const { scene } = useEasterModel('arena')
  const textures = useArenaTextures(mobile)
  const gl = useThree((s) => s.gl)
  const rig = useMemo(() => buildArena(scene, textures, { bloom, mobile }), [scene, textures, bloom, mobile])
  // Scène porteuse de la carte d'environnement (Environment y écrit `environment`)
  const [holder] = useState(() => new Scene())

  useLayoutEffect(() => {
    prepareArenaTextures(textures, gl, mobile)
    return () => {
      releaseArenaTextures(textures)
    }
  }, [textures, gl, mobile])
  // Après celui d'Environment (enfant) : la carte existe déjà, avant la précompilation des shaders
  useLayoutEffect(() => {
    applyArenaEnvironment(rig, holder.environment)
  }, [rig, holder])
  useEffect(
    () => () => {
      disposeArena(rig)
    },
    [rig],
  )

  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    g.visible = E.shot === SHOT.arena
    if (g.visible) updateArena(rig, E, clock.elapsedTime)
  })

  return (
    <>
      <Environment scene={holder} frames={1} resolution={256}>
        <ArenaLightformers />
      </Environment>
      <group ref={group}>
        <primitive object={rig.root} />
        <Dust mobile={mobile} reducedMotion={reducedMotion} bloom={bloom} />
      </group>
    </>
  )
}
