/* ==========================================================================
   api.js — TODO O fetch MORA AQUI   (tickets: US02, US04, US05)
   ========================================================================== */

/**
 * Erro personalizado de requisição com indicação do tipo de falha:
 * - 'rede': requisição rejeitada (sem internet ou queda de conexão)
 * - 'http': servidor respondeu com status de erro (404, 500...)
 * - 'formato': dado de entrada inválido antes de chamar a rede
 * - 'nao-encontrado': consulta concluída sem resultado
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
    throw new ErroApi('rede', 'Sem conexão para carregar os serviços.');
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
