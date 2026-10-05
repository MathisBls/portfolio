import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { onAnchorClick } from '../lib/anchors'
import styles from './Button.module.css'

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'href'> & {
  href: string
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
}

/** Lien-bouton pill. Les liens `#ancre` passent par le scroll doux (Lenis) puis déplacent le focus. */
export function Button({
  href,
  variant = 'primary',
  size = 'md',
  onClick,
  children,
  ...rest
}: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    onAnchorClick(event)
  }
  return (
    <a
      {...rest}
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
