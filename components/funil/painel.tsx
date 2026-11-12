'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  PERIODOS,
  fmt,
  fmtDia,
  listarDias,
  mediaEstrelas,
  pctPerdidos,
  pctReuniao,
  somar,
  somarDias,
  type FunilData,
  type Periodo,
} from '@/lib/funil'
import { Filtros } from './filtros'
import { Indicadores } from './indicadores'
import { GraficoLinhas } from './grafico-linhas'
import { PergunteAosDados } from './pergunte-aos-dados'
import { TabelaOrigens, type LinhaOrigem } from './tabela-origens'
import { MotivosPerda, type LinhaMotivos } from './motivos-perda'

const buscar = async (url: string): Promise<FunilData> => {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error('Falha ao carregar')
  return resposta.json()
}

export function Painel() {
  const { data, error, isLoading } = useSWR('/api/funil', buscar, {
    revalidateOnFocus: false,
  })
  const [periodo, setPeriodo] = useState<Periodo>(PERIODOS[0])
  const [escolhidas, setEscolhidas] = useState<string[] | null>(null)

  const origens = data?.origens ?? []
  const selecionadas = escolhidas ?? origens
  const origensAtivas = origens.filter((o) => selecionadas.includes(o))

  function alternar(origem: string) {
    const atual = escolhidas ?? origens
    if (atual.includes(origem)) {
      if (atual.length === 1) return
      setEscolhidas(atual.filter((o) => o !== origem))
    } else {
      setEscolhidas([...atual, origem])
    }
  }

  const calculos = useMemo(() => {
    if (!data || data.serie.length === 0) return null

    const dias = data.serie.map((s) => s.dia)
    const ultimoDia = dias.reduce((a, b) => (a > b ? a : b))
    const primeiroDia = dias.reduce((a, b) => (a < b ? a : b))
    const inicio = somarDias(ultimoDia, -(periodo - 1))
    const inicioAnterior = somarDias(inicio, -periodo)
    const fimAnterior = somarDias(inicio, -1)
    const temAnterior = primeiroDia <= inicioAnterior

    const ativas = origensAtivas
    const serieAtual = data.serie.filter(
      (s) => ativas.includes(s.origem) && s.dia >= inicio && s.dia <= ultimoDia,
    )
    const serieAnterior = data.serie.filter(
      (s) =>
        ativas.includes(s.origem) && s.dia >= inicioAnterior && s.dia <= fimAnterior,
    )
    const motivosAtual = data.motivos.filter(
      (m) => ativas.includes(m.origem) && m.dia >= inicio && m.dia <= ultimoDia,
    )

    const totalAtual = somar(serieAtual)
    const totalAnterior = temAnterior ? somar(serieAnterior) : null

    const porDiaOrigem = new Map(
      serieAtual.map((s) => [`${s.dia}|${s.origem}`, s]),
    )
    const diasPeriodo = listarDias(inicio, ultimoDia)
    const leadsPorDia = diasPeriodo.map((dia) => {
      const linha: Record<string, string | number | null> = { dia }
      for (const o of ativas) linha[o] = porDiaOrigem.get(`${dia}|${o}`)?.leads ?? 0
      return linha
    })
    const estrelasPorDia = diasPeriodo.map((dia) => {
      const linha: Record<string, string | number | null> = { dia }
      for (const o of ativas) {
        const s = porDiaOrigem.get(`${dia}|${o}`)
        linha[o] = s && s.leads > 0 ? s.soma_estrelas / s.leads : null
      }
      return linha
    })

    const linhasTabela: LinhaOrigem[] = ativas.map((origem) => {
      const totais = somar(serieAtual.filter((s) => s.origem === origem))
      const porMotivo = new Map<string, number>()
      for (const m of motivosAtual.filter((m) => m.origem === origem))
        porMotivo.set(m.motivo, (porMotivo.get(m.motivo) ?? 0) + m.qtd)
      const principal = [...porMotivo.entries()].sort((a, b) => b[1] - a[1])[0]
      return {
        origem,
        leads: totais.leads,
        media: mediaEstrelas(totais),
        pctPerdidos: pctPerdidos(totais),
        reunioes: totais.reunioes,
        pctReuniao: pctReuniao(totais),
        motivo: principal ? principal[0] : null,
      }
    })

    const somaPorMotivo = new Map<string, number>()
    const linhasMotivos: LinhaMotivos[] = ativas.map((origem) => {
      const linha: LinhaMotivos = { origem, total: 0 }
      for (const m of motivosAtual.filter((m) => m.origem === origem)) {
        linha[m.motivo] = ((linha[m.motivo] as number) ?? 0) + m.qtd
        linha.total += m.qtd
        somaPorMotivo.set(m.motivo, (somaPorMotivo.get(m.motivo) ?? 0) + m.qtd)
      }
      return linha
    })
    const motivos = [...somaPorMotivo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m)

    return {
      inicio,
      ultimoDia,
      totalAtual,
      totalAnterior,
      leadsPorDia,
      estrelasPorDia,
      linhasTabela,
      linhasMotivos,
      motivos,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, periodo, escolhidas])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Painel de leads
        </h1>
      </header>

      {isLoading && (
        <p role="status" className="py-16 text-sm text-muted-foreground">
          Carregando dados do funil...
        </p>
      )}

      {error && (
        <p role="alert" className="py-16 text-sm text-red-700">
          Não foi possível carregar os dados. Tente recarregar a página.
        </p>
      )}

      {data && calculos && (
        <>
          <Filtros
            periodo={periodo}
            onPeriodo={setPeriodo}
            origens={origens}
            selecionadas={selecionadas}
            onAlternar={alternar}
          />

          <p className="-mt-3 text-sm text-muted-foreground">
            Período de {fmtDia(calculos.inicio)} a {fmtDia(calculos.ultimoDia)},{' '}
            {fmt(calculos.totalAtual.leads)} leads.
          </p>

          <Indicadores
            atual={calculos.totalAtual}
            anterior={calculos.totalAnterior}
            dias={periodo}
          />

          <PergunteAosDados periodo={periodo} origens={origensAtivas} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GraficoLinhas
              titulo="Leads por dia"
              descricao="Novos leads recebidos em cada dia, por origem."
              dados={calculos.leadsPorDia}
              origens={origensAtivas}
              formatar={(v) => fmt(v)}
            />
            <GraficoLinhas
              titulo="Média de estrelas por dia"
              descricao="Nota dada pelo SDR, de 1 a 5, por origem."
              dados={calculos.estrelasPorDia}
              origens={origensAtivas}
              dominio={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              formatar={(v) => fmt(v, 1)}
            />
          </div>

          <TabelaOrigens linhas={calculos.linhasTabela} />

          <MotivosPerda dados={calculos.linhasMotivos} motivos={calculos.motivos} />
        </>
      )}

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Dados fictícios a fim de preservar as informações originais da empresa
        </p>
      </footer>
    </main>
  )
}
