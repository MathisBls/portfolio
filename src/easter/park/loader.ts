// Easter egg v3, beat 8 : chargement des textures du parc (textures.ts, agent C), sans suspendre la
// scène. Décodage hors du fil principal (createImageBitmap, ImageBitmapLoader) et cache partagé : le
// préchargement (preloadPark, assets.ts) part pendant le chargement de la séquence, l'envoi au GPU
// (initTexture) se fait au montage du parc, pendant la précompilation où l'image est figée : plus rien à
// décoder ni à téléverser une fois dans le parc. Vidéos des écrans : VideoTexture muette, en boucle,
// créée paresseusement, lecture et pause pilotées par le parc.
import {
  ImageBitmapLoader,
  LinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  VideoTexture,
  type WebGLRenderer,
} from 'three'

export type TextureOptions = {
  /** Couleur (sRGB) ou donnée (linéaire). */
  srgb?: boolean
  /** Retournement vertical (UV three) ; false pour les UV glTF. */
  flipY?: boolean
  /** Sans mipmaps : ciel équirectangulaire (évite la couture de l'atan) ; aniso sinon. */
  mipmaps?: boolean
}

/** Textures décodées, partagées (préchargement puis montage du parc), par URL et réglages. */
const cache = new Map<string, Promise<Texture>>()
const decoded = new Set<Texture>()
let generation = 0

const cacheKey = (url: string, o: TextureOptions) =>
  `${url}|${String(o.flipY ?? true)}|${String(o.srgb ?? true)}|${String(o.mipmaps ?? true)}`

function decode(url: string, options: TextureOptions): Promise<Texture> {
  const flipY = options.flipY ?? true
  const finish = (texture: Texture) => {
    texture.colorSpace = options.srgb === false ? NoColorSpace : SRGBColorSpace
    if (options.mipmaps === false) {
      texture.generateMipmaps = false
      texture.minFilter = LinearFilter
    }
    texture.needsUpdate = true
    return texture
  }
  return new Promise<Texture>((resolve, reject) => {
    if (typeof createImageBitmap === 'function') {
      const loader = new ImageBitmapLoader()
      loader.setOptions({ imageOrientation: flipY ? 'flipY' : 'none', premultiplyAlpha: 'none' })
      loader.load(
        url,
        (bitmap) => {
          const texture = new Texture(bitmap)
          texture.flipY = false
          resolve(finish(texture))
        },
        undefined,
        reject,
      )
      return
    }
    new TextureLoader().load(
      url,
      (texture) => {
        texture.flipY = flipY
        resolve(finish(texture))
      },
      undefined,
      reject,
    )
  })
}

/**
 * Texture décodée (hors du fil principal), mise en cache : un second appel avec la même URL et les mêmes
 * réglages rend la même promesse. Le préchargement (assets.ts) l'appelle pendant le chargement de la
 * séquence ; l'envoi au GPU se fait au montage du parc (attachTexture).
 */
export function requestTexture(url: string, options: TextureOptions): Promise<Texture> {
  const key = cacheKey(url, options)
  const hit = cache.get(key)
  if (hit) return hit
  const round = generation
  const promise = decode(url, options).then((texture) => {
    if (round !== generation) texture.dispose()
    else decoded.add(texture)
    return texture
  })
  promise.catch(() => {
    cache.delete(key)
  })
  cache.set(key, promise)
  return promise
}

/** Branche une texture du cache (envoyée au GPU tout de suite) ; renvoie l'annulation. */
export function attachTexture(
  gl: WebGLRenderer,
  url: string,
  options: TextureOptions,
  apply: (texture: Texture) => void,
): () => void {
  let alive = true
  requestTexture(url, options).then(
    (texture) => {
      if (!alive) return
      if (options.mipmaps !== false) {
        texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      }
      gl.initTexture(texture)
      apply(texture)
    },
    () => undefined,
  )
  return () => {
    alive = false
  }
}

/** Libère toutes les textures du parc (GPU et images décodées) ; un prochain lancement recharge. */
export function releaseTextures(): void {
  generation++
  for (const texture of decoded) {
    texture.dispose()
    const image: unknown = texture.image
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close()
  }
  decoded.clear()
  cache.clear()
}

export type ScreenVideo = {
  texture: VideoTexture
  play: () => void
  pause: () => void
  dispose: () => void
}

/** Vidéo muette en boucle (jamais de son : piste absente et `muted`). */
export function createScreenVideo(url: string, flipY: boolean): ScreenVideo {
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
  video.setAttribute('aria-hidden', 'true')
  video.src = url
  const texture = new VideoTexture(video)
  texture.colorSpace = SRGBColorSpace
  texture.flipY = flipY
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  let playing = false
  return {
    texture,
    play: () => {
      if (playing) return
      playing = true
      video.play().catch(() => {
        playing = false
      })
    },
    pause: () => {
      if (!playing) return
      playing = false
      video.pause()
    },
    dispose: () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      texture.dispose()
    },
  }
}
