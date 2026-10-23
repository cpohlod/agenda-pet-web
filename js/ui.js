/* ==========================================================================
   ui.js — DESENHA NA TELA (DOM)   (tickets: US02, US03, US06, US09)
   ========================================================================== */

import { formatarMoeda } from './dominio/regras.js';

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
