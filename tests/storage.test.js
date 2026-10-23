/* ==========================================================================
   storage.test.js — TESTES AUTOMÁTICOS DE PERSISTÊNCIA E STORAGE (US08)
   ========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';

// Mock simples e em conformidade com a especificação W3C do Storage para ambiente Node
class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }

  get length() {
    return this.store.size;
  }

  key(index) {
    const chaves = Array.from(this.store.keys());
    return chaves[index] ?? null;
  }

  getItem(key) {
    return this.store.has(String(key)) ? this.store.get(String(key)) : null;
  }

  setItem(key, value) {
    this.store.set(String(key), String(value));
  }

  removeItem(key) {
    this.store.delete(String(key));
  }

  clear() {
    this.store.clear();
  }
}

// Configura o mock antes de importar storage.js
globalThis.localStorage = new LocalStorageMock();

const {
  CHAVES,
  lerJSON,
  salvarJSON,
  lerAgenda,
  salvarAgenda,
  exportarAgendaJSON,
  lerFiltro,
  salvarFiltro,
  lerTema,
  salvarTema,
  lerFeriadosCache,
  salvarFeriadosCache,
  limparDados,
} = await import('../js/storage.js');

const {
  STATUS,
  Servico,
  Agendamento,
  AgendamentoDomiciliar,
} = await import('../js/dominio/agendamento.js');

test.beforeEach(() => {
  globalThis.localStorage.clear();
});

test('storage: lerJSON retorna valor padrão quando a chave não existe ou está corrompida', () => {
  // Inexistente
  assert.equal(lerJSON('chave-inexistente', 'padrao'), 'padrao');

  // JSON corrompido com sintaxe inválida
  globalThis.localStorage.setItem('dado-corrompido', '{ nome: "teste", ');
  assert.deepEqual(lerJSON('dado-corrompido', { erro: true }), { erro: true });

  // JSON válido
  globalThis.localStorage.setItem('dado-valido', JSON.stringify({ ok: 123 }));
  assert.deepEqual(lerJSON('dado-valido', null), { ok: 123 });
});

test('storage: salvarJSON grava o valor e trata falhas de escrita graciosamente', () => {
  const sucesso = salvarJSON('teste-salvar', { a: 1 });
  assert.equal(sucesso, true);
  assert.equal(globalThis.localStorage.getItem('teste-salvar'), '{"a":1}');

  // Simula erro de QuotaExceededError
  const originalSetItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };

  const falhou = salvarJSON('teste-quota', { b: 2 });
  assert.equal(falhou, false);

  globalThis.localStorage.setItem = originalSetItem;
});

test('storage: lerAgenda e salvarAgenda preservam a lista e usam paraJSON()', () => {
  assert.deepEqual(lerAgenda(), []);

  const servico = new Servico({
    id: 'banho',
    nome: 'Banho',
    preco: 60,
    duracaoMin: 60,
    domiciliar: true,
  });

  const ag1 = new Agendamento({
    protocolo: 'AP-0001',
    tutor: 'Mariana',
    telefone: '(11) 98888-7777',
    pet: 'Thor',
    especie: 'Cão',
    servico,
    data: '2026-10-25',
    hora: '09:00',
    status: STATUS.AGENDADO,
  });

  const ag2 = new AgendamentoDomiciliar({
    protocolo: 'AP-0002',
    tutor: 'Carlos',
    telefone: '(11) 97777-6666',
    pet: 'Luna',
    especie: 'Cão',
    servico,
    data: '2026-10-25',
    hora: '10:00',
    status: STATUS.CONCLUIDO,
    endereco: {
      logradouro: 'Av Paulista',
      numero: '100',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310-200',
    },
  });

  salvarAgenda([ag1, ag2]);

  const lidos = lerAgenda();
  assert.equal(lidos.length, 2);
  assert.equal(lidos[0].protocolo, 'AP-0001');
  assert.equal(lidos[0].domiciliar, false);
  assert.equal(lidos[1].protocolo, 'AP-0002');
  assert.equal(lidos[1].domiciliar, true);
  assert.equal(lidos[1].endereco?.cidade, 'São Paulo');
});

test('storage: exportarAgendaJSON gera string JSON formatada compatível com Node scripts (US11)', () => {
  const lista = [
    {
      protocolo: 'AP-0001',
      tutor: 'Mariana',
      pet: 'Thor',
      data: '2026-10-25',
      hora: '09:00',
      status: 'Agendado',
    },
  ];

  const jsonFormatado = exportarAgendaJSON(lista);
  assert.ok(typeof jsonFormatado === 'string');
  assert.ok(jsonFormatado.includes('"protocolo": "AP-0001"'));

  const parsed = JSON.parse(jsonFormatado);
  assert.equal(parsed[0].protocolo, 'AP-0001');
});

test('storage: lerFiltro e salvarFiltro persistem e validam o filtro ativo', () => {
  assert.equal(lerFiltro(), 'todos');

  salvarFiltro('Agendado');
  assert.equal(lerFiltro(), 'Agendado');

  salvarFiltro('Concluído');
  assert.equal(lerFiltro(), 'Concluído');

  // Filtro inválido retorna 'todos'
  globalThis.localStorage.setItem(CHAVES.filtro, JSON.stringify('FiltroInvalido'));
  assert.equal(lerFiltro(), 'todos');
});

test('storage: lerTema e salvarTema persistem a preferência de interface', () => {
  assert.equal(lerTema(), 'claro');

  salvarTema('escuro');
  assert.equal(lerTema(), 'escuro');

  salvarTema('claro');
  assert.equal(lerTema(), 'claro');

  // Valor inválido normaliza para 'claro'
  salvarTema('azul');
  assert.equal(lerTema(), 'claro');
});

test('storage: limparDados remove SOMENTE chaves com prefixo agendapet: e respeita manterTema', () => {
  // Dados de outra aplicação no mesmo domínio
  globalThis.localStorage.setItem('outroApp:preferencias', '{"v":1}');

  // Dados da nossa aplicação
  salvarAgenda([{ protocolo: 'AP-0001' }]);
  salvarFiltro('Agendado');
  salvarTema('escuro');
  salvarFeriadosCache('2026', [{ date: '2026-01-01', name: 'Ano Novo' }]);

  // Limpeza mantendo tema
  const removidas1 = limparDados(true);
  assert.ok(removidas1 >= 3);

  // Tema foi mantido
  assert.equal(lerTema(), 'escuro');
  // Agenda foi limpa
  assert.deepEqual(lerAgenda(), []);
  // Outro app foi preservado intacto
  assert.equal(globalThis.localStorage.getItem('outroApp:preferencias'), '{"v":1}');

  // Limpeza completa sem manter tema
  limparDados(false);
  assert.equal(globalThis.localStorage.getItem(CHAVES.tema), null);
  assert.equal(globalThis.localStorage.getItem('outroApp:preferencias'), '{"v":1}');
});

test('storage: lerFeriadosCache e salvarFeriadosCache respeitam expiração de validade', () => {
  const feriados = [{ date: '2026-12-25', name: 'Natal' }];
  salvarFeriadosCache('2026', feriados);

  // Válido imediatamente
  const emCache = lerFeriadosCache('2026');
  assert.deepEqual(emCache, feriados);

  // Simula expiração: 31 dias no passado
  const trintaEUmDiasAtras = Date.now() - 31 * 24 * 60 * 60 * 1000;
  salvarJSON(`${CHAVES.feriadosPrefixo}2026`, {
    salvoEm: trintaEUmDiasAtras,
    feriados,
  });

  assert.equal(lerFeriadosCache('2026'), null);
});
