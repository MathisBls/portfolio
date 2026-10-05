/** three >= r163 ne gère que WebGL 2. Sans WebGL 2, le <Canvas> n'est pas monté : le DOM seul fait le site. */
export function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}
