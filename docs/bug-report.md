# Relatório de bug — BUG-01

| Campo | Valor |
|---|---|
| **Título** | Faturamento do fechamento diário somava indevidamente atendimentos cancelados junto aos concluídos |
| **Ticket relacionado** | US07 / US11 / US12 – Regras de negócio, relatório de fechamento do dia e depuração no VS Code |
| **Onde apareceu** | `js/dominio/fechamento.js` (função `calcularFechamento`), refletindo no comando `npm run fechamento` (`scripts/fechamento-dia.js`) e na seção "Fechamento do dia" da página web |
| **Branch da correção** | `feat/US12-depuracao-bug-report` (PR #13) |
| **Gravidade** | **Alta** — distorce o fechamento financeiro do caixa da loja, contabilizando como receita realizada o valor de serviços que foram cancelados (`R$ 90,00` do protocolo `AP-0004`). |

---

## Passos para reproduzir

1. Certifique-se de que as dependências estão instaladas (`npm install`) e que o arquivo `data/agenda-exemplo.json` contém os 10 agendamentos do dia `2026-10-20` (5 `Concluído`, 4 `Agendado` e 1 `Cancelado` — protocolo `AP-0004`, serviço `Vacinação`, valor `R$ 90,00`).
2. Com o defeito ativo em `js/dominio/fechamento.js` (onde a lista `concluidos` filtrava `a.status !== STATUS.AGENDADO` em vez de `a.status === STATUS.CONCLUIDO`), abra a aba **Run and Debug (`Ctrl+Shift+D`)** no VS Code.
3. Selecione a configuração **"Depurar fechamento do dia (Node)"** definida em `.vscode/launch.json` e pressione **F5** (ou execute `npm run fechamento` no terminal).
4. Observe os totais exibidos em `Concluídos` e `Faturamento (concluídos)` no console e nas variáveis inspecionadas pelo depurador.

---

## Resultado esperado × obtido

| Item conferido (data `2026-10-20`) | Esperado | Obtido (com o bug) |
|---|---|---|
| **Quantidade de Concluídos** | `5` (`AP-0001`, `AP-0002`, `AP-0003`, `AP-0005`, `AP-0010`) | `6` (incluiu indevidamente `AP-0004` com status `Cancelado`) |
| **Faturamento (concluídos)** | `R$ 515,00` (`60 + 135 + 150 + 60 + 110`) | `R$ 605,00` (`515 + 90` da vacinação cancelada `AP-0004`) |
| **A receber (agendados)** | `R$ 385,00` (`110 + 75 + 80 + 120`) | `R$ 385,00` |
| **Status do item `AP-0004` (Bolt)** | Ignorado no faturamento (`status: "Cancelado"`, `ativo: false`) | Somado ao faturamento do dia (`+ R$ 90,00`) |

---

## Investigação com o depurador

Configuração usada: **"Depurar fechamento do dia (Node)"** (tecla **F5**).

1. **Breakpoint simples:**
   - Posicionado em `js/dominio/fechamento.js`, linha **108** (`const faturamento = valoresConcluidos.reduce((acc, v) => acc + v, 0);`) e em `scripts/fechamento-dia.js`, linha **67** (`const fechamento = calcularFechamento(agendamentos, data);`).
   - Ao pausar na linha 108, o painel **Variables (Locals)** mostrou que o array `concluidos` possuía `length: 6` em vez de `5`, e o array `valoresConcluidos` continha `[60, 135, 150, 90, 60, 110]`.

2. **Variables / Watch (Expressões monitoradas no painel Watch):**

   | Expressão (Watch) | Valor inspecionado durante o bug | Valor após a correção |
   |---|---|---|
   | `doDia.length` | `10` | `10` |
   | `concluidos.length` | `6` | `5` |
   | `concluidos.map(a => `${a.protocolo}:${a.status}`)` | `['AP-0001:Concluído', 'AP-0002:Concluído', 'AP-0003:Concluído', 'AP-0004:Cancelado', 'AP-0010:Concluído', 'AP-0005:Concluído']` | `['AP-0001:Concluído', 'AP-0002:Concluído', 'AP-0003:Concluído', 'AP-0010:Concluído', 'AP-0005:Concluído']` |
   | `valoresConcluidos` | `[60, 135, 150, 90, 60, 110]` | `[60, 135, 150, 60, 110]` |
   | `faturamento` | `605` | `515` |
   | `doDia.find(a => a.protocolo === 'AP-0004').ativo` | `false` | `false` |

3. **Call Stack (Pilha de chamadas):**
   - Topo: `calcularFechamento` (`js/dominio/fechamento.js:108`) — onde `concluidos` e `faturamento` são calculados a partir de `doDia`.
   - Meio: `main` (`scripts/fechamento-dia.js:67`) — função assíncrona que leu `data/servicos.json` e `data/agenda-exemplo.json`, instanciou os objetos com `criarAgendamento` e invocou `calcularFechamento(agendamentos, '2026-10-20')`.
   - Base: `<anonymous>` (`scripts/fechamento-dia.js:89`) — ponto de entrada CLI do módulo ESM.
   - **Conclusão pela Call Stack:** Os dados lidos em `main` estavam íntegros (`AP-0004` possuía `status: "Cancelado"`); o defeito surgia exclusivamente dentro do filtro de `calcularFechamento`.

4. **Breakpoint condicional e Logpoint:**
   - **Breakpoint condicional** configurado em `js/dominio/fechamento.js` (linha **106**, dentro do `.map()` de `concluidos`) com a condição:
     ```js
     a.status === 'Cancelado'
     ```
     O depurador interrompeu a execução exatamente quando `a` era o objeto `Agendamento { protocolo: 'AP-0004', pet: 'Bolt', status: 'Cancelado', servico: Servico { id: 'vacina', preco: 90 } }`, provando que um item cancelado havia passado pelo filtro `concluidos`.
   - **Logpoint** configurado na linha **118** (`for (const a of doDia)`) com a mensagem:
     ```text
     [FECHAMENTO] {a.protocolo} | status={a.status} | ativo={a.ativo} | valor={a.calcularValor()}
     ```
     Isso permitiu acompanhar no *Debug Console* todos os 10 itens do dia sem precisar pausar manualmente a cada iteração.

Evidência:

![Depuração no VS Code pausada no breakpoint em calcularFechamento](depuracao.png)

---

## Causa raiz

O array `concluidos` na função `calcularFechamento` (`js/dominio/fechamento.js`) estava filtrando os itens com a condição `a.status !== STATUS.AGENDADO` em vez de `a.status === STATUS.CONCLUIDO`. Como existem três estados possíveis (`Agendado`, `Concluído` e `Cancelado`), negar `STATUS.AGENDADO` fazia com que os agendamentos com status `Cancelado` também entrassem na lista de concluídos e tivessem seus preços somados ao faturamento do dia.

```js
// ANTES (bug) — js/dominio/fechamento.js
const concluidos = doDia.filter((a) => a.status !== STATUS.AGENDADO);

// DEPOIS (correto) — js/dominio/fechamento.js
const concluidos = doDia.filter((a) => a.status === STATUS.CONCLUIDO);
```

---

## Correção

- **Commit / Pull Request:** `fix(US12): registrar relatorio de depuracao, configurar launch.json e validar calculo de fechamento` (Branch `feat/US12-depuracao-bug-report`).
- **Como confirmar que foi corrigido:**
  1. Executar `npm run fechamento` no terminal e verificar que `Concluídos: 5` e `Faturamento (concluídos): R$ 515,00`.
  2. Executar `npm test` e confirmar que todos os 27 testes automatizados (incluindo os testes específicos de `calcularFechamento` e `fechamento-dia.js`) passam sem erros.

---

## Como evitar de novo

- [x] Manter teste unitário automatizado em `tests/dominio.test.js` (`calcularFechamento contabiliza faturamento só dos concluídos e valores a receber`) contendo simultaneamente itens `Concluído`, `Agendado` e `Cancelado` para detectar imediatamente qualquer regressão na soma.
- [x] Manter teste de integração em `tests/dominio.test.js` (`US11 (ESM): fechamento-dia lê data/agenda-exemplo.json e calcula os totais de 2026-10-20`) validando os valores exatos (`faturamento: 515`, `aReceber: 385`, `concluidos: 5`, `cancelados: 1`).
- [x] Utilizar sempre comparações explícitas de igualdade estrita (`=== STATUS.CONCLUIDO`) com o enum imutável `STATUS` (`Object.freeze`) em vez de filtros por negação (`!==`).
