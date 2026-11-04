'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MOTIVO_COR, fmt } from '@/lib/funil'

export type LinhaMotivos = { origem: string; total: number } & Record<
  string,
  string | number
>

type Props = {
  dados: LinhaMotivos[]
  motivos: string[]
}

type RotuloProps = {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  index?: number
}

export function MotivosPerda({ dados, motivos }: Props) {
  const altura = Math.max(dados.length * 64 + 40, 160)

  return (
    <section
      aria-label="Motivos de perda"
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div>
        <h2 className="text-base font-semibold">Motivos de perda por origem</h2>
        <p className="text-sm text-muted-foreground">
          Quantidade de leads perdidos no período, por motivo.
        </p>
      </div>

      {motivos.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">
          Nenhum lead perdido no período.
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {motivos.map((motivo) => (
              <li key={motivo} className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: MOTIVO_COR[motivo] ?? '#A3A3A3' }}
                />
                {motivo}
              </li>
            ))}
          </ul>

          <div className="w-full min-w-0" style={{ height: altura }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                layout="vertical"
                margin={{ top: 4, right: 36, bottom: 0, left: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid stroke="#E5E5E5" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#737373' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="origem"
                  width={108}
                  tickMargin={4}
                  tick={{ fontSize: 12, fill: '#171717', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#F5F5F5' }}
                  formatter={(valor) => fmt(Number(valor))}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: '#FFFFFF',
                    color: '#171717',
                    borderRadius: 6,
                    border: '1px solid #E5E5E5',
                    boxShadow: 'none',
                  }}
                />
                {motivos.map((motivo) => (
                  <Bar
                    key={motivo}
                    dataKey={motivo}
                    stackId="perdas"
                    fill={MOTIVO_COR[motivo] ?? '#A3A3A3'}
                    isAnimationActive={false}
                  >
                    {(
                      <LabelList
                        content={(props: RotuloProps) => {
                          const x = Number(props.x ?? 0) + Number(props.width ?? 0)
                          const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2
                          const linha = dados[props.index ?? -1]
                          if (!linha) return null
                          const ultimoComValor = [...motivos]
                            .reverse()
                            .find((m) => Number(linha[m] ?? 0) > 0)
                          if (motivo !== ultimoComValor) return null
                          return (
                            <text
                              x={x + 6}
                              y={y}
                              dominantBaseline="central"
                              fontSize={12}
                              fontWeight={600}
                              fill="#171717"
                            >
                              {fmt(linha.total)}
                            </text>
                          )
                        }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  )
}
