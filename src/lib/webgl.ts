/**
 * three >= r163 ne gère que WebGL 2. Sans WebGL 2, le <Canvas> n'est pas monté : le DOM seul fait le
 * site. Test sans créer de contexte (un contexte de test coûtait ~150 ms, review Phase 1) ; si la
 * création échoue quand même (GPU blacklisté), le Canvas n'affiche rien et le poster SVG reste.
 */
export function hasWebGL2(): boolean {
  return typeof window !== 'undefined' && 'WebGL2RenderingContext' in window
}
