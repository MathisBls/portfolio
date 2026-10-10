// Objets 3D sur mobile (demande de Mathis du 2026-10-10, « aucun gel à la première image d'un chapitre ») :
// les textures des objets projets sont envoyées au GPU dès leur montage (un écran avant la section), mais
// une par image et non toutes dans la même tâche. Mesuré le 2026-10-10 (mobile émulé, CPU ×4) : l'envoi
// groupé des captures d'écran au montage (drei useTexture) bloquait le thread principal 413 ms.
import type { Texture, WebGLRenderer } from 'three'

const queue: { gl: WebGLRenderer; texture: Texture }[] = []
let raf = 0

function step() {
  raf = 0
  const next = queue.shift()
  if (next) next.gl.initTexture(next.texture)
  if (queue.length > 0) raf = requestAnimationFrame(step)
}

/** Met les textures en file (une envoyée par image). Renvoie de quoi retirer celles pas encore envoyées. */
export function queueUpload(gl: WebGLRenderer, textures: readonly (Texture | null)[]): () => void {
  textures.forEach((texture) => {
    if (texture) queue.push({ gl, texture })
  })
  if (!raf && queue.length > 0) raf = requestAnimationFrame(step)
  return () => {
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i]
      if (item && textures.includes(item.texture)) queue.splice(i, 1)
    }
  }
}
