// Easter egg n° 2 « Le Sanctuaire » (docs/storyboards/easter-majestic.md, « Composants de D4 ») : point
// d'entrée de l'environnement. D3 monte <MajesticEnv mobile reducedMotion bloom />, appelle
// warmMajesticEnv avant le premier affichage, et peut lire majesticSky (soleil, ambiance, couleur et
// densité du brouillard) pour éclairer la montagne et le chœur comme le ciel.
export { MajesticEnv, type MajesticEnvProps } from './MajesticEnv'
export { warmMajesticEnv } from './warm'
export { majesticSky } from './shared'
