// Easter egg, beat 5 : projets en bord de route, instanciés directement depuis leurs GLB (useModel, noms
// et mesures de docs/models.md), sans useAnchoredObject. Une animation légère chacun, coupée en
// reduced-motion (`still`) :
// - Zephyr : le logo Z, l'étoile GitHub qui tourne sur elle-même, le logo Git qui pivote ;
// - Fitness : le téléphone avec le vrai écran d'accueil de l'app, l'anneau de progression qui tourne ;
// - Game Factory : rouleaux qui tournent, dés qui avancent sur le tapis ;
// - Meme Rina : la part de pizza qui pivote autour de son centre (contenu décalé de x −0.8).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import { Part } from '../scene/objects/Part'
import { screenMaterial, useScreenTextures } from '../scene/objects/useScreenCycle'
import { useModel } from '../scene/useModel'

type MarkProps = { still: boolean }

const wrap = (v: number, n: number) => ((v % n) + n) % n

export function ZephyrMark({ still }: MarkProps) {
  const { nodes } = useModel('zephyr')
  const star = useRef<Mesh>(null)
  const git = useRef<Group>(null)
  const gitYaw = nodes.Zep_Git_Root.rotation.y
  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime
    if (star.current) star.current.rotation.y = t * 2.2
    if (git.current) git.current.rotation.y = gitYaw + t * 0.8
  })
  return (
    <>
      <group position={nodes.Zep_Logo_Root.position} rotation-y={-0.2}>
        <Part node={nodes.Zep_Logo_Face} />
        <Part node={nodes.Zep_Logo_Side} />
      </group>
      <Part ref={star} node={nodes.Zep_Star} position={[1.05, 0.55, 0.3]} />
      <group
        ref={git}
        position={nodes.Zep_Git_Root.position}
        rotation={nodes.Zep_Git_Root.rotation}
      >
        <Part node={nodes.Zep_Git_Diamond} />
        <Part node={nodes.Zep_Git_Graph} />
      </group>
    </>
  )
}

const HOME_SCREEN = ['/textures/fitness/home.webp']

export function FitnessMark({ still }: MarkProps) {
  const { nodes } = useModel('fitness')
  const [home] = useScreenTextures(HOME_SCREEN)
  const screen = useMemo(() => screenMaterial(home ?? null, 0.88), [home])
  useEffect(
    () => () => {
      screen.dispose()
    },
    [screen],
  )
  const ring = useRef<Mesh>(null)
  const dumbbell = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime
    if (ring.current) ring.current.rotation.z = -t * 1.2
    if (dumbbell.current) dumbbell.current.rotation.x = t * 0.8
  })
  return (
    <>
      <Part node={nodes.Fit_Body} />
      <Part node={nodes.Fit_Screen} material={screen} />
      <Part node={nodes.Fit_RingTrack} />
      <Part ref={ring} node={nodes.Fit_RingArc} />
      <group ref={dumbbell} position={nodes.Fit_Dumbbell_Root.position}>
        <Part node={nodes.Fit_Bar} />
        <Part node={nodes.Fit_PlateL0} />
        <Part node={nodes.Fit_PlateL1} />
        <Part node={nodes.Fit_PlateR0} />
        <Part node={nodes.Fit_PlateR1} />
      </group>
    </>
  )
}

const FACTORY = [
  'Belt',
  'Leg-13-038',
  'Leg-13038',
  'Leg0-038',
  'Leg0038',
  'Leg13-038',
  'Leg13038',
  'Hopper',
  'Chute',
] as const
const ROLLERS = ['Roller-16', 'Roller16'] as const
const DICE = [
  { name: 'Die0', pips: ['Pip0_-008_008'] },
  { name: 'Die1', pips: ['Pip1_-008_008', 'Pip1_008_-008'] },
  { name: 'Die2', pips: ['Pip2_-008_008', 'Pip2_008_-008', 'Pip2_0_0'] },
] as const
/** Tapis : de x −0.4 à 1.6 à y 0.72 (docs/models.md), rouleaux de rayon 0.14. */
const BELT = { start: -0.4, run: 2, top: 0.72, speed: 0.6, roller: 0.14 }

export function FactoryMark({ still }: MarkProps) {
  const { nodes } = useModel('gamefactory')
  const rollers = useRef<(Mesh | null)[]>([])
  const dice = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const distance = still ? 0 : BELT.speed * clock.elapsedTime
    for (const roller of rollers.current) {
      if (roller) roller.rotation.y = -distance / BELT.roller
    }
    for (let i = 0; i < dice.current.length; i++) {
      const die = dice.current[i]
      if (die) die.position.x = BELT.start + wrap(distance + (i * BELT.run) / 3 + 0.2, BELT.run)
    }
  })
  return (
    <>
      {FACTORY.map((name) => (
        <Part key={name} node={nodes[name]} />
      ))}
      {ROLLERS.map((name, i) => (
        <Part
          key={name}
          node={nodes[name]}
          ref={(m) => {
            rollers.current[i] = m
          }}
        />
      ))}
      {DICE.map(({ name, pips }, i) => (
        <Part
          key={name}
          node={nodes[name]}
          position-y={BELT.top}
          ref={(m) => {
            dice.current[i] = m
          }}
        >
          {pips.map((pip) => (
            <Part key={pip} node={nodes[pip]} />
          ))}
        </Part>
      ))}
    </>
  )
}

const SLICE = ['Dough', 'Sauce', 'Cheese', 'Crust'] as const
const TOPPINGS = [
  'Pep06-012',
  'Pep105018',
  'Pep115-022',
  'Pep085-002',
  'Basil045015',
  'Basil0900',
  'Basil12005',
] as const

export function PizzaMark({ still }: MarkProps) {
  const { nodes } = useModel('pizza')
  const spin = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = still ? 0.6 : clock.elapsedTime * 0.5
  })
  return (
    <group ref={spin}>
      <group position-x={-0.8}>
        {[...SLICE, ...TOPPINGS].map((name) => (
          <Part key={name} node={nodes[name]} />
        ))}
      </group>
    </group>
  )
}
