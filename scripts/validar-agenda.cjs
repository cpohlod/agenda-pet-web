/* ==========================================================================
   validar-agenda.cjs — VALIDA UM ARQUIVO DE AGENDA (CommonJS)   (ticket: US11)

   O QUE É ESTE ARQUIVO
   Um programa Node.js escrito em CommonJS (require / module.exports) que
   confere se um arquivo JSON de agenda está correto:
       npm run validar                       (usa data/agenda-exemplo.json)
       node scripts/validar-agenda.cjs data/agenda-invalida.json

   POR QUE .cjs?
   O package.json declara "type": "module" (tudo é ESM). A extensão .cjs
   força ESTE arquivo a ser CommonJS. Assim o projeto mostra os DOIS sistemas
   de módulos funcionando lado a lado:
        ESM:       import x from '...'      export ...        (sem __dirname)
        CommonJS:  const x = require('...') module.exports    (tem __dirname)

   COMO REAPROVEITAR O DOMÍNIO (que é ESM) DENTRO DE UM ARQUIVO CommonJS?
   require() NÃO carrega ESM. A ponte é o import() DINÂMICO, que devolve uma
   Promise (use await dentro de uma função async):
        const { Servico } = await import('../js/dominio/agendamento.js');

   O QUE FAZER AQUI
   1) 'use strict'; e os requires:  const fs = require('node:fs'); const path = require('node:path');
   2) Ler o arquivo passado em process.argv[2] (ou um padrão) e data/servicos.json.
   3) Verificar, para cada item:
        - campos obrigatórios presentes;
        - protocolo sem repetição (use um Set);
        - status dentro dos permitidos;
        - data, hora e telefone válidos (reutilize as funções de regras.js);
        - serviço existente no catálogo;
        - horário dentro do funcionamento;
        - se domiciliar: serviço permite e endereço completo.
   4) Depois, comparar os itens VÁLIDOS dois a dois procurando conflito de horário.
   5) Mostrar a lista de problemas com console.error e terminar com
      process.exit(1). Se estiver tudo certo, console.log("[OK] ...") e código 0.

   EXEMPLOS GENÉRICOS (assunto: validar um arquivo de alunos):

   // ---- Cabeçalho CommonJS ------------------------------------------------
   // 'use strict';
   // const fs = require('node:fs');
   // const path = require('node:path');
   // const raiz = path.resolve(__dirname, '..');         // __dirname existe no CommonJS

   // ---- Ler JSON -------------------------------------------------------------
   // const lerJSON = (relativo) => JSON.parse(fs.readFileSync(path.resolve(raiz, relativo), 'utf8'));

   // ---- Estrutura geral com import() dinâmico -------------------------------
   // async function main() {
   //   const arquivo = process.argv[2] || 'data/alunos.json';
   //   const { alunoValido } = await import('../js/dominio/regras.js');   // ESM dentro do CJS
   //   const erros = [];
   //   const vistos = new Set();
   //
   //   lerJSON(arquivo).forEach((item, i) => {
   //     const rotulo = `[${item.matricula || `item ${i + 1}`}]`;
   //     if (vistos.has(item.matricula)) erros.push(`${rotulo} matrícula repetida.`);
   //     vistos.add(item.matricula);
   //     if (!alunoValido(item)) erros.push(`${rotulo} dados inválidos.`);
   //   });
   //
   //   if (erros.length > 0) {
   //     console.error(`[ERRO] ${arquivo}: ${erros.length} problema(s):`);
   //     erros.forEach((m) => console.error(`  - ${m}`));
   //     process.exit(1);                                  // código 1 = falhou
   //   }
   //   console.log(`[OK] ${arquivo}: sem problemas.`);
   // }
   // main().catch((e) => { console.error(`[ERRO] ${e.message}`); process.exit(1); });

   COMO TESTAR
   - npm run validar         -> deve imprimir [OK].
   - npm run validar:erro    -> deve listar os problemas e terminar com erro.
   - Depure com F5 (configuração "Depurar validar-agenda (CommonJS)").
   ========================================================================== */
