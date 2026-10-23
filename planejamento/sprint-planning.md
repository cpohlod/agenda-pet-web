# Sprint Planning — AgendaPet Web

## 1. Meta da Sprint (Sprint Goal)
Entregar uma aplicação web funcional, acessível e responsiva para a gestão diária de agendamentos do pet shop Patinhas & Cia, com validações em tempo real, persistência em localStorage e relatórios executáveis em Node.js.

## 2. Estimativa e Backlog da Sprint

Capacidade Total Planeada: **48 Story Points** (Escala de Fibonacci: 1, 2, 3, 5, 8).

| Ticket | História | Prioridade | Estimativa (Pontos) | Branch Planeada |
| :--- | :--- | :---: | :---: | :--- |
| **US01** | Estrutura semântica e acessível da página | Alta | 3 | `feat/US01-estrutura-semantica` |
| **US02** | Catálogo de serviços via fetch | Alta | 3 | `feat/US02-catalogo-servicos` |
| **US03** | Formulário de novo agendamento e validação | Alta | 5 | `feat/US03-formulario-agendamento` |
| **US04** | Endereço automático por CEP (ViaCEP) | Média | 3 | `feat/US04-endereco-cep` |
| **US05** | Alerta de feriados com cache (BrasilAPI) | Média | 3 | `feat/US05-alerta-feriados` |
| **US06** | Agenda do dia: lista, busca, filtros e atalhos | Alta | 5 | `feat/US06-agenda-do-dia` |
| **US07** | Regras de negócio, POO e fechamento do dia | Alta | 8 | `feat/US07-regras-negocio-poo` |
| **US08** | Persistência (localStorage) e exportação | Alta | 3 | `feat/US08-persistencia-storage` |
| **US09** | Relógio e lembretes de atendimento (Timers) | Média | 3 | `feat/US09-relogio-lembretes` |
| **US10** | Layout responsivo e identidade visual (Flexbox) | Alta | 5 | `feat/US10-css-responsivo` |
| **US11** | Projeto Node.js, scripts, ESM e CommonJS | Alta | 5 | `feat/US11-node-scripts-modulos` |
| **US12** | Depuração e relatório de bug no VS Code | Média | 2 | `fix/US12-depuracao-bug-report` |

## 3. Ordem de Execução e Justificativa Técnica

1. **Setup inicial & US01 / US10:** Montagem da estrutura HTML semântica e esqueleto CSS em Flexbox mobile-first. Sem a estrutura de base e as áreas principais demarcadas, a manipulação do DOM e a estilização ficam bloqueadas.
2. **US02 & US03:** Carregamento assíncrono dos serviços e construção do formulário. Os dados de `servicos.json` alimentam diretamente os selects do agendamento.
3. **US04 & US05:** Integração das APIs externas (ViaCEP e BrasilAPI). Incrementam a inteligência do formulário com preenchimento de morada e alerta de feriados com cache.
4. **US07 & US06:** Implementação do núcleo de domínio (`js/dominio/`) com classes, herança e regras sem acoplamento ao DOM, seguida da renderização da lista da agenda, filtros e atalhos de teclado.
5. **US08 & US09:** Persistência em localStorage para manter o estado após F5 e timers assíncronos para o relógio e avisos de atendimento.
6. **US11 & US12:** Scripts de terminal em Node.js (ESM para fechamento e CommonJS para validação) e configuração do depurador `.vscode/launch.json` com o preenchimento de `docs/bug-report.md`.

## 4. Análise de Riscos e Mitigações

* **Risco 1: Indisponibilidade das APIs externas (ViaCEP e BrasilAPI)**
  * *Impacto:* Bloqueio de preenchimento ou falso travamento no agendamento.
  * *Mitigação:* Implementação de `try/catch` robusto. Caso o ViaCEP falhe, os campos de endereço tornam-se editáveis manualmente; se a BrasilAPI falhar, o sistema exibe aviso amigável e permite prosseguir. Para feriados, utiliza-se cache de 30 dias em `localStorage`.
* **Risco 2: Violação do isolamento da pasta `js/dominio/`**
  * *Impacto:* Falha na execução do script `npm run fechamento` via terminal Node.js.
  * *Mitigação:* Proibir estritamente o uso de `window`, `document`, `localStorage` e `fetch` dentro de `js/dominio/`.
* **Risco 3: Conflito de sintaxe entre ESM e CommonJS**
  * *Impacto:* Erro de execução ao rodar `npm run validar`.
  * *Mitigação:* Usar a extensão explícita `.cjs` no script `validar-agenda.cjs` e manter `"type": "module"` no `package.json`.

## 5. Plano de Contingência (O que cortar se faltar tempo)

Caso ocorram desvios no cronograma, os seguintes itens com prioridade **Média** ou funcionalidades bónus poderão ser simplificados para preservar o núcleo obrigatório (US01, US03, US06, US07, US10 e US11):
1. **US09:** Simplificar o lembrete de atendimento para aviso fixo na interface, reduzindo a complexidade de múltiplos timers.
2. **US05:** Reduzir a validação de feriados aos feriados nacionais padrão via ficheiro JSON estático de contingência caso a API externa exija tempo excessivo de ajuste.
3. **Bónus:** Despriorizar a publicação no GitHub Pages e a folha de estilos de impressão `@media print` para focar nos 10 pontos da grelha de avaliação principal.