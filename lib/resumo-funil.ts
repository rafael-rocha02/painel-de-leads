import {
  VOLUME_BAIXO,
  mediaEstrelas,
  pctPerdidos,
  somar,
  somarDias,
  type FunilData,
  type Totais,
} from '@/lib/funil'

const arredondar = (valor: number | null, casas: number) =>
  valor === null ? null : Number(valor.toFixed(casas))

function indicadores(t: Totais) {
  return {
    leads: t.leads,
    media_estrelas: arredondar(mediaEstrelas(t), 2),
    pct_perdidos: arredondar(pctPerdidos(t), 1),
    reunioes: t.reunioes,
  }
}

export function montarResumo(
  dados: FunilData,
  periodo: number,
  origens: string[],
) {
  const dias = dados.serie.map((s) => s.dia)
  if (dias.length === 0) return null

  const fim = dias.reduce((a, b) => (a > b ? a : b))
  const primeiroDia = dias.reduce((a, b) => (a < b ? a : b))
  const inicio = somarDias(fim, -(periodo - 1))
  const inicioAnterior = somarDias(inicio, -periodo)
  const fimAnterior = somarDias(inicio, -1)
  const temAnterior = primeiroDia <= inicioAnterior

  const noPeriodo = (dia: string) => dia >= inicio && dia <= fim
  const noAnterior = (dia: string) => dia >= inicioAnterior && dia <= fimAnterior

  const porOrigem = origens.map((origem) => {
    const atual = somar(
      dados.serie.filter((s) => s.origem === origem && noPeriodo(s.dia)),
    )
    const anterior = temAnterior
      ? somar(dados.serie.filter((s) => s.origem === origem && noAnterior(s.dia)))
      : null

    const motivos = new Map<string, number>()
    for (const m of dados.motivos) {
      if (m.origem === origem && noPeriodo(m.dia))
        motivos.set(m.motivo, (motivos.get(m.motivo) ?? 0) + m.qtd)
    }

    return {
      origem,
      ...indicadores(atual),
      periodo_anterior: anterior ? indicadores(anterior) : null,
      volume_baixo: atual.leads < VOLUME_BAIXO,
      motivos_perda: [...motivos.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([motivo, qtd]) => ({ motivo, qtd })),
    }
  })

  const selecionada = (o: string) => origens.includes(o)
  const totalAtual = somar(
    dados.serie.filter((s) => selecionada(s.origem) && noPeriodo(s.dia)),
  )
  const totalAnterior = temAnterior
    ? somar(dados.serie.filter((s) => selecionada(s.origem) && noAnterior(s.dia)))
    : null

  return {
    periodo: { inicio, fim, dias: periodo },
    periodo_anterior: temAnterior
      ? { inicio: inicioAnterior, fim: fimAnterior }
      : null,
    origens: porOrigem,
    totais: {
      ...indicadores(totalAtual),
      periodo_anterior: totalAnterior ? indicadores(totalAnterior) : null,
    },
  }
}
