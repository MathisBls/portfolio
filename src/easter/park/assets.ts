// Easter egg v3, beat 8 : textures du parc (chemins : textures.ts, agent C) et leur préchargement. Une
// seule table pour le préchargement et les objets : mêmes URL, mêmes réglages, donc le même cache
// (loader.ts). preloadPark() part à l'évaluation de Park.tsx (chunk lazy de l'easter egg, stage
// 'loading') ; D1 peut aussi l'appeler. Les vidéos des écrans restent paresseuses (alleyRig.ts).
import { MOBILE_QUERY, matches } from '../../lib/media'
import { type TextureOptions, releaseTextures, requestTexture } from './loader'
import { PLANETS, SCREENS, SKY } from './textures'

type Source = { url: string; options: TextureOptions }

const map = (mobile: boolean, entry: { map: string; mapMobile: string }) =>
  mobile ? entry.mapMobile : entry.map

/** Textures des planètes et du ciel, selon le palier (1K et ciel 2K sur mobile). */
export function parkTextures(mobile: boolean) {
  return {
    sky: { url: mobile ? SKY.mobile : SKY.full, options: { mipmaps: false } },
    giant: { url: map(mobile, PLANETS.jupiter), options: {} },
    ring: {
      url: mobile ? PLANETS.saturn.ringMobile : PLANETS.saturn.ring,
      options: { flipY: false },
    },
    moon: { url: map(mobile, PLANETS.moon), options: {} },
    night: { url: map(mobile, PLANETS.earthNight), options: {} },
    cards: { url: map(mobile, PLANETS.haumea), options: {} },
  } satisfies Record<string, Source>
}

/** Images des écrans (UV glTF de Screen_Panel : sans flipY ; écran de remplacement : avec). */
export function screenImages(flipY: boolean): Source[] {
  return SCREENS.filter((m) => m.kind === 'image').map((m) => ({ url: m.src, options: { flipY } }))
}

/** Lance le décodage de toutes les images du parc (idempotent). */
export function preloadPark(mobile = matches(MOBILE_QUERY)): void {
  for (const source of Object.values(parkTextures(mobile))) {
    void requestTexture(source.url, source.options).catch(() => undefined)
  }
  for (const source of screenImages(false)) {
    void requestTexture(source.url, source.options).catch(() => undefined)
  }
}

/** Libère les textures du parc (démontage de la séquence). */
export function releasePark(): void {
  releaseTextures()
}
