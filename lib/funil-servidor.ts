import snapshot from '@/data/snapshot-funil.json'
import type { FunilData, MotivoItem, SerieItem } from '@/lib/funil'

const REVALIDAR_SEGUNDOS = 3600
const TIMEOUT_PIPEDRIVE_MS = 5000

const CAMPO_DATA = '79ef76eaf31f801f533e773a786cc9c60c57b97b'
const CAMPO_ESTRELAS = 'f203d474df1cb565941e2b4f29d57f96b839aab9'
const CAMPO_ORIGEM = '349261b3e8060a7857a56bf0cf133be588b4ef18'
const CAMPO_REUNIAO = '25192e0b8f809493d71cb43cb66490659c80f70f'

const ORIGENS: Record<number, string> = {
  39: 'LP Cartões',
  40: 'Site institucional',
  41: 'LP Eventos',
  42: 'Indicação',
}
const REUNIAO_SIM = 43
const MAX_PAGINAS = 200

type Deal = {
  status?: string
  lost_reason?: string | null
  custom_fields?: Record<string, unknown>
}

type Pagina = {
  data?: Deal[]
  additional_data?: { next_cursor?: string | null }
}

function valorCampo(campo: unknown): unknown {
  if (campo && typeof campo === 'object') {
    const o = campo as Record<string, unknown>
    if ('value' in o) return o.value
    if ('id' in o) return o.id
  }
  return campo
}

async function buscarPagina(url: URL, token: string): Promise<Pagina> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_PIPEDRIVE_MS)

  try {
    const resposta = await fetch(url, {
      headers: { 'x-api-token': token },
      signal: controlador.signal,
      next: { revalidate: REVALIDAR_SEGUNDOS },
    })
    if (resposta.status < 200 || resposta.status > 299)
      throw new Error(`status ${resposta.status}`)

    let corpo: Pagina & { success?: boolean }
    try {
      corpo = await resposta.json()
    } catch (erro) {
      if (controlador.signal.aborted) throw erro
      throw new Error('resposta não é JSON válido')
    }
    if (!corpo || typeof corpo !== 'object') throw new Error('resposta vazia')
    if (corpo.success === false) throw new Error('success: false')
    if (!Array.isArray(corpo.data)) throw new Error('resposta sem o array data')
    return corpo
  } catch (erro) {
    if (controlador.signal.aborted)
      throw new Error(`tempo esgotado (${TIMEOUT_PIPEDRIVE_MS / 1000}s)`)
    throw erro
  } finally {
    clearTimeout(temporizador)
  }
}

async function buscarNegocios(dominio: string, token: string) {
  const negocios: Deal[] = []
  let cursor: string | null = null

  for (let i = 0; i < MAX_PAGINAS; i++) {
    const url = new URL(
      `https://${encodeURIComponent(dominio)}.pipedrive.com/api/v2/deals`,
    )
    url.searchParams.set('limit', '500')
    if (cursor) url.searchParams.set('cursor', cursor)

    const pagina = await buscarPagina(url, token)
    negocios.push(...(pagina.data ?? []))
    cursor = pagina.additional_data?.next_cursor ?? null
    if (!cursor) return negocios
  }
  throw new Error(`mais de ${MAX_PAGINAS} páginas`)
}

function agregar(negocios: Deal[]): Pick<FunilData, 'serie' | 'motivos'> {
  const serie = new Map<string, SerieItem>()
  const motivos = new Map<string, MotivoItem>()

  for (const negocio of negocios) {
    const campos = negocio.custom_fields ?? {}
    const dia = String(valorCampo(campos[CAMPO_DATA]) ?? '').slice(0, 10)
    const origem = ORIGENS[Number(valorCampo(campos[CAMPO_ORIGEM]))]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !origem) continue

    const estrelas = Number(valorCampo(campos[CAMPO_ESTRELAS]))
    const perdido = negocio.status === 'lost'
    const reuniao = Number(valorCampo(campos[CAMPO_REUNIAO])) === REUNIAO_SIM

    const chave = `${dia}|${origem}`
    const linha = serie.get(chave) ?? {
      dia,
      origem,
      leads: 0,
      soma_estrelas: 0,
      perdidos: 0,
      reunioes: 0,
    }
    linha.leads += 1
    linha.soma_estrelas += Number.isFinite(estrelas) ? estrelas : 0
    if (perdido) linha.perdidos += 1
    if (reuniao) linha.reunioes += 1
    serie.set(chave, linha)

    if (perdido) {
      const motivo = negocio.lost_reason?.trim() || 'Sem motivo informado'
      const chaveMotivo = `${chave}|${motivo}`
      const item = motivos.get(chaveMotivo) ?? { dia, origem, motivo, qtd: 0 }
      item.qtd += 1
      motivos.set(chaveMotivo, item)
    }
  }

  const ordenar = (a: SerieItem | MotivoItem, b: SerieItem | MotivoItem) =>
    a.dia.localeCompare(b.dia) || a.origem.localeCompare(b.origem)

  return {
    serie: [...serie.values()].sort(ordenar),
    motivos: [...motivos.values()].sort(ordenar),
  }
}

export function dadosDeReserva(): FunilData {
  return { ...(snapshot as FunilData), fonte: 'copia' }
}

function registrarFalha(motivo: unknown) {
  const texto = motivo instanceof Error ? motivo.message : String(motivo)
  console.error(`[funil] Pipedrive indisponível, usando o snapshot: ${texto.slice(0, 120)}`)
}

export async function obterDadosFunil(): Promise<FunilData> {
  try {
    const dominio = process.env.PIPEDRIVE_DOMAIN
    const token = process.env.PIPEDRIVE_API_TOKEN
    if (!dominio || !token) {
      registrarFalha('PIPEDRIVE_DOMAIN ou PIPEDRIVE_API_TOKEN ausentes')
      return dadosDeReserva()
    }

    const negocios = await buscarNegocios(dominio, token)
    const agregado = agregar(negocios)
    const totalLeads = agregado.serie.reduce((soma, s) => soma + s.leads, 0)
    if (totalLeads === 0) {
      registrarFalha('nenhum lead com os campos personalizados preenchidos')
      return dadosDeReserva()
    }

    return {
      atualizado_em: new Date().toISOString().slice(0, 10),
      fonte: 'pipedrive',
      origens: Object.values(ORIGENS),
      ...agregado,
    }
  } catch (erro) {
    registrarFalha(erro)
    return dadosDeReserva()
  }
}
