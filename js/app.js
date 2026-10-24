/* ==========================================================================
   app.js — O "MAESTRO" DA APLICAÇÃO   (tickets: US02, US03, US04, US05, US06)
   ========================================================================== */

import * as api from './api.js';
import * as ui from './ui.js';
import * as storage from './storage.js';

import {
  CONFIG,
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
  horaAgora,
  buscarLembreteProximo,
} from './dominio/regras.js';

import {
  agendamentosDoDia,
  filtrarAgendamentos,
  porStatus,
  porBusca,
  calcularFechamento,
  proximoAtendimento,
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
  selecionado: null,
  gerarProtocolo: null,
  ultimoCepBuscado: '',
  feriado: null,
  lembretesAtivos: true,
};

let timerPeriodico = null;
const INTERVALO_LEMBRETES_MS = 30000;

/**
 * Salva a agenda atual no storage.
 */
function salvar() {
  storage.salvarAgenda(estado.agenda);
  const painelExportacao = ui.$('exportacao');
  if (painelExportacao && !painelExportacao.hidden && ui.$('exportacao-texto')) {
    ui.$('exportacao-texto').value = storage.exportarAgendaJSON(estado.agenda);
  }
}

/**
 * Redesenha a lista da agenda e contador com base no estado atual (US06, US09).
 * @param {Date} [agora=new Date()]
 */
function atualizarAgenda(agora = new Date()) {
  const doDia = agendamentosDoDia(estado.agenda, estado.dataAgenda);
  const visiveis = filtrarAgendamentos(
    doDia,
    porStatus(estado.filtroStatus),
    porBusca(estado.busca)
  );

  const temFiltros = (estado.filtroStatus !== 'todos') || Boolean(estado.busca.trim());

  ui.renderizarAgenda(visiveis, {
    expandidos: estado.expandidos,
    selecionado: estado.selecionado,
    dataExibida: estado.dataAgenda,
    agora,
    temFiltros,
  });

  // Atualiza banner do próximo atendimento (US06, US07, US09)
  const horaCorte = (estado.dataAgenda === hojeISO()) ? horaAgora(agora) : '00:00';
  const proximo = proximoAtendimento(doDia, horaCorte);
  ui.atualizarBannerProximo(proximo, agora);

  // Calcula e renderiza o fechamento consolidado do dia (US07)
  const resumo = calcularFechamento(estado.agenda, estado.dataAgenda, horaCorte);
  ui.renderizarFechamento(resumo);

  // Atualiza o lembrete de atendimento próximo (em 15 min ou menos) (US09)
  if (estado.lembretesAtivos) {
    const doDiaHoje = agendamentosDoDia(estado.agenda, hojeISO());
    const lembrete = buscarLembreteProximo(doDiaHoje, agora, CONFIG.minutoLembrete || 15);
    ui.mostrarLembrete(lembrete);
  } else {
    ui.mostrarLembrete(null);
  }
}

/**
 * Ciclo periódico disparado pelo setInterval a cada 30 segundos (US09).
 * Atualiza o relógio, o próximo atendimento e destaca atendimentos atrasados.
 */
function cicloPeriodico() {
  const agora = new Date();
  ui.atualizarRelogio(agora);
  atualizarAgenda(agora);
}

/**
 * Inicia o temporizador periódico com setInterval (US09).
 */
function iniciarTemporizador() {
  if (timerPeriodico) {
    clearInterval(timerPeriodico);
  }
  cicloPeriodico();
  timerPeriodico = setInterval(cicloPeriodico, INTERVALO_LEMBRETES_MS);
  estado.lembretesAtivos = true;
  ui.atualizarBotaoLembretes(true);
}

/**
 * Pausa o temporizador periódico utilizando clearInterval (US09).
 */
function pausarTemporizador() {
  if (timerPeriodico) {
    clearInterval(timerPeriodico);
    timerPeriodico = null;
  }
  estado.lembretesAtivos = false;
  ui.atualizarBotaoLembretes(false);
  ui.mostrarLembrete(null);
}

/**
 * Alterna entre pausar e retomar os lembretes periódicos (US09).
 */
function alternarLembretes() {
  if (estado.lembretesAtivos) {
    pausarTemporizador();
    ui.mostrarToast('Lembretes periódicos pausados.', 'info');
  } else {
    iniciarTemporizador();
    ui.mostrarToast('Lembretes periódicos retomados.', 'info');
  }
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
  const agora = new Date();
  const confirmouFeriado = Boolean(ui.$('feriado-confirmar')?.checked);

  // Validação no submit com preventDefault (incluindo checagem de feriado)
  const erros = validarAgendamento(dados, servico, {
    feriado: estado.feriado,
    confirmouFeriado,
    agora,
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
    ui.mostrarToast('Não foi possível verificar feriados para a data escolhida. Você pode prosseguir com o agendamento.', 'info');
  }
}

/**
 * Trata cliques dentro da lista da agenda (alternar detalhes, concluir, cancelar, selecionar) (US06).
 * @param {MouseEvent} evento
 */
function aoClicarNaAgenda(evento) {
  const itemLi = evento.target.closest('li[data-protocolo]');
  if (!itemLi) return;

  const protocolo = itemLi.getAttribute('data-protocolo');
  const agendamento = estado.agenda.find((a) => a.protocolo === protocolo);
  if (!agendamento) return;

  const alvoAcao = evento.target.closest('[data-acao]');
  const acao = alvoAcao ? alvoAcao.getAttribute('data-acao') : null;

  if (acao === 'concluir') {
    evento.stopPropagation();
    agendamento.alterarStatus(STATUS.CONCLUIDO);
    salvar();
    atualizarAgenda();
    ui.mostrarToast(`Atendimento ${protocolo} (${agendamento.pet}) marcado como Concluído.`, 'sucesso');
    return;
  }

  if (acao === 'cancelar') {
    evento.stopPropagation();
    agendamento.alterarStatus(STATUS.CANCELADO);
    salvar();
    atualizarAgenda();
    ui.mostrarToast(`Atendimento ${protocolo} (${agendamento.pet}) foi Cancelado.`, 'info');
    return;
  }

  if (acao === 'alternar') {
    if (estado.expandidos.has(protocolo)) {
      estado.expandidos.delete(protocolo);
    } else {
      estado.expandidos.add(protocolo);
    }
  }

  // Destaque de seleção do item ao clicar com o mouse
  estado.selecionado = (estado.selecionado === protocolo) ? null : protocolo;
  atualizarAgenda();
}

/**
 * Trata teclas Enter e Espaço na lista da agenda para acessibilidade por teclado (US06).
 * @param {KeyboardEvent} evento
 */
function aoTeclarNaAgenda(evento) {
  if (evento.key !== 'Enter' && evento.key !== ' ') return;
  const itemLi = evento.target.closest('li[data-protocolo]');
  if (!itemLi) return;

  // Se o foco está diretamente em um botão de ação, a ativação nativa do botão responde
  if (evento.target.tagName === 'BUTTON') return;

  evento.preventDefault();
  const protocolo = itemLi.getAttribute('data-protocolo');
  if (estado.expandidos.has(protocolo)) {
    estado.expandidos.delete(protocolo);
  } else {
    estado.expandidos.add(protocolo);
  }
  estado.selecionado = (estado.selecionado === protocolo) ? null : protocolo;
  atualizarAgenda();
}

/**
 * Trata os atalhos de teclado globais ("N", "/", "Esc") (US06).
 * @param {KeyboardEvent} evento
 */
function aoDigitarTeclado(evento) {
  const elementoAtivo = document.activeElement;
  const emCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(elementoAtivo?.tagName);

  // Atalho "Esc" (limpa a busca em tempo real)
  if (evento.key === 'Escape') {
    const inputBusca = ui.$('busca');
    if (inputBusca && (inputBusca.value || elementoAtivo === inputBusca)) {
      evento.preventDefault();
      inputBusca.value = '';
      estado.busca = '';
      atualizarAgenda();
      inputBusca.blur();
      return;
    }
  }

  // Ignora atalhos de letra se o usuário estiver digitando em um campo de texto
  if (emCampo) return;

  // Atalho "/" (foca o campo de busca sem digitar a barra)
  if (evento.key === '/') {
    evento.preventDefault();
    const inputBusca = ui.$('busca');
    if (inputBusca) {
      inputBusca.focus();
      inputBusca.select();
    }
    return;
  }

  // Atalho "N" (vai ao formulário, focando o primeiro campo: Tutor)
  if (evento.key.toLowerCase() === 'n') {
    evento.preventDefault();
    const inputTutor = ui.$('tutor');
    if (inputTutor) {
      inputTutor.focus();
    }
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

  // Interação com a agenda com mouse e teclado (US06)
  const ulAgenda = ui.$('lista-agenda');
  if (ulAgenda) {
    ulAgenda.addEventListener('click', aoClicarNaAgenda);
    ulAgenda.addEventListener('keydown', aoTeclarNaAgenda);
  }

  // Filtros da agenda: Data
  const inputDataAgenda = ui.$('data-agenda');
  if (inputDataAgenda) {
    inputDataAgenda.addEventListener('input', (e) => {
      estado.dataAgenda = e.target.value;
      atualizarAgenda();
    });
  }

  // Filtros da agenda: Status (US06, US08)
  const selectFiltroStatus = ui.$('filtro-status');
  if (selectFiltroStatus) {
    selectFiltroStatus.addEventListener('change', (e) => {
      estado.filtroStatus = e.target.value;
      storage.salvarFiltro(estado.filtroStatus);
      atualizarAgenda();
    });
  }

  // Alternância de tema claro/escuro (US08)
  const btnTema = ui.$('btn-tema');
  if (btnTema) {
    btnTema.addEventListener('click', () => {
      const temaAtual = storage.lerTema();
      const novoTema = temaAtual === 'escuro' ? 'claro' : 'escuro';
      ui.aplicarTema(novoTema);
      storage.salvarTema(novoTema);
      ui.mostrarToast(`Tema ${novoTema === 'escuro' ? 'escuro' : 'claro'} ativado.`, 'info');
    });
  }

  // Controle de pausar/retomar lembretes periódicos (US09)
  const btnLembretes = ui.$('btn-lembretes');
  if (btnLembretes) {
    btnLembretes.addEventListener('click', alternarLembretes);
  }

  // Botão Limpar meus dados (US08)
  const btnLimpar = ui.$('btn-limpar');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      const confirmou = window.confirm(
        'Deseja realmente limpar todos os agendamentos salvos? Esta ação não pode ser desfeita.'
      );
      if (!confirmou) return;

      storage.limparDados(true);
      estado.agenda = [];
      estado.expandidos.clear();
      estado.selecionado = null;
      estado.gerarProtocolo = criarGeradorProtocolo(0);

      const painelExportacao = ui.$('exportacao');
      if (painelExportacao) painelExportacao.hidden = true;

      atualizarAgenda();
      ui.mostrarToast('Todos os agendamentos salvos foram removidos.', 'sucesso');
    });
  }

  // Botão Exportar dados (US08)
  const btnExportar = ui.$('btn-exportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      const jsonTexto = storage.exportarAgendaJSON(estado.agenda);
      ui.alternarExportacao(jsonTexto);
    });
  }

  // Botão Copiar JSON exportado (US08)
  const btnCopiar = ui.$('btn-copiar');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', async () => {
      const textarea = ui.$('exportacao-texto');
      const texto = textarea?.value || '';
      if (!texto) return;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(texto);
        } else {
          textarea.select();
          document.execCommand('copy');
        }
        ui.mostrarToast('JSON copiado para a área de transferência!', 'sucesso');
      } catch {
        ui.mostrarToast('Não foi possível copiar automaticamente. Selecione e copie o texto.', 'erro');
      }
    });
  }

  // Botão Baixar JSON (US08 - bônus)
  const btnBaixar = ui.$('btn-baixar');
  if (btnBaixar) {
    btnBaixar.addEventListener('click', () => {
      const texto = ui.$('exportacao-texto')?.value || storage.exportarAgendaJSON(estado.agenda);
      try {
        const blob = new Blob([texto], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agenda-${estado.dataAgenda || hojeISO()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        ui.mostrarToast('Arquivo JSON baixado com sucesso!', 'sucesso');
      } catch {
        ui.mostrarToast('Erro ao gerar o download do arquivo JSON.', 'erro');
      }
    });
  }

  // Botão Carregar agenda de exemplo (US08, US11)
  const btnExemplo = ui.$('btn-exemplo');
  if (btnExemplo) {
    btnExemplo.addEventListener('click', async () => {
      try {
        const dadosExemplo = await api.carregarAgendaExemplo();
        estado.agenda = [];
        for (const item of dadosExemplo) {
          try {
            estado.agenda.push(criarAgendamento(item, estado.servicos));
          } catch {
            // ignora agendamentos com dados inconsistentes
          }
        }

        const ultimo = ultimoNumeroProtocolo(estado.agenda);
        estado.gerarProtocolo = criarGeradorProtocolo(ultimo);
        salvar();
        atualizarAgenda();

        const painelExportacao = ui.$('exportacao');
        if (painelExportacao && !painelExportacao.hidden && ui.$('exportacao-texto')) {
          ui.$('exportacao-texto').value = storage.exportarAgendaJSON(estado.agenda);
        }

        ui.mostrarToast(`Agenda de exemplo carregada com ${estado.agenda.length} atendimentos!`, 'sucesso');
      } catch (erro) {
        ui.mostrarToast(erro.message || 'Erro ao carregar dados de exemplo.', 'erro');
      }
    });
  }

  // Busca em tempo real por tutor ou pet (input e keyup) (US06)
  const inputBusca = ui.$('busca');
  if (inputBusca) {
    const aoBuscar = (e) => {
      estado.busca = e.target.value;
      atualizarAgenda();
    };
    inputBusca.addEventListener('input', aoBuscar);
    inputBusca.addEventListener('keyup', aoBuscar);
  }

  // Atalhos de teclado globais ("N", "/", "Esc") (US06)
  document.addEventListener('keydown', aoDigitarTeclado);
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
  // Aplica a preferência de tema salva (US08)
  const temaSalvo = storage.lerTema();
  ui.aplicarTema(temaSalvo);

  // Restaura o filtro de status salvo (US08)
  estado.filtroStatus = storage.lerFiltro();
  if (ui.$('filtro-status')) {
    ui.$('filtro-status').value = estado.filtroStatus;
  }

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

  // Inicia relógio e lembretes periódicos com setInterval (US09)
  iniciarTemporizador();
}

// Inicializa a aplicação
iniciar();
