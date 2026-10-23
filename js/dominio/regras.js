/* ==========================================================================
   regras.js — VALIDAÇÕES E FUNÇÕES DE APOIO   (US02, US03, US05, US07)
   ========================================================================== */

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
