// Dados de demonstração do PAD — 1 ADMIN, 2 ENFERMEIRO, 2 MEDICO, 10 pacientes,
// 15 atendimentos cobrindo os 4 status e três janelas de tempo (hoje / ontem /
// semana passada), pra fila, autorização e concorrência terem o que exercitar
// assim que o seed roda.
//
// Roda à mão com `npx prisma db seed` (local e demo). O serviço `migrate` do
// Compose de produção só aplica schema, sem seed. Os dois caminhos precisam
// ser seguros de repetir: por isso todo upsert usa `update: {}` — cria o que
// falta e nunca sobrescreve o que já existe. Sem isso, repetir o seed depois
// de alguém ter mexido nos dados (ex.: iniciado um dos atendimentos
// AGUARDANDO durante um teste manual) apagaria esse progresso.
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  PrismaClient,
  Papel,
  StatusAtendimento,
  Risco,
} from '../generated/prisma/client';

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Seed de demonstração bloqueado: não pode executar com NODE_ENV=production.',
  );
}

const ambienteSeedSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'obrigatória'),
  SEED_DEMO_PASSWORD: z
    .string()
    .min(12, 'precisa de pelo menos 12 caracteres')
    .refine(
      (senha) => Buffer.byteLength(senha, 'utf8') <= 72,
      'não pode exceder 72 bytes UTF-8 por usar bcrypt',
    ),
});

const ambienteSeed = ambienteSeedSchema.safeParse(process.env);
if (!ambienteSeed.success) {
  const problemas = ambienteSeed.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Ambiente inválido para o seed de demonstração.\n${problemas}`);
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(ambienteSeed.data.DATABASE_URL),
});

// A senha existe apenas no ambiente local ignorado pelo Git. O repositório
// público nunca contém nem imprime a credencial usada pelos usuários demo.
const SENHA_TESTE = ambienteSeed.data.SEED_DEMO_PASSWORD;
const CUSTO_HASH = 10;

const agora = new Date();
function horasAtras(horas: number): Date {
  return new Date(agora.getTime() - horas * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Usuários — email é a chave natural, então o upsert usa ela. O id que cada
// um recebe na criação fica disponível pro resto do script via o retorno
// do upsert (nunca é hardcoded, então não corre risco de divergir).
// ---------------------------------------------------------------------------

interface UsuarioSeed {
  chave: 'admin' | 'ana' | 'bruno' | 'carla' | 'diego';
  nome: string;
  email: string;
  papel: Papel;
}

const USUARIOS: UsuarioSeed[] = [
  {
    chave: 'admin',
    nome: 'Administradora Geral',
    email: 'admin@pad.local',
    papel: Papel.ADMIN,
  },
  {
    chave: 'ana',
    nome: 'Ana Ferreira',
    email: 'ana.ferreira@pad.local',
    papel: Papel.ENFERMEIRO,
  },
  {
    chave: 'bruno',
    nome: 'Bruno Castro',
    email: 'bruno.castro@pad.local',
    papel: Papel.ENFERMEIRO,
  },
  {
    chave: 'carla',
    nome: 'Carla Nogueira',
    email: 'carla.nogueira@pad.local',
    papel: Papel.MEDICO,
  },
  {
    chave: 'diego',
    nome: 'Diego Ramos',
    email: 'diego.ramos@pad.local',
    papel: Papel.MEDICO,
  },
];

async function semearUsuarios(): Promise<
  Record<UsuarioSeed['chave'], { id: string }>
> {
  const senhaHash = await bcrypt.hash(SENHA_TESTE, CUSTO_HASH);
  const resultado = {} as Record<UsuarioSeed['chave'], { id: string }>;

  for (const usuario of USUARIOS) {
    const criado = await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: {
        nome: usuario.nome,
        email: usuario.email,
        senhaHash,
        papel: usuario.papel,
      },
      select: { id: true },
    });
    resultado[usuario.chave] = criado;
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Pacientes — cpf é a chave natural. Nascimento varia pra não ter uma fila
// de pacientes todos com a mesma idade.
// ---------------------------------------------------------------------------

interface PacienteSeed {
  nome: string;
  cpf: string;
  contato: string;
  nascimento: string;
}

const PACIENTES: PacienteSeed[] = [
  {
    nome: 'Maria Aparecida Souza',
    cpf: '10000000001',
    contato: '(11) 90001-0001',
    nascimento: '1958-03-12',
  },
  {
    nome: 'José Carlos Lima',
    cpf: '10000000002',
    contato: '(11) 90001-0002',
    nascimento: '1972-07-25',
  },
  {
    nome: 'Francisca Oliveira Santos',
    cpf: '10000000003',
    contato: '(11) 90001-0003',
    nascimento: '1990-01-30',
  },
  {
    nome: 'Antônio Pereira Costa',
    cpf: '10000000004',
    contato: '(11) 90001-0004',
    nascimento: '1945-11-02',
  },
  {
    nome: 'Juliana Rodrigues Alves',
    cpf: '10000000005',
    contato: '(11) 90001-0005',
    nascimento: '1988-05-19',
  },
  {
    nome: 'Marcos Vinícius Ferreira',
    cpf: '10000000006',
    contato: '(11) 90001-0006',
    nascimento: '2001-09-08',
  },
  {
    nome: 'Sandra Regina Martins',
    cpf: '10000000007',
    contato: '(11) 90001-0007',
    nascimento: '1965-12-24',
  },
  {
    nome: 'Paulo Henrique Barbosa',
    cpf: '10000000008',
    contato: '(11) 90001-0008',
    nascimento: '1979-04-14',
  },
  {
    nome: 'Luciana Gomes Ribeiro',
    cpf: '10000000009',
    contato: '(11) 90001-0009',
    nascimento: '1995-02-27',
  },
  {
    nome: 'Roberto Carlos Nascimento',
    cpf: '10000000010',
    contato: '(11) 90001-0010',
    nascimento: '1953-08-06',
  },
];

async function semearPacientes(): Promise<{ id: string }[]> {
  const criados: { id: string }[] = [];
  for (const paciente of PACIENTES) {
    const criado = await prisma.paciente.upsert({
      where: { cpf: paciente.cpf },
      update: {},
      create: {
        nome: paciente.nome,
        cpf: paciente.cpf,
        contato: paciente.contato,
        nascimento: new Date(paciente.nascimento),
      },
      select: { id: true },
    });
    criados.push(criado);
  }
  return criados;
}

// ---------------------------------------------------------------------------
// Triagem padrão por risco — só pra não repetir sinais vitais em cada linha
// da tabela de atendimentos abaixo.
// ---------------------------------------------------------------------------

const TRIAGEM_POR_RISCO: Record<
  Risco,
  { queixa: string; pa: string; fc: number; temperatura: number; satO2: number }
> = {
  [Risco.VERMELHO]: {
    queixa: 'Dor torácica intensa com irradiação para o braço esquerdo',
    pa: '150/95',
    fc: 110,
    temperatura: 36.8,
    satO2: 94,
  },
  [Risco.LARANJA]: {
    queixa: 'Falta de ar progressiva há dois dias',
    pa: '140/90',
    fc: 98,
    temperatura: 37.2,
    satO2: 95,
  },
  [Risco.AMARELO]: {
    queixa: 'Febre alta e mal-estar geral há 24 horas',
    pa: '128/84',
    fc: 92,
    temperatura: 38.9,
    satO2: 97,
  },
  [Risco.VERDE]: {
    queixa: 'Dor de garganta e tosse seca leve',
    pa: '110/70',
    fc: 78,
    temperatura: 37.0,
    satO2: 98,
  },
  [Risco.AZUL]: {
    queixa: 'Check-up de rotina, sem queixas agudas',
    pa: '118/76',
    fc: 70,
    temperatura: 36.4,
    satO2: 99,
  },
};

// Conteúdo de prontuário por atendimento finalizado — texto curto, mas
// específico o bastante pra não parecer lorem ipsum na demonstração.
// `satisfies` em vez de anotação: valida o formato de cada entrada e ainda
// deixa as chaves como literais, então um typo em AtendimentoSeed.prontuario
// vira erro de compilação em vez de `undefined.anamnese` em runtime.
const PRONTUARIOS = {
  finalizado1: {
    anamnese:
      'Paciente refere febre de 38,9°C iniciada há 24h, associada a mialgia e cefaleia. Nega dispneia. Ausculta pulmonar sem alterações.',
    conduta:
      'Quadro compatível com síndrome febril viral. Orientada hidratação, repouso e retorno se piora ou febre persistente por mais de 72h.',
    prescricao:
      'Dipirona 1g VO até 6/6h se febre ou dor. Paracetamol como alternativa.',
  },
  finalizado2: {
    anamnese:
      'Paciente com tosse seca e odinofagia há 3 dias, sem febre. Orofaringe hiperemiada, sem exsudato. Ausculta pulmonar limpa.',
    conduta:
      'Quadro compatível com faringite viral. Sem sinais de alarme. Orientada sintomáticos e retorno se surgir febre ou dificuldade para engolir.',
    prescricao: null,
  },
  finalizado3: {
    anamnese:
      'Consulta de rotina, paciente assintomático. Sinais vitais dentro da normalidade. Sem queixas agudas no momento.',
    conduta:
      'Sem intercorrências. Orientações gerais de saúde e retorno em caso de sintomas novos.',
    prescricao: null,
  },
  finalizado4: {
    anamnese:
      'Paciente com dispneia progressiva há 2 dias, pior aos esforços. Saturação de entrada 95%. Ausculta com sibilos discretos bilaterais.',
    conduta:
      'Quadro compatível com broncoespasmo leve. Realizada nebulização na unidade com melhora da saturação para 98%.',
    prescricao:
      'Salbutamol spray, 2 jatos a cada 4h se falta de ar. Retorno imediato se piora.',
  },
} satisfies Record<
  string,
  { anamnese: string; conduta: string; prescricao: string | null }
>;

// ---------------------------------------------------------------------------
// Atendimentos — a tabela que realmente importa pro case. Cobre os quatro
// status, três janelas de tempo, e deixa pronto pelo menos um exemplar de
// cada cenário dos "cinco primeiros testes" do plano (ver docs/invariantes.md
// e docs/matriz-de-acesso.md):
//
//  - #3 (AGUARDANDO, já triado, risco alto) é o candidato natural pro teste
//    de concorrência: dois POST /iniciar simultâneos nele.
//  - #7 está triado e aguardando, pronto para Diego assumir no fluxo médico.
//  - #10 a #13 têm prontuário finalizado — PATCH neles deve ser recusado
//    pelo gatilho, e são o par usado pra provar isolamento entre atendimentos
//    (token da sala de um não pode ser usado no outro).
//
// IDs são fixos (não gerados) porque Atendimento não tem nenhuma chave de
// negócio única pra servir de alvo de upsert — sem um id fixo, cada boot do
// container criaria 15 linhas novas em vez de reconhecer as que já existem.
// ---------------------------------------------------------------------------

interface AtendimentoSeed {
  id: string;
  pacienteIndex: number;
  status: StatusAtendimento;
  entradaFilaHorasAtras: number;
  risco: Risco | null;
  triagemAutor: 'ana' | 'bruno' | null;
  triagemHorasAtras: number | null;
  // ENFERMEIRO também inicia atendimento; a coluna gerada + unique no banco
  // exige profissionalId distinto em cada linha EM_ANDAMENTO.
  profissional: 'ana' | 'bruno' | 'carla' | 'diego' | null;
  iniciadoEmHorasAtras: number | null;
  finalizadoEmHorasAtras: number | null;
  canceladoEmHorasAtras: number | null;
  prontuario: keyof typeof PRONTUARIOS | null;
  prontuarioFinalizado: boolean;
  autorProntuario: 'carla' | 'diego' | null;
  comAdendo: boolean;
}

const HOJE = 0;
const ONTEM = 24;
const SEMANA_PASSADA = 24 * 7;

const ATENDIMENTOS: AtendimentoSeed[] = [
  // AGUARDANDO (5) — a fila.
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    pacienteIndex: 0,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: HOJE + 0.3,
    risco: null,
    triagemAutor: null,
    triagemHorasAtras: null,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    pacienteIndex: 1,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: HOJE + 3,
    risco: null,
    triagemAutor: null,
    triagemHorasAtras: null,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  // Já triado, risco alto — o candidato ao teste de concorrência (dois POST /iniciar).
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    pacienteIndex: 2,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: HOJE + 2,
    risco: Risco.VERMELHO,
    triagemAutor: 'ana',
    triagemHorasAtras: HOJE + 1.8,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000004',
    pacienteIndex: 3,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: ONTEM + 2,
    risco: Risco.AMARELO,
    triagemAutor: 'bruno',
    triagemHorasAtras: ONTEM + 1,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    pacienteIndex: 4,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: SEMANA_PASSADA + 2,
    risco: Risco.VERDE,
    triagemAutor: 'ana',
    triagemHorasAtras: SEMANA_PASSADA + 1,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },

  // EM_ANDAMENTO (2) — Carla e Bruno demonstram retomada de atendimento.
  // Ana e Diego ficam livres para assumir uma nova ficha e executar, em
  // sequência, triagem/encaminhamento e atendimento médico no ambiente demo.
  {
    id: 'c0000000-0000-4000-8000-000000000006',
    pacienteIndex: 5,
    status: StatusAtendimento.EM_ANDAMENTO,
    entradaFilaHorasAtras: HOJE + 5,
    risco: Risco.LARANJA,
    triagemAutor: 'ana',
    triagemHorasAtras: HOJE + 4.5,
    profissional: 'carla',
    iniciadoEmHorasAtras: HOJE + 3,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  // Triado e aguardando — candidato para Diego assumir no fluxo médico.
  {
    id: 'c0000000-0000-4000-8000-000000000007',
    pacienteIndex: 6,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: HOJE + 6,
    risco: Risco.AMARELO,
    triagemAutor: 'bruno',
    triagemHorasAtras: HOJE + 5.5,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000008',
    pacienteIndex: 7,
    status: StatusAtendimento.AGUARDANDO,
    entradaFilaHorasAtras: ONTEM + 6,
    risco: Risco.VERMELHO,
    triagemAutor: 'ana',
    triagemHorasAtras: ONTEM + 5,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000009',
    pacienteIndex: 8,
    status: StatusAtendimento.EM_ANDAMENTO,
    entradaFilaHorasAtras: HOJE + 7,
    risco: Risco.VERDE,
    triagemAutor: 'bruno',
    triagemHorasAtras: HOJE + 6.5,
    profissional: 'bruno',
    iniciadoEmHorasAtras: HOJE + 5,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: null,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },

  // FINALIZADO (4) — prontuário sempre finalizado; #10 leva um adendo de exemplo.
  {
    id: 'c0000000-0000-4000-8000-000000000010',
    pacienteIndex: 9,
    status: StatusAtendimento.FINALIZADO,
    entradaFilaHorasAtras: ONTEM + 8,
    risco: Risco.AMARELO,
    triagemAutor: 'ana',
    triagemHorasAtras: ONTEM + 7,
    profissional: 'carla',
    iniciadoEmHorasAtras: ONTEM + 5,
    finalizadoEmHorasAtras: ONTEM + 1,
    canceladoEmHorasAtras: null,
    prontuario: 'finalizado1',
    prontuarioFinalizado: true,
    autorProntuario: 'carla',
    comAdendo: true,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000011',
    pacienteIndex: 0,
    status: StatusAtendimento.FINALIZADO,
    entradaFilaHorasAtras: ONTEM + 10,
    risco: Risco.VERDE,
    triagemAutor: 'bruno',
    triagemHorasAtras: ONTEM + 9,
    profissional: 'diego',
    iniciadoEmHorasAtras: ONTEM + 7,
    finalizadoEmHorasAtras: ONTEM + 2,
    canceladoEmHorasAtras: null,
    prontuario: 'finalizado2',
    prontuarioFinalizado: true,
    autorProntuario: 'diego',
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000012',
    pacienteIndex: 1,
    status: StatusAtendimento.FINALIZADO,
    entradaFilaHorasAtras: SEMANA_PASSADA + 8,
    risco: Risco.AZUL,
    triagemAutor: 'ana',
    triagemHorasAtras: SEMANA_PASSADA + 7,
    profissional: 'carla',
    iniciadoEmHorasAtras: SEMANA_PASSADA + 5,
    finalizadoEmHorasAtras: SEMANA_PASSADA + 3,
    canceladoEmHorasAtras: null,
    prontuario: 'finalizado3',
    prontuarioFinalizado: true,
    autorProntuario: 'carla',
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000013',
    pacienteIndex: 2,
    status: StatusAtendimento.FINALIZADO,
    entradaFilaHorasAtras: SEMANA_PASSADA + 12,
    risco: Risco.LARANJA,
    triagemAutor: 'bruno',
    triagemHorasAtras: SEMANA_PASSADA + 11,
    profissional: 'diego',
    iniciadoEmHorasAtras: SEMANA_PASSADA + 9,
    finalizadoEmHorasAtras: SEMANA_PASSADA + 6,
    canceladoEmHorasAtras: null,
    prontuario: 'finalizado4',
    prontuarioFinalizado: true,
    autorProntuario: 'diego',
    comAdendo: false,
  },

  // CANCELADO (2) — ambos saíram da fila antes de qualquer profissional
  // assumir. Pelo grafo do case, cancelamento depois da triagem não existe.
  {
    id: 'c0000000-0000-4000-8000-000000000014',
    pacienteIndex: 3,
    status: StatusAtendimento.CANCELADO,
    entradaFilaHorasAtras: ONTEM + 4,
    risco: null,
    triagemAutor: null,
    triagemHorasAtras: null,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: ONTEM + 3.5,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000015',
    pacienteIndex: 4,
    status: StatusAtendimento.CANCELADO,
    entradaFilaHorasAtras: SEMANA_PASSADA + 4,
    risco: null,
    triagemAutor: null,
    triagemHorasAtras: null,
    profissional: null,
    iniciadoEmHorasAtras: null,
    finalizadoEmHorasAtras: null,
    canceladoEmHorasAtras: SEMANA_PASSADA + 2,
    prontuario: null,
    prontuarioFinalizado: false,
    autorProntuario: null,
    comAdendo: false,
  },
];

async function semearAtendimentos(
  usuarios: Record<UsuarioSeed['chave'], { id: string }>,
  pacientes: { id: string }[],
): Promise<void> {
  for (const spec of ATENDIMENTOS) {
    const paciente = pacientes[spec.pacienteIndex];
    if (!paciente) {
      throw new Error(
        `pacienteIndex ${spec.pacienteIndex} fora da lista de PACIENTES`,
      );
    }

    await prisma.atendimento.upsert({
      where: { id: spec.id },
      update: {},
      create: {
        id: spec.id,
        pacienteId: paciente.id,
        status: spec.status,
        risco: spec.risco,
        entradaFila: horasAtras(spec.entradaFilaHorasAtras),
        profissionalId: spec.profissional
          ? usuarios[spec.profissional].id
          : null,
        iniciadoEm:
          spec.iniciadoEmHorasAtras !== null
            ? horasAtras(spec.iniciadoEmHorasAtras)
            : null,
        finalizadoEm:
          spec.finalizadoEmHorasAtras !== null
            ? horasAtras(spec.finalizadoEmHorasAtras)
            : null,
        canceladoEm:
          spec.canceladoEmHorasAtras !== null
            ? horasAtras(spec.canceladoEmHorasAtras)
            : null,
      },
    });

    if (spec.triagemAutor && spec.risco && spec.triagemHorasAtras !== null) {
      const vitais = TRIAGEM_POR_RISCO[spec.risco];
      await prisma.triagem.upsert({
        where: { atendimentoId: spec.id },
        update: {},
        create: {
          atendimentoId: spec.id,
          autorId: usuarios[spec.triagemAutor].id,
          queixa: vitais.queixa,
          pa: vitais.pa,
          fc: vitais.fc,
          temperatura: vitais.temperatura,
          satO2: vitais.satO2,
          criadoEm: horasAtras(spec.triagemHorasAtras),
        },
      });
    }

    if (spec.prontuario && spec.autorProntuario) {
      const conteudo = PRONTUARIOS[spec.prontuario];

      // Aqui NÃO pode ser upsert. O gatilho trg_prontuario_imutavel recusa
      // qualquer UPDATE em prontuário com finalizadoEm preenchido, e o Prisma
      // injeta `atualizadoEm` (@updatedAt) mesmo quando o update é `{}` —
      // então o `update: {}` que é inofensivo nas outras tabelas viraria um
      // UPDATE real aqui e mataria o seed no segundo boot do container.
      // Ler antes e criar só se faltar mantém a repetição segura.
      const prontuario =
        (await prisma.prontuario.findUnique({
          where: { atendimentoId: spec.id },
          select: { id: true },
        })) ??
        (await prisma.prontuario.create({
          data: {
            atendimentoId: spec.id,
            autorId: usuarios[spec.autorProntuario].id,
            anamnese: conteudo.anamnese,
            conduta: conteudo.conduta,
            prescricao: conteudo.prescricao,
            finalizadoEm:
              spec.prontuarioFinalizado && spec.finalizadoEmHorasAtras !== null
                ? horasAtras(spec.finalizadoEmHorasAtras)
                : null,
          },
          select: { id: true },
        }));

      // Adendo de exemplo, só no primeiro finalizado — mostra o formato de
      // correção append-only sem precisar rodar a API pra ver como fica.
      // Mesmo motivo do prontuário, e um extra: adendo é append-only por
      // definição, então nem deveria existir caminho de UPDATE no seed.
      if (spec.comAdendo) {
        const adendoId = 'd0000000-0000-4000-8000-000000000001';
        const adendoExiste = await prisma.prontuarioAdendo.findUnique({
          where: { id: adendoId },
          select: { id: true },
        });
        if (!adendoExiste) {
          await prisma.prontuarioAdendo.create({
            data: {
              id: adendoId,
              prontuarioId: prontuario.id,
              autorId: usuarios[spec.autorProntuario].id,
              texto:
                'Retificação: pressão arterial correta de admissão era 128/84, não 130/85 como registrado inicialmente.',
              criadoEm: horasAtras((spec.finalizadoEmHorasAtras ?? 0) - 0.5),
            },
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const usuarios = await semearUsuarios();
  const pacientes = await semearPacientes();
  await semearAtendimentos(usuarios, pacientes);

  console.log('\nSeed concluído.\n');
  console.log('Usuários de demonstração criados:');
  for (const usuario of USUARIOS) {
    console.log(`  ${usuario.papel.padEnd(11)} ${usuario.email}`);
  }
  console.log(
    `\n${PACIENTES.length} pacientes e ${ATENDIMENTOS.length} atendimentos criados/confirmados.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (erro: unknown) => {
    console.error('Falha ao rodar o seed:', erro);
    await prisma.$disconnect();
    process.exit(1);
  });
