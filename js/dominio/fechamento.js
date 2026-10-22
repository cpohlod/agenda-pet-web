/* ==========================================================================
   fechamento.js — CÁLCULOS DA AGENDA E DO FECHAMENTO DO DIA   (tickets: US06, US07)

   O QUE É ESTE ARQUIVO
   Funções PURAS que trabalham com LISTAS de agendamentos: ordenar, filtrar,
   achar o próximo, somar o faturamento e montar o texto do relatório.
   É aqui que moram os métodos de array: filter, map, find, every, some,
   reduce e sort. Sem DOM: a tela e o terminal usam estas mesmas funções,
   então os números do navegador e do `npm run fechamento` são idênticos.

   O QUE FAZER AQUI (nesta ordem sugerida)
   1) import { STATUS, normalizarTexto } from './agendamento.js';
      import { formatarDataBR, formatarMoeda } from './regras.js';
   2) ordenarPorHora(lista)       -> sort() em uma CÓPIA ([...lista]).
   3) agendamentosDoDia(lista, data) -> filter() + ordenação.
   4) filtrarAgendamentos(lista, ...criterios) -> CALLBACKS: recebe funções
      (os critérios) e usa every() para exigir que o item passe em TODAS.
   5) Fábricas de critério: porStatus(status), porBusca(texto) — cada uma
      DEVOLVE uma função pronta para ser usada como callback.
   6) proximoAtendimento(listaDoDia, horaAtual) -> find().
   7) calcularFechamento(lista, data) -> devolve um OBJETO-RESUMO com totais,
      faturamento (reduce), a receber (reduce), agrupamento por serviço
      (reduce que monta um objeto), "encerrado" (every) e "temDomiciliar" (some).
   8) montarLinhasRelatorio(fechamento) -> devolve um ARRAY de linhas de texto
      (usa for...of). Quem imprime é o script de terminal, não esta função.

   ATENÇÃO COM O FATURAMENTO
   Defina por escrito o que entra em "faturamento" (só concluídos?) e o que
   entra em "a receber" (só agendados?). Misturar os dois é um bug clássico —
   veja docs/bug-report.md.

   EXEMPLOS GENÉRICOS (assunto: uma loja de bicicletas):

   // ---- sort sem alterar o original (cópia + ordenação) -----------------
   // export const ordenarPorPreco = (lista) => [...lista].sort((a, b) => a.preco - b.preco);

   // ---- filter por um campo -------------------------------------------------
   // export const doMes = (lista, mes) => lista.filter((v) => v.mes === mes);

   // ---- CALLBACKS: critérios combináveis --------------------------------
   // export function filtrar(lista, ...criterios) {
   //   return lista.filter((item) => criterios.every((criterio) => criterio(item)));
   // }
   // // fábrica de critério (devolve uma função):
   // export const porTipo = (tipo) => (item) => tipo === 'todos' || item.tipo === tipo;
   // // uso:  filtrar(vendas, porTipo('aro 29'), porBusca('joão'))

   // ---- find: o primeiro que atende a condição (ou null) ---------------------
   // export const primeiraPendente = (lista) => lista.find((v) => v.status === 'Pendente') ?? null;

   // ---- reduce: somar -----------------------------------------------------
   // const total = lista.reduce((soma, venda) => soma + venda.valor, 0);   // 0 = valor inicial

   // ---- reduce: agrupar por chave (monta um objeto) ---------------------
   // const porModelo = lista.reduce((acc, venda) => {
   //   const grupo = acc[venda.modelo] ?? { modelo: venda.modelo, quantidade: 0, total: 0 };
   //   grupo.quantidade += 1;
   //   grupo.total += venda.valor;
   //   acc[venda.modelo] = grupo;
   //   return acc;                         // o reduce SEMPRE devolve o acumulador
   // }, {});
   // const lista2 = Object.values(porModelo);   // volta a ser array

   // ---- every / some --------------------------------------------------------
   // const tudoPago = lista.every((v) => v.status === 'Pago');   // TODOS atendem?
   // const temAtraso = lista.some((v) => v.atrasada);             // ALGUM atende?

   // ---- for...of para montar texto --------------------------------------
   // const linhas = [];
   // for (const item of resumo.porModelo) linhas.push(`${item.modelo.padEnd(20)} ${item.quantidade}x`);

   COMO SABER QUE ESTÁ CERTO
   - npm run fechamento  -> imprime o relatório de uma data no terminal.
   - Confira à mão com a agenda de exemplo (data/agenda-exemplo.json).
   - npm test  -> testes de calcularFechamento e dos filtros.
   ========================================================================== */
