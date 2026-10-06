import { type ComponentPropsWithoutRef, type MouseEvent, useRef } from 'react'
import { onAnchorClick } from '../lib/anchors'
import { useMagnetic } from '../lib/useMagnetic'
import styles from './Button.module.css'

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'href'> & {
  href: string
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
}

/**
 * Lien-bouton pill. Les liens `#ancre` passent par le scroll doux (Lenis) puis déplacent le focus.
 * Le primaire (CTA de la nav compris) est magnétique à la souris ; le ghost reste immobile.
 */
export function Button({
  href,
  variant = 'primary',
  size = 'md',
  onClick,
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  useMagnetic(ref, variant === 'primary')

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    onAnchorClick(event)
  }
  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      onClick={handleClick}
      className={styles.button}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </a>
  )
}
