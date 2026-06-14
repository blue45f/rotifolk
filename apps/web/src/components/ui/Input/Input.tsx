import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

import styles from './Input.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, id, className, ...props },
  ref
) {
  const reactId = useId()
  const inputId = id ?? `input-${reactId}`

  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''} ${className ?? ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.wrap}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input ref={ref} id={inputId} className={styles.input} aria-invalid={!!error} {...props} />
        {rightSlot && <span className={styles.rightSlot}>{rightSlot}</span>}
      </div>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
