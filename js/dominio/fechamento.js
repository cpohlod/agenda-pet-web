/* ==========================================================================
   fechamento.js — CÁLCULOS DA AGENDA E DO FECHAMENTO DO DIA   (tickets: US06, US07)
   ========================================================================== */

import { STATUS, normalizarTexto, AgendamentoDomiciliar } from './agendamento.js';
import { formatarDataBR, formatarMoeda } from './regras.js';

/**
 * Retorna uma nova lista ordenada por horário (e depois por protocolo).
 * @param {Array} lista
 * @returns {Array}
 */
export function ordenarPorHora(lista = []) {
  return [...lista].sort((a, b) => {
    if (a.hora < b.hora) return -1;
    if (a.hora > b.hora) return 1;
    return (a.protocolo ?? '').localeCompare(b.protocolo ?? '');
  });
}

/**
 * Filtra e ordena os atendimentos de um dia específico.
 * @param {Array} lista
 * @param {string} data ISO (AAAA-MM-DD)
 * @returns {Array}
 */
export function agendamentosDoDia(lista = [], data) {
  if (!data) return [];
  const filtrados = lista.filter((item) => item.data === data);
  return ordenarPorHora(filtrados);
}

/**
 * Filtra uma lista aplicando múltiplos critérios combinados (callbacks).
 * Exige que o item atenda a todos os critérios fornecidos.
 * @param {Array} lista
 * @param  {...Function} criterios
 * @returns {Array}
 */
export function filtrarAgendamentos(lista = [], ...criterios) {
  return lista.filter((item) => criterios.every((criterio) => criterio(item)));
}

/**
 * Fábrica de critério: devolve uma função para filtrar por status.
 * @param {string} status
 * @returns {(item: object) => boolean}
 */
export const porStatus = (status) => (item) => {
  if (!status || status === 'todos') return true;
  return item.status === status;
};

/**
 * Fábrica de critério: devolve uma função para filtrar por termo de busca (tutor, pet ou protocolo).
 * @param {string} texto
 * @returns {(item: object) => boolean}
 */
export const porBusca = (texto) => (item) => {
  if (!texto || !texto.trim()) return true;
  const termo = normalizarTexto(texto);
  return (
    normalizarTexto(item.tutor).includes(termo) ||
    normalizarTexto(item.pet).includes(termo) ||
    normalizarTexto(item.protocolo).includes(termo)
  );
};

/**
 * Encontra o primeiro atendimento 'Agendado' a partir da hora atual informada.
 * @param {Array} listaDoDia
 * @param {string} horaAtual HH:MM
 * @returns {object|null}
 */
export function proximoAtendimento(listaDoDia = [], horaAtual = '00:00') {
  const ordenados = ordenarPorHora(listaDoDia);
  return (
    ordenados.find(
      (item) => item.status === STATUS.AGENDADO && item.hora >= horaAtual
    ) ?? null
  );
}

/**
 * Calcula os totais e agrupamentos financeiros do dia para o fechamento.
 * @param {Array} lista
 * @param {string} data
 * @returns {object} Resumo com contadores e agrupamento
 */
export function calcularFechamento(lista = [], data) {
  const doDia = agendamentosDoDia(lista, data);

  const concluidos = doDia.filter((a) => a.status === STATUS.CONCLUIDO);
  const agendados = doDia.filter((a) => a.status === STATUS.AGENDADO);
  const cancelados = doDia.filter((a) => a.status === STATUS.CANCELADO);

  // Faturamento = soma somente dos CONCLUÍDOS
  const faturamento = concluidos.reduce(
    (acc, a) => acc + (typeof a.calcularValor === 'function' ? a.calcularValor() : (a.servico?.preco || 0)),
    0
  );

  // A receber = soma dos ainda AGENDADOS
  const aReceber = agendados.reduce(
    (acc, a) => acc + (typeof a.calcularValor === 'function' ? a.calcularValor() : (a.servico?.preco || 0)),
    0
  );

  // Agrupamento por serviço (considera apenas serviços ativos do dia)
  const mapaServicos = doDia.reduce((acc, a) => {
    if (!a.ativo) return acc;
    const servicoId = a.servico?.id || 'outro';
    const servicoNome = a.servico?.nome || 'Serviço';

    if (!acc[servicoId]) {
      acc[servicoId] = {
        id: servicoId,
        nome: servicoNome,
        quantidade: 0,
        faturado: 0,
      };
    }

    acc[servicoId].quantidade += 1;
    if (a.status === STATUS.CONCLUIDO) {
      const valor = typeof a.calcularValor === 'function' ? a.calcularValor() : (a.servico?.preco || 0);
      acc[servicoId].faturado += valor;
    }

    return acc;
  }, {});

  const porServico = Object.values(mapaServicos).sort((a, b) => b.quantidade - a.quantidade);

  return {
    data,
    total: doDia.length,
    concluidos: concluidos.length,
    agendados: agendados.length,
    cancelados: cancelados.length,
    faturamento,
    aReceber,
    porServico,
    encerrado: doDia.length > 0 && agendados.length === 0,
    temDomiciliar: doDia.some((a) => a instanceof AgendamentoDomiciliar || a.domiciliar),
  };
}

/**
 * Monta as linhas de texto para impressão no terminal.
 * @param {object} fechamento Objeto resumo retornado por calcularFechamento
 * @returns {string[]}
 */
export function montarLinhasRelatorio(fechamento) {
  const linhas = [];
  linhas.push('====================================================');
  linhas.push(`  RELATÓRIO DE FECHAMENTO — PATINHAS & CIA`);
  linhas.push(`  Data: ${formatarDataBR(fechamento.data)}`);
  linhas.push('====================================================');
  linhas.push(`Total de atendimentos: ${fechamento.total}`);
  linhas.push(`  - Concluídos: ${fechamento.concluidos}`);
  linhas.push(`  - Agendados : ${fechamento.agendados}`);
  linhas.push(`  - Cancelados: ${fechamento.cancelados}`);
  linhas.push('----------------------------------------------------');
  linhas.push(`Faturamento (concluídos): ${formatarMoeda(fechamento.faturamento)}`);
  linhas.push(`A receber (agendados)   : ${formatarMoeda(fechamento.aReceber)}`);
  linhas.push(`Status do dia           : ${fechamento.encerrado ? 'Encerrado' : 'Em andamento'}`);
  linhas.push('----------------------------------------------------');
  linhas.push('ATENDIMENTOS POR SERVIÇO:');

  if (fechamento.porServico.length === 0) {
    linhas.push('  (Nenhum atendimento ativo)');
  } else {
    for (const item of fechamento.porServico) {
      linhas.push(`  * ${item.nome.padEnd(26)} : ${String(item.quantidade).padStart(2)} un  |  Faturado: ${formatarMoeda(item.faturado)}`);
    }
  }

  linhas.push('====================================================');
  return linhas;
}
