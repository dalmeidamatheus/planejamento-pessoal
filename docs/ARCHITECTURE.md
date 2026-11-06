# Arquitetura do Norte

Este documento explica como o código está organizado e as regras de negócio mais delicadas.

## 1. Carregamento e organização do código

O `public/index.html` carrega os arquivos como **scripts clássicos, em ordem**. Todos compartilham o escopo global, então `const` e `function` de um arquivo ficam visíveis nos seguintes. A ordem está em [`scripts/js-order.json`](../scripts/js-order.json) e o `npm run check` confirma que todo arquivo referenciado existe.

Ordem lógica:

1. `config.js`
2. `core/` (util → time → state → auth → shell → charts → markdown)
3. `modules/calendar/*`
4. `modules/finance/*`
5. `modules/wishlist/*`, `modules/trips/*`
6. `modules/tasks`, `habits`, `notes/*`, `home`, `palette/*`, `settings`, `seed`
7. `main.js` (inicialização, sempre por último)

### Registros globais

Cada módulo se pluga ao núcleo preenchendo dicionários definidos em `core/state.js`:

| Registro | Papel |
|---|---|
| `VIEWS[nome]` | função que devolve o HTML da aba |
| `AFTER[nome]` | gancho executado depois de renderizar a aba |
| `TITLES[nome]` | título exibido na barra superior |
| `ACT[nome]` | ação disparada por clique em `[data-act="nome"]` |
| `SUBMIT[nome]` | tratador de `<form data-form="nome">` |
| `INP[nome]` | tratador de `input`/`change` em `[data-in]` e `[data-ch]` |

### Ciclo de renderização

`render()` (em `core/shell.js`) escolhe a aba pela hash (`#/calendar`, `#/finance`…), preenche `#main` com `VIEWS[aba]()` e chama `AFTER[aba]`. Os eventos usam **delegação** em `document`: o clique sobe até o elemento com `data-act` e chama `ACT[...]`. Não há `onclick` inline.

## 2. Persistência

`core/state.js` mantém o estado em `S`. Cada alteração chama `save()`, que:

1. grava imediatamente no `localStorage` (`fox:data:<id>`);
2. agenda, com *debounce* de 700 ms, o `upsert` do documento inteiro em `user_data` no Supabase.

No carregamento, vale o documento mais recente entre o local e o remoto (`_ts`). A estratégia é **última gravação vence**.

Sem Supabase, `core/auth.js` usa contas locais (hash SHA-256 com sal) e a mesma camada de dados.

## 3. Tempo, fusos e recorrências

Para evitar bugs de fuso e horário de verão, o calendário usa **datas de parede**: um `Date` cujos campos **UTC** representam a hora que o relógio de um fuso marca (`toWall`, `fromWall` em `core/time.js`).

- O compromisso guarda `start` e `end` como `YYYY-MM-DDTHH:mm` no **fuso do próprio evento** (`tz`).
- A exibição converte para o fuso do usuário só na borda: `toWall(instante, fusoDoUsuario)`.
- Compromissos de dia inteiro não têm fuso.

`occurrences(evento, de, até)` (`calendar/occurrences.js`) expande a recorrência dia a dia, sempre na hora de parede do evento, e converte cada ocorrência para instante:

| Regra | Condição |
|---|---|
| diária | `dias desde o início % intervalo == 0` |
| semanal | semana `% intervalo == 0` e dia da semana em `days` |
| mensal | mês `% intervalo == 0` e dia igual ao do início (limitado ao último dia do mês) |
| anual | ano `% intervalo == 0`, mesmo mês e dia |

Exceções (`ex`) removem ocorrências por data. Mover **uma** ocorrência de uma série adiciona a data em `ex` e cria um evento avulso.

**Conflitos:** `occs()` varre as ocorrências ordenadas por início e marca as que se sobrepõem; a mesma função alimenta o aviso do formulário e o aviso ao arrastar.

**Arrastar e soltar** (`calendar/dragdrop.js`): usa *pointer events*. O deslocamento vertical é arredondado a 15 min; o dia de destino vem de `elementFromPoint` (`[data-date]`). Ao soltar, o deslocamento é aplicado sobre o instante e convertido de volta para o fuso do evento.

**Aniversários** não são eventos gravados: `birthdayOccs()` injeta ocorrências de dia inteiro, ano a ano, dentro de `occs()`. O `birthdayTick()` dispara as notificações.

## 4. Regras financeiras

- **Competência:** tudo é contado pela **data de vencimento/pagamento** da transação. Cada parcela de cartão é uma transação própria, no mês do vencimento da sua fatura.
- **Status:** `paid`, ou `pending` e, se a data já passou, `overdue` (calculado em `stat()`).
- **Recorrentes:** a lista `recur` guarda modelos. `monthTx(mês)` junta as transações reais do mês com ocorrências **virtuais** dos modelos; pagar uma virtual a materializa como transação real (`tpl` e `tplYm` evitam duplicar).
- **Fatura de cartão:** compra feita *depois* do dia de fechamento entra na fatura do mês seguinte (`invYm`). O vencimento (`dueDate`) cai no mês seguinte ao do fechamento quando o dia de vencimento é menor ou igual ao de fechamento.
- **Parcelamento:** o total é dividido em centavos (o resto vai para as primeiras parcelas); cada parcela guarda `invoice`, `no` e `of`.
- **Limite:** `limite − soma das transações do cartão ainda não pagas`.
- **Patrimônio:** saldo inicial + transações pagas até a data + valor dos investimentos na data.
- **Investimentos (saldo conferido):** cada investimento guarda `checks` (`{d, v}`: saldo visto em uma data) e `moves` (`{d, a}`: aporte positivo ou resgate negativo feitos pelo usuário). O valor em uma data é o último saldo conferido até ela mais as movimentações posteriores a essa conferência (`assetVal`). Entre duas conferências consecutivas, `rendimento = saldo_atual − saldo_anterior − movimentações_do_intervalo`; a rentabilidade do intervalo usa o método de Dietz modificado, `rendimento / (saldo_anterior + movimentações / 2)`, e a rentabilidade total encadeia os intervalos. O capital aportado é o saldo da primeira conferência (menos o rendimento até ali) mais as movimentações. Dados antigos (`contribs` e `manual`) são migrados na carga (`normAssets`).

## 5. Lista de desejos e monitor de preço

**Juros:** parcela pela Tabela Price, `PMT = P · i / (1 − (1 + i)^−n)`; sem juros, `P / n`. O total é `PMT · n` e os juros pagos são `total − P`.

**Histórico de preço:** `priceHist(item)` une os pontos locais (`item.hist`, de edições e verificações manuais) com os do servidor (`price_watch.history`), ordena por data e **mantém só os pontos em que o preço mudou**.

Fluxo do monitor:

```
Vercel Cron (diário) ─▶ /api/cron-prices  (Bearer CRON_SECRET)
   ├─ lê user_data.wishlist de todos os usuários (service_role)
   ├─ para cada item monitorado: lib/price.js busca a página e extrai o preço
   └─ grava em price_watch; só acrescenta ao histórico se o preço mudou

App aberto ─▶ loadWatch() lê price_watch (RLS) ─▶ wishTick()
   └─ compara com o último preço visto (item.seenPrice) e com o alvo,
      gerando notificações de queda, alta ou meta atingida
```

`lib/price.js` tenta, em ordem: JSON-LD (`schema.org/Offer`), meta tags (`product:price:amount`, `og:price:amount`, `itemprop="price"`) e, por último, o primeiro `R$ 0,00` do texto (marcado como baixa confiança). Antes de cada requisição, valida o endereço contra IPs privados.

## 6. Viagens

`tripCalc()` soma os itens aplicando o multiplicador (`fixo`, `pessoa`, `dia`, `pessoa_dia`) com o número de pessoas e de dias da viagem. O valor mensal é `faltante / ceil(dias até a ida / 30,44)`, com mínimo de 1 mês.

## 7. Filtros

Cada tela guarda seus filtros em `ui.<tela>` (por exemplo `ui.fin.f`, `ui.cal.f`, `ui.tasks`). Selecionar uma opção grava o valor e chama `render()`; campos de texto usam `renderKeep()` (em `core/shell.js`), que renderiza de novo e devolve o foco e o cursor ao campo. Na aba Transações, `txFiltered()` junta os meses do período com `monthTx()` (inclusive recorrências previstas), aplica os filtros e a ordenação, e `txGroups()` agrega o resultado para a visão agrupada.

## 8. Como adicionar uma nova aba

1. Crie `public/js/modules/minha-aba.js` e registre:
   ```js
   TITLES.minhaAba = 'Minha aba';
   VIEWS.minhaAba = () => `<div class="card">...</div>`;
   ACT.minhaAcao = el => { /* ... */ };
   ```
2. Se precisar de dados persistentes, adicione a chave em `emptyData()` (`core/state.js`).
3. Inclua a aba em `NAV` (`core/shell.js`) e um ícone em `I` (`core/util.js`).
4. Adicione o `<script>` no `public/index.html` (e em `scripts/js-order.json`).
5. Se tiver CSS próprio, crie `public/css/minha-aba.css` e o `<link>` correspondente.
6. Rode `npm run check`.

## 9. Testes

Não há suíte automatizada de interface. O `npm run check` valida a sintaxe de todos os `.js` e as referências do `index.html`, e roda no CI a cada push e pull request. Funções puras (`pmt`, `occurrences`, `lib/price.js`) são fáceis de testar com `node` por serem independentes do DOM.
