import { SetMetadata } from '@nestjs/common';

export const CHAVE_PUBLICO = 'rota_publica';

/**
 * Abre a rota para quem não está autenticado.
 *
 * É opt-out de propósito: o JwtAuthGuard é global, então **esquecer** este
 * decorator deixa a rota fechada. O inverso — guard aplicado rota a rota —
 * transforma um esquecimento em endpoint clínico aberto na internet.
 */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);
