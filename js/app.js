/* ==========================================================================
   app.js — O "MAESTRO" DA APLICAÇÃO   (US02 - Catálogo de Serviços)
   ========================================================================== */

import * as api from './api.js';
import * as ui from './ui.js';
import { Servico } from './dominio/agendamento.js';

/**
 * Estado único da aplicação.
 */
const estado = {
  servicos: [],
};

/**
 * Carrega a lista de serviços com tratamento dos três estados:
 * 1. Carregando (feedback visual imediato)
 * 2. Sucesso (renderiza na lista lateral e popula o <select> do formulário)
 * 3. Erro (mensagem clara com botão "Tentar novamente" sem quebrar a aplicação)
 */
async function carregarCatalogo() {
  const aviso = ui.$('servicos-status');
  ui.mostrarEstado(aviso, 'carregando', 'Carregando serviços…');

  try {
    const dados = await api.carregarServicos();
    estado.servicos = dados.map((s) => new Servico(s));

    ui.renderizarServicos(estado.servicos);
    ui.popularSelectServicos(estado.servicos);
    ui.esconderEstado(aviso);
  } catch (erro) {
    ui.mostrarEstado(aviso, 'erro', erro.message, carregarCatalogo);
  }
}

/**
 * Ponto de partida da aplicação.
 */
function iniciar() {
  carregarCatalogo();
}

// Inicializa a aplicação
iniciar();
