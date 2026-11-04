export type SerieItem = {
  dia: string
  origem: string
  leads: number
  soma_estrelas: number
  perdidos: number
  reunioes: number
}

export type MotivoItem = {
  dia: string
  origem: string
  motivo: string
  qtd: number
}

export type FunilData = {
  atualizado_em: string
  fonte: 'pipedrive' | 'copia'
  origens: string[]
  serie: SerieItem[]
  motivos: MotivoItem[]
}

export const ORIGEM_COR: Record<string, string> = {
  'LP Cartões': '#C2410C',
  'Site institucional': '#1D4ED8',
  'LP Eventos': '#047857',
  Indicação: '#7C3AED',
}

export const MOTIVO_COR: Record<string, string> = {
  'Sem orçamento': '#334155',
  'Contato inválido': '#0E7490',
  'Empresa pequena demais': '#A16207',
  'Só pesquisando': '#BE185D',
  'Já usa concorrente': '#65A30D',
  'Sem retorno': '#94A3B8',
}

export const PERIODOS = [7, 14, 30] as const
export type Periodo = (typeof PERIODOS)[number]

export const VOLUME_BAIXO = 10

const numero = (digitos: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos,
  })

const formatadores = [numero(0), numero(1), numero(2)]

export function fmt(valor: number, digitos = 0) {
  return formatadores[digitos].format(valor)
}

export function fmtPct(valor: number, digitos = 1) {
  return `${fmt(valor, digitos)}%`
}

export function fmtSinal(valor: number, digitos = 0) {
  const texto = fmt(Math.abs(valor), digitos)
  if (Number(texto.replace(',', '.')) === 0) return texto
  return `${valor > 0 ? '+' : '-'}${texto}`
}

export function fmtDia(dia: string) {
  const [, mes, d] = dia.split('-')
  return `${d}/${mes}`
}

export function fmtDataCompleta(dia: string) {
  const [ano, mes, d] = dia.split('-')
  return `${d}/${mes}/${ano}`
}

export function somarDias(dia: string, n: number) {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10)
}

export function listarDias(inicio: string, fim: string) {
  const dias: string[] = []
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d)
  return dias
}

export type Totais = {
  leads: number
  somaEstrelas: number
  perdidos: number
  reunioes: number
}

export function somar(linhas: SerieItem[]): Totais {
  return linhas.reduce<Totais>(
    (acc, l) => ({
      leads: acc.leads + l.leads,
      somaEstrelas: acc.somaEstrelas + l.soma_estrelas,
      perdidos: acc.perdidos + l.perdidos,
      reunioes: acc.reunioes + l.reunioes,
    }),
    { leads: 0, somaEstrelas: 0, perdidos: 0, reunioes: 0 },
  )
}

export const mediaEstrelas = (t: Totais) =>
  t.leads > 0 ? t.somaEstrelas / t.leads : null
export const pctPerdidos = (t: Totais) =>
  t.leads > 0 ? (t.perdidos / t.leads) * 100 : null
export const pctReuniao = (t: Totais) =>
  t.leads > 0 ? (t.reunioes / t.leads) * 100 : null
