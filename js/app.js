/* ==========================================================================
   app.js — O "MAESTRO" DA APLICAÇÃO   (tickets: US03, US04, US05, US06, US08, US09)

   O QUE É ESTE ARQUIVO
   O ponto de entrada (carregado no HTML com <script type="module">).
   Guarda o ESTADO da tela, LIGA os eventos e CHAMA os outros módulos.
   Ele não faz o trabalho pesado: orquestra.

     js/dominio/*  -> regras de negócio       (o que é permitido)
     api.js        -> fetch                   (buscar dados fora)
     storage.js    -> localStorage            (guardar no navegador)
     ui.js         -> DOM                     (mostrar na tela)
     app.js        -> junta tudo e reage ao usuário

   O QUE ESTE ARQUIVO CONCENTRA (organize em blocos com comentários)
   1) IMPORTS de todos os módulos acima.
        import * as storage from './storage.js';   // "import * as" agrupa tudo num nome
        import * as ui from './ui.js';
   2) O objeto `estado` -> uma ÚNICA fonte da verdade (serviços, agenda,
      data exibida, filtro, busca, ids de timers...). Evite variáveis soltas.
   3) Carregar o catálogo (async/await + 3 estados: carregando, erro com
      botão "tentar novamente", sucesso).
   4) Persistência: restaurar a agenda do localStorage (reconstruindo as
      classes com criarAgendamento) e salvar a cada mudança.
   5) Desenhar: uma função atualizarTela() que chama renderAgenda() e o
      fechamento, sempre a partir do `estado`.
   6) Relógio e lembretes com setInterval / clearInterval (e a hora do
      próximo atendimento).
   7) Formulário: aoEnviar(evento) -> preventDefault, ler campos, validar,
      checar conflito, criar o agendamento, salvar, redesenhar e avisar.
   8) CEP: ao sair do campo / digitar 8 dígitos, chamar buscarCep e
      preencher o endereço; tratar cada tipo de ErroApi.
   9) Feriados: ao mudar a data, chamar buscarFeriados e avisar (com
      confirmação "agendar mesmo assim").
  10) Agenda: DELEGAÇÃO DE EVENTOS — UM único listener na <ul> e, dentro
      dele, descobrir o que foi clicado com evento.target.closest(...).
      Busca (input) e filtros (change).
  11) Teclado: atalhos (N, /, Esc) com keydown.
  12) Dados: carregar exemplo, exportar (JSON), limpar (com confirmação por
      timer de 4 s), alternar tema.
  13) ligarEventos() e iniciar() -> no FINAL do arquivo: liga tudo e dá a
      partida chamando iniciar().

   EXEMPLOS GENÉRICOS (assunto: lista de tarefas):

   // ---- Estado único ------------------------------------------------------
   // const estado = { tarefas: [], filtro: 'todas', busca: '', timer: null };

   // ---- Fluxo padrão do ciclo: mudou o estado -> salva -> redesenha ------
   // function atualizarTela() {
   //   const visiveis = filtrarTarefas(estado.tarefas, porStatus(estado.filtro), porBusca(estado.busca));
   //   ui.renderizarTarefas(visiveis);
   // }
   // const salvar = () => storage.salvarTarefas(estado.tarefas);

   // ---- Envio de formulário ----------------------------------------------
   // function aoEnviar(evento) {
   //   evento.preventDefault();                     // impede o recarregamento da página
   //   ui.limparErros();
   //   const dados = ui.lerFormulario();
   //   const erros = validarTarefa(dados);          // regra vem do domínio
   //   if (Object.keys(erros).length > 0) { ui.mostrarErros(erros); return; }
   //   estado.tarefas.push(criarTarefa(dados));
   //   salvar();
   //   atualizarTela();
   //   ui.limparFormulario();
   //   ui.mostrarToast('Tarefa salva!');
   // }

   // ---- async/await com tratamento por tipo de erro -----------------------
   // async function carregarLista() {
   //   ui.mostrarEstado(el, 'carregando', 'Carregando…');
   //   try {
   //     estado.itens = await carregarItens();     // vem do api.js
   //     ui.esconderEstado(el);
   //   } catch (erro) {
   //     ui.mostrarEstado(el, 'erro', erro.message, carregarLista);   // botão "tentar de novo"
   //   }
   // }

   // ---- Delegação de eventos (um listener para N botões) -----------------
   // function aoClicarNaLista(evento) {
   //   const botao = evento.target.closest('button[data-acao]');
   //   if (!botao) return;                           // clicou em outra coisa
   //   const id = botao.closest('li').dataset.id;
   //   if (botao.dataset.acao === 'concluir') concluirTarefa(id);
   // }
   // document.getElementById('lista').addEventListener('click', aoClicarNaLista);

   // ---- Timer (relógio / lembretes) ---------------------------------------
   // function iniciarRelogio() {
   //   atualizarRelogio();
   //   estado.timer = setInterval(atualizarRelogio, 30_000);   // guarde o id para poder parar
   // }
   // function pararRelogio() { clearInterval(estado.timer); estado.timer = null; }

   // ---- Debounce simples para a busca (opcional) ---------------------------
   // let espera;
   // campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(filtrar, 250); });

   // ---- Atalhos de teclado -------------------------------------------------
   // document.addEventListener('keydown', (e) => {
   //   const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
   //   if (e.key === '/' && !digitando) { e.preventDefault(); document.getElementById('busca').focus(); }
   // });

   // ---- Ligar eventos e iniciar (final do arquivo) -----------------------
   // function ligarEventos() {
   //   document.getElementById('form').addEventListener('submit', aoEnviar);
   //   ...
   // }
   // function iniciar() { ui.aplicarTema(storage.lerTema()); ligarEventos(); carregarLista(); }
   // iniciar();

   BOAS PRÁTICAS
   - Funções pequenas, com nomes que dizem o que fazem (aoEnviar, aoClicarNaLista).
   - Nada de regra de negócio aqui: se tem "if" de regra, ele provavelmente
     pertence a js/dominio/.
   - Nada de innerHTML com texto de usuário.
   - Cada ticket = uma branch e um Pull Request; vá preenchendo este arquivo
     aos poucos, na ordem do seu sprint planning.
   ========================================================================== */
