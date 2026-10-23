/* ==========================================================================
   dominio.test.js — TESTES AUTOMÁTICOS DO DOMÍNIO   (ticket: US07 / US11)
   ========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIG,
  STATUS,
  Servico,
  Agendamento,
  AgendamentoDomiciliar,
  criarAgendamento,
  criarGeradorProtocolo,
  ultimoNumeroProtocolo,
} from '../js/dominio/agendamento.js';

import {
  horarioDentroDoFuncionamento,
  dataValida,
  horaValida,
  telefoneValido,
  cepValido,
  formatarCep,
  validarAgendamento,
  temConflito,
  formatarMoeda,
  acharFeriado,
} from '../js/dominio/regras.js';

import {
  filtrarAgendamentos,
  porStatus,
  porBusca,
  calcularFechamento,
  proximoAtendimento,
  montarLinhasRelatorio,
} from '../js/dominio/fechamento.js';

const servicoBanho = new Servico({
  id: 'banho',
  nome: 'Banho',
  descricao: 'Banho simples',
  preco: 60,
  duracaoMin: 60,
  domiciliar: true,
});

const servicoAdestramento = new Servico({
  id: 'adestramento',
  nome: 'Adestramento',
  descricao: 'Sessão na loja',
  preco: 110,
  duracaoMin: 60,
  domiciliar: false,
});

const catalogo = [servicoBanho, servicoAdestramento];

test('closure: o protocolo é sequencial e mantém o estado', () => {
  const proximo = criarGeradorProtocolo(7);
  assert.equal(proximo(), 'AP-0008');
  assert.equal(proximo(), 'AP-0009');
});

test('ultimoNumeroProtocolo identifica o maior identificador', () => {
  const lista = [
    { protocolo: 'AP-0002' },
    { protocolo: 'AP-0015' },
    { protocolo: 'AP-0003' },
  ];
  assert.equal(ultimoNumeroProtocolo(lista), 15);
});

test('herança: atendimento na loja cobra o valor do serviço', () => {
  const ag = new Agendamento({
    protocolo: 'AP-0001',
    tutor: 'Mariana',
    telefone: '(11) 98888-7777',
    pet: 'Thor',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
  });
  assert.equal(ag.calcularValor(), 60);
  assert.equal(ag.tipo, 'Na loja');
});

test('herança: atendimento domiciliar inclui taxa de deslocamento para SP e fora de SP', () => {
  const domiciliarSP = new AgendamentoDomiciliar({
    protocolo: 'AP-0002',
    tutor: 'Carlos',
    telefone: '(11) 97777-6666',
    pet: 'Luna',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '10:00',
    endereco: { cidade: 'São Paulo', uf: 'SP', logradouro: 'Av Paulista', numero: '100' },
  });
  assert.equal(domiciliarSP.taxaDeslocamento(), CONFIG.taxaSP);
  assert.equal(domiciliarSP.calcularValor(), 60 + CONFIG.taxaSP);

  const domiciliarOutra = new AgendamentoDomiciliar({
    protocolo: 'AP-0003',
    tutor: 'Paula',
    telefone: '(11) 96666-5555',
    pet: 'Rex',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '11:00',
    endereco: { cidade: 'Guarulhos', uf: 'SP', logradouro: 'Rua Central', numero: '50' },
  });
  assert.equal(domiciliarOutra.taxaDeslocamento(), CONFIG.taxaOutra);
  assert.equal(domiciliarOutra.calcularValor(), 60 + CONFIG.taxaOutra);
});

test('horarioDentroDoFuncionamento respeita abertura, fechamento e múltiplos de 30 min', () => {
  assert.equal(horarioDentroDoFuncionamento('08:00', 60), true);
  assert.equal(horarioDentroDoFuncionamento('17:00', 60), true);
  assert.equal(horarioDentroDoFuncionamento('17:30', 60), false); // terminaria 18:30 (após fechamento)
  assert.equal(horarioDentroDoFuncionamento('07:30', 30), false); // antes da abertura
  assert.equal(horarioDentroDoFuncionamento('09:15', 30), false); // não é múltiplo de 30 min
});

test('conflito de horários: mesmo dia e hora impede agendamento ativo, mas cancelado libera', () => {
  const item1 = new Agendamento({
    protocolo: 'AP-0001',
    tutor: 'Mariana',
    telefone: '(11) 98888-7777',
    pet: 'Thor',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
    status: STATUS.AGENDADO,
  });

  const item2 = new Agendamento({
    protocolo: 'AP-0002',
    tutor: 'Lucas',
    telefone: '(11) 99999-8888',
    pet: 'Mel',
    especie: 'Gato',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
    status: STATUS.AGENDADO,
  });

  assert.equal(temConflito([item1], item2), true);

  item1.alterarStatus(STATUS.CANCELADO);
  assert.equal(temConflito([item1], item2), false);
});

test('validarAgendamento valida campos obrigatórios, telefone e serviço domiciliar', () => {
  const dadosInvalidos = {
    tutor: '',
    telefone: '123',
    pet: '',
    especie: '',
    servicoId: 'adestramento',
    domiciliar: true, // adestramento não aceita domicílio
    data: '2020-01-01',
    hora: '07:00',
  };

  const erros = validarAgendamento(dadosInvalidos, servicoAdestramento);
  assert.ok(erros.tutor);
  assert.ok(erros.telefone);
  assert.ok(erros.pet);
  assert.ok(erros.especie);
  assert.ok(erros.servico);
  assert.ok(erros.data);
  assert.ok(erros.hora);
});

test('calcularFechamento contabiliza faturamento só dos concluídos e valores a receber', () => {
  const lista = [
    new Agendamento({
      protocolo: 'AP-0001',
      tutor: 'Tutor 1',
      telefone: '(11) 91111-2222',
      pet: 'Pet 1',
      especie: 'Cão',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '09:00',
      status: STATUS.CONCLUIDO,
    }),
    new Agendamento({
      protocolo: 'AP-0002',
      tutor: 'Tutor 2',
      telefone: '(11) 92222-3333',
      pet: 'Pet 2',
      especie: 'Cão',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '10:00',
      status: STATUS.AGENDADO,
    }),
    new Agendamento({
      protocolo: 'AP-0003',
      tutor: 'Tutor 3',
      telefone: '(11) 93333-4444',
      pet: 'Pet 3',
      especie: 'Gato',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '11:00',
      status: STATUS.CANCELADO,
    }),
  ];

  const fechamento = calcularFechamento(lista, '2026-10-25');
  assert.equal(fechamento.total, 3);
  assert.equal(fechamento.concluidos, 1);
  assert.equal(fechamento.agendados, 1);
  assert.equal(fechamento.cancelados, 1);
  assert.equal(fechamento.faturamento, 60);
  assert.equal(fechamento.aReceber, 60);
  assert.equal(fechamento.encerrado, false);
});

test('filtrarAgendamentos combina busca e status', () => {
  const lista = [
    { tutor: 'Sônia Martins', pet: 'Zeca', protocolo: 'AP-0001', status: 'Concluído' },
    { tutor: 'Carlos Lima', pet: 'Luna', protocolo: 'AP-0002', status: 'Agendado' },
    { tutor: 'Sônia Souza', pet: 'Bela', protocolo: 'AP-0003', status: 'Agendado' },
  ];

  const res1 = filtrarAgendamentos(lista, porStatus('Agendado'));
  assert.equal(res1.length, 2);

  const res2 = filtrarAgendamentos(lista, porBusca('sonia'), porStatus('Agendado'));
  assert.equal(res2.length, 1);
  assert.equal(res2[0].pet, 'Bela');
});

test('cepValido e formatarCep tratam o formato de 8 dígitos e máscara', () => {
  assert.equal(cepValido('01310-200'), true);
  assert.equal(cepValido('01310200'), true);
  assert.equal(cepValido('123'), false);
  assert.equal(cepValido('123456789'), false);
  assert.equal(formatarCep('01310200'), '01310-200');
  assert.equal(formatarCep('01310-200'), '01310-200');
});

test('acharFeriado identifica feriado e validarAgendamento exige confirmação em feriado', () => {
  const feriados = [
    { date: '2026-11-02', name: 'Finados' },
    { date: '2026-11-15', name: 'Proclamação da República' },
  ];

  const achado = acharFeriado(feriados, '2026-11-02');
  assert.equal(achado?.name, 'Finados');
  assert.equal(acharFeriado(feriados, '2026-11-03'), null);

  const dadosValidos = {
    tutor: 'Carlos Silva',
    telefone: '(11) 98765-4321',
    pet: 'Rex',
    especie: 'Cão',
    servicoId: 'banho',
    domiciliar: false,
    data: '2026-11-02',
    hora: '10:00',
  };

  // Sem confirmar o feriado: deve retornar erro em feriado-confirmar
  const errosSemConfirmacao = validarAgendamento(dadosValidos, servicoBanho, {
    feriado: achado,
    confirmouFeriado: false,
  });
  assert.ok(errosSemConfirmacao['feriado-confirmar']);

  // Confirmando o feriado: deve passar sem erro
  const errosComConfirmacao = validarAgendamento(dadosValidos, servicoBanho, {
    feriado: achado,
    confirmouFeriado: true,
  });
  assert.equal(Object.keys(errosComConfirmacao).length, 0);
});

test('POO: método conflitaCom compara instâncias ativas na mesma data e hora', () => {
  const ag1 = new Agendamento({
    protocolo: 'AP-0001',
    tutor: 'Mariana',
    telefone: '(11) 98888-7777',
    pet: 'Thor',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
    status: STATUS.AGENDADO,
  });

  const ag2 = new Agendamento({
    protocolo: 'AP-0002',
    tutor: 'Carlos',
    telefone: '(11) 97777-6666',
    pet: 'Luna',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
    status: STATUS.AGENDADO,
  });

  const agOutroHorario = new Agendamento({
    protocolo: 'AP-0003',
    tutor: 'Sônia',
    telefone: '(11) 96666-5555',
    pet: 'Zeca',
    especie: 'Gato',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '10:00',
    status: STATUS.AGENDADO,
  });

  // Não conflita consigo mesmo
  assert.equal(ag1.conflitaCom(ag1), false);

  // Conflita com outro ativo na mesma data e hora
  assert.equal(ag1.conflitaCom(ag2), true);

  // Não conflita com outro em horário diferente
  assert.equal(ag1.conflitaCom(agOutroHorario), false);

  // Se ag1 for cancelado, não gera conflito
  ag1.alterarStatus(STATUS.CANCELADO);
  assert.equal(ag1.conflitaCom(ag2), false);
});

test('POO: resumo e enderecoCompleto em Agendamento e AgendamentoDomiciliar', () => {
  const ag = new Agendamento({
    protocolo: 'AP-0001',
    tutor: 'Mariana',
    telefone: '(11) 98888-7777',
    pet: 'Thor',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '09:00',
  });
  assert.equal(ag.resumo(), 'AP-0001 — Thor (Mariana) · Banho às 09:00');

  const agDom = new AgendamentoDomiciliar({
    protocolo: 'AP-0002',
    tutor: 'Carlos',
    telefone: '(11) 97777-6666',
    pet: 'Luna',
    especie: 'Cão',
    servico: servicoBanho,
    data: '2026-10-25',
    hora: '10:00',
    endereco: {
      logradouro: 'Av Paulista',
      numero: '100',
      complemento: 'Apto 12',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310-200',
    },
  });

  assert.equal(agDom.resumo(), 'AP-0002 — Luna (Carlos) · Banho às 10:00 [Domiciliar (São Paulo)]');
  assert.equal(
    agDom.enderecoCompleto(),
    'Av Paulista, 100 - Apto 12 - Bela Vista - São Paulo/SP - CEP 01310-200'
  );
});

test('proximoAtendimento retorna o próximo agendado ou null', () => {
  const lista = [
    new Agendamento({
      protocolo: 'AP-0001',
      tutor: 'Tutor 1',
      telefone: '(11) 91111-2222',
      pet: 'Pet 1',
      especie: 'Cão',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '09:00',
      status: STATUS.CONCLUIDO,
    }),
    new Agendamento({
      protocolo: 'AP-0002',
      tutor: 'Tutor 2',
      telefone: '(11) 92222-3333',
      pet: 'Pet 2',
      especie: 'Cão',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '10:30',
      status: STATUS.AGENDADO,
    }),
    new Agendamento({
      protocolo: 'AP-0003',
      tutor: 'Tutor 3',
      telefone: '(11) 93333-4444',
      pet: 'Pet 3',
      especie: 'Cão',
      servico: servicoBanho,
      data: '2026-10-25',
      hora: '14:00',
      status: STATUS.AGENDADO,
    }),
  ];

  // Às 08:00, o próximo ativo é o das 10:30 (09:00 está concluído)
  const p1 = proximoAtendimento(lista, '08:00');
  assert.equal(p1?.protocolo, 'AP-0002');

  // Às 11:00, o próximo é o das 14:00
  const p2 = proximoAtendimento(lista, '11:00');
  assert.equal(p2?.protocolo, 'AP-0003');

  // Às 15:00, não há mais agendamentos
  const p3 = proximoAtendimento(lista, '15:00');
  assert.equal(p3, null);
});

test('montarLinhasRelatorio gera as linhas formatadas do fechamento', () => {
  const fechamento = {
    data: '2026-10-25',
    total: 3,
    concluidos: 2,
    agendados: 1,
    cancelados: 0,
    faturamento: 120,
    aReceber: 60,
    encerrado: false,
    porServico: [
      { id: 'banho', nome: 'Banho simples', quantidade: 3, faturado: 120 },
    ],
  };

  const linhas = montarLinhasRelatorio(fechamento);
  assert.ok(linhas.some((l) => l.includes('RELATÓRIO DE FECHAMENTO')));
  assert.ok(linhas.some((l) => l.includes('25/10/2026')));
  assert.ok(linhas.some((l) => l.includes('Total de atendimentos: 3')));
  assert.ok(linhas.some((l) => l.includes('Banho simples')));
  assert.ok(linhas.some((l) => l.includes('120,00')));
});
