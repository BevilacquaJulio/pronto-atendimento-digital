import { HttpException, HttpStatus } from '@nestjs/common';

// Exceções de domínio. O service fala em termos de negócio ("perdi a corrida",
// "essa transição não existe") e o mapeamento para HTTP acontece aqui, num
// lugar só — em vez de espalhar `throw new ForbiddenException` pelos services.
//
// O corpo é sempre { codigo, mensagem }: `codigo` é estável e serve para o
// frontend decidir o que fazer; `mensagem` é para humano e pode mudar.

export class ErroDeDominio extends HttpException {
  constructor(codigo: string, mensagem: string, status: HttpStatus) {
    super({ codigo, mensagem }, status);
  }
}

/** Alguém chegou primeiro: o recurso não está mais no estado esperado. */
export class ConflitoDeEstado extends ErroDeDominio {
  constructor(mensagem: string, codigo = 'CONFLITO_DE_ESTADO') {
    super(codigo, mensagem, HttpStatus.CONFLICT);
  }
}

/** A transição pedida não existe na máquina de estados. */
export class TransicaoInvalida extends ErroDeDominio {
  constructor(mensagem: string) {
    super('TRANSICAO_INVALIDA', mensagem, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/**
 * Autenticado, mas não pode. Usado também quando o recurso existe e não é
 * dele: responder 404 aqui vazaria a existência do atendimento alheio, e
 * responder 401 sugeriria que basta reautenticar.
 */
export class AcessoNegado extends ErroDeDominio {
  constructor(mensagem = 'Acesso negado para este recurso') {
    super('ACESSO_NEGADO', mensagem, HttpStatus.FORBIDDEN);
  }
}

/** Credencial inválida no login. Mensagem propositalmente genérica. */
export class CredenciaisInvalidas extends ErroDeDominio {
  constructor() {
    super(
      'CREDENCIAIS_INVALIDAS',
      'E-mail ou senha inválidos',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RecursoNaoEncontrado extends ErroDeDominio {
  constructor(recurso: string) {
    super('NAO_ENCONTRADO', `${recurso} não encontrado`, HttpStatus.NOT_FOUND);
  }
}
