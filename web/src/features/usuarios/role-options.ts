import type { SelectOption } from '../../components/ui/Select'
import type { Papel } from '../auth/auth.types'

/** Papéis com o efeito prático de cada um, e não só o nome. */
export const roleOptions: Array<SelectOption<Papel>> = [
  {
    value: 'ENFERMEIRO',
    label: 'Enfermagem',
    description: 'Cadastro, triagem e encaminhamento',
  },
  {
    value: 'MEDICO',
    label: 'Medicina',
    description: 'Prontuário, prescrição e finalização',
  },
  {
    value: 'ADMIN',
    label: 'Administração',
    description: 'Usuários e acessos — sem dado clínico',
  },
]

export const roleFilterOptions: Array<SelectOption<Papel | ''>> = [
  { value: '', label: 'Todos os perfis' },
  { value: 'ADMIN', label: 'Administradores' },
  { value: 'ENFERMEIRO', label: 'Enfermagem' },
  { value: 'MEDICO', label: 'Medicina' },
]

/**
 * O que cada papel pode e não pode fazer, na linguagem do administrador.
 *
 * Serve de pré-visualização antes de salvar. O administrador do PAD não vê
 * dado clínico, então ele decide permissão sem enxergar a consequência — este
 * resumo é o que fecha essa lacuna. A regra real vive no backend
 * (`docs/matriz-de-acesso.md`); aqui é espelho, nunca fonte.
 */
export const rolePermissions: Record<
  Papel,
  Array<{ text: string; allowed: boolean }>
> = {
  ENFERMEIRO: [
    { text: 'Cadastrar pacientes e incluir na fila', allowed: true },
    { text: 'Registrar triagem e sinais vitais', allowed: true },
    { text: 'Encaminhar para a fila médica', allowed: true },
    { text: 'Ver prontuário médico', allowed: false },
  ],
  MEDICO: [
    { text: 'Assumir encaminhamentos da enfermagem', allowed: true },
    { text: 'Registrar prontuário e prescrição', allowed: true },
    { text: 'Finalizar atendimentos', allowed: true },
    { text: 'Gerenciar usuários', allowed: false },
  ],
  ADMIN: [
    { text: 'Criar, editar e desativar usuários', allowed: true },
    { text: 'Alterar o perfil de outros profissionais', allowed: true },
    { text: 'Ver a fila de atendimentos', allowed: false },
    { text: 'Ver qualquer dado clínico de paciente', allowed: false },
  ],
}
