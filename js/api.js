/* ==========================================================================
   api.js — TODO O fetch MORA AQUI   (tickets: US02, US04, US05)
   ========================================================================== */

import { somenteDigitos, formatarCep } from './dominio/regras.js';
import * as storage from './storage.js';

/**
 * Erro personalizado de requisição com indicação do tipo de falha:
 * - 'formato': dado de entrada inválido antes de chamar a rede
 * - 'rede': requisição rejeitada (sem internet ou queda de conexão)
 * - 'http': servidor respondeu com status de erro (404, 500...)
 * - 'nao-encontrado': consulta concluída sem resultado (ex: ViaCEP retornou erro)
 */
export class ErroApi extends Error {
  constructor(tipo, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
  }
}

/**
 * Função interna para buscar dados JSON com tratamento de rede e HTTP.
 * @param {string} url
 * @param {string} mensagemHttp
 * @returns {Promise<any>}
 */
async function buscarJSON(url, mensagemHttp = 'Erro ao consultar dados') {
  let resposta;
  try {
    resposta = await fetch(url);
  } catch {
    throw new ErroApi('rede', 'Sem conexão com a rede.');
  }

  if (!resposta.ok) {
    throw new ErroApi('http', `${mensagemHttp} (erro HTTP ${resposta.status}).`);
  }

  try {
    return await resposta.json();
  } catch {
    throw new ErroApi('http', 'Resposta do servidor não é um JSON válido.');
  }
}

/**
 * Carrega a lista de serviços a partir do arquivo local data/servicos.json.
 * @returns {Promise<Array>}
 */
export async function carregarServicos() {
  return buscarJSON('data/servicos.json', 'Não foi possível carregar os serviços');
}

/**
 * Carrega os agendamentos de exemplo do arquivo local data/agenda-exemplo.json.
 * @returns {Promise<Array>}
 */
export async function carregarAgendaExemplo() {
  return buscarJSON('data/agenda-exemplo.json', 'Não foi possível carregar a agenda de exemplo');
}

/**
 * Consulta endereço a partir do CEP utilizando a API ViaCEP (US04).
 * Trata:
 * 1. Formato inválido (diferente de 8 dígitos)
 * 2. CEP não encontrado (ViaCEP retorna {"erro": true})
 * 3. Falha de rede ou API fora do ar
 * @param {string} cep
 * @returns {Promise<{cep: string, logradouro: string, complemento: string, bairro: string, cidade: string, uf: string}>}
 */
export async function buscarCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) {
    throw new ErroApi('formato', 'Formato de CEP inválido: informe 8 dígitos numéricos.');
  }

  const url = `https://viacep.com.br/ws/${digitos}/json/`;
  let dados;

  try {
    dados = await buscarJSON(url, 'Não foi possível consultar o CEP');
  } catch (erro) {
    if (erro instanceof ErroApi) {
      if (erro.tipo === 'rede' || erro.tipo === 'http') {
        throw new ErroApi('rede', 'Serviço de CEP indisponível no momento. Preencha o endereço manualmente.');
      }
      throw erro;
    }
    throw new ErroApi('rede', 'Falha ao consultar o CEP. Preencha o endereço manualmente.');
  }

  if (dados.erro === true || dados.erro === 'true') {
    throw new ErroApi('nao-encontrado', 'CEP não encontrado. Preencha o endereço manualmente.');
  }

  return {
    cep: dados.cep || formatarCep(digitos),
    logradouro: dados.logradouro || '',
    complemento: dados.complemento || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '',
    uf: dados.uf || '',
  };

}

/**
 * Consulta feriados nacionais do ano pela BrasilAPI, utilizando cache no localStorage (US05).
 * Validade do cache: 30 dias (gerenciada por storage.js).
 * @param {number|string} ano
 * @returns {Promise<Array<{date: string, name: string}>>}
 */
export async function buscarFeriados(ano) {
  const anoStr = String(ano);
  const emCache = storage.lerFeriadosCache(anoStr);
  if (emCache) {
    return emCache;
  }

  const url = `https://brasilapi.com.br/api/feriados/v1/${anoStr}`;
  let feriados;
  try {
    feriados = await buscarJSON(url, `Erro ao consultar feriados de ${anoStr}`);
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi('rede', 'Sem conexão para verificar feriados.');
  }

  if (Array.isArray(feriados)) {
    storage.salvarFeriadosCache(anoStr, feriados);
    return feriados;
  }

  return [];

}
