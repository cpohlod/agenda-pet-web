/* ==========================================================================
   agendamento.js — O "CORAÇÃO" DO NEGÓCIO   (US02, US07)
   ========================================================================== */

/**
 * Representa um serviço oferecido pelo pet shop.
 */
export class Servico {
  constructor({ id, nome, descricao, preco, duracaoMin, domiciliar }) {
    this.id = String(id);
    this.nome = String(nome);
    this.descricao = String(descricao ?? '');
    this.preco = Number(preco);
    this.duracaoMin = Number(duracaoMin);
    this.domiciliar = Boolean(domiciliar);
  }
}
