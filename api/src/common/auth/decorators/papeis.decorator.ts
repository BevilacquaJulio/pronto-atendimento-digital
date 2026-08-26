import { SetMetadata } from '@nestjs/common';
import { Papel } from '../../../../generated/prisma/client';

export const CHAVE_PAPEIS = 'papeis_permitidos';

/**
 * Lista os papéis que podem chamar a rota.
 *
 * Ausência do decorator **não** significa "todos podem": o PapelGuard nega
 * quando não encontra a lista. Rota autenticada sem @Papeis é rota fechada,
 * que é o comportamento certo para um esquecimento.
 */
export const Papeis = (...papeis: Papel[]) => SetMetadata(CHAVE_PAPEIS, papeis);
