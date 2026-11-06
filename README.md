<div align="center">

# Planejamento Pessoal

**Organização pessoal all-in-one: calendário, finanças, tarefas, hábitos, notas, lista de desejos, viagens e aniversários em um só lugar.**

[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-1d1c1a.svg)](LICENSE)
![Sem build](https://img.shields.io/badge/front--end-HTML%20%2B%20CSS%20%2B%20JS%20puro-1d1c1a.svg)
![Supabase](https://img.shields.io/badge/auth%20%2B%20dados-Supabase-3ecf8e.svg)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000.svg)
![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-2b5bd7.svg)

<img src="docs/screenshots/inicio.jpg" alt="Página inicial" width="880">

</div>

---

## Sumário

- [Visão geral](#visão-geral)
- [Capturas de tela](#capturas-de-tela)
- [Recursos](#recursos)
- [Criar por texto (Ctrl+K)](#criar-por-texto-ctrlk)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Stack e decisões de projeto](#stack-e-decisões-de-projeto)
- [Arquitetura](#arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Rodar localmente](#rodar-localmente)
- [Modelo de dados](#modelo-de-dados)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Limitações conhecidas](#limitações-conhecidas)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Visão geral

O Norte reúne em uma interface limpa e rápida (inspirada em Notion, Linear e Raycast) tudo o que costuma ficar espalhado em vários aplicativos:

| Área | O que resolve |
|---|---|
| **Calendário** | Agenda com arrastar e soltar, conflitos, recorrências complexas, fusos horários e lembretes |
| **Finanças** | Fluxo de caixa, cartões com fatura e parcelamento, investimentos, orçamentos e metas |
| **Tarefas** | Kanban sincronizado com blocos de tempo no calendário |
| **Hábitos** | Sequências, aderência e mapa de consistência |
| **Notas** | Markdown, vínculo com eventos e transações, gravação e resumo de reuniões |
| **Desejos** | Itens que você quer comprar, com peso no salário, parcelas com juros e monitor de preço |
| **Viagens** | Caixinhas que calculam quanto separar por mês até a data da viagem |
| **Aniversários** | Aparecem todo ano no calendário e avisam no dia com 🎂 |

Cada usuário tem **login próprio e dados isolados** (Supabase com Row Level Security). Sem Supabase configurado, o app roda em **modo local** (contas e dados só no navegador), ótimo para testar.

Não há framework nem etapa de build de front-end: são arquivos estáticos organizados por responsabilidade, simples de ler, alterar e publicar.

## Capturas de tela

> As imagens usam os dados de exemplo (*Ajustes → Carregar dados de exemplo*).

| Calendário (semana, conflitos e aniversários) | Cartões, fatura e limite |
|---|---|
| <img src="docs/screenshots/calendario.jpg" alt="Calendário semanal"> | <img src="docs/screenshots/cartoes.jpg" alt="Cartões de crédito"> |

| Lista de desejos | Histórico de preço (só datas em que mudou) |
|---|---|
| <img src="docs/screenshots/desejos.jpg" alt="Lista de desejos"> | <img src="docs/screenshots/preco-historico.jpg" alt="Gráfico de preço do item"> |

| Caixinhas de viagem |
|---|
| <img src="docs/screenshots/viagens.jpg" alt="Caixinhas de viagem"> |

## Recursos

### Calendário e gestão de tempo

- **Visões:** mês, semana, dia e agenda em lista.
- **Arrastar e soltar:** mova compromissos entre horários e dias (passos de 15 min) e **redimensione** o bloco pela borda inferior. `Esc` cancela o arrasto.
- **Conflitos:** sobreposições são detectadas automaticamente e marcadas com listras e aviso, tanto ao criar quanto ao mover.
- **Recorrências:** diária, semanal (inclusive “toda terça e quinta”), quinzenal (semanal a cada 2), mensal e anual, com intervalo e data final. Ao arrastar uma ocorrência o sistema pergunta se vale só para ela (cria uma exceção) ou para a série toda.
- **Fusos horários:** cada compromisso tem seu fuso; a exibição usa o seu fuso, e há relógios extras na barra lateral.
- **Lembretes:** de 0 min a 1 dia antes, com central de notificações no app e alertas do navegador.
- **Detalhes do compromisso:** prioridade (alta, média, baixa), categorias coloridas (Trabalho, Saúde, Lazer, Estudos, Pessoal), subtarefas, links e anexos por URL, dia inteiro.
- **Aniversários:** cadastro no botão do calendário. Aparecem todo ano como evento de dia inteiro (com a idade, se informar o ano), notificam **no dia** e, se quiser, 1, 3 ou 7 dias antes.
- **Exportação `.ics`:** compromissos e aniversários, compatível com Google Agenda, Apple Calendar e Outlook.

### Finanças

- **Painel:** entradas × saídas dos últimos 6 meses, despesas por categoria (rosca) e evolução patrimonial de 12 meses.
- **Transações:** entradas e saídas com categoria, subcategoria, forma de pagamento (cartão, Pix, débito, boleto, dinheiro, transferência) e status **pago, pendente ou atrasado** (calculado pela data). Lançamentos **recorrentes mensais** (a cada N meses, com data final) viram pendências automáticas; você pode pagar, editar ou pular um mês.
- **Cartões de crédito:** limite, dia de fechamento e vencimento, **melhor dia de compra**, fatura por mês e botão de pagar fatura.
- **Parcelamento:** a compra é dividida em até 60 parcelas, cada uma na fatura correta (compras após o fechamento caem na fatura seguinte). O **limite** é consumido pelas parcelas em aberto e liberado quando a fatura é paga; compras acima do limite pedem confirmação.
- **Comprometimento da renda futura:** gráfico de 12 meses com tudo que já está parcelado ou em fatura e o percentual da sua renda.
- **Investimentos:** ativos por tipo (renda fixa, ações, cripto, fundos imobiliários, fundos), aportes, rentabilidade estimada a.a., valor atual (estimado ou manual), alocação e proventos recebidos. Aportes e proventos podem gerar a transação correspondente.
- **Orçamentos e metas:** teto por categoria com barra que fica **amarela em 80% e vermelha em 100%**; metas de economia mensal, anual (calculadas sozinhas) e por objetivo.
- **Exportação CSV** das transações do mês, respeitando os filtros (separador `;`, abre direto no Excel).

> As despesas no cartão entram no mês de **vencimento da fatura**, cada parcela no seu mês.

### Tarefas, hábitos e notas

- **Kanban** (A fazer, Em andamento, Concluído) com arrastar e soltar, prioridades, categorias e prazos. Agende uma tarefa como **bloco no calendário**; concluir a tarefa marca o bloco como feito.
- **Hábitos:** marcação diária dos últimos 14 dias, sequência atual e melhor sequência, aderência em 30 dias, gráfico diário e mapa de 13 semanas.
- **Notas em Markdown** com edição, leitura ou tela dividida, busca e **vínculo a um evento ou a uma transação**.
- **Reuniões:** botão *Gravar reunião* com **transcrição ao vivo em português** (Web Speech API) escrita na nota com marcação de tempo. Ao parar, o sistema gera **resumo, decisões e ações** e oferece criar tarefas a partir das ações. Com a chave da Anthropic configurada, o resumo usa IA (`/api/summarize`); sem ela, usa um resumo local por palavras-chave.

### Lista de desejos

- Um **bloco por item** com link, preço, prioridade, foto (quando o link a fornece) e etiquetas.
- **Peso no salário:** percentual do preço à vista e da parcela sobre a sua renda (campo em *Ajustes* ou estimativa pelas entradas recorrentes).
- **Parcelas e juros:** informe número de parcelas e juros ao mês; o sistema calcula a parcela pela Tabela Price, o total e **quanto você paga de juros**.
- **Preço-alvo** (avisa quando chegar) e **“quero comprar até”** (mostra quanto separar por mês).
- **Gráfico de preço** ao clicar no bloco, em degraus e **somente com as datas em que o preço mudou**, com menor e maior preço e variação percentual.
- **Monitor de preço:** com “Monitorar” ligado, um cron diário lê o link, extrai o preço e registra apenas as mudanças. Você recebe 🏷️ queda, 📈 alta e 🎯 meta atingida. Também há *Verificar preço agora*.
- Integra com Finanças: *Registrar compra* abre a transação já preenchida.

### Viagens

- **Caixinha por viagem** com orçamento por categoria (passagens, hospedagem, alimentação, transporte, passeios, compras, seguro, outros).
- Cada custo pode ser **valor fixo, por pessoa, por dia ou por pessoa/dia**.
- Calcula **quanto separar por mês e por semana** até a data de ida, quanto isso pesa no salário, o progresso da caixinha e a contagem regressiva.
- Depósitos podem virar saída na categoria *Viagens*; um botão põe a viagem no calendário.

### Busca global e criação rápida

`Ctrl/Cmd + K` abre a paleta: navega para qualquer área, busca em compromissos, transações, tarefas, notas, hábitos, desejos, viagens e aniversários, e **cria itens por linguagem natural**.

### Extras

- **PWA:** instalável e abre offline (service worker com “rede primeiro”).
- **Backup:** exporta e importa tudo em JSON.
- **Dados de exemplo** para conhecer o sistema e **apagar tudo** quando quiser.
- Responsivo, com tema claro refinado, fonte Inter, bordas discretas e microinterações leves.

## Criar por texto (Ctrl+K)

| Digite | O que acontece |
|---|---|
| `reunião amanhã 14h por 2h` | Agenda “Reunião” amanhã das 14h às 16h |
| `toda terça e quinta 19h academia` | Cria evento recorrente semanal |
| `consulta dia 15 9h30` | Agenda para o dia 15 às 9h30 |
| `gasto 45,90 mercado` | Registra saída (categoria Alimentação) |
| `recebi 1.200 freela` | Registra entrada |
| `tarefa enviar proposta` | Cria tarefa em “A fazer” |
| `nota ideia para o projeto` | Cria uma nota |
| `aniversário Ana 15/03/1994` | Cadastra o aniversário |
| `desejo fone 349,90 https://loja.com/fone` | Adiciona à lista de desejos |

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl/Cmd + K` | Paleta de comandos |
| `Alt + 1…8` | Ir para cada aba |
| `N` | Novo item da aba atual |
| `T` · `←` `→` | Calendário: hoje · período anterior/próximo |
| `M` `S` `D` `A` | Calendário: mês, semana, dia, agenda |
| `?` | Lista de atalhos |
| `Esc` | Fecha janelas e cancela o arrasto |

## Stack e decisões de projeto

| Camada | Tecnologia | Por quê |
|---|---|---|
| Front-end | HTML, CSS e JavaScript puros, sem framework e sem bundler | Zero dependências no front, publicação trivial, fácil de auditar |
| Login e dados | Supabase (Auth + Postgres + RLS) | Usuários isolados sem servidor próprio |
| Back-end | Funções serverless da Vercel (`api/`) | IA, leitura de preço e cron, só quando necessário |
| Hospedagem | Vercel | Deploy a cada `git push` e cron nativo |
| Gráficos | SVG gerado no código | Leve, sem biblioteca |

Decisões importantes:

- **Um documento JSON por usuário** (`user_data.data`). É simples, seguro com RLS e rápido; trocar por tabelas relacionais é possível porque cada lista do documento mapeia 1:1 para uma tabela (veja [Modelo de dados](#modelo-de-dados)).
- **Scripts clássicos em ordem**, não módulos ES: todos compartilham o escopo global, e cada módulo registra suas telas e ações em dicionários (`VIEWS`, `ACT`, `SUBMIT`, `INP`). Para criar uma aba nova basta um arquivo e uma linha no `index.html`.
- **Horário de parede + fuso:** compromissos guardam data/hora local e o fuso; as contas de calendário usam “datas de parede” e só convertem na borda. Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Arquitetura

```
 Navegador (public/)                         Vercel (api/)                     Supabase
┌──────────────────────────────┐   POST    ┌──────────────────────┐
│ index.html + css/ + js/      │──────────▶│ /api/summarize  (IA) │──▶ Anthropic API
│  core/    estado, auth, shell│  (JWT)    │ /api/price (preço)   │──▶ página da loja
│  modules/ calendário, finanças│          └──────────────────────┘
│           desejos, viagens…  │                    ▲ cron diário
│  PWA: manifest + sw.js       │                    │ (CRON_SECRET)
└──────────────┬───────────────┘           ┌──────────────────────┐
               │ supabase-js (anon + RLS)  │ /api/cron-prices     │
               ▼                           └──────────┬───────────┘
        ┌─────────────────────────────────────────────▼───────────┐
        │ Postgres:  user_data (1 doc/usuário)  ·  price_watch     │
        │ Auth:      e-mail e senha                                │
        └─────────────────────────────────────────────────────────┘
```

Mais detalhes (ciclo de renderização, tempo e recorrências, regras financeiras, fluxo do monitor de preço) em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estrutura do repositório

```
norte/
├── public/                         site estático (outputDirectory da Vercel)
│   ├── index.html                  carrega CSS e JS na ordem correta
│   ├── manifest.webmanifest        PWA
│   ├── sw.js                       service worker (rede primeiro)
│   ├── icon.svg
│   ├── css/
│   │   ├── base · controls · layout · overlays · auth
│   │   ├── calendar · tasks · habits · notes · palette
│   │   └── finance · wishlist · trips · responsive
│   └── js/
│       ├── config.js               configuração (gerado no build pelas variáveis de ambiente)
│       ├── main.js                 inicialização
│       ├── core/                   util · time · state · auth · shell · charts · markdown
│       └── modules/
│           ├── calendar/           occurrences · views · dragdrop · event-modal
│           │                       notifications · ics · shortcuts · birthdays
│           ├── finance/            data · index · overview · transactions · filters
│           │                       tx-form · cards · investments · budgets
│           ├── wishlist/           pricing · wishlist · item-modal · monitor
│           ├── trips/              trips · trip-modal
│           ├── notes/              notes · recorder · summary
│           ├── palette/            nl-parser · palette
│           └── tasks · habits · home · settings · seed
├── api/                            funções serverless
│   ├── summarize.js                resumo de reunião com IA
│   ├── price.js                    leitura de preço de um link
│   └── cron-prices.js              cron diário do monitor de preços
├── lib/                            código compartilhado das funções
│   ├── price.js                    extração de preço (JSON-LD, meta tags, texto) com proteção SSRF
│   └── auth.js                     validação do JWT do Supabase
├── scripts/
│   ├── build-config.js             gera public/js/config.js a partir das variáveis de ambiente
│   ├── check.js                    valida sintaxe e referências do index.html
│   ├── js-order.json               ordem de carregamento dos scripts
│   └── dev-server.js               servidor estático local
├── supabase/schema.sql             tabelas e políticas RLS
├── docs/                           arquitetura e capturas de tela
├── .github/workflows/ci.yml        integração contínua
├── vercel.json                     build, cabeçalhos de segurança e cron
├── package.json
└── .env.example
```

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `SUPABASE_URL` | Para login na nuvem | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Para login na nuvem | Chave pública (a segurança vem do RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Para o monitor de preço | Usada **somente** pelo cron, no servidor. Nunca exponha |
| `CRON_SECRET` | Para o monitor de preço | Texto aleatório longo (`openssl rand -hex 24`); a Vercel o envia ao cron |
| `ANTHROPIC_API_KEY` | Opcional | Resumo de reuniões com IA |
| `ANTHROPIC_MODEL` | Opcional | Modelo da IA (padrão `claude-haiku-5-5`) |
| `ALLOW_ANON_PRICE_CHECK` | Opcional | `1` libera `/api/price` sem login em deploys sem Supabase (não recomendado) |

Sem `SUPABASE_URL` e `SUPABASE_ANON_KEY` o app funciona em **modo local**. As variáveis são gravadas em `public/js/config.js` durante o build por [`scripts/build-config.js`](scripts/build-config.js).

## Rodar localmente

Requer Node.js 18 ou superior.

```bash
npm run dev       # http://localhost:3000, modo local, sem Supabase
npm run check     # valida a sintaxe de todos os .js e as referências do index.html
```

Para testar com Supabase localmente, preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `public/js/config.js`. As funções de `api/` só rodam na Vercel (ou com `vercel dev`); localmente o app cai no resumo local e pede para atualizar o preço manualmente.

## Modelo de dados

Cada usuário tem uma linha em `user_data` com um documento JSON:

| Chave | Conteúdo |
|---|---|
| `settings` | fuso, relógios extras, saldo inicial, renda mensal, exibir aniversários |
| `events` | compromissos: início, fim, fuso, dia inteiro, categoria, prioridade, recorrência, exceções, subtarefas, links, lembrete |
| `tx` | transações: tipo, valor, data, categoria, forma de pagamento, status, cartão, fatura, parcela |
| `recur` | modelos de lançamentos mensais recorrentes |
| `cards`, `budgets`, `goals` | cartões, orçamentos por categoria e metas |
| `assets`, `divs` | investimentos (com aportes) e proventos |
| `tasks`, `habits`, `notes` | tarefas, hábitos (com histórico) e notas |
| `birthdays` | aniversários (nome, dia, mês, ano opcional, antecedência) |
| `wishlist` | desejos (link, preço, parcelas, juros, alvo, histórico local de preço) |
| `trips` | viagens (datas, pessoas, itens de orçamento, depósitos) |
| `notifs`, `fired` | central de notificações e controle de avisos já disparados |

A tabela `price_watch` (`user_id`, `item_id`, `url`, `last_price`, `last_checked`, `last_error`, `history`) guarda o histórico de preços gravado pelo cron. O usuário só **lê** as próprias linhas; quem escreve é o servidor.

## Segurança e privacidade

- **Isolamento por usuário:** RLS em `user_data` e `price_watch`; cada pessoa só enxerga a própria linha.
- **Chaves:** a `anon` é pública por design; a `service_role` fica **apenas** em variáveis da Vercel e é usada só no cron.
- **Funções protegidas:** `/api/summarize` e `/api/price` exigem o token de login; `/api/cron-prices` exige `CRON_SECRET`.
- **Leitor de preços (anti-SSRF):** aceita apenas `http`/`https` nas portas 80/443, bloqueia endereços privados e locais (verificados após a resolução de DNS e a cada redirecionamento), com limite de tempo (10 s) e de tamanho (1,5 MB).
- **XSS:** todo conteúdo digitado pelo usuário é escapado antes de ir para o HTML.
- **Cabeçalhos:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` (microfone liberado só para o próprio site).
- **Modo local:** as senhas ficam com hash SHA-256 e sal no navegador. Serve para demonstração, **não** como segurança real.
- **Transcrição de voz:** o Web Speech API envia o áudio ao provedor do navegador (Google, no Chrome).

## Limitações conhecidas

- **Monitor de preço:** lojas que bloqueiam acesso automatizado (as grandes costumam bloquear) ou que carregam o preço só por JavaScript não funcionam; nesses casos o item mostra o erro e você atualiza o preço manualmente. O cron do plano gratuito da Vercel roda **1 vez por dia**, e os avisos aparecem **com o app aberto** (não há push com o app fechado).
- **Sincronização:** como cada usuário é um único documento, usar dois aparelhos ao mesmo tempo resulta em “vale a última gravação”.
- **Transcrição de reunião:** não identifica quem está falando e depende do navegador (Chrome, Edge ou Safari). Para algo mais robusto, troque `notes/recorder.js` por um serviço de streaming (Deepgram, AssemblyAI).
- **Anexos:** são links; arquivos exigiriam Supabase Storage.
- **Moeda:** tudo em reais (BRL).


## Contribuindo

Contribuições são bem-vindas. Leia o [CONTRIBUTING.md](CONTRIBUTING.md) e rode `npm run check` antes de abrir um pull request.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
