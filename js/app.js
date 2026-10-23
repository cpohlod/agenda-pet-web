/* ==========================================================================
   app.js — O "MAESTRO" DA APLICAÇÃO   (tickets: US02, US03, US04, US05, US06)
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
  somenteDigitos,
  formatarCep,
  acharFeriado,
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
  ultimoCepBuscado: '',
  feriado: null,
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
 * Trata o envio do formulário de agendamento (US03, US05).
 * @param {Event} evento
 */
function aoEnviarFormulario(evento) {
  evento.preventDefault();
  ui.limparErros();

  const dados = ui.lerFormulario();
  const servico = estado.servicos.find((s) => s.id === dados.servicoId);
  const confirmouFeriado = Boolean(ui.$('feriado-confirmar')?.checked);

  // Validação no submit com preventDefault (incluindo checagem de feriado)
  const erros = validarAgendamento(dados, servico, {
    feriado: estado.feriado,
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
  estado.feriado = null;
  estado.ultimoCepBuscado = '';
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
 * Consulta o CEP no ViaCEP ao completar 8 dígitos e preenche o endereço (US04).
 * @param {Event} evento
 */
async function aoDigitarCep(evento) {
  const cep = evento.target.value;
  const digitos = somenteDigitos(cep);
  const statusEl = ui.$('cep-status');

  if (digitos.length < 8) {
    ui.esconderEstado(statusEl);
    return;
  }

  if (digitos === estado.ultimoCepBuscado) {
    return;
  }

  estado.ultimoCepBuscado = digitos;
  ui.mostrarEstado(statusEl, 'carregando', 'Buscando endereço pelo CEP…');

  try {
    const endereco = await api.buscarCep(digitos);
    if (somenteDigitos(ui.$('cep')?.value) === digitos) {
      ui.preencherEndereco(endereco);
      ui.mostrarEstado(
        statusEl,
        'sucesso',
        'Endereço preenchido automaticamente! Informe o número e complemento.'
      );
    }
  } catch (erro) {
    ui.mostrarEstado(statusEl, 'erro', erro.message);
  }
}

/**
 * Formata o CEP ao sair do campo (US04).
 * @param {Event} evento
 */
function aoSairDoCep(evento) {
  const cep = evento.target.value.trim();
  if (!cep) return;
  const digitos = somenteDigitos(cep);
  if (digitos.length === 8) {
    evento.target.value = formatarCep(digitos);
  } else {
    const statusEl = ui.$('cep-status');
    ui.mostrarEstado(statusEl, 'erro', 'Formato de CEP inválido: informe 8 dígitos numéricos.');
  }
}

/**
 * Trata alteração da data no formulário para alertar sobre feriados nacionais (US05).
 * Consulta BrasilAPI ou cache de 30 dias no localStorage.
 * Se a data for feriado, exibe aviso e exige confirmação "Agendar mesmo assim".
 * Se a API falhar, avisa com toast e permite continuar normalmente.
 * @param {Event} [evento]
 */
async function aoMudarData(evento) {
  const data = evento?.target?.value || ui.$('data')?.value;
  estado.feriado = null;
  ui.mostrarFeriado(null);

  if (!data) return;
  const ano = data.slice(0, 4);

  try {
    const feriados = await api.buscarFeriados(ano);
    if (ui.$('data')?.value === data) {
      const achado = acharFeriado(feriados, data);
      if (achado) {
        estado.feriado = achado;
        ui.mostrarFeriado(achado);
      }
    }
  } catch {
    // Se a API falhar, avisar que não foi possível verificar feriados e permitir continuar
    ui.mostrarToast('Não foi possível verificar feriados para a data escolhida. Você pode prosseguir com o agendamento.', 'info');
  }
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

  // Checkbox domiciliar (US04)
  const chkDomiciliar = ui.$('domiciliar');
  if (chkDomiciliar) {
    chkDomiciliar.addEventListener('change', (e) => {
      const servicoId = ui.$('servico')?.value;
      const servico = estado.servicos.find((s) => s.id === servicoId);

      if (e.target.checked && servico && !servico.domiciliar) {
        ui.mostrarErros({
          servico: `"${servico.nome}" é realizado apenas na loja e não aceita atendimento domiciliar.`,
        });
        e.target.checked = false;
        ui.alternarEndereco(false);
        return;
      }

      ui.alternarEndereco(e.target.checked);
      if (!e.target.checked) {
        ui.esconderEstado(ui.$('cep-status'));
      } else {
        ui.$('cep')?.focus();
      }
    });
  }

  // Mudança no select de serviço (US04)
  const selectServico = ui.$('servico');
  if (selectServico) {
    selectServico.addEventListener('change', (e) => {
      const servico = estado.servicos.find((s) => s.id === e.target.value);
      if (servico && !servico.domiciliar && ui.$('domiciliar')?.checked) {
        ui.mostrarErros({
          servico: `"${servico.nome}" é realizado apenas na loja e não aceita atendimento domiciliar.`,
        });
        ui.$('domiciliar').checked = false;
        ui.alternarEndereco(false);
      }
    });
  }

  // Campo CEP (US04)
  const inputCep = ui.$('cep');
  if (inputCep) {
    inputCep.addEventListener('input', aoDigitarCep);
    inputCep.addEventListener('blur', aoSairDoCep);
  }

  // Campo Data para alerta de feriados (US05)
  const inputData = ui.$('data');
  if (inputData) {
    inputData.addEventListener('change', aoMudarData);
    inputData.addEventListener('input', aoMudarData);
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

  // Verifica se a data inicial padrão é feriado
  if (ui.$('data')?.value) {
    aoMudarData();
  }
}

// Inicializa a aplicação
iniciar();
