import { NextResponse } from 'next/server'
import { PERIODOS } from '@/lib/funil'
import { perguntarAoGemini } from '@/lib/gemini'
import { dadosDeReserva, obterDadosFunil } from '@/lib/funil-servidor'
import { montarResumo } from '@/lib/resumo-funil'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CARACTERES = 300
const LIMITE_DIARIO = 15

const INSTRUCAO_SISTEMA = [
  "Você é um analista de marketing que responde perguntas sobre a qualidade dos leads de uma empresa B2B de software de gestão de despesas.",
  "Responda em português do Brasil, em até 5 tópicos com '•', cada um com no máximo 2 frases curtas.",
  "Use SOMENTE os números do JSON de dados fornecido; nunca invente, calcule, estime ou arredonde de outro jeito; use vírgula como separador decimal.",
  "Escreva para alguém do marketing: nunca mencione nomes de campos do JSON, como poucos_leads ou pct_perdidos; diga em palavras, como 'poucos leads' ou '% de perdidos'.",
  "Cite os números que sustentam cada afirmação. Ao comparar com o período anterior, diga se subiu ou caiu e mostre os dois valores; não chame uma variação de estabilidade.",
  "Ao comparar ou recomendar origens, considere juntos o volume (leads, reuniões e participação nas reuniões) e a qualidade (média de estrelas, % de perdidos e taxa de reunião). Taxas altas com pouco volume não valem mais que uma origem que gera grande parte das reuniões.",
  "Se uma origem tiver poucos leads para concluir (poucos_leads true) e ela sustentar uma conclusão, avise que o volume dela é baixo para uma conclusão firme.",
  "Não recomende cortar ou evitar uma origem que gerou reuniões no período; recomende ajustar a segmentação ou a página com base nos principais motivos de perda dela.",
  "Indicação não é mídia paga: para ela, recomende incentivar indicações, não aumentar verba.",
  "Em perguntas sobre prioridade, diga claramente qual origem priorizar e por quê.",
  "Quando a pergunta pedir análise, comparação ou recomendação, termine com um tópico que comece com 'Ação recomendada:' e traga uma ação concreta e específica para o marketing.",
  "Se a pergunta não puder ser respondida com esses dados, diga isso em uma frase e sugira o que dá para responder.",
  "Se a pergunta não for sobre leads, marketing ou estes dados, responda apenas: 'Só consigo responder perguntas sobre os dados deste painel.'",
  "Não use markdown com # nem **.",
].join(' ')

const contadores = new Map<string, number>()

function registrarPergunta(ip: string) {
  const hoje = new Date().toISOString().slice(0, 10)
  for (const chave of contadores.keys()) {
    if (!chave.endsWith(`|${hoje}`)) contadores.delete(chave)
  }
  const chave = `${ip}|${hoje}`
  const total = (contadores.get(chave) ?? 0) + 1
  contadores.set(chave, total)
  return total <= LIMITE_DIARIO
}

function ipDaRequisicao(req: Request) {
  const encaminhado = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return encaminhado || req.headers.get('x-real-ip') || 'desconhecido'
}

function limparMarkdown(texto: string) {
  return texto
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()
}

const ocupado = () => NextResponse.json({ erro: 'ocupado' }, { status: 503 })

export async function POST(req: Request) {
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { pergunta, periodo, origens } = (corpo ?? {}) as {
    pergunta?: unknown
    periodo?: unknown
    origens?: unknown
  }

  const texto = typeof pergunta === 'string' ? pergunta.trim() : ''
  if (!texto)
    return NextResponse.json({ erro: 'Escreva uma pergunta.' }, { status: 400 })
  if (texto.length > MAX_CARACTERES)
    return NextResponse.json(
      { erro: `A pergunta pode ter até ${MAX_CARACTERES} caracteres.` },
      { status: 400 },
    )
  if (typeof periodo !== 'number' || !(PERIODOS as readonly number[]).includes(periodo))
    return NextResponse.json({ erro: 'Período inválido.' }, { status: 400 })

  let dados
  try {
    dados = await obterDadosFunil()
  } catch {
    dados = dadosDeReserva()
  }
  if (
    !Array.isArray(origens) ||
    origens.length === 0 ||
    !origens.every((o) => typeof o === 'string' && dados.origens.includes(o))
  )
    return NextResponse.json({ erro: 'Origens inválidas.' }, { status: 400 })

  if (!registrarPergunta(ipDaRequisicao(req)))
    return NextResponse.json({ erro: 'limite' }, { status: 429 })

  const chave = process.env.GEMINI_API_KEY
  if (!chave) return ocupado()

  const resumo = montarResumo(dados, periodo, [...new Set(origens as string[])])
  if (!resumo) return ocupado()

  const resposta = await perguntarAoGemini(
    chave,
    INSTRUCAO_SISTEMA,
    `DADOS:\n${JSON.stringify(resumo)}\n\nPERGUNTA:\n${texto}`,
  ).catch(() => null)
  if (!resposta) return ocupado()

  return NextResponse.json({ resposta: limparMarkdown(resposta) })
}
