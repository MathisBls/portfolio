import { type RefObject, useEffect, useState } from 'react'

/**
 * true tant que le focus clavier est dans l'élément. Écouteurs natifs : un <header> n'est pas
 * interactif pour jsx-a11y, on ne peut pas y poser onFocus/onBlur.
 */
export function useFocusWithin(ref: RefObject<HTMLElement | null>): boolean {
  const [focusWithin, setFocusWithin] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onFocusIn = () => {
      setFocusWithin(true)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && element.contains(event.relatedTarget))) {
        setFocusWithin(false)
      }
    }
    element.addEventListener('focusin', onFocusIn)
    element.addEventListener('focusout', onFocusOut)
    return () => {
      element.removeEventListener('focusin', onFocusIn)
      element.removeEventListener('focusout', onFocusOut)
    }
  }, [ref])

  return focusWithin
}
