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
   ========================================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// No CommonJS, __dirname e __filename existem nativamente
const raiz = path.resolve(__dirname, '..');

/**
 * Lê e interpreta um arquivo JSON de forma síncrona a partir da raiz do projeto.
 * @param {string} caminhoRelativo
 * @returns {any}
 */
function lerJSON(caminhoRelativo) {
  const caminhoAbsoluto = path.resolve(raiz, caminhoRelativo);
  const conteudo = fs.readFileSync(caminhoAbsoluto, 'utf8');
  return JSON.parse(conteudo);
}

/**
 * Valida uma lista de agendamentos contra o catálogo de serviços e as regras de negócio.
 * Usa import() dinâmico para carregar os módulos ESM de js/dominio/.
 * @param {Array} listaAgenda
 * @param {Array} listaServicos
 * @returns {Promise<string[]>} Lista de mensagens de erro encontradas
 */
async function validarDadosAgenda(listaAgenda, listaServicos) {
  const { STATUS, Servico, criarAgendamento } = await import('../js/dominio/agendamento.js');
  const {
    dataValida,
    horaValida,
    horarioDentroDoFuncionamento,
    telefoneValido,
    cepValido,
  } = await import('../js/dominio/regras.js');

  const erros = [];

  if (!Array.isArray(listaServicos)) {
    erros.push('O catálogo de serviços não é um array válido.');
    return erros;
  }

  if (!Array.isArray(listaAgenda)) {
    erros.push('O arquivo de agenda deve conter um array JSON de agendamentos.');
    return erros;
  }

  const catalogo = listaServicos.map((s) => new Servico(s));
  const mapaServicos = new Map(catalogo.map((s) => [s.id, s]));
  const statusPermitidos = Object.values(STATUS);
  const protocolosVistos = new Set();
  const agendamentosValidos = [];

  listaAgenda.forEach((item, indice) => {
    const rotulo = `[${item?.protocolo || `item #${indice + 1}`}]`;
    let itemValidoParaConflito = true;

    if (!item || typeof item !== 'object') {
      erros.push(`${rotulo} Registro inválido (não é um objeto).`);
      return;
    }

    // 1. Protocolo obrigatório e único
    if (!item.protocolo || String(item.protocolo).trim() === '') {
      erros.push(`${rotulo} Campo obrigatório "protocolo" ausente.`);
      itemValidoParaConflito = false;
    } else if (protocolosVistos.has(item.protocolo)) {
      erros.push(`${rotulo} Protocolo duplicado "${item.protocolo}".`);
      itemValidoParaConflito = false;
    } else {
      protocolosVistos.add(item.protocolo);
    }

    // 2. Tutor obrigatório
    if (!item.tutor || String(item.tutor).trim().length < 3) {
      erros.push(`${rotulo} Campo "tutor" obrigatório (mínimo 3 caracteres).`);
    }

    // 3. Telefone válido com DDD
    if (!item.telefone || !telefoneValido(item.telefone)) {
      erros.push(`${rotulo} Telefone inválido "${item.telefone ?? ''}" (informe DDD + número com 10 ou 11 dígitos).`);
    }

    // 4. Pet e espécie obrigatórios
    if (!item.pet || String(item.pet).trim().length < 2) {
      erros.push(`${rotulo} Campo "pet" obrigatório (mínimo 2 caracteres).`);
    }
    if (!item.especie || String(item.especie).trim() === '') {
      erros.push(`${rotulo} Campo "especie" obrigatório.`);
    }

    // 5. Status permitido
    if (!item.status || !statusPermitidos.includes(item.status)) {
      erros.push(
        `${rotulo} Status inválido "${item.status ?? ''}". Valores permitidos: ${statusPermitidos.join(', ')}.`
      );
      itemValidoParaConflito = false;
    }

    // 6. Serviço existente no catálogo
    const servicoId = item.servicoId || item.servico?.id;
    const servico = mapaServicos.get(servicoId);
    if (!servico) {
      erros.push(`${rotulo} Serviço "${servicoId ?? ''}" não existe no catálogo.`);
      itemValidoParaConflito = false;
    }

    // 7. Data válida
    if (!item.data || !dataValida(item.data)) {
      erros.push(`${rotulo} Data inválida "${item.data ?? ''}" (esperado AAAA-MM-DD real).`);
      itemValidoParaConflito = false;
    }

    // 8. Hora válida e dentro do horário de funcionamento
    if (!item.hora || !horaValida(item.hora)) {
      erros.push(`${rotulo} Horário inválido "${item.hora ?? ''}" (esperado HH:MM entre 00:00 e 23:59).`);
      itemValidoParaConflito = false;
    } else if (servico && !horarioDentroDoFuncionamento(item.hora, servico.duracaoMin)) {
      erros.push(
        `${rotulo} Horário "${item.hora}" fora do expediente da loja (08:00 às 18:00, intervalos de 30 min, duração de ${servico.duracaoMin} min).`
      );
      itemValidoParaConflito = false;
    }

    // 9. Regras de atendimento domiciliar
    if (item.domiciliar) {
      if (servico && !servico.domiciliar) {
        erros.push(`${rotulo} O serviço "${servico.nome}" não permite atendimento a domicílio.`);
      }
      const end = item.endereco;
      if (!end || typeof end !== 'object') {
        erros.push(`${rotulo} Atendimento domiciliar exige o objeto "endereco" preenchido.`);
      } else {
        if (!end.cep || !cepValido(end.cep)) {
          erros.push(`${rotulo} Endereço domiciliar com CEP inválido "${end.cep ?? ''}".`);
        }
        if (!end.logradouro || String(end.logradouro).trim().length < 2) {
          erros.push(`${rotulo} Endereço domiciliar sem logradouro válido.`);
        }
        if (!end.numero || String(end.numero).trim() === '') {
          erros.push(`${rotulo} Endereço domiciliar sem número.`);
        }
        if (!end.bairro || String(end.bairro).trim() === '') {
          erros.push(`${rotulo} Endereço domiciliar sem bairro.`);
        }
        if (!end.cidade || String(end.cidade).trim() === '') {
          erros.push(`${rotulo} Endereço domiciliar sem cidade.`);
        }
        if (!end.uf || String(end.uf).trim().length !== 2) {
          erros.push(`${rotulo} Endereço domiciliar com UF inválida "${end.uf ?? ''}".`);
        }
      }
    }

    if (itemValidoParaConflito && servico) {
      agendamentosValidos.push(criarAgendamento(item, catalogo));
    }
  });

  // 10. Verificação de conflito de horário entre agendamentos ativos válidos (dois a dois)
  for (let i = 0; i < agendamentosValidos.length; i += 1) {
    for (let j = i + 1; j < agendamentosValidos.length; j += 1) {
      const a = agendamentosValidos[i];
      const b = agendamentosValidos[j];
      if (a.conflitaCom(b)) {
        erros.push(
          `[CONFLITO] ${a.protocolo} (${a.pet}) e ${b.protocolo} (${b.pet}) estão agendados para o mesmo dia e horário (${a.data} às ${a.hora}).`
        );
      }
    }
  }

  return erros;
}

/**
 * Função principal de execução via CLI.
 */
async function main() {
  const arquivoAgenda = process.argv[2] || 'data/agenda-exemplo.json';
  const servicos = lerJSON('data/servicos.json');
  const agenda = lerJSON(arquivoAgenda);

  const erros = await validarDadosAgenda(agenda, servicos);

  if (erros.length > 0) {
    console.error(`[ERRO] ${arquivoAgenda}: ${erros.length} problema(s) encontrado(s):`);
    erros.forEach((msg) => console.error(`  - ${msg}`));
    process.exit(1);
  }

  console.log(
    `[OK] ${arquivoAgenda}: ${agenda.length} agendamento(s) validado(s) sem problemas.`
  );
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(`[ERRO] Falha ao validar agenda: ${erro.message}`);
    process.exit(1);
  });
}

module.exports = {
  lerJSON,
  validarDadosAgenda,
};
