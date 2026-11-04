'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ORIGEM_COR, fmtDia } from '@/lib/funil'

type Props = {
  titulo: string
  descricao: string
  dados: Record<string, string | number | null>[]
  origens: string[]
  dominio?: [number, number]
  ticks?: number[]
  formatar: (valor: number) => string
}

export function GraficoLinhas({
  titulo,
  descricao,
  dados,
  origens,
  dominio,
  ticks,
  formatar,
}: Props) {
  return (
    <section
      aria-label={titulo}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {origens.map((origem) => (
          <li key={origem} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded"
              style={{ backgroundColor: ORIGEM_COR[origem] }}
            />
            {origem}
          </li>
        ))}
      </ul>

      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#E5E5E5" vertical={false} />
            <XAxis
              dataKey="dia"
              tickFormatter={fmtDia}
              tick={{ fontSize: 12, fill: '#737373' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E5E5' }}
              minTickGap={28}
            />
            <YAxis
              domain={dominio}
              ticks={ticks}
              tickFormatter={formatar}
              tick={{ fontSize: 12, fill: '#737373' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              labelFormatter={(dia) => fmtDia(String(dia))}
              formatter={(valor) => formatar(Number(valor))}
              contentStyle={{
                fontSize: 12,
                backgroundColor: '#FFFFFF',
                color: '#171717',
                borderRadius: 6,
                border: '1px solid #E5E5E5',
                boxShadow: 'none',
              }}
            />
            {origens.map((origem) => (
              <Line
                key={origem}
                type="linear"
                dataKey={origem}
                stroke={ORIGEM_COR[origem]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
