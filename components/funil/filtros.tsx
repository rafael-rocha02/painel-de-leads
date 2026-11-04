'use client'

import { cn } from '@/lib/utils'
import { ORIGEM_COR, PERIODOS, type Periodo } from '@/lib/funil'

type Props = {
  periodo: Periodo
  onPeriodo: (p: Periodo) => void
  origens: string[]
  selecionadas: string[]
  onAlternar: (origem: string) => void
}

export function Filtros({
  periodo,
  onPeriodo,
  origens,
  selecionadas,
  onAlternar,
}: Props) {
  return (
    <section
      aria-label="Filtros"
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-10"
    >
      <div className="flex flex-col gap-2">
        <span id="rotulo-periodo" className="text-sm font-medium">
          Período
        </span>
        <div
          role="radiogroup"
          aria-labelledby="rotulo-periodo"
          className="inline-flex w-fit rounded-md border border-border p-0.5"
        >
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={periodo === p}
              onClick={() => onPeriodo(p)}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                periodo === p
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Últimos {p} dias
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="rotulo-origens" className="text-sm font-medium">
          Origens
        </span>
        <div
          role="group"
          aria-labelledby="rotulo-origens"
          className="flex flex-wrap gap-2"
        >
          {origens.map((origem) => {
            const ativa = selecionadas.includes(origem)
            return (
              <button
                key={origem}
                type="button"
                aria-pressed={ativa}
                onClick={() => onAlternar(origem)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                  ativa
                    ? 'border-foreground/60 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full border"
                  style={{
                    borderColor: ORIGEM_COR[origem],
                    backgroundColor: ativa ? ORIGEM_COR[origem] : 'transparent',
                  }}
                />
                {origem}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
