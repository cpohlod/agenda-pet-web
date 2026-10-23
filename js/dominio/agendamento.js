/* ==========================================================================
   agendamento.js — O "CORAÇÃO" DO NEGÓCIO   (US02, US03, US07)
   ========================================================================== */

/**
 * Configurações e constantes do negócio.
 */
export const CONFIG = Object.freeze({
  abertura: '08:00',
  fechamento: '18:00',
  passoMin: 30,
  cidadeLoja: 'São Paulo',
  taxaSP: 15,
  taxaOutra: 30,
  minutoLembrete: 15,
});

/**
 * Enum com os status possíveis de um atendimento.
 */
export const STATUS = Object.freeze({
  AGENDADO: 'Agendado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
});

/**
 * Normaliza um texto: remove acentos e converte para minúsculas.
 * @param {string} texto
 * @returns {string}
 */
export function normalizarTexto(texto) {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

/**
 * Representa um agendamento na loja física.
 */
export class Agendamento {
  constructor({
    protocolo,
    tutor,
    telefone,
    pet,
    especie,
    servico,
    data,
    hora,
    status = STATUS.AGENDADO,
    observacoes = '',
  }) {
    this.protocolo = String(protocolo);
    this.tutor = String(tutor ?? '').trim();
    this.telefone = String(telefone ?? '').trim();
    this.pet = String(pet ?? '').trim();
    this.especie = String(especie ?? '').trim();
    this.servico = servico instanceof Servico ? servico : new Servico(servico);
    this.data = String(data);
    this.hora = String(hora);
    this.status = status;
    this.observacoes = String(observacoes ?? '').trim();
  }

  get ativo() {
    return this.status !== STATUS.CANCELADO;
  }

  get inicio() {
    return `${this.data}T${this.hora}`;
  }

  get tipo() {
    return 'Na loja';
  }

  calcularValor() {
    return this.servico.preco;
  }

  resumo() {
    return `${this.protocolo} — ${this.pet} (${this.tutor}) · ${this.servico.nome} às ${this.hora}`;
  }

  conflitaCom(outro) {
    if (this === outro) return false;
    if (!this.ativo || !outro.ativo) return false;
    return this.data === outro.data && this.hora === outro.hora;
  }

  alterarStatus(novoStatus) {
    if (Object.values(STATUS).includes(novoStatus)) {
      this.status = novoStatus;
    }
  }

  paraJSON() {
    return {
      protocolo: this.protocolo,
      tutor: this.tutor,
      telefone: this.telefone,
      pet: this.pet,
      especie: this.especie,
      servicoId: this.servico.id,
      data: this.data,
      hora: this.hora,
      status: this.status,
      observacoes: this.observacoes,
      domiciliar: false,
      endereco: null,
    };
  }
}

/**
 * Representa um agendamento com atendimento no domicílio do cliente.
 */
export class AgendamentoDomiciliar extends Agendamento {
  constructor({ endereco, ...dados }) {
    super(dados);
    this.endereco = endereco ? { ...endereco } : null;
  }

  get tipo() {
    return 'Domiciliar';
  }

  taxaDeslocamento() {
    if (!this.endereco || !this.endereco.cidade) return CONFIG.taxaOutra;
    const cidadeNormalizada = normalizarTexto(this.endereco.cidade);
    const lojaNormalizada = normalizarTexto(CONFIG.cidadeLoja);
    return cidadeNormalizada === lojaNormalizada ? CONFIG.taxaSP : CONFIG.taxaOutra;
  }

  enderecoCompleto() {
    if (!this.endereco) return '';
    const { logradouro, numero, complemento, bairro, cidade, uf, cep } = this.endereco;
    const partes = [];
    if (logradouro) partes.push(numero ? `${logradouro}, ${numero}` : logradouro);
    if (complemento) partes.push(complemento);
    if (bairro) partes.push(bairro);
    if (cidade || uf) partes.push(`${cidade || ''}/${uf || ''}`);
    if (cep) partes.push(`CEP ${cep}`);
    return partes.join(' - ');
  }

  calcularValor() {
    return super.calcularValor() + this.taxaDeslocamento();
  }

  resumo() {
    const cid = this.endereco?.cidade ? ` (${this.endereco.cidade})` : '';
    return `${super.resumo()} [Domiciliar${cid}]`;
  }

  paraJSON() {
    const base = super.paraJSON();
    return {
      ...base,
      domiciliar: true,
      endereco: this.endereco,
    };
  }
}

/**
 * Fábrica: instancia a classe adequada (Agendamento ou AgendamentoDomiciliar).
 * @param {object} dados
 * @param {Servico[]} catalogo
 * @returns {Agendamento|AgendamentoDomiciliar}
 */
export function criarAgendamento(dados, catalogo) {
  const servicoId = dados.servicoId || dados.servico?.id;
  const servico = catalogo.find((s) => s.id === servicoId);
  if (!servico) {
    throw new Error(`Serviço "${servicoId}" não encontrado no catálogo.`);
  }

  const payload = {
    ...dados,
    servico,
  };

  if (dados.domiciliar && dados.endereco) {
    return new AgendamentoDomiciliar(payload);
  }
  return new Agendamento(payload);
}

/**
 * Closure: gerador sequencial de protocolos AP-0001, AP-0002...
 * @param {number} [ultimo=0]
 * @returns {() => string}
 */
export function criarGeradorProtocolo(ultimo = 0) {
  let contador = Number(ultimo) || 0;
  return function proximoProtocolo() {
    contador += 1;
    return `AP-${String(contador).padStart(4, '0')}`;
  };
}

/**
 * Descobre o maior número de protocolo utilizado em uma lista.
 * @param {Array} lista
 * @returns {number}
 */
export function ultimoNumeroProtocolo(lista = []) {
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((maior, item) => {
    const match = String(item.protocolo ?? '').match(/^AP-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(maior, num);
    }
    return maior;
  }, 0);
}
