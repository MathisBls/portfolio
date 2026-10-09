// Menu déroulant aux couleurs du site (remplace la liste native, blanche sous Windows), motif
// « select-only combobox » du WAI-ARIA APG : un <button role="combobox"> garde le focus, la liste
// (role="listbox") est désignée par aria-controls et l'option active par aria-activedescendant.
// Clavier (logique pure et testée : lib/listbox.ts) : Entrée, Espace, Alt+Bas ouvrent ; Haut, Bas,
// Début, Fin, Page haut/bas naviguent ; Entrée choisit ; Échap ferme ; Tab choisit l'option active et
// sort ; une lettre saute à l'option qui commence par elle. Clic sur une option : choisie, le focus reste
// sur le bouton ; clic à l'extérieur : fermeture, le focus revient au bouton s'il n'est allé nulle part.
// La valeur part dans un <input type="hidden" name>. Rendu serveur et sans JS : ContactForm garde le
// <select> natif, ce composant ne s'affiche qu'après l'hydratation.
// La liste s'ouvre sous le champ, ou au-dessus s'il n'y a pas la place ; elle tient en entier (21rem),
// défilement interne sans barre visible sur un écran trop bas. Ouverture et fermeture : léger fondu et
// glissement (motion), coupés en reduced-motion. Style sans « look IA » (skill design-sans-ia).
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { type Move, keyAction, moveIndex, typeaheadIndex } from '../lib/listbox'
import { useReducedMotion } from '../lib/useReducedMotion'
import styles from './SelectMenu.module.css'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
/** Délai (ms) après lequel une nouvelle lettre commence une nouvelle recherche. */
const TYPEAHEAD_MS = 600
/** Hauteur maximale de la liste (21rem, SelectMenu.module.css), d'une option (44 px + filet) et marge au
 * bord de l'écran, en px. */
const LIST_MAX = 336
const OPTION_H = 45
const EDGE = 16

export type SelectOption = { value: string; label: string }

type Props = {
  /** id du bouton : le formulaire y envoie le focus quand le champ est en erreur. */
  id: string
  /** id du libellé visible (aria-labelledby du bouton et de la liste). */
  labelId: string
  name: string
  options: readonly SelectOption[]
  value: string
  placeholder: string
  onChange: (value: string) => void
  invalid: boolean
  describedBy: string
  /** Classe du champ (même apparence que les autres champs du formulaire). */
  className?: string
}

type Placement = 'below' | 'above'

/** Au-dessus seulement si la liste ne tient pas en dessous et qu'il y a plus de place au-dessus. */
function placementFor(button: HTMLElement, count: number): Placement {
  const { top, bottom } = button.getBoundingClientRect()
  const needed = Math.min(LIST_MAX, count * OPTION_H + 2) + EDGE
  const below = window.innerHeight - bottom
  return below < needed && top > below ? 'above' : 'below'
}

/** Ferme la liste au clic à l'extérieur du champ (bouton et liste). `setOpen` : setter d'état (stable). */
function useOutsidePress(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  button: RefObject<HTMLElement | null>,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      setOpen(false)
      // Clic dans le vide : le focus serait perdu (body), il revient au bouton
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) button.current?.focus({ preventScroll: true })
      })
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, root, button, setOpen])
}

export function SelectMenu({
  id,
  labelId,
  name,
  options,
  value,
  placeholder,
  onChange,
  invalid,
  describedBy,
  className,
}: Props) {
  const reduced = useReducedMotion()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [placement, setPlacement] = useState<Placement>('below')
  const typed = useRef({ buffer: '', at: 0 })

  const selected = options.findIndex((option) => option.value === value)
  const optionId = (index: number) => `${listId}-${String(index)}`

  const show = (index: number) => {
    const button = buttonRef.current
    if (button) setPlacement(placementFor(button, options.length))
    setActive(index)
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (option && option.value !== value) onChange(option.value)
    setOpen(false)
  }

  useOutsidePress(open, rootRef, buttonRef, setOpen)

  // L'option active reste visible dans la liste (défilement interne seulement, jamais la page)
  useEffect(() => {
    const list = listRef.current
    if (!open || !list || active < 0) return
    const option = list.children[active]
    if (!(option instanceof HTMLElement)) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
    }
  }, [open, active])

  // Clic sur une option : mousedown annulé (le focus reste sur le bouton), choix au clic. Écouteurs
  // natifs : la liste n'a pas le focus clavier (aria-activedescendant), jsx-a11y n'y accepte pas onClick.
  useEffect(() => {
    const list = listRef.current
    if (!open || !list) return
    const indexOf = (target: EventTarget | null) => {
      const option = target instanceof Element ? target.closest('[role="option"]') : null
      return option ? Array.prototype.indexOf.call(list.children, option) : -1
    }
    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      const option = options[indexOf(event.target)]
      if (!option) return
      if (option.value !== value) onChange(option.value)
      setOpen(false)
      buttonRef.current?.focus({ preventScroll: true })
    }
    const onPointerMove = (event: PointerEvent) => {
      const index = indexOf(event.target)
      if (index >= 0) setActive(index)
    }
    list.addEventListener('mousedown', onMouseDown)
    list.addEventListener('click', onClick)
    list.addEventListener('pointermove', onPointerMove)
    return () => {
      list.removeEventListener('mousedown', onMouseDown)
      list.removeEventListener('click', onClick)
      list.removeEventListener('pointermove', onPointerMove)
    }
  }, [open, options, value, onChange])

  const search = (char: string, from: number): number => {
    const now = performance.now()
    const state = typed.current
    state.buffer = now - state.at > TYPEAHEAD_MS ? char : state.buffer + char
    state.at = now
    return typeaheadIndex(
      options.map((option) => option.label),
      state.buffer,
      from,
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const typing =
      typed.current.buffer !== '' && performance.now() - typed.current.at <= TYPEAHEAD_MS
    const action = keyAction(event, open, typing)
    if (!action) return
    if (action.type !== 'selectAndLeave') event.preventDefault()
    const count = options.length
    switch (action.type) {
      case 'open':
        show(action.to === 'first' ? 0 : action.to === 'last' ? count - 1 : Math.max(selected, 0))
        break
      case 'move':
        setActive((current) => moveIndex(action.to satisfies Move, current, count))
        break
      case 'select':
      case 'selectAndLeave':
        choose(active)
        break
      case 'close':
        close()
        break
      case 'type': {
        const from = open ? active : selected
        const found = search(action.char, from)
        if (open) {
          if (found >= 0) setActive(found)
        } else {
          show(found >= 0 ? found : Math.max(selected, 0))
        }
        break
      }
    }
  }

  const transition = reduced ? { duration: 0 } : { duration: 0.22, ease: EASE }
  const offset = placement === 'above' ? 6 : -6
  const current = options[selected]

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        className={`${className} ${styles.button}`}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          // Espace active un bouton au relâchement : déjà traitée au keydown
          if (event.key === ' ') event.preventDefault()
        }}
        onClick={() => {
          if (open) close()
          else show(Math.max(selected, 0))
        }}
        onBlur={(event) => {
          if (!(
            event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)
          )) {
            close()
          }
        }}
      >
        <span className={styles.value} data-placeholder={current ? undefined : ''}>
          {current ? current.label : placeholder}
        </span>
        <svg
          className={styles.chevron}
          data-open={open ? '' : undefined}
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <input type="hidden" name={name} value={value} />

      <AnimatePresence>
        {open && (
          <m.div
            key="list"
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            className={styles.list}
            data-placement={placement}
            data-lenis-prevent
            initial={{ opacity: 0, y: reduced ? 0 : offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : offset }}
            transition={transition}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={index === selected}
                className={styles.option}
                data-active={index === active ? '' : undefined}
              >
                <span>{option.label}</span>
                <svg
                  className={styles.check}
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
