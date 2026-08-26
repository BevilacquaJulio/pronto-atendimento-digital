import type { Triage } from '../atendimentos/atendimentos.types'

export type VitalStatus = 'normal' | 'watch' | 'alert' | 'empty'

export type VitalReading = {
  key: string
  label: string
  value: string
  unit?: string
  /** Faixa esperada, mostrada abaixo do valor. */
  reference: string
  status: VitalStatus
}

/**
 * Faixas de referência para **adulto em repouso**.
 *
 * Três avisos que valem mais que o código:
 *
 * 1. Isto é realce visual, não interpretação clínica. O destaque diz "olhe
 *    para este número", nunca "este paciente está grave". A classificação de
 *    risco continua vindo da triagem feita por profissional.
 * 2. As faixas não valem para todo mundo. Criança tem FC basal mais alta;
 *    paciente com DPOC costuma viver com SpO2 88–92% e seria marcado em
 *    vermelho aqui sem estar descompensado. Como o PAD é de saúde ocupacional
 *    (população adulta economicamente ativa), a faixa adulta é a aposta certa
 *    — mas o dado de idade existe no cadastro e permitiria refinar isso depois.
 * 3. Nada aqui bloqueia fluxo. Um valor "alerta" não impede salvar a triagem:
 *    software clínico que trava em cima de faixa estatística atrapalha mais do
 *    que ajuda.
 */
const ADULT_RANGES = {
  fc: { min: 60, max: 100, criticalLow: 40, criticalHigh: 130 },
  temperatura: { min: 36, max: 37.5, criticalLow: 35, criticalHigh: 39.5 },
  satO2: { min: 95, watchLow: 91, criticalLow: 90 },
  sistolica: { min: 90, max: 140, criticalLow: 80, criticalHigh: 180 },
  diastolica: { min: 60, max: 90, criticalHigh: 120 },
} as const

function classifyRange(
  value: number,
  min: number,
  max: number,
  criticalLow: number,
  criticalHigh: number,
): VitalStatus {
  if (value <= criticalLow || value >= criticalHigh) return 'alert'
  if (value < min || value > max) return 'watch'
  return 'normal'
}

/**
 * Prisma serializa `Decimal` como string no JSON. Sem esta conversão,
 * `temperatura.toFixed(1)` explode e a ficha do paciente some da tela.
 */
function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function classifyPressure(reading: string | null): VitalStatus {
  if (!reading) return 'empty'

  // Aceita "120/80", "120 x 80" e "120-80" — a equipe digita dos três jeitos.
  const match = reading.match(/(\d{2,3})\s*[/x\-–]\s*(\d{2,3})/i)
  if (!match) return 'normal'

  const systolic = Number(match[1])
  const diastolic = Number(match[2])
  const { sistolica, diastolica } = ADULT_RANGES

  if (
    systolic >= sistolica.criticalHigh ||
    diastolic >= diastolica.criticalHigh ||
    systolic <= sistolica.criticalLow
  ) {
    return 'alert'
  }
  if (
    systolic < sistolica.min ||
    systolic > sistolica.max ||
    diastolic < diastolica.min ||
    diastolica.max < diastolic
  ) {
    return 'watch'
  }
  return 'normal'
}

export function readVitals(triage: Triage): VitalReading[] {
  const { fc, temperatura, satO2 } = ADULT_RANGES
  const heartRate = toFiniteNumber(triage.fc)
  const temperature = toFiniteNumber(triage.temperatura)
  const oxygen = toFiniteNumber(triage.satO2)

  return [
    {
      key: 'pa',
      label: 'Pressão arterial',
      value: triage.pa ?? 'Não informada',
      unit: triage.pa ? 'mmHg' : undefined,
      reference: '90/60 a 140/90 mmHg',
      status: classifyPressure(triage.pa),
    },
    {
      key: 'fc',
      label: 'Frequência cardíaca',
      value: heartRate === null ? 'Não informada' : String(heartRate),
      unit: heartRate === null ? undefined : 'bpm',
      reference: `${fc.min} a ${fc.max} bpm`,
      status:
        heartRate === null
          ? 'empty'
          : classifyRange(
              heartRate,
              fc.min,
              fc.max,
              fc.criticalLow,
              fc.criticalHigh,
            ),
    },
    {
      key: 'temperatura',
      label: 'Temperatura',
      value: temperature === null ? 'Não informada' : temperature.toFixed(1),
      unit: temperature === null ? undefined : '°C',
      reference: `${temperatura.min} a ${temperatura.max} °C`,
      status:
        temperature === null
          ? 'empty'
          : classifyRange(
              temperature,
              temperatura.min,
              temperatura.max,
              temperatura.criticalLow,
              temperatura.criticalHigh,
            ),
    },
    {
      key: 'satO2',
      label: 'Saturação O₂',
      value: oxygen === null ? 'Não informada' : String(oxygen),
      unit: oxygen === null ? undefined : '%',
      reference: `≥ ${satO2.min}%`,
      status:
        oxygen === null
          ? 'empty'
          : oxygen <= satO2.criticalLow
            ? 'alert'
            : oxygen < satO2.min
              ? 'watch'
              : 'normal',
    },
  ]
}
