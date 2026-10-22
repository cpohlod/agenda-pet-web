/* ==========================================================================
   dominio.test.js — TESTES AUTOMÁTICOS DO DOMÍNIO   (ticket: US07 / US11; opcional)

   O QUE É ESTE ARQUIVO
   Testes que rodam no Node, sem navegador, com o executor nativo (node:test):
       npm test
   Eles provam que as regras de js/dominio/ funcionam — e continuam
   funcionando depois que você mexe no código. Só é possível testar assim
   porque o domínio é PURO (sem DOM).

   O QUE FAZER AQUI
   1) Importar test e assert, e as funções que serão testadas:
        import test from 'node:test';
        import assert from 'node:assert/strict';
        import { ... } from '../js/dominio/agendamento.js';
   2) Montar os dados de apoio (catálogo e agenda lidos dos JSON em data/).
   3) Escrever um test('descrição', () => { ... }) por comportamento.
   4) Cubra pelo menos: closure do protocolo, herança (valor domiciliar),
      conflito de horário, horário dentro do funcionamento, validação do
      formulário, fechamento do dia e filtros.

   PADRÃO DE UM BOM TESTE (Preparar -> Executar -> Conferir)
   Dê ao teste um nome que explique a REGRA, não a função:
   "cancelado libera o horário", e não "testa conflitaCom".

   EXEMPLOS GENÉRICOS (assunto: carrinho de compras):

   // ---- Cabeçalho -----------------------------------------------------------
   // import test from 'node:test';
   // import assert from 'node:assert/strict';
   // import { Carrinho, aplicarCupom } from '../js/dominio/carrinho.js';

   // ---- Teste simples --------------------------------------------------------
   // test('o carrinho soma o preço dos itens', () => {
   //   const carrinho = new Carrinho();                       // preparar
   //   carrinho.adicionar({ nome: 'Caneta', preco: 3 });
   //   carrinho.adicionar({ nome: 'Caderno', preco: 20 });
   //   assert.equal(carrinho.total(), 23);                    // conferir
   // });

   // ---- Teste de regra com vários casos ------------------------------------
   // test('cupom não deixa o total negativo', () => {
   //   assert.equal(aplicarCupom(10, 50), 0);
   // });

   // ---- Teste que espera um erro -----------------------------------------
   // test('item sem preço lança erro', () => {
   //   assert.throws(() => new Carrinho().adicionar({ nome: 'X' }), /preço/);
   // });

   // ---- Ler JSON em teste (ESM) ---------------------------------------------
   // import { readFile } from 'node:fs/promises';
   // const lerJSON = async (c) => JSON.parse(await readFile(new URL(`../${c}`, import.meta.url), 'utf8'));
   // const catalogo = (await lerJSON('data/servicos.json')).map((s) => new Servico(s));

   // ---- Closure ---------------------------------------------------------------
   // test('o gerador preserva o contador entre chamadas', () => {
   //   const proximo = criarGerador(7);
   //   assert.equal(proximo(), 'X-0008');
   //   assert.equal(proximo(), 'X-0009');
   // });

   DICAS
   - Passe datas/horas FIXAS aos testes (por isso as funções recebem "agora"
     por parâmetro): o teste nunca pode depender do dia em que roda.
   - Se um teste falhar, o Node mostra o valor esperado e o obtido.
   - Para depurar: configuração "Depurar testes do domínio" no launch.json.
   ========================================================================== */
