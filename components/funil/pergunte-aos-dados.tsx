'use client'

import { useState } from 'react'
import type { Periodo } from '@/lib/funil'

const MAX_CARACTERES = 300
const SUGESTOES = [
  'Por que a LP Cartões piorou?',
  'Qual origem devo priorizar?',
  'Quais os principais motivos de perda?',
]

const MSG_LIMITE = 'Você atingiu o limite de perguntas de hoje. Tente de novo amanhã.'
const MSG_OCUPADO = 'O modelo está ocupado agora. Tente de novo em alguns segundos.'

type Props = {
  periodo: Periodo
  origens: string[]
}

export function PergunteAosDados({ periodo, origens }: Props) {
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [ultima, setUltima] = useState<{ pergunta: string; resposta: string } | null>(
    null,
  )
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(texto: string) {
    const limpa = texto.trim()
    if (!limpa || carregando) return

    setCarregando(true)
    setErro(null)
    setUltima(null)
    try {
      const resposta = await fetch('/api/perguntar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: limpa, periodo, origens }),
      })
      if (resposta.ok) {
        const json = (await resposta.json()) as { resposta: string }
        setUltima({ pergunta: limpa, resposta: json.resposta })
      } else if (resposta.status === 429) {
        setErro(MSG_LIMITE)
      } else if (resposta.status === 400) {
        const json = (await resposta.json().catch(() => null)) as {
          erro?: string
        } | null
        setErro(json?.erro ?? MSG_OCUPADO)
      } else {
        setErro(MSG_OCUPADO)
      }
    } catch {
      setErro(MSG_OCUPADO)
    } finally {
      setCarregando(false)
    }
  }

  function usarSugestao(texto: string) {
    setPergunta(texto)
    enviar(texto)
  }

  return (
    <section
      aria-labelledby="titulo-pergunte"
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-4"
    >
      <div>
        <h2 id="titulo-pergunte" className="text-base font-semibold">
          Pergunte aos dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Faça uma pergunta sobre o período e as origens selecionados.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {SUGESTOES.map((sugestao) => (
          <li key={sugestao}>
            <button
              type="button"
              disabled={carregando}
              onClick={() => usarSugestao(sugestao)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-left transition-colors hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {sugestao}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          enviar(pergunta)
        }}
      >
        <label htmlFor="campo-pergunta" className="sr-only">
          Sua pergunta
        </label>
        <textarea
          id="campo-pergunta"
          value={pergunta}
          maxLength={MAX_CARACTERES}
          rows={2}
          placeholder="Digite sua pergunta"
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              enviar(pergunta)
            }
          }}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            {pergunta.length}/{MAX_CARACTERES}
          </span>
          <button
            type="submit"
            disabled={carregando || pergunta.trim().length === 0}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Perguntar
          </button>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-2">
        {carregando && (
          <p role="status" className="text-sm text-muted-foreground">
            Analisando os dados...
          </p>
        )}
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {erro}
          </p>
        )}
        {ultima && (
          <div className="flex flex-col gap-2 rounded-md border border-border p-4">
            <p className="text-sm font-medium">{ultima.pergunta}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {ultima.resposta}
            </p>
            <p className="text-xs text-muted-foreground">
              Resposta gerada por IA (Gemini) com base nos dados do período filtrado.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
