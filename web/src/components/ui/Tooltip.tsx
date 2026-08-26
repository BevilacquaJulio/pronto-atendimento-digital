import { useId, useState, type ReactNode } from 'react'

type TooltipProps = {
  label: string
  children: ReactNode
}

/**
 * Dica curta em hover e foco.
 *
 * Só serve para *complementar* — nunca para carregar informação que exista
 * apenas ali. Em tela sensível ao toque não há hover, e o conteúdo ficaria
 * inacessível para quem usa o PAD no tablet à beira do leito.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()

  return (
    <span
      className="tooltip-wrapper"
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      onFocusCapture={() => setVisible(true)}
      onBlurCapture={() => setVisible(false)}
    >
      <span aria-describedby={visible ? tooltipId : undefined}>{children}</span>
      {visible ? (
        <span className="tooltip" id={tooltipId} role="tooltip">
          {label}
        </span>
      ) : null}
    </span>
  )
}
