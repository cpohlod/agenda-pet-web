/* ==========================================================================
   ui.js — DESENHA NA TELA (DOM)   (tickets: US02, US03, US04, US05, US06, US09)
   ========================================================================== */

import { formatarMoeda, formatarDataBR, estaAtrasado, minutosAte } from './dominio/regras.js';
import { STATUS } from './dominio/agendamento.js';

/**
 * Atalho para document.getElementById.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Cria um elemento HTML com classes, texto e atributos de forma segura (sem innerHTML de usuário).
 * @param {string} tag
 * @param {object} [opcoes={}]
 * @param {string} [opcoes.classe]
 * @param {string} [opcoes.texto]
 * @param {Record<string, string>} [opcoes.atributos]
 * @param  {...HTMLElement|string} filhos
 * @returns {HTMLElement}
 */
export function criar(tag, { classe, texto, atributos = {} } = {}, ...filhos) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null) el.textContent = String(texto);
  for (const [chave, valor] of Object.entries(atributos)) {
    if (valor !== undefined && valor !== null) {
      el.setAttribute(chave, valor);
    }
  }
  for (const filho of filhos) {
    if (filho instanceof HTMLElement) {
      el.appendChild(filho);
    } else if (filho !== undefined && filho !== null) {
      el.appendChild(document.createTextNode(String(filho)));
    }
  }
  return el;
}

/**
 * Mostra uma mensagem de estado (carregando, erro ou sucesso) em um elemento container.
 * @param {HTMLElement} el
 * @param {'carregando'|'erro'|'sucesso'|'info'} tipo
 * @param {string} texto
 * @param {Function} [aoTentarNovamente] Callback para o botão de tentar novamente
 */
export function mostrarEstado(el, tipo, texto, aoTentarNovamente) {
  if (!el) return;
  el.className = `status status--${tipo}`;
  el.replaceChildren();

  const span = criar('span', { texto });
  el.appendChild(span);

  if (tipo === 'erro' && typeof aoTentarNovamente === 'function') {
    const btn = criar(
      'button',
      {
        classe: 'botao botao--secundario botao--pequeno',
        texto: 'Tentar novamente',
        atributos: { type: 'button' },
      }
    );
    btn.style.marginLeft = '12px';
    btn.addEventListener('click', aoTentarNovamente);
    el.appendChild(btn);
  }

  el.hidden = false;
}

/**
 * Esconde o elemento de estado.
 * @param {HTMLElement} el
 */
export function esconderEstado(el) {
  if (!el) return;
  el.hidden = true;
  el.replaceChildren();
}

/**
 * Gerenciador de toast temporário.
 */
let timerToast = null;
export function mostrarToast(texto, tipo = 'sucesso', duracaoMs = 4000) {
  const toast = $('toast');
  if (!toast) return;

  clearTimeout(timerToast);
  toast.className = `toast toast--${tipo}`;
  toast.textContent = texto;
  toast.hidden = false;

  timerToast = setTimeout(() => {
    toast.hidden = true;
  }, duracaoMs);
}

/**
 * Renderiza o catálogo de serviços na lista <ul id="lista-servicos">.
 * @param {Array} lista
 */
export function renderizarServicos(lista = []) {
  const ul = $('lista-servicos');
  if (!ul) return;

  const itens = lista.map((s) => {
    const topo = criar(
      'div',
      { classe: 'servico__topo' },
      criar('strong', { texto: s.nome }),
      criar('span', { classe: 'servico__preco', texto: formatarMoeda(s.preco) })
    );

    const desc = criar('p', { classe: 'servico__descricao', texto: s.descricao });
    const meta = criar('span', {
      classe: 'servico__meta',
      texto: `Duração: ${s.duracaoMin} min · ${s.domiciliar ? 'Aceita domicílio' : 'Apenas na loja'}`,
    });

    return criar('li', { classe: 'servico' }, topo, desc, meta);
  });

  ul.replaceChildren(...itens);
}

/**
 * Preenche as opções do select de serviços no formulário.
 * @param {Array} lista
 */
export function popularSelectServicos(lista = []) {
  const select = $('servico');
  if (!select) return;

  const fragment = document.createDocumentFragment();
  const optPadrao = criar('option', { texto: 'Selecione um serviço…', atributos: { value: '' } });
  fragment.appendChild(optPadrao);

  for (const s of lista) {
    const opt = criar('option', {
      texto: `${s.nome} — ${formatarMoeda(s.preco)} (${s.duracaoMin} min)`,
      atributos: { value: s.id },
    });
    fragment.appendChild(opt);
  }

  select.replaceChildren(fragment);
}

/**
 * Define a data mínima permitida no input de data do formulário.
 * @param {string} dataMinima ISO (AAAA-MM-DD)
 */
export function definirDataMinima(dataMinima) {
  const input = $('data');
  if (input) input.min = dataMinima;
}

/**
 * Lê os dados preenchidos no formulário de agendamento.
 * @returns {object}
 */
export function lerFormulario() {
  const tutor = $('tutor')?.value ?? '';
  const telefone = $('telefone')?.value ?? '';
  const pet = $('pet')?.value ?? '';
  const especie = $('especie')?.value ?? '';
  const servicoId = $('servico')?.value ?? '';
  const data = $('data')?.value ?? '';
  const hora = $('hora')?.value ?? '';
  const domiciliar = Boolean($('domiciliar')?.checked);
  const observacoes = $('observacoes')?.value ?? '';

  let endereco = null;
  if (domiciliar) {
    endereco = {
      cep: $('cep')?.value ?? '',
      logradouro: $('logradouro')?.value ?? '',
      numero: $('numero')?.value ?? '',
      complemento: $('complemento')?.value ?? '',
      bairro: $('bairro')?.value ?? '',
      cidade: $('cidade')?.value ?? '',
      uf: $('uf')?.value ?? '',
    };
  }

  return {
    tutor,
    telefone,
    pet,
    especie,
    servicoId,
    data,
    hora,
    domiciliar,
    observacoes,
    endereco,
  };
}

/**
 * Limpa todos os campos do formulário e estados auxiliares.
 */
export function limparFormulario() {
  const form = $('form-agendamento');
  if (form) form.reset();
  alternarEndereco(false);
  mostrarFeriado(null);
  limparErros();
  esconderEstado($('cep-status'));
}

/**
 * Preenche os campos de endereço a partir de um objeto consultado e move o foco para o número (US04).
 * @param {object} dadosEndereco
 */
export function preencherEndereco(dadosEndereco) {
  if (!dadosEndereco) return;
  if ($('logradouro')) $('logradouro').value = dadosEndereco.logradouro || '';
  if ($('bairro')) $('bairro').value = dadosEndereco.bairro || '';
  if ($('cidade')) $('cidade').value = dadosEndereco.cidade || '';
  if ($('uf')) $('uf').value = dadosEndereco.uf || '';
  if (dadosEndereco.complemento && $('complemento')) {
    $('complemento').value = dadosEndereco.complemento;
  }
  const numInput = $('numero');
  if (numInput) numInput.focus();
}

/**
 * Exibe ou esconde o aviso de feriado sob o campo de data (US05).
 * @param {{date: string, name: string}|null} feriado
 */
export function mostrarFeriado(feriado) {
  const container = $('feriado-aviso');
  const textoEl = $('feriado-texto');
  const check = $('feriado-confirmar');
  if (!container || !textoEl) return;

  if (feriado) {
    textoEl.textContent = `${formatarDataBR(feriado.date)} é feriado: ${feriado.name}. Confirme com o tutor antes de agendar.`;
    if (check) check.checked = false;
    container.hidden = false;
  } else {
    container.hidden = true;
    textoEl.textContent = '';
    if (check) check.checked = false;
  }
}

/**
 * Mostra as mensagens de erro nos campos correspondentes e foca o primeiro campo inválido.
 * Garante que mensagens sejam anunciadas via role="alert" / aria-live.
 * @param {Record<string, string>} erros
 */
export function mostrarErros(erros = {}) {
  limparErros();
  let primeiroCampoFocado = false;

  for (const [campoId, mensagem] of Object.entries(erros)) {
    const elementoErro = $(`erro-${campoId}`);
    if (elementoErro) {
      elementoErro.textContent = mensagem;
      elementoErro.hidden = false;
    }

    const input = $(campoId);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (!primeiroCampoFocado) {
        input.focus();
        primeiroCampoFocado = true;
      }
    }
  }
}

/**
 * Remove mensagens de erro e desmarca aria-invalid em todos os campos.
 */
export function limparErros() {
  const erros = document.querySelectorAll('.campo__erro');
  erros.forEach((p) => {
    p.hidden = true;
    p.textContent = '';
  });

  const invalidos = document.querySelectorAll('[aria-invalid="true"]');
  invalidos.forEach((el) => el.removeAttribute('aria-invalid'));
}

/**
 * Mostra ou esconde o fieldset de endereço para atendimentos domiciliares.
 * @param {boolean} visivel
 */
export function alternarEndereco(visivel) {
  const grupo = $('grupo-endereco');
  if (grupo) grupo.hidden = !visivel;
}

/**
 * Normaliza classe de estilo para o selo de status.
 * @param {string} status
 * @returns {string}
 */
function normalizarStatusSelo(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('concl')) return 'concluido';
  if (s.includes('canc')) return 'cancelado';
  return 'agendado';
}

/**
 * Renderiza a lista de agendamentos na agenda do dia (US06).
 * @param {Array} lista
 * @param {object} [opcoes={}]
 */
export function renderizarAgenda(lista = [], { expandidos = new Set(), selecionado = null, dataExibida = '', agora = new Date(), temFiltros = false } = {}) {
  const ul = $('lista-agenda');
  const contador = $('contador');
  const vazio = $('agenda-vazio');

  if (contador) {
    const qtd = lista.length;
    contador.textContent = `${qtd} ${qtd === 1 ? 'agendamento' : 'agendamentos'}`;
  }

  if (!ul) return;

  if (lista.length === 0) {
    ul.replaceChildren();
    if (vazio) {
      vazio.textContent = temFiltros
        ? 'Nenhum agendamento encontrado para os filtros selecionados.'
        : 'Nenhum agendamento para este dia. Use o formulário para criar o primeiro.';
      vazio.hidden = false;
    }
    return;
  }

  if (vazio) vazio.hidden = true;

  const itens = lista.map((item) => {
    const expandido = expandidos.has(item.protocolo);
    const valor = typeof item.calcularValor === 'function' ? item.calcularValor() : (item.servico?.preco || 0);
    const statusClasse = item.status === STATUS.CONCLUIDO
      ? 'item--concluido'
      : item.status === STATUS.CANCELADO
      ? 'item--cancelado'
      : '';

    const atrasado =
      item.status === STATUS.AGENDADO &&
      estaAtrasado(item.data, item.hora, agora);

    const liClasses = ['item'];
    if (statusClasse) liClasses.push(statusClasse);
    if (atrasado) liClasses.push('item--atrasado');
    if (expandido) liClasses.push('item--expandido');
    if (item.protocolo === selecionado) liClasses.push('item--realce');

    // Botão de expandir cabeçalho
    const toggleBtn = criar(
      'button',
      {
        classe: 'item__toggle',
        atributos: {
          type: 'button',
          'data-acao': 'alternar',
          'aria-expanded': String(expandido),
        },
      },
      criar('span', { classe: 'item__hora', texto: item.hora }),
      criar('span', { classe: 'item__titulo', texto: `${item.pet} (${item.servico.nome})` }),
      criar('span', {
        classe: 'item__tutor',
        texto: `Tutor: ${item.tutor} · Tel: ${item.telefone}`,
      })
    );

    // Selos de status
    const selosDiv = criar('div', { classe: 'item__selos' });
    const seloStatusClasse = `selo selo--${normalizarStatusSelo(item.status)}`;
    selosDiv.appendChild(criar('span', { classe: seloStatusClasse, texto: item.status }));

    if (atrasado) {
      selosDiv.appendChild(criar('span', { classe: 'selo selo--atrasado', texto: 'Atrasado' }));
    }
    selosDiv.appendChild(criar('span', { classe: 'item__valor', texto: formatarMoeda(valor) }));

    const linhaTopo = criar('div', { classe: 'item__linha' }, toggleBtn, selosDiv);

    // Botões de ação (Concluir / Cancelar)
    const acoesDiv = criar('div', { classe: 'item__acoes' });
    const btnConcluir = criar('button', {
      classe: 'botao botao--secundario botao--pequeno',
      texto: 'Concluir',
      atributos: {
        type: 'button',
        'data-acao': 'concluir',
      },
    });
    const btnCancelar = criar('button', {
      classe: 'botao botao--perigo botao--pequeno',
      texto: 'Cancelar',
      atributos: {
        type: 'button',
        'data-acao': 'cancelar',
      },
    });

    if (item.status !== STATUS.AGENDADO) {
      btnConcluir.disabled = true;
      btnCancelar.disabled = true;
    }

    acoesDiv.append(btnConcluir, btnCancelar);

    // Detalhes expansíveis
    const filhosLi = [linhaTopo, acoesDiv];
    if (expandido) {
      const dl = criar('dl', { classe: 'item__detalhes' });

      dl.append(
        criar('dt', { texto: 'Protocolo:' }),
        criar('dd', { texto: item.protocolo }),
        criar('dt', { texto: 'Espécie:' }),
        criar('dd', { texto: item.especie || 'Não informada' }),
        criar('dt', { texto: 'Local:' }),
        criar('dd', {
          texto:
            item.domiciliar && typeof item.enderecoCompleto === 'function'
              ? item.enderecoCompleto()
              : item.domiciliar && item.endereco
              ? `${item.endereco.logradouro}, ${item.endereco.numero} - ${item.endereco.cidade}/${item.endereco.uf}`
              : 'Atendimento na loja',
        })
      );

      if (item.observacoes) {
        dl.append(
          criar('dt', { texto: 'Observações:' }),
          criar('dd', { texto: item.observacoes })
        );
      }

      filhosLi.push(dl);
    }

    return criar('li', { classe: liClasses.join(' '), atributos: { 'data-protocolo': item.protocolo, tabindex: '0' } }, ...filhosLi);
  });

  ul.replaceChildren(...itens);
}


/**
 * Atualiza o banner com as informações do próximo atendimento do dia (US06, US07).
 * @param {object|null} proximo Objeto de agendamento ou null
 * @param {Date} [agora=new Date()] Instante atual de referência
 */
export function atualizarBannerProximo(proximo, agora = new Date()) {
  const el = $('proximo');
  if (!el) return;

  if (!proximo) {
    el.textContent = 'Próximo atendimento: nenhum agendamento próximo';
    return;
  }

  const minutos = minutosAte(proximo.data, proximo.hora, agora);
  const infoTempo = minutos > 0 ? ` (em ${minutos} min)` : minutos === 0 ? ' (agora)' : '';
  const tipo = proximo.domiciliar ? ' [Domiciliar]' : '';

  el.textContent = `Próximo atendimento: ${proximo.hora} — ${proximo.pet} (${proximo.tutor}) · ${proximo.servico?.nome || 'Serviço'}${tipo}${infoTempo}`;
}

/**
 * Cria um card/item de resumo para o fechamento.
 * @param {string} rotulo
 * @param {string|number} valor
 * @returns {HTMLElement}
 */
function criarItemResumo(rotulo, valor) {
  return criar(
    'div',
    { classe: 'resumo__item' },
    criar('span', { classe: 'resumo__rotulo', texto: rotulo }),
    criar('span', { classe: 'resumo__valor', texto: String(valor) })
  );
}

/**
 * Renderiza os dados consolidados do fechamento do dia (US07).
 * Monta os cartões de totais e a tabela de faturamento por serviço de forma segura via DOM.
 * @param {object} fechamento Objeto gerado por calcularFechamento
 */
export function renderizarFechamento(fechamento) {
  if (!fechamento) return;

  const elData = $('fechamento-data');
  if (elData) {
    elData.textContent = fechamento.data
      ? `Data: ${formatarDataBR(fechamento.data)} · Status: ${fechamento.encerrado ? 'Encerrado' : 'Em andamento'}`
      : '';
  }

  const elResumo = $('fechamento-resumo');
  if (elResumo) {
    elResumo.replaceChildren(
      criarItemResumo('Total de atendimentos', fechamento.total),
      criarItemResumo('Concluídos', fechamento.concluidos),
      criarItemResumo('Agendados', fechamento.agendados),
      criarItemResumo('Cancelados', fechamento.cancelados),
      criarItemResumo('Faturamento (concluídos)', formatarMoeda(fechamento.faturamento)),
      criarItemResumo('A receber (agendados)', formatarMoeda(fechamento.aReceber))
    );
  }

  const elServicos = $('fechamento-servicos');
  if (elServicos) {
    elServicos.replaceChildren();

    if (!fechamento.porServico || fechamento.porServico.length === 0) {
      elServicos.appendChild(
        criar('p', { classe: 'vazio', texto: 'Nenhum atendimento ativo registrado para este dia.' })
      );
    } else {
      const thead = criar(
        'thead',
        {},
        criar(
          'tr',
          {},
          criar('th', { texto: 'Serviço' }),
          criar('th', { texto: 'Qtd' }),
          criar('th', { texto: 'Faturado' })
        )
      );

      const tbody = criar('tbody');
      for (const item of fechamento.porServico) {
        tbody.appendChild(
          criar(
            'tr',
            {},
            criar('td', { texto: item.nome }),
            criar('td', { texto: `${item.quantidade} un` }),
            criar('td', { texto: formatarMoeda(item.faturado) })
          )
        );
      }

      const tabela = criar('table', { classe: 'tabela' }, thead, tbody);
      elServicos.appendChild(tabela);
    }
  }
}
