/* ==========================================================================
   app.js — O "MAESTRO" DA APLICAÇÃO   (tickets: US02, US03, US06)
   ========================================================================== */

import * as api from './api.js';
import * as ui from './ui.js';
import * as storage from './storage.js';

import {
  STATUS,
  Servico,
  criarAgendamento,
  criarGeradorProtocolo,
  ultimoNumeroProtocolo,
} from './dominio/agendamento.js';

import {
  hojeISO,
  formatarDataBR,
  validarAgendamento,
  temConflito,
} from './dominio/regras.js';

import {
  agendamentosDoDia,
  filtrarAgendamentos,
  porStatus,
  porBusca,
} from './dominio/fechamento.js';

/**
 * Estado único da aplicação.
 */
const estado = {
  servicos: [],
  agenda: [],
  dataAgenda: hojeISO(),
  filtroStatus: 'todos',
  busca: '',
  expandidos: new Set(),
  gerarProtocolo: null,
};

/**
 * Salva a agenda atual no storage.
 */
function salvar() {
  storage.salvarAgenda(estado.agenda);
}

/**
 * Redesenha a lista da agenda e contador com base no estado atual.
 */
function atualizarAgenda() {
  const doDia = agendamentosDoDia(estado.agenda, estado.dataAgenda);
  const visiveis = filtrarAgendamentos(
    doDia,
    porStatus(estado.filtroStatus),
    porBusca(estado.busca)
  );

  ui.renderizarAgenda(visiveis, {
    expandidos: estado.expandidos,
    dataExibida: estado.dataAgenda,
    agora: new Date(),
  });
}

/**
 * Trata o envio do formulário de agendamento (US03).
 * @param {Event} evento
 */
function aoEnviarFormulario(evento) {
  evento.preventDefault();
  ui.limparErros();

  const dados = ui.lerFormulario();
  const servico = estado.servicos.find((s) => s.id === dados.servicoId);
  const confirmouFeriado = Boolean(ui.$('feriado-confirmar')?.checked);

  // Validação no submit com preventDefault
  const erros = validarAgendamento(dados, servico, {
    confirmouFeriado,
    agora: new Date(),
  });

  if (Object.keys(erros).length > 0) {
    ui.mostrarErros(erros);
    return;
  }

  // Gera protocolo sequencial
  const protocolo = estado.gerarProtocolo ? estado.gerarProtocolo() : `AP-${Date.now()}`;
  const novoAgendamento = criarAgendamento(
    { ...dados, protocolo },
    estado.servicos
  );

  // Verifica conflito de horário
  if (temConflito(estado.agenda, novoAgendamento)) {
    ui.mostrarErros({
      hora: `Já existe um atendimento às ${dados.hora} em ${formatarDataBR(dados.data)}. Escolha outro horário.`,
    });
    return;
  }

  // Adiciona à agenda e persiste
  estado.agenda.push(novoAgendamento);
  salvar();

  // Sincroniza a data exibida na agenda com a do agendamento salvo
  estado.dataAgenda = dados.data;
  if (ui.$('data-agenda')) {
    ui.$('data-agenda').value = dados.data;
  }

  // Limpa o formulário e redesenha a agenda
  ui.limparFormulario();
  if (ui.$('data')) {
    ui.$('data').value = hojeISO();
  }
  atualizarAgenda();

  // Exibe mensagem de confirmação de sucesso
  const statusEl = ui.$('form-status');
  if (statusEl) {
    ui.mostrarEstado(
      statusEl,
      'sucesso',
      `Agendamento ${novoAgendamento.protocolo} registrado com sucesso!`
    );
    setTimeout(() => ui.esconderEstado(statusEl), 5000);
  }

  ui.mostrarToast(
    `Agendamento ${novoAgendamento.protocolo} salvo: ${novoAgendamento.pet} (${novoAgendamento.tutor}), ${formatarDataBR(novoAgendamento.data)} às ${novoAgendamento.hora}.`,
    'sucesso'
  );
}

/**
 * Trata cliques dentro da lista da agenda (alternar detalhes, concluir, cancelar).
 * @param {MouseEvent} evento
 */
function aoClicarNaAgenda(evento) {
  const alvo = evento.target.closest('[data-acao]');
  if (!alvo) return;

  const itemLi = alvo.closest('li[data-protocolo]');
  if (!itemLi) return;

  const protocolo = itemLi.getAttribute('data-protocolo');
  const agendamento = estado.agenda.find((a) => a.protocolo === protocolo);
  if (!agendamento) return;

  const acao = alvo.getAttribute('data-acao');

  if (acao === 'alternar') {
    if (estado.expandidos.has(protocolo)) {
      estado.expandidos.delete(protocolo);
    } else {
      estado.expandidos.add(protocolo);
    }
    atualizarAgenda();
  } else if (acao === 'concluir') {
    agendamento.alterarStatus(STATUS.CONCLUIDO);
    salvar();
    atualizarAgenda();
    ui.mostrarToast(`Atendimento ${protocolo} marcado como Concluído.`, 'sucesso');
  } else if (acao === 'cancelar') {
    agendamento.alterarStatus(STATUS.CANCELADO);
    salvar();
    atualizarAgenda();
    ui.mostrarToast(`Atendimento ${protocolo} foi Cancelado.`, 'info');
  }
}

/**
 * Registra todos os ouvintes de eventos da interface.
 */
function ligarEventos() {
  // Formulário de agendamento (US03)
  const form = ui.$('form-agendamento');
  if (form) {
    form.addEventListener('submit', aoEnviarFormulario);
  }

  // Checkbox domiciliar
  const chkDomiciliar = ui.$('domiciliar');
  if (chkDomiciliar) {
    chkDomiciliar.addEventListener('change', (e) => {
      ui.alternarEndereco(e.target.checked);
    });
  }

  // Interação com a agenda (expandir/concluir/cancelar)
  const ulAgenda = ui.$('lista-agenda');
  if (ulAgenda) {
    ulAgenda.addEventListener('click', aoClicarNaAgenda);
  }

  // Filtros da agenda
  const inputDataAgenda = ui.$('data-agenda');
  if (inputDataAgenda) {
    inputDataAgenda.addEventListener('input', (e) => {
      estado.dataAgenda = e.target.value;
      atualizarAgenda();
    });
  }

  const selectFiltroStatus = ui.$('filtro-status');
  if (selectFiltroStatus) {
    selectFiltroStatus.addEventListener('change', (e) => {
      estado.filtroStatus = e.target.value;
      atualizarAgenda();
    });
  }

  const inputBusca = ui.$('busca');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      estado.busca = e.target.value;
      atualizarAgenda();
    });
  }
}

/**
 * Carrega a lista de serviços com tratamento de erros.
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
 * Carrega os agendamentos persistidos no localStorage.
 */
function carregarAgendaSalva() {
  const dados = storage.lerAgenda();
  estado.agenda = [];
  for (const item of dados) {
    try {
      estado.agenda.push(criarAgendamento(item, estado.servicos));
    } catch {
      // Ignora agendamento com dados inconsistentes
    }
  }

  const ultimo = ultimoNumeroProtocolo(estado.agenda);
  estado.gerarProtocolo = criarGeradorProtocolo(ultimo);

  atualizarAgenda();
}

/**
 * Ponto de partida da aplicação.
 */
async function iniciar() {
  const hoje = hojeISO();
  ui.definirDataMinima(hoje);

  if (ui.$('data')) ui.$('data').value = hoje;
  if (ui.$('data-agenda')) ui.$('data-agenda').value = hoje;

  ligarEventos();

  await carregarCatalogo();
  carregarAgendaSalva();
}

// Inicializa a aplicação
iniciar();
