# Painel de leads

Dashboard funcional e publicado, onde o marketing acompanha ao longo do tempo a qualidade dos leads de cada origem e pode fazer perguntas sobre os dados, com respostas do Gemini baseadas nos números do período escolhido.

**Painel no ar:** https://painel-de-leads-rafael.vercel.app

Construí este painel na VExpenses como complemento ao [agente de leads](https://github.com/rafael-rocha02/agente-de-leads): o agente manda o resumo de cada dia no Slack, e o painel mostra a evolução ao longo das semanas. Esta é uma recriação publicada com dados fictícios.

## O que o painel permite

- Filtrar por período (7, 14 ou 30 dias) e por origem do lead.
- Ver leads, média de estrelas, % de perdidos e reuniões agendadas, comparados com o período anterior.
- Acompanhar por dia o volume e a qualidade de cada origem.
- Ver os motivos de perda de cada origem.
- Perguntar aos dados, por exemplo "Qual origem devo priorizar?".

## Como funciona

- **Construído com vibe coding** no v0, em Next.js, TypeScript, Tailwind e Recharts, e publicado na Vercel.
- **Dados direto do CRM por API.** A rota `app/api/funil` busca os negócios na API do Pipedrive e devolve os números já agregados por dia e origem. O token fica só no servidor.
- **Perguntas respondidas pelo Gemini.** A rota `app/api/perguntar` monta um resumo do recorte escolhido e envia ao Gemini com regras explícitas: responder só com os números fornecidos e avisar quando o volume é baixo.
- **Sempre disponível.** Se o CRM falhar ou demorar, o painel usa uma cópia dos dados (`data/snapshot-funil.json`). Se um modelo do Gemini estiver ocupado ou for descontinuado, tenta outro.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `PIPEDRIVE_DOMAIN` | Subdomínio da conta do Pipedrive |
| `PIPEDRIVE_API_TOKEN` | Token da API do Pipedrive |
| `GEMINI_API_KEY` | Chave da API do Gemini |
| `GEMINI_MODEL` | Opcional: modelo preferido do Gemini |

Sem as variáveis do Pipedrive, o painel funciona com a cópia dos dados.

---

Feito por [Rafael Augusto Barbosa da Rocha](https://www.linkedin.com/in/rafael-rocha02/).
