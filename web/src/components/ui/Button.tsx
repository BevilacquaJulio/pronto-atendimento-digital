import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'accent'
  | 'danger'
  | 'danger-ghost'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  /** Ícone à direita — use para avanço ("Próxima →"), não para o ícone principal. */
  trailingIcon?: ReactNode
  loading?: boolean
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    block ? 'button--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      // Enquanto carrega, o botão continua no DOM com o mesmo nome acessível;
      // aria-busy avisa o leitor de tela sem trocar o rótulo no meio da ação.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="button__loader" aria-hidden="true" /> : icon}
      {children ? <span>{children}</span> : null}
      {!loading && trailingIcon ? trailingIcon : null}
    </button>
  )
}
