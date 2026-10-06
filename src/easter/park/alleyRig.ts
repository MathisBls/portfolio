// Easter egg v3, beat 8, tableau 1 (docs/storyboards/easter-park.md : « Allée des écrans : des écrans
// géants en carrousel tournent autour de la trajectoire. Ils montrent des visuels BoulardTV SFW ») :
// écrans (Screen_Frame et Screen_Panel instanciés) sur une hélice autour de l'axe de l'allée, qui tourne
// lentement ; chaque écran reste droit et s'incline vers la caméra qui arrive. Médias : SCREENS
// (textures.ts) ; au plus deux vidéos décodées (aucune sur mobile), lues seulement quand l'allée est
// affichée, muettes. Enseignes néon BOULARDTV et B de la marque en balises. Luminosité des écrans qui
// respire doucement avec le tempo (±6 %, jamais de flash). Sans React ; par frame : updateAlley.
import {
  type CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { type Instanced, commitInstances, instanceNode, setInstance } from './instancing'
import { ALLEY } from './layout'
import { type ScreenVideo, attachTexture, createScreenVideo } from './loader'
import { type Parts, fitScale, parkMaterial } from './parts'
import { BRAND, neonMaterial, neonTexture, placeholderScreen } from './signs'
import { SCREENS, type ScreenMedia } from './textures'

/** Vidéos décodées au plus en même temps (consigne perf). */
const MAX_VIDEOS = 2

type Source = {
  media: ScreenMedia
  material: MeshBasicMaterial
  placeholder: CanvasTexture
  panels: Instanced
  screens: number[]
  video: ScreenVideo | null
}

export type AlleyRig = {
  root: Group
  count: number
  scale: number
  frames: Instanced
  sources: Source[]
  beacons: Instanced | null
  beaconCount: number
  hoops: InstancedMesh<TorusGeometry, MeshBasicMaterial>
  hoopCount: number
  beaconScale: number
  panelOffset: Vector3
  flipY: boolean
  loaded: boolean
  dispose: () => void
}

const HOOP_COLORS = [new Color('#ff3d9a'), new Color('#59e1ff')] as const

/** Enseignes BOULARDTV : position (repère du parc), largeur, lacet. */
const SIGNS: readonly (readonly [number, number, number, number, number])[] = [
  [0, 47, -40, 74, 0],
  [-44, 30, -250, 56, 0.55],
  [46, -28, -330, 56, -0.5],
  [0, -50, -480, 84, 0],
]

export function buildAlley(
  parts: Parts,
  logo: Object3D | null,
  mobile: boolean,
  bloom: boolean,
): AlleyRig {
  const owned: { dispose: () => void }[] = []
  const root = new Group()
  root.visible = false
  const count = mobile ? ALLEY.screens.mobile : ALLEY.screens.desktop
  const frameNode = parts.get('Screen_Frame')
  const panelNode = parts.get('Screen_Panel')
  const scale = fitScale(frameNode, ALLEY.width)
  const frames = instanceNode(frameNode, count, (m) => parkMaterial(m, bloom, 1.4))
  for (const mesh of frames.meshes) root.add(mesh)
  owned.push(frames)
  // Médias : images, puis au plus deux vidéos (aucune sur mobile)
  const images = SCREENS.filter((m) => m.kind === 'image')
  const videos = mobile ? [] : SCREENS.filter((m) => m.kind === 'video').slice(0, MAX_VIDEOS)
  const medias: ScreenMedia[] = []
  for (let i = 0; i < Math.max(images.length, videos.length); i++) {
    const image = images[i]
    const video = videos[i]
    if (image) medias.push(image)
    if (video) medias.push(video)
  }
  const sources: Source[] = medias.map((media, k) => {
    const screens: number[] = []
    for (let i = k; i < count; i += medias.length) screens.push(i)
    const placeholder = placeholderScreen(k)
    const material = new MeshBasicMaterial({ map: placeholder, toneMapped: false, fog: false })
    const panels = instanceNode(panelNode, Math.max(1, screens.length), () => material)
    for (const mesh of panels.meshes) root.add(mesh)
    owned.push(placeholder, panels)
    return { media, material, placeholder, panels, screens, video: null }
  })
  // Enseignes néon
  const neon = neonTexture(BRAND, '#ffe1f1', '#ff3d9a')
  const signMaterial = neonMaterial(neon, bloom ? 2.4 : 1)
  const signGeometry = new PlaneGeometry(4, 1)
  owned.push(neon, signMaterial, signGeometry)
  for (const [x, y, z, width, yaw] of SIGNS) {
    const sign = new Mesh(signGeometry, signMaterial)
    sign.position.set(x, y, z)
    sign.rotation.y = yaw
    sign.scale.setScalar(width / 4)
    sign.renderOrder = 5
    root.add(sign)
  }
  // Cerceaux néon, rose et cyan en alternance : ils dessinent le couloir
  const hoopCount = mobile ? ALLEY.hoops.mobile : ALLEY.hoops.desktop
  const hoopGeometry = new TorusGeometry(ALLEY.hoops.radius, 0.45, 8, 220)
  const hoopMaterial = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false })
  const hoops = new InstancedMesh(hoopGeometry, hoopMaterial, hoopCount)
  hoops.frustumCulled = false
  const hoopMatrix = new Matrix4()
  for (let i = 0; i < hoopCount; i++) {
    const z = ALLEY.hoops.from + ((ALLEY.hoops.to - ALLEY.hoops.from) * i) / Math.max(1, hoopCount - 1)
    hoops.setMatrixAt(i, hoopMatrix.makeTranslation(0, 0, z))
    hoops.setColorAt(i, HOOP_COLORS[i % 2] ?? HOOP_COLORS[0])
  }
  root.add(hoops)
  owned.push(hoopGeometry, hoopMaterial, hoops)
  // B de la marque en balises, de part et d'autre de l'allée
  const beaconCount = mobile ? 4 : 6
  let beacons: Instanced | null = null
  let beaconScale = 1
  if (logo) {
    beacons = instanceNode(logo, beaconCount, (m) => parkMaterial(m, bloom, 2.2))
    beaconScale = fitScale(logo, 22)
    for (const mesh of beacons.meshes) root.add(mesh)
    owned.push(beacons)
  }
  return {
    root,
    count,
    scale,
    frames,
    sources,
    beacons,
    beaconCount,
    beaconScale,
    hoops,
    hoopCount,
    panelOffset: panelNode.position.clone().sub(frameNode.position),
    flipY: !parts.fromModel('Screen_Panel'),
    loaded: false,
    dispose: () => {
      sources.forEach((source) => {
        source.video?.dispose()
      })
      owned.forEach((item) => {
        item.dispose()
      })
    },
  }
}

/** Branche les images des écrans (cache préchargé, assets.ts) ; renvoie l'annulation. */
export function attachScreens(rig: AlleyRig, gl: WebGLRenderer): () => void {
  const cancels = rig.sources
    .filter((source) => source.media.kind === 'image')
    .map((source) =>
      attachTexture(gl, source.media.src, { flipY: rig.flipY }, (texture: Texture) => {
        source.material.map = texture
      }),
    )
  return () => {
    cancels.forEach((cancel) => {
      cancel()
    })
  }
}

/** Crée les vidéos des écrans (une fois, paresseusement) : VideoTexture muettes. */
export function loadVideos(rig: AlleyRig): void {
  if (rig.loaded) return
  rig.loaded = true
  for (const source of rig.sources) {
    if (source.media.kind !== 'video') continue
    source.video = createScreenVideo(source.media.src, rig.flipY)
    source.material.map = source.video.texture
  }
}

const matrix = new Matrix4()
const offset = new Matrix4()
const basis = new Matrix4()
const quaternion = new Quaternion()
const position = new Vector3()
const facing = new Vector3()
const up = new Vector3()
const right = new Vector3()
const scale = new Vector3()
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const white = new Color()

/** Pose de l'écran i à l'instant t : hélice autour de l'axe z, droit, incliné vers +Z. */
function screenMatrix(i: number, count: number, time: number, out: Matrix4) {
  const angle = (i / ALLEY.perTurn) * Math.PI * 2 + ALLEY.spin * time
  const z = ALLEY.from + ((ALLEY.to - ALLEY.from) * i) / Math.max(1, count - 1)
  position.set(Math.cos(angle) * ALLEY.radius, Math.sin(angle) * ALLEY.radius, z)
  facing
    .set(-Math.cos(angle), -Math.sin(angle), 0)
    .multiplyScalar(Math.cos(ALLEY.tilt))
    .addScaledVector(Z, Math.sin(ALLEY.tilt))
    .normalize()
  up.copy(Y).addScaledVector(facing, -facing.dot(Y)).normalize()
  right.crossVectors(up, facing).normalize()
  basis.makeBasis(right, up, facing)
  quaternion.setFromRotationMatrix(basis)
  return out.compose(position, quaternion, scale)
}

export type AlleyFrame = {
  visible: boolean
  time: number
  /** Pulsation du tempo (0 -> 1, douce) et accent du drop. */
  pulse: number
  accent: number
  lights: number
  /** Gain des néons (> 1 sous bloom). */
  hoopGain: number
}

export function updateAlley(rig: AlleyRig, f: AlleyFrame): void {
  rig.root.visible = f.visible
  for (const source of rig.sources) {
    if (f.visible) source.video?.play()
    else source.video?.pause()
  }
  if (!f.visible) return
  scale.setScalar(rig.scale)
  offset.makeTranslation(rig.panelOffset)
  for (let i = 0; i < rig.count; i++) {
    screenMatrix(i, rig.count, f.time, matrix)
    setInstance(rig.frames, i, matrix)
  }
  commitInstances(rig.frames, rig.count)
  const glow = (0.55 + 0.45 * f.lights) * (1 + 0.06 * f.pulse + 0.12 * f.accent)
  // Cerceaux : intensité qui respire avec le tempo, sans jamais s'éteindre
  rig.hoops.material.color.setScalar(f.hoopGain * (0.4 + 0.6 * f.lights) * (0.85 + 0.15 * f.pulse))
  for (const source of rig.sources) {
    source.screens.forEach((screen, k) => {
      screenMatrix(screen, rig.count, f.time, matrix).multiply(offset)
      setInstance(source.panels, k, matrix)
    })
    commitInstances(source.panels, source.screens.length)
    source.material.color.copy(white.setScalar(glow))
  }
  // Balises : B qui tournent lentement sur eux-mêmes, alternés gauche et droite
  const beacons = rig.beacons
  if (!beacons) return
  for (let i = 0; i < rig.beaconCount; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const z = -110 - i * 70
    quaternion.setFromAxisAngle(Y, f.time * 0.5 + i)
    position.set(side * 62, 8 * Math.sin(i * 1.7), z)
    scale.setScalar(rig.beaconScale)
    matrix.compose(position, quaternion, scale)
    setInstance(beacons, i, matrix)
  }
  commitInstances(beacons, rig.beaconCount)
}
