---
name: r3f-scroll-scene
description: Patterns et snippets pour une scène React Three Fiber pilotée au scroll avec GSAP ScrollTrigger + Lenis, chargement GLB Draco, MeshTransmissionMaterial, bloom sélectif, et dégradation mobile/reduced-motion. À lire avant d'écrire ou modifier quoi que ce soit dans src/scene.
---
# Scène R3F pilotée au scroll

## Installation
```bash
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap lenis motion
npm i -D @types/three
# décodeur Draco servi en local (pas de CDN)
mkdir -p public/draco && cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/
```

## Lenis + GSAP, une seule fois (`src/lib/gsap.ts`)
```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
gsap.registerPlugin(ScrollTrigger)
export const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
export { gsap, ScrollTrigger }
```

## Progress partagé entre DOM et 3D
Un store minimal (zustand est déjà une dépendance de R3F) ou un module avec des refs :
```ts
// src/scene/store.ts
import { create } from 'zustand'
type Store = { progress: Record<string, number>; set: (id: string, v: number) => void }
export const useScene = create<Store>((set) => ({ progress: {}, set: (id, v) => set((s) => ({ progress: { ...s.progress, [id]: v } })) }))
```
Mais **dans useFrame on lit `useScene.getState().progress[id]`**, jamais via le hook (évite les re-renders).

## Timeline par section
```ts
useLayoutEffect(() => {
  const ctx = gsap.context(() => {
    gsap.timeline({ scrollTrigger: { id: 'hero', trigger: ref.current, start: 'top top', end: '+=200%', scrub: 0.6, pin: true,
      onUpdate: (st) => { useScene.getState().set('hero', st.progress); invalidate() } } })
  }, ref)
  return () => ctx.revert()
}, [])
```
`invalidate` vient de `useThree` (à remonter via le store si on est hors Canvas).

## Canvas global
```tsx
<Canvas dpr={[1, isMobile ? 1.5 : 2]} frameloop="demand" gl={{ antialias: true, powerPreference: 'high-performance' }}
  camera={{ fov: 35, near: 0.1, far: 50, position: [0, 0, 8] }} style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
  <Suspense fallback={null}>
    <Environment preset="city" environmentIntensity={0.6} />
    <CameraRig />
    <Prism /> ...
    {!isMobile && !reducedMotion && <Effects />}
  </Suspense>
</Canvas>
```
Le DOM est au-dessus (`position: relative; z-index: 1; pointer-events: none` sur les wrappers, `pointer-events: auto` sur les éléments interactifs).

## GLB
```tsx
const { nodes, materials } = useGLTF('/models/wegir.glb', '/draco/') as unknown as GLTFResult
useGLTF.preload('/models/wegir.glb', '/draco/')
```
Génère les types avec `npx gltfjsx public/models/wegir.glb --types --transform` une fois, puis garde seulement l'interface.

## Prisme en verre
```tsx
<mesh geometry={nodes.Prism.geometry} rotation={nodes.Prism.rotation}>
  <MeshTransmissionMaterial samples={isMobile ? 2 : 6} resolution={isMobile ? 256 : 512} thickness={0.6}
    chromaticAberration={0.35} anisotropy={0.2} distortion={0.1} ior={1.5} roughness={0.05} backside />
</mesh>
```
Reduced-motion → `<meshPhysicalMaterial transmission={1} thickness={0.6} roughness={0.05} />`.

## Bloom sélectif
```tsx
<EffectComposer multisampling={0}>
  <SelectiveBloom selection={spectrumRefs} luminanceThreshold={0.9} intensity={1.4} mipmapBlur />
  <Vignette offset={0.3} darkness={0.7} />
  <Noise opacity={0.04} />
</EffectComposer>
```

## Animer les enfants d'un GLB
```ts
useFrame((_, dt) => {
  const p = useScene.getState().progress.projects ?? 0
  cars.forEach((car, i) => { const t = (p * 2 + i / 3) % 1; placeOnArc(car, t) })
})
```
Les objets viennent de Blender en Z-up converti Y-up par l'export : les rotations/positions sont déjà bonnes, ne pas "corriger" à la main sans vérifier.

## Dégradation
- `isMobile = matchMedia('(pointer: coarse)')` ou largeur < 1024 → dpr 1.5, pas de postprocessing, transmission samples 2, Float désactivé
- `prefers-reduced-motion` → scrub remplacé par état final, tout `useFrame` continu coupé, posters PNG dans les cards
- WebGL absent → `<Canvas>` non monté, le DOM seul fait le site

## Pièges connus
- `pin` + Lenis : mettre `pinType: 'transform'` si saut, et `ScrollTrigger.refresh()` après chargement des fonts/GLB
- `MeshTransmissionMaterial` rend 2 passes : jamais plus d'un objet transmission visible à la fois
- `backdrop-filter` sur un parent crée un containing block et casse les `position: fixed` enfants
