import type { Risco, StatusAtendimento } from './atendimentos.types'

/**
 * Vocabulário do domínio em um lugar só.
 *
 * Vive fora do componente de badge por dois motivos: o Fast Refresh do Vite
 * exige que um arquivo de componente exporte apenas componentes, e — mais
 * importante — estes rótulos são o texto que a equipe lê na tela. Ter uma
 * fonte única evita que a fila chame de "Em atendimento" o que o histórico
 * chama de "Em andamento".
 */
export const statusLabels: Record<StatusAtendimento, string> = {
  AGUARDANDO: 'Aguardando',
  EM_ANDAMENTO: 'Em atendimento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

/**
 * Rótulos do Protocolo de Manchester. Escritos por extenso de propósito: o
 * badge nunca comunica gravidade só pela cor, porque parte da equipe não
 * distingue vermelho de verde e porque impressão em preto e branco continua
 * comum em serviço de saúde.
 */
export const riskLabels: Record<Risco, string> = {
  VERMELHO: 'Emergência',
  LARANJA: 'Muito urgente',
  AMARELO: 'Urgente',
  VERDE: 'Pouco urgente',
  AZUL: 'Não urgente',
}

/** Nome da cor, usado no texto de apoio ("classificação laranja"). */
export const riskColorNames: Record<Risco, string> = {
  VERMELHO: 'vermelho',
  LARANJA: 'laranja',
  AMARELO: 'amarelo',
  VERDE: 'verde',
  AZUL: 'azul',
}
