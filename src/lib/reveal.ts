// Apparitions au scroll des éléments [data-reveal] : ajoute .is-in une fois visible (CSS dans global.css).
// Déclenché, pas scrubé : un IntersectionObserver suffit. Stagger via style="--reveal-i: n".
// L'état caché n'existe que sous html.has-reveal, posé ici : si le JS échoue, rien n'est caché.
// Les éléments [data-reveal] doivent avoir un className statique (React ne doit pas réécrire .is-in).
export function observeReveals(root: ParentNode = document): () => void {
  const elements = root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  )
  document.documentElement.classList.add('has-reveal')
  elements.forEach((el) => {
    observer.observe(el)
  })
  return () => {
    observer.disconnect()
  }
}
