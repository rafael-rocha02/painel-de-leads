import { cn } from '@/lib/utils'
import {
  fmt,
  fmtPct,
  fmtSinal,
  mediaEstrelas,
  pctPerdidos,
  type Totais,
} from '@/lib/funil'

type Variacao = { texto: string; tom: 'bom' | 'ruim' | 'neutro' } | null

type Props = {
  atual: Totais
  anterior: Totais | null
  dias: number
}

function tom(delta: number, altaEhBoa: boolean): 'bom' | 'ruim' | 'neutro' {
  if (Math.abs(delta) < 0.05) return 'neutro'
  return delta > 0 === altaEhBoa ? 'bom' : 'ruim'
}

function variacaoRelativa(atual: number, anterior: number): Variacao {
  if (anterior === 0) return null
  const pct = ((atual - anterior) / anterior) * 100
  return { texto: `${fmtSinal(pct, 0)}%`, tom: tom(pct, true) }
}

export function Indicadores({ atual, anterior, dias }: Props) {
  const media = mediaEstrelas(atual)
  const perdidos = pctPerdidos(atual)
  const mediaAnt = anterior ? mediaEstrelas(anterior) : null
  const perdidosAnt = anterior ? pctPerdidos(anterior) : null

  const itens: { rotulo: string; valor: string; variacao: Variacao }[] = [
    {
      rotulo: 'Leads',
      valor: fmt(atual.leads),
      variacao: anterior ? variacaoRelativa(atual.leads, anterior.leads) : null,
    },
    {
      rotulo: 'Média de estrelas',
      valor: media === null ? '—' : fmt(media, 1),
      variacao:
        media !== null && mediaAnt !== null
          ? { texto: fmtSinal(media - mediaAnt, 1), tom: tom(media - mediaAnt, true) }
          : null,
    },
    {
      rotulo: 'Leads perdidos',
      valor: perdidos === null ? '—' : fmtPct(perdidos),
      variacao:
        perdidos !== null && perdidosAnt !== null
          ? {
              texto: `${fmtSinal(perdidos - perdidosAnt, 1)} p.p.`,
              tom: tom(perdidos - perdidosAnt, false),
            }
          : null,
    },
    {
      rotulo: 'Reuniões agendadas',
      valor: fmt(atual.reunioes),
      variacao: anterior
        ? variacaoRelativa(atual.reunioes, anterior.reunioes)
        : null,
    },
  ]

  return (
    <section
      aria-label="Números principais"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className="flex min-w-0 flex-col gap-1 rounded-lg border border-border p-4"
        >
          <span className="text-sm text-muted-foreground">{item.rotulo}</span>
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {item.valor}
          </span>
          {item.variacao && (
            <span className="text-xs text-muted-foreground">
              <span
                className={cn(
                  'font-medium tabular-nums',
                  item.variacao.tom === 'bom' && 'text-emerald-700',
                  item.variacao.tom === 'ruim' && 'text-red-700',
                )}
              >
                {item.variacao.texto}
              </span>{' '}
              vs. {dias} dias anteriores
            </span>
          )}
        </div>
      ))}
    </section>
  )
}
