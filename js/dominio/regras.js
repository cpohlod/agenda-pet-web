/* ==========================================================================
   regras.js — VALIDAÇÕES E FUNÇÕES DE APOIO   (tickets: US03, US05, US07)
   ========================================================================== */

import { CONFIG, STATUS, normalizarTexto } from './agendamento.js';

/**
 * Retorna a data de hoje no padrão ISO "AAAA-MM-DD".
 * @param {Date} [agora=new Date()]
 * @returns {string}
 */
export function hojeISO(agora = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

/**
 * Retorna a hora atual no padrão "HH:MM".
 * @param {Date} [agora=new Date()]
 * @returns {string}
 */
export function horaAgora(agora = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(agora.getHours())}:${dois(agora.getMinutes())}`;
}

/**
 * Valida se uma string é uma data do calendário válida (AAAA-MM-DD).
 * @param {string} texto
 * @returns {boolean}
 */
export function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto ?? '')) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

/**
 * Valida se uma string é uma hora válida no formato HH:MM (00:00 a 23:59).
 * @param {string} texto
 * @returns {boolean}
 */
export function horaValida(texto) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto ?? '');
}

/**
 * Converte "HH:MM" para a quantidade total de minutos do dia.
 * @param {string} hora
 * @returns {number}
 */
export function paraMinutos(hora) {
  if (!horaValida(hora)) return 0;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Converte "AAAA-MM-DD" para "DD/MM/AAAA".
 * @param {string} iso
 * @returns {string}
 */
export function formatarDataBR(iso) {
  if (!dataValida(iso)) return iso || '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Calcula a diferença em minutos entre o momento atual e uma data/hora futura.
 * Positivo = faltam X minutos; Negativo = já passou há X minutos.
 * @param {string} data
 * @param {string} hora
 * @param {Date} [agora=new Date()]
 * @returns {number}
 */
export function minutosAte(data, hora, agora = new Date()) {
  if (!dataValida(data) || !horaValida(hora)) return 0;
  const alvo = new Date(`${data}T${hora}:00`);
  return Math.round((alvo.getTime() - agora.getTime()) / 60000);
}

/**
 * Determina se um agendamento já passou em relação a agora.
 * @param {string} data
 * @param {string} hora
 * @param {Date} [agora=new Date()]
 * @returns {boolean}
 */
export function estaAtrasado(data, hora, agora = new Date()) {
  return minutosAte(data, hora, agora) < 0;
}

/**
 * Localiza o primeiro atendimento ativo do dia que necessita de aviso (faltando 15 min ou menos) (US09).
 * @param {Array} listaDoDia Lista de agendamentos do dia
 * @param {Date} [agora=new Date()] Momento atual de referência
 * @param {number} [limiteMin=15] Limite em minutos para disparo do lembrete (padrão CONFIG.minutoLembrete)
 * @returns {{ agendamento: object, minutos: number } | null}
 */
export function buscarLembreteProximo(listaDoDia = [], agora = new Date(), limiteMin = 15) {
  if (!Array.isArray(listaDoDia)) return null;
  const agendados = listaDoDia
    .filter((a) => a && a.status === STATUS.AGENDADO)
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  for (const ag of agendados) {
    const min = minutosAte(ag.data, ag.hora, agora);
    if (min >= 0 && min <= limiteMin) {
      return { agendamento: ag, minutos: min };
    }
  }
  return null;
}

/**
 * Verifica se um horário está dentro do expediente e alinhado aos intervalos da loja.
 * - Início entre abertura e término antes do fechamento
 * - Intervalo de passoMinutos (30 em 30 min)
 * @param {string} hora
 * @param {number} [duracaoMin=30]
 * @returns {boolean}
 */
export function horarioDentroDoFuncionamento(hora, duracaoMin = 30) {
  if (!horaValida(hora)) return false;
  const minutosInicio = paraMinutos(hora);
  const aberturaMin = paraMinutos(CONFIG.abertura);
  const fechamentoMin = paraMinutos(CONFIG.fechamento);

  if (minutosInicio < aberturaMin) return false;
  if ((minutosInicio - aberturaMin) % CONFIG.passoMin !== 0) return false;
  if (minutosInicio + Number(duracaoMin) > fechamentoMin) return false;

  return true;
}

/**
 * Mantém somente dígitos de uma string.
 * @param {string} str
 * @returns {string}
 */
export function somenteDigitos(str) {
  return String(str ?? '').replace(/\D/g, '');
}

/**
 * Valida se um número de telefone tem DDD (10 ou 11 dígitos numéricos).
 * @param {string} tel
 * @returns {boolean}
 */
export function telefoneValido(tel) {
  const digitos = somenteDigitos(tel);
  return digitos.length === 10 || digitos.length === 11;
}

/**
 * Valida formato do CEP (8 dígitos).
 * @param {string} cep
 * @returns {boolean}
 */
export function cepValido(cep) {
  return somenteDigitos(cep).length === 8;
}

/**
 * Formata um CEP para 00000-000.
 * @param {string} cep
 * @returns {string}
 */
export function formatarCep(cep) {
  const d = somenteDigitos(cep);
  if (d.length !== 8) return cep || '';
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Formata um valor numérico em moeda BRL (R$ 0,00).
 * @param {number} valor
 * @returns {string}
 */
export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Localiza se uma data específica consta na lista de feriados nacionais.
 * @param {Array<{date: string, name: string}>} feriados
 * @param {string} data
 * @returns {{date: string, name: string}|null}
 */
export function acharFeriado(feriados, data) {
  if (!Array.isArray(feriados) || !data) return null;
  return feriados.find((f) => f.date === data) ?? null;
}

/**
 * Verifica se um novo agendamento tem conflito de horário com a lista existente.
 * @param {Array} lista
 * @param {object} candidato
 * @returns {boolean}
 */
export function temConflito(lista, candidato) {
  if (!Array.isArray(lista) || !candidato) return false;
  return lista.some((item) => {
    if (typeof item.conflitaCom === 'function') {
      return item.conflitaCom(candidato);
    }
    const ativoItem = item.status !== 'Cancelado';
    const ativoCand = candidato.status !== 'Cancelado';
    return (
      ativoItem &&
      ativoCand &&
      item.data === candidato.data &&
      item.hora === candidato.hora &&
      item.protocolo !== candidato.protocolo
    );
  });
}

/**
 * Valida os dados submetidos pelo formulário de agendamento.
 * @param {object} dados
 * @param {object} servico
 * @param {object} [opcoes={}]
 * @returns {Record<string, string>} Mapa com { idCampo: mensagemErro }
 */
export function validarAgendamento(dados, servico, { feriado = null, confirmouFeriado = false, agora = new Date() } = {}) {
  const erros = {};

  // Tutor
  if (!dados.tutor || dados.tutor.trim().length < 3) {
    erros.tutor = 'Informe o nome do tutor (mínimo 3 letras).';
  }

  // Telefone
  if (!dados.telefone || !telefoneValido(dados.telefone)) {
    erros.telefone = 'Informe um telefone com DDD (10 ou 11 dígitos).';
  }

  // Pet
  if (!dados.pet || dados.pet.trim().length < 2) {
    erros.pet = 'Informe o nome do pet.';
  }

  // Espécie
  if (!dados.especie || dados.especie.trim() === '') {
    erros.especie = 'Selecione a espécie.';
  }

  // Serviço
  if (!servico) {
    erros.servico = 'Selecione um serviço válido.';
  } else if (dados.domiciliar && !servico.domiciliar) {
    erros.servico = `"${servico.nome}" é realizado somente na loja.`;
  }

  // Data
  const hoje = hojeISO(agora);
  if (!dados.data || !dataValida(dados.data)) {
    erros.data = 'Informe uma data válida.';
  } else if (dados.data < hoje) {
    erros.data = 'Não é possível agendar em uma data que já passou.';
  }

  // Hora
  const duracao = servico ? servico.duracaoMin : 30;
  if (!dados.hora || !horaValida(dados.hora)) {
    erros.hora = 'Informe um horário válido.';
  } else if (!horarioDentroDoFuncionamento(dados.hora, duracao)) {
    erros.hora =
      'Fora do funcionamento: atendemos das 08:00 às 18:00 (de 30 em 30 min) e o serviço deve terminar até as 18:00.';
  } else if (dados.data === hoje && estaAtrasado(dados.data, dados.hora, agora)) {
    erros.hora = 'Esse horário de hoje já passou.';
  }

  // Feriado
  if (feriado && !confirmouFeriado) {
    erros['feriado-confirmar'] = 'Marque "Agendar mesmo assim" para confirmar o atendimento no feriado.';
  }

  // Endereço domiciliar
  if (dados.domiciliar) {
    const end = dados.endereco || {};
    if (!end.cep || !cepValido(end.cep)) {
      erros.cep = 'O CEP deve ter 8 dígitos.';
    }
    if (!end.logradouro || end.logradouro.trim().length < 2) {
      erros.logradouro = 'Informe o logradouro.';
    }
    if (!end.numero || end.numero.trim() === '') {
      erros.numero = 'Informe o número.';
    }
    if (!end.bairro || end.bairro.trim() === '') {
      erros.bairro = 'Informe o bairro.';
    }
    if (!end.cidade || end.cidade.trim() === '') {
      erros.cidade = 'Informe a cidade.';
    }
    if (!end.uf || end.uf.trim().length !== 2) {
      erros.uf = 'Informe a UF (2 letras).';
    }
  }

  return erros;
}
