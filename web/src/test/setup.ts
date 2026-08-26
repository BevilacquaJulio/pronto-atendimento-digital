import '@testing-library/jest-dom/vitest'

/**
 * Preenchimento de `<dialog>` para o jsdom.
 *
 * O jsdom ainda não implementa `showModal()`/`close()` (o elemento existe, os
 * métodos não). Em navegador real isso é suporte universal desde março de 2022
 * — Chrome 37+, Firefox 98+, Safari 15.4+ —, então o `Modal` usa o elemento
 * nativo de propósito, por causa da armadilha de foco, do top layer e do
 * `::backdrop` que vêm de graça.
 *
 * A alternativa seria ramificar o componente para o ambiente de teste, o que
 * significaria testar um caminho de código que nunca roda em produção. Melhor
 * o teste se ajustar ao navegador do que o contrário.
 *
 * Não reproduz armadilha de foco nem inertização — comportamento de navegador
 * que o jsdom não tem como simular. Isso precisa de teste em navegador real
 * (Playwright), não de unidade.
 */
/**
 * `scrollIntoView` também não existe no jsdom. O `Select` usa esse método para
 * manter a opção ativa visível durante a navegação por teclado — comportamento
 * real, sem efeito colateral em teste. Um no-op basta.
 */
if (typeof Element !== 'undefined') {
  // O tipo de `Element` já declara `scrollIntoView`, então o TypeScript
  // estreitaria a checagem para `never`. O alias parcial diz a verdade sobre
  // o jsdom: em tempo de execução o método pode não existir.
  const elementPrototype = Element.prototype as Partial<Element>

  if (!elementPrototype.scrollIntoView) {
    elementPrototype.scrollIntoView = function scrollIntoView() {}
  }
}

if (typeof HTMLDialogElement !== 'undefined') {
  const prototype = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void
    show?: () => void
    close?: (returnValue?: string) => void
  }

  if (!prototype.showModal) {
    prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true
      this.setAttribute('open', '')
    }
  }

  if (!prototype.show) {
    prototype.show = function show(this: HTMLDialogElement) {
      this.open = true
      this.setAttribute('open', '')
    }
  }

  if (!prototype.close) {
    prototype.close = function close(
      this: HTMLDialogElement,
      returnValue?: string,
    ) {
      this.open = false
      this.removeAttribute('open')
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}
