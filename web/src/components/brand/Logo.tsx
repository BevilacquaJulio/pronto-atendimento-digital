type LogoProps = {
  /** `full` mostra símbolo e nome; `mark` mostra apenas o símbolo. */
  variant?: 'full' | 'mark'
  /** Lado do símbolo em pixels. O texto acompanha por escala tipográfica. */
  size?: number
  className?: string
  /**
   * Rótulo acessível. Sem ele a marca é tratada como decorativa — usado
   * quando o nome do produto já aparece em texto na mesma tela e um segundo
   * anúncio faria o leitor de tela repetir a mesma informação.
   */
  label?: string
}

/**
 * Marca do PAD.
 *
 * SVG inline em vez de <img src="logo.png"> por três motivos concretos:
 *
 *   1. O traço usa `currentColor`, então a marca fica branca no menu escuro e
 *      azul no cartão claro sem nenhum `filter: brightness(0) invert(1)` e sem
 *      um segundo arquivo só para a versão invertida.
 *   2. Não há requisição extra nem troca de layout enquanto a imagem carrega.
 *   3. Permanece nítida em qualquer densidade de tela.
 *
 * A geometria é a mesma que gera favicon e ícones da PWA, para que a marca não
 * divirja entre a aplicação e a tela inicial do dispositivo.
 */
export function Logo({
  variant = 'full',
  size = 34,
  className = '',
  label,
}: LogoProps) {
  const decorativa = !label

  return (
    <span
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      role={decorativa ? undefined : 'img'}
      aria-label={decorativa ? undefined : label}
      aria-hidden={decorativa ? true : undefined}
    >
      <svg
        className="brand-logo__symbol"
        viewBox="0 0 40 40"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="2.6"
          y="2.6"
          width="34.8"
          height="34.8"
          rx="11.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
        />
        <path
          d="M8.0 20.6 H12.6 L15.7 13.2 L20.0 26.7 L23.1 20.6 H26.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* O ponto de acento é a única cor fixa: ele marca o fim da espera e
            precisa contrastar tanto no menu escuro quanto no cartão claro. */}
        <circle cx="30.3" cy="20.6" r="2.9" fill="var(--teal-500, #00aea9)" />
      </svg>

      {variant === 'full' ? (
        <span className="brand-logo__text">
          <strong className="brand-logo__name">PAD</strong>
          <span className="brand-logo__tagline">Pronto Atendimento Digital</span>
        </span>
      ) : null}
    </span>
  )
}
