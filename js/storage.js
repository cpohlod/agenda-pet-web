/* ==========================================================================
   storage.js — TODO O ACESSO AO localStorage MORA AQUI   (ticket: US08; apoia US05)
   ========================================================================== */

const PREFIXO = 'agendapet:';

export const CHAVES = Object.freeze({
  agenda: `${PREFIXO}agenda`,
  filtro: `${PREFIXO}filtro`,
  tema: `${PREFIXO}tema`,
  feriadosPrefixo: `${PREFIXO}feriados:`,
});

/**
 * Lê uma chave do localStorage e faz o parse de JSON de forma segura.
 * Nunca lança exceção se o valor não existir ou estiver corrompido.
 * @param {string} chave
 * @param {any} padrao
 * @returns {any}
 */
export function lerJSON(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return padrao;
    return JSON.parse(bruto);
  } catch {
    return padrao;
  }
}

/**
 * Serializa e grava um valor no localStorage de forma segura com try/catch.
 * @param {string} chave
 * @param {any} valor
 * @returns {boolean} Retorna true se gravou com sucesso, false caso contrário.
 */
export function salvarJSON(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê a lista de agendamentos persistida no localStorage.
 * Retorna sempre um array (vazio se inexistente ou corrompido).
 * @returns {Array<object>}
 */
export function lerAgenda() {
  const valor = lerJSON(CHAVES.agenda, []);
  return Array.isArray(valor) ? valor : [];
}

/**
 * Salva a lista de agendamentos no localStorage.
 * Transforma instâncias de classe em objetos simples usando paraJSON().
 * @param {Array} lista
 * @returns {boolean}
 */
export function salvarAgenda(lista = []) {
  if (!Array.isArray(lista)) return false;
  const objetos = lista.map((item) =>
    typeof item.paraJSON === 'function' ? item.paraJSON() : item
  );
  return salvarJSON(CHAVES.agenda, objetos);
}

/**
 * Converte a lista de agendamentos em JSON formatado com 2 espaços (US08, US11).
 * Mesma estrutura compatível com os scripts de Node.js.
 * @param {Array} lista
 * @returns {string}
 */
export function exportarAgendaJSON(lista = []) {
  if (!Array.isArray(lista)) return '[]';
  const objetos = lista.map((item) =>
    typeof item.paraJSON === 'function' ? item.paraJSON() : item
  );
  return JSON.stringify(objetos, null, 2);
}

/**
 * Lê o filtro de status selecionado.
 * @returns {string}
 */
export function lerFiltro() {
  const filtro = lerJSON(CHAVES.filtro, 'todos');
  const validos = ['todos', 'Agendado', 'Concluído', 'Cancelado'];
  return validos.includes(filtro) ? filtro : 'todos';
}

/**
 * Salva o filtro de status selecionado.
 * @param {string} filtro
 * @returns {boolean}
 */
export function salvarFiltro(filtro) {
  return salvarJSON(CHAVES.filtro, filtro);
}

/**
 * Lê a preferência de tema da página (claro ou escuro).
 * @returns {string} 'claro' | 'escuro'
 */
export function lerTema() {
  const tema = lerJSON(CHAVES.tema, 'claro');
  return tema === 'escuro' ? 'escuro' : 'claro';
}

/**
 * Salva a preferência de tema da página.
 * @param {string} tema
 * @returns {boolean}
 */
export function salvarTema(tema) {
  const normalizado = tema === 'escuro' ? 'escuro' : 'claro';
  return salvarJSON(CHAVES.tema, normalizado);
}

/**
 * Lê o cache de feriados para um determinado ano se ainda estiver na validade.
 * @param {string|number} ano
 * @param {number} [validadeMs=2592000000] 30 dias em milissegundos
 * @returns {Array|null}
 */
export function lerFeriadosCache(ano, validadeMs = 30 * 24 * 60 * 60 * 1000) {
  const cache = lerJSON(`${CHAVES.feriadosPrefixo}${ano}`, null);
  if (!cache || !cache.salvoEm || !Array.isArray(cache.feriados)) {
    return null;
  }
  if (Date.now() - cache.salvoEm > validadeMs) {
    return null;
  }
  return cache.feriados;
}

/**
 * Salva a lista de feriados de um determinado ano em cache.
 * @param {string|number} ano
 * @param {Array} lista
 * @returns {boolean}
 */
export function salvarFeriadosCache(ano, lista) {
  return salvarJSON(`${CHAVES.feriadosPrefixo}${ano}`, {
    salvoEm: Date.now(),
    feriados: lista,
  });
}

/**
 * Remove SOMENTE as chaves de dados criadas pela aplicação (com prefixo 'agendapet:').
 * Preserva o tema e outros itens não vinculados à agenda se manterTema for true.
 * @param {boolean} [manterTema=true]
 * @returns {number} Quantidade de chaves removidas
 */
export function limparDados(manterTema = true) {
  try {
    const chavesParaRemover = [];
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith(PREFIXO)) {
        if (manterTema && chave === CHAVES.tema) {
          continue;
        }
        chavesParaRemover.push(chave);
      }
    }
    chavesParaRemover.forEach((k) => localStorage.removeItem(k));
    return chavesParaRemover.length;
  } catch {
    return 0;
  }
}
