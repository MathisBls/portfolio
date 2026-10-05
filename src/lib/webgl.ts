/** three >= r163 ne gère que WebGL 2. Sans WebGL 2, le <Canvas> n'est pas monté : le DOM seul fait le site. */
export function hasWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    // Libère tout de suite le contexte de test (le nombre de contextes actifs est limité)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
