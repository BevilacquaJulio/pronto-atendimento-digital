import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { label, error, hint, icon, action, className = '', id, ...props },
    ref,
  ) {
    const inputId = id ?? props.name
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={inputId}>{label}</label>
        <div className={`form-field__control ${error ? 'is-invalid' : ''}`}>
          {icon ? (
            <span className="form-field__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...props}
          />
          {action ? <span className="form-field__action">{action}</span> : null}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="form-field__error">
            <WarningCircleIcon size={13} weight="fill" aria-hidden="true" />
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="form-field__hint">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
  hint?: string
}

/**
 * Campo longo (queixa, anamnese, conduta, prescrição).
 *
 * Separado do `FormField` porque `<textarea>` e `<input>` não compartilham
 * assinatura de props — juntar os dois num componente só exigiria união de
 * tipos e um `as any` na ref. Dois componentes pequenos custam menos.
 */
export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField(
  { label, error, hint, className = '', id, rows = 4, ...props },
  ref,
) {
  const fieldId = id ?? props.name
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined

  return (
    <div className={`textarea-field ${className}`}>
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <small id={`${fieldId}-error`}>{error}</small>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
