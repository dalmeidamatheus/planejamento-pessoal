# Contribuindo

Obrigado por querer ajudar! O projeto é propositalmente simples: HTML, CSS e JavaScript puros, sem bundler.

## Como começar

```bash
git clone https://github.com/dalmeidamatheus/planejamento-pessoal.git
cd planejamento-pessoal
npm run dev      # http://localhost:3000 (modo local, sem Supabase)
```

## Antes de abrir um pull request

1. Rode `npm run check` (sintaxe e referências do `index.html`).
2. Teste a mudança no navegador, de preferência com os dados de exemplo (*Ajustes → Carregar dados de exemplo*).
3. Mantenha **um arquivo por responsabilidade**: telas em `public/js/modules/<área>/`, utilitários em `public/js/core/`, estilos em `public/css/<área>.css`.
4. Escape todo texto vindo do usuário com `esc()` antes de colocá-lo em HTML.
5. Não inclua chaves, tokens nem dados pessoais. A `service_role` do Supabase nunca vai para o front-end.
6. Se criar um arquivo JS novo, adicione-o ao `public/index.html` e a `scripts/js-order.json`.

## Convenções

- Código sem comentários: prefira nomes claros e funções pequenas. A documentação fica no `README.md` e em `docs/ARCHITECTURE.md`.
- Textos da interface em português do Brasil.
- Commits curtos e no imperativo (ex.: `Adiciona filtro por cartão`).

## Ideias bem-vindas

Veja o *Roadmap* no [README](README.md). Abra uma issue antes de começar algo grande para alinharmos a abordagem.
