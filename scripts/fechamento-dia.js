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
   ========================================================================== */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Servico, criarAgendamento } from '../js/dominio/agendamento.js';
import { dataValida, formatarDataBR, formatarMoeda } from '../js/dominio/regras.js';
import {
  agendamentosDoDia,
  calcularFechamento,
  montarLinhasRelatorio,
} from '../js/dominio/fechamento.js';

// No ESM não existem __dirname e __filename globais: calculamos a partir de import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname, '..');

/**
 * Lê um argumento da linha de comando no formato --nome=valor.
 * @param {string} nome
 * @param {string} padrao
 * @returns {string}
 */
export function lerArgumento(nome, padrao = '') {
  const prefixo = `--${nome}=`;
  const arg = process.argv.slice(2).find((a) => a.startsWith(prefixo));
  return arg ? arg.slice(prefixo.length).trim() : padrao;
}

/**
 * Lê e interpreta um arquivo JSON a partir da raiz do projeto.
 * @param {string} caminhoRelativo
 * @returns {Promise<any>}
 */
export async function lerJSONArquivo(caminhoRelativo) {
  const caminhoAbsoluto = path.resolve(raiz, caminhoRelativo);
  const conteudo = await readFile(caminhoAbsoluto, 'utf8');
  return JSON.parse(conteudo);
}

/**
 * Executa a geração e impressão do relatório de fechamento do dia no terminal.
 */
export async function main() {
  const data = lerArgumento('data', '2026-10-20');
  const arquivo = lerArgumento('arquivo', 'data/agenda-exemplo.json');

  if (!dataValida(data)) {
    throw new Error(
      `Data inválida "${data}". Informe uma data real no formato AAAA-MM-DD (ex.: --data=2026-10-20).`
    );
  }

  const dadosServicos = await lerJSONArquivo('data/servicos.json');
  if (!Array.isArray(dadosServicos)) {
    throw new Error('O catálogo data/servicos.json não contém uma lista válida.');
  }
  const catalogo = dadosServicos.map((s) => new Servico(s));

  const dadosAgenda = await lerJSONArquivo(arquivo);
  if (!Array.isArray(dadosAgenda)) {
    throw new Error(`O arquivo "${arquivo}" não contém uma lista JSON de agendamentos.`);
  }

  const agendamentos = dadosAgenda.map((item) => criarAgendamento(item, catalogo));
  const doDia = agendamentosDoDia(agendamentos, data);
  const fechamento = calcularFechamento(agendamentos, data);

  const linhas = montarLinhasRelatorio(fechamento);
  console.log(linhas.join('\n'));

  if (doDia.length === 0) {
    const datasDisponiveis = [...new Set(agendamentos.map((a) => a.data))].sort();
    if (datasDisponiveis.length > 0) {
      console.log(
        `\n[AVISO] Nenhum agendamento encontrado em ${formatarDataBR(data)} (${data}). Datas disponíveis em ${arquivo}: ${datasDisponiveis.join(', ')}`
      );
    } else {
      console.log(`\n[AVISO] O arquivo ${arquivo} não possui agendamentos registrados.`);
    }
    return;
  }

  console.log('\nDETALHAMENTO DOS ATENDIMENTOS DO DIA:');
  for (const ag of doDia) {
    console.log(`  - [${ag.status}] ${ag.resumo()} — ${formatarMoeda(ag.calcularValor())}`);
  }
}

// Executa apenas quando chamado diretamente pelo Node.js
const executadoDiretamente =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (executadoDiretamente) {
  main().catch((erro) => {
    console.error(`[ERRO] Não foi possível gerar o relatório: ${erro.message}`);
    process.exitCode = 1;
  });
}
