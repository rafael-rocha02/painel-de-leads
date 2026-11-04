'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ORIGEM_COR, VOLUME_BAIXO, fmt, fmtPct } from '@/lib/funil'

export type LinhaOrigem = {
  origem: string
  leads: number
  media: number | null
  pctPerdidos: number | null
  reunioes: number
  pctReuniao: number | null
  motivo: string | null
}

type Chave = keyof LinhaOrigem

const COLUNAS: { chave: Chave; rotulo: string; numerica: boolean }[] = [
  { chave: 'origem', rotulo: 'Origem', numerica: false },
  { chave: 'leads', rotulo: 'Leads', numerica: true },
  { chave: 'media', rotulo: 'Média de estrelas', numerica: true },
  { chave: 'pctPerdidos', rotulo: '% perdidos', numerica: true },
  { chave: 'reunioes', rotulo: 'Reuniões', numerica: true },
  { chave: 'pctReuniao', rotulo: '% de reunião', numerica: true },
  { chave: 'motivo', rotulo: 'Principal motivo de perda', numerica: false },
]

export function TabelaOrigens({ linhas }: { linhas: LinhaOrigem[] }) {
  const [chave, setChave] = useState<Chave>('leads')
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('desc')

  const ordenadas = useMemo(() => {
    const fator = direcao === 'asc' ? 1 : -1
    return [...linhas].sort((a, b) => {
      const va = a[chave]
      const vb = b[chave]
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      if (typeof va === 'number' && typeof vb === 'number')
        return (va - vb) * fator
      return String(va).localeCompare(String(vb), 'pt-BR') * fator
    })
  }, [linhas, chave, direcao])

  function ordenarPor(nova: Chave, numerica: boolean) {
    if (nova === chave) {
      setDirecao(direcao === 'asc' ? 'desc' : 'asc')
    } else {
      setChave(nova)
      setDirecao(numerica ? 'desc' : 'asc')
    }
  }

  return (
    <section
      aria-label="Tabela por origem"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4"
    >
      <h2 className="text-base font-semibold">Desempenho por origem</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUNAS.map((c) => {
                const ativa = chave === c.chave
                const Icone = !ativa
                  ? ArrowUpDown
                  : direcao === 'asc'
                    ? ArrowUp
                    : ArrowDown
                return (
                  <th
                    key={c.chave}
                    scope="col"
                    aria-sort={
                      ativa
                        ? direcao === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={cn(
                      'py-2 pr-4 font-medium text-muted-foreground',
                      c.numerica ? 'text-right' : 'text-left',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => ordenarPor(c.chave, c.numerica)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                        ativa && 'text-foreground',
                        c.numerica && 'flex-row-reverse',
                      )}
                    >
                      {c.rotulo}
                      <Icone aria-hidden="true" className="size-3.5" />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l.origem} className="border-b border-border last:border-0">
                <th
                  scope="row"
                  className="whitespace-nowrap py-3 pr-4 text-left font-medium"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ORIGEM_COR[l.origem] }}
                    />
                    {l.origem}
                    {l.leads < VOLUME_BAIXO && (
                      <span className="rounded border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                        volume baixo
                      </span>
                    )}
                  </span>
                </th>
                <td className="py-3 pr-4 text-right tabular-nums">{fmt(l.leads)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {l.media === null ? '—' : fmt(l.media, 1)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {l.pctPerdidos === null ? '—' : fmtPct(l.pctPerdidos)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {fmt(l.reunioes)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {l.pctReuniao === null ? '—' : fmtPct(l.pctReuniao)}
                </td>
                <td className="py-3 pr-4">{l.motivo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
