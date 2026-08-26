import { Papel } from '../../../generated/prisma/client';

/** O que a JwtStrategy anexa em `request.user` depois de validar o token. */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

/** Conteúdo do JWT. `sub` é convenção do padrão; o resto é conveniência. */
export interface PayloadJwt {
  sub: string;
  email: string;
  papel: Papel;
}

/**
 * Tipos de recurso que o EscopoGuard sabe verificar. Cresce junto com as
 * rotas: prontuário e sala entram nos blocos seguintes.
 */
export type TipoDeRecurso = 'atendimento' | 'prontuario' | 'paciente';
