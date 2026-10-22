/* ==========================================================================
   fechamento-dia.js — RELATÓRIO DE FECHAMENTO NO TERMINAL   (ticket: US11)

   O QUE É ESTE ARQUIVO
   Um programa Node.js (módulo ESM) que a dona da loja roda no terminal:
       npm run fechamento
       node scripts/fechamento-dia.js --data=2026-10-20 --arquivo=data/agenda-exemplo.json
   Ele lê os arquivos JSON, monta os objetos e imprime o relatório do dia.

   O PONTO PRINCIPAL DO TICKET
   Este script IMPORTA os mesmos módulos que a página usa (js/dominio/).
   Por isso os números do terminal e os da tela são idênticos — e é por isso
   que o domínio não pode usar document, window ou localStorage.

   O QUE FAZER AQUI
   1) Imports no estilo ESM (funciona porque o package.json tem "type": "module"):
        import { readFile } from 'node:fs/promises';
        import path from 'node:path';
        import { fileURLToPath } from 'node:url';
        import { Servico, criarAgendamento } from '../js/dominio/agendamento.js';
        ...
      ATENÇÃO: em import relativo, a extensão ".js" é OBRIGATÓRIA no Node.
   2) Descobrir a raiz do projeto. No ESM NÃO existem __dirname e __filename:
      calcule a partir de import.meta.url.
   3) Função para ler argumentos no formato --nome=valor, usando process.argv.
   4) Função main() assíncrona:
        - ler e validar a data (mostrar mensagem de erro clara se inválida);
        - ler data/servicos.json e data/<arquivo>.json (readFile + JSON.parse);
        - transformar em objetos (map + new Servico / criarAgendamento);
        - calcular o fechamento e imprimir com console.log;
        - se não houver agendamento naquela data, avisar quais datas existem.
   5) Tratamento de erro: main().catch(...) imprimindo console.error e
      process.exitCode = 1 (código diferente de 0 = "deu erro", útil em automações).

   EXEMPLOS GENÉRICOS (assunto: relatório de estoque):

   // ---- Raiz do projeto no ESM -------------------------------------------
   // const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

   // ---- Ler um JSON -------------------------------------------------------
   // const lerJSON = async (relativo) => JSON.parse(await readFile(path.join(raiz, relativo), 'utf8'));

   // ---- Ler argumentos --nome=valor ---------------------------------------
   // function lerArgumento(nome, padrao) {
   //   const arg = process.argv.find((a) => a.startsWith(`--${nome}=`));
   //   return arg ? arg.slice(nome.length + 3) : padrao;      // "--mes=10" -> "10"
   // }

   // ---- Estrutura geral ------------------------------------------------------
   // async function main() {
   //   const mes = lerArgumento('mes', '10');
   //   const produtos = (await lerJSON('data/produtos.json')).map((p) => new Produto(p));
   //   const resumo = calcularEstoque(produtos, mes);             // vem do domínio
   //   console.log(montarLinhas(resumo).join('\n'));
   // }
   // main().catch((erro) => {
   //   console.error(`Não foi possível gerar o relatório: ${erro.message}`);
   //   process.exitCode = 1;
   // });

   COMO TESTAR
   - npm run fechamento
   - Passe uma data sem agendamentos e uma data inválida: as mensagens
     precisam ser claras.
   - Depure com F5 (configuração "Depurar fechamento do dia" em .vscode/launch.json).
   ========================================================================== */
