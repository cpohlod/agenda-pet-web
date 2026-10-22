/* ==========================================================================
   ui.js — DESENHA NA TELA (DOM)   (tickets: US02, US03, US06, US09)

   O QUE É ESTE ARQUIVO
   Só mostra informação: recebe dados já prontos e os coloca na página.
   NÃO busca dados (api.js), NÃO salva (storage.js), NÃO decide regra de
   negócio (js/dominio/) e NÃO liga eventos (app.js).

   REGRA DE SEGURANÇA
   Texto vindo de pessoas (nome do tutor, observações...) entra SEMPRE com
   textContent, NUNCA com innerHTML. Com innerHTML alguém poderia digitar
   <img onerror=...> e executar código na sua página (XSS).

   O QUE ESTE ARQUIVO CONCENTRA (cada item vira uma função exportada)
   1) Atalhos:     $ = (id) => document.getElementById(id)
                   criar(tag, { classe, texto, atributos }, ...filhos)  -> cria elementos
   2) Estados:     mostrarEstado(elemento, tipo, texto, aoTentarNovamente)
                   esconderEstado(elemento)   -> carregando / erro / vazio
                   mostrarToast(texto, tipo)  -> mensagem rápida que some sozinha
   3) Topo:        aplicarTema(tema)  (muda data-tema no <html> e o texto do botão),
                   atualizarBotaoLembretes(), mostrarRelogio(), mostrarLembrete()
   4) Catálogo:    renderizarServicos(lista), popularSelectServicos(lista)
   5) Formulário:  lerFormulario() -> devolve um objeto com os valores dos campos
                   mostrarErros(erros) / limparErros() -> usa as chaves do objeto
                   de erros como ids (erro-<campo>) e marca aria-invalid
                   limparFormulario(), definirDataMinima(), alternarEndereco(),
                   preencherEndereco(), mostrarFeriado()...
   6) Agenda:      renderizarAgenda(lista, opcoes) -> cria um <li> por item
                   (nome, hora, status, valor, botões Concluir/Cancelar)
   7) Fechamento:  renderizarFechamento(resumo) -> cartões de totais + tabela
   8) Dados:       exibirExportacao(), definirBotaoLimpar()...

   TÉCNICAS DO MÓDULO DE DOM QUE APARECEM AQUI
   createElement, textContent, appendChild/append, replaceChildren, classList,
   setAttribute, dataset, hidden, aria-*.

   EXEMPLOS GENÉRICOS (assunto: lista de produtos):

   // ---- Atalho e criador de elementos -----------------------------------
   // const $ = (id) => document.getElementById(id);
   // function criar(tag, { classe, texto, atributos = {} } = {}, ...filhos) {
   //   const el = document.createElement(tag);
   //   if (classe) el.className = classe;
   //   if (texto !== undefined) el.textContent = texto;       // textContent = seguro
   //   for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, valor);
   //   el.append(...filhos);
   //   return el;
   // }

   // ---- Renderizar uma lista (limpa e recria) ----------------------------
   // export function renderizarProdutos(produtos) {
   //   const ul = $('lista-produtos');
   //   ul.replaceChildren(                                    // apaga o que tinha e põe o novo
   //     ...produtos.map((p) =>
   //       criar('li', { classe: 'produto' },
   //         criar('strong', { texto: p.nome }),
   //         criar('span', { texto: formatarMoeda(p.preco) }),
   //       ),
   //     ),
   //   );
   // }

   // ---- Guardar o id do item no elemento para o clique achar depois -------
   // const botao = criar('button', { texto: 'Remover', atributos: { type: 'button', 'data-acao': 'remover' } });
   // li.dataset.id = produto.id;          // lido com  elemento.closest('li').dataset.id

   // ---- Estado de carregando / erro / vazio ------------------------------
   // export function mostrarEstado(elemento, tipo, texto) {
   //   elemento.hidden = false;
   //   elemento.className = `status status--${tipo}`;         // classes diferentes = cores diferentes
   //   elemento.textContent = texto;
   // }

   // ---- Ler formulário e mostrar erros por campo -------------------------
   // export const lerFormulario = () => ({ nome: $('nome').value.trim(), qtd: $('qtd').value });
   // export function mostrarErros(erros) {
   //   for (const [campo, mensagem] of Object.entries(erros)) {
   //     $(campo).setAttribute('aria-invalid', 'true');
   //     $(`erro-${campo}`).textContent = mensagem;
   //     $(`erro-${campo}`).hidden = false;
   //   }
   //   $(Object.keys(erros)[0])?.focus();                      // leva o foco ao primeiro erro
   // }

   // ---- Tema ------------------------------------------------------------
   // export function aplicarTema(tema) {
   //   document.documentElement.dataset.tema = tema;          // o CSS reage a [data-tema="escuro"]
   //   $('btn-tema').textContent = tema === 'escuro' ? 'Tema claro' : 'Tema escuro';
   //   $('btn-tema').setAttribute('aria-pressed', String(tema === 'escuro'));
   // }

   // ---- Toast que some sozinho -------------------------------------------
   // let timerToast;
   // export function mostrarToast(texto, tipo = 'sucesso', ms = 4000) {
   //   const t = $('toast'); t.textContent = texto; t.className = `toast toast--${tipo}`; t.hidden = false;
   //   clearTimeout(timerToast);
   //   timerToast = setTimeout(() => { t.hidden = true; }, ms);
   // }

   COMO TESTAR
   Chame as funções pelo console ou pelo app.js com dados de mentira e veja
   o resultado no navegador. Teste também com um nome contendo "<b>oi</b>":
   ele deve aparecer como texto, sem virar negrito.
   ========================================================================== */
