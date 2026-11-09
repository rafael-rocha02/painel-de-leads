const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MODELOS_PADRAO = ['gemini-3.5-flash-lite', 'gemini-3.5-flash']
const ESPERAS_MS = [1500, 3000]
const TIMEOUT_MS = 20000

let modeloDescoberto: string | null = null

type Resultado =
  | { tipo: 'ok'; texto: string }
  | { tipo: 'naoExiste' }
  | { tipo: 'falha' }

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

function registrar(mensagem: string) {
  console.error(`[gemini] ${mensagem.slice(0, 120)}`)
}

async function chamar(url: string, chave: string, init: RequestInit = {}) {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controlador.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': chave,
      },
    })
  } finally {
    clearTimeout(temporizador)
  }
}

export function listaDeModelos() {
  const lista = [
    modeloDescoberto,
    process.env.GEMINI_MODEL,
    ...MODELOS_PADRAO,
  ].filter((m): m is string => Boolean(m))
  return [...new Set(lista)]
}

export async function descobrirModelo(chave: string): Promise<string | null> {
  try {
    const resposta = await chamar(`${BASE}/models?pageSize=1000`, chave)
    if (!resposta.ok) {
      registrar(`listagem de modelos respondeu ${resposta.status}`)
      return null
    }
    const json = (await resposta.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[]
    }
    const candidatos = (json.models ?? [])
      .filter(
        (m) =>
          m.name?.includes('flash') &&
          m.supportedGenerationMethods?.includes('generateContent'),
      )
      .map((m) => (m.name as string).replace(/^models\//, ''))

    const escolhido =
      candidatos.find((nome) => nome.includes('flash-lite')) ?? candidatos[0] ?? null
    if (escolhido) modeloDescoberto = escolhido
    return escolhido
  } catch (erro) {
    registrar(`falha ao listar modelos: ${erro instanceof Error ? erro.name : 'erro'}`)
    return null
  }
}

async function tentarModelo(
  modelo: string,
  chave: string,
  instrucao: string,
  conteudo: string,
): Promise<Resultado> {
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: instrucao }] },
    contents: [{ role: 'user', parts: [{ text: conteudo }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
  })

  for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
    let status = 0
    try {
      const resposta = await chamar(`${BASE}/models/${modelo}:generateContent`, chave, {
        method: 'POST',
        body: corpo,
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
        if (texto) return { tipo: 'ok', texto }
        registrar(`${modelo} respondeu sem texto`)
        return { tipo: 'falha' }
      }

      const detalhe = await resposta.text().catch(() => '')
      if (
        status === 404 ||
        (status === 400 &&
          /no longer available|deprecated|not found|does not exist/i.test(detalhe))
      ) {
        registrar(`${modelo} não existe mais (${status})`)
        return { tipo: 'naoExiste' }
      }
    } catch (erro) {
      if (erro instanceof Error && erro.name === 'AbortError') {
        registrar(`${modelo} excedeu ${TIMEOUT_MS / 1000}s`)
        return { tipo: 'falha' }
      }
      status = 503
    }

    const repetir = status === 429 || status >= 500
    if (!repetir) {
      registrar(`${modelo} respondeu ${status}`)
      return { tipo: 'falha' }
    }
    if (tentativa === ESPERAS_MS.length) {
      registrar(`${modelo} seguiu com ${status} após novas tentativas`)
      return { tipo: 'falha' }
    }
    await espera(ESPERAS_MS[tentativa])
  }
  return { tipo: 'falha' }
}

export async function perguntarAoGemini(
  chave: string,
  instrucao: string,
  conteudo: string,
): Promise<string | null> {
  let todosNaoExistem = true

  for (const modelo of listaDeModelos()) {
    const resultado = await tentarModelo(modelo, chave, instrucao, conteudo)
    if (resultado.tipo === 'ok') return resultado.texto
    if (resultado.tipo === 'naoExiste') {
      if (modelo === modeloDescoberto) modeloDescoberto = null
    } else {
      todosNaoExistem = false
    }
  }

  if (!todosNaoExistem) return null

  const novo = await descobrirModelo(chave)
  if (!novo) return null
  const resultado = await tentarModelo(novo, chave, instrucao, conteudo)
  return resultado.tipo === 'ok' ? resultado.texto : null
}
