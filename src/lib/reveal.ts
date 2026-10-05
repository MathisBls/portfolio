// Apparitions au scroll des éléments [data-reveal] : ajoute .is-in une fois visible (CSS dans global.css).
// Déclenché, pas scrubé : un IntersectionObserver suffit. Stagger via style="--reveal-i: n".
// L'état caché n'existe que sous html.has-reveal, posé ici : si le JS échoue, rien n'est caché.
// Les éléments montés après coup (MutationObserver) sont observés eux aussi.
// Les éléments [data-reveal] doivent avoir un className statique (React ne doit pas réécrire .is-in).
const SELECTOR = '[data-reveal]:not(.is-in)'

export function observeReveals(root: HTMLElement = document.body): () => void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  )

  const observeIn = (node: ParentNode) => {
    node.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
      io.observe(el)
    })
  }

  const mo = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.matches(SELECTOR)) io.observe(node)
        observeIn(node)
      })
    }
  })

  document.documentElement.classList.add('has-reveal')
  observeIn(root)
  mo.observe(root, { childList: true, subtree: true })

  return () => {
    mo.disconnect()
    io.disconnect()
  }
}
