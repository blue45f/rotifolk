import styles from './Card.module.css'

import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  variant?: 'plain' | 'soft' | 'glass' | 'gradient' | 'twilight'
  children: ReactNode
}

export function Card({
  padding = 'md',
  hoverable = false,
  variant = 'plain',
  className,
  children,
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    styles[`p_${padding}`],
    styles[`v_${variant}`],
    hoverable && styles.hoverable,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}

Card.Header = function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.header} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  )
}
Card.Body = function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.body} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  )
}
Card.Footer = function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${styles.footer} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  )
}

export default Card
