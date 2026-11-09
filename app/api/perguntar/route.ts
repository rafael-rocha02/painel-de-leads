import { NextResponse } from 'next/server'
import { PERIODOS } from '@/lib/funil'
import { obterDadosFunil } from '@/lib/funil-servidor'
import { montarResumo } from '@/lib/resumo-funil'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_CARACTERES = 300
const LIMITE_DIARIO = 15
const ESPERAS_MS = [1500, 3000]

const INSTRUCAO_SISTEMA =
  "Você é um analista de marketing que responde perguntas sobre a qualidade dos leads de uma empresa B2B de software de gestão de despesas. Responda em português do Brasil, em no máximo 6 frases curtas ou até 5 tópicos com '•'. Use SOMENTE os números do JSON de dados fornecido; nunca invente, estime ou arredonde de outro jeito; use vírgula como separador decimal. Sempre cite os números que sustentam a resposta e compare com o período anterior quando fizer sentido. Se uma origem tiver volume_baixo true, avise que o volume é baixo para conclusões fortes. Se a pergunta não puder ser respondida com esses dados, diga isso em uma frase e sugira o que dá para responder. Se a pergunta não for sobre leads, marketing ou estes dados, responda apenas: 'Só consigo responder perguntas sobre os dados deste painel.' Não use markdown com # nem **."

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

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function perguntarAoGemini(chave: string, conteudo: string) {
  const modelo = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`

  for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
    let status = 0
    try {
      const resposta = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
          contents: [{ role: 'user', parts: [{ text: conteudo }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
        }),
      })
      status = resposta.status

      if (resposta.ok) {
        const json = (await resposta.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        const texto = (json.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? '')
          .join('')
          .trim()
        return texto || null
      }
    } catch {
      status = 503
    }

    const repetir = status === 429 || status >= 500
    if (!repetir || tentativa === ESPERAS_MS.length) return null
    await espera(ESPERAS_MS[tentativa])
  }
  return null
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

  const dados = await obterDadosFunil()
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
    `DADOS:\n${JSON.stringify(resumo)}\n\nPERGUNTA:\n${texto}`,
  )
  if (!resposta) return ocupado()

  return NextResponse.json({ resposta: limparMarkdown(resposta) })
}
