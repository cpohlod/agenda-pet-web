/* ==========================================================================
   regras.js — VALIDAÇÕES E FUNÇÕES DE APOIO   (tickets: US03, US05, US07)

   O QUE É ESTE ARQUIVO
   Uma "caixa de ferramentas" de funções PURAS (mesma entrada -> mesma saída,
   sem efeitos colaterais) com as regras do formulário: datas, horas,
   funcionamento da loja, telefone, CEP, conflito de horário, feriado e
   formatação. Sem DOM, sem fetch, sem localStorage: roda na página e no Node.

   POR QUE SEPARAR?
   Se a regra estiver misturada com o DOM, só dá para testar clicando na tela.
   Em função pura, você testa com 3 linhas no Node (tests/dominio.test.js).

   O QUE FAZER AQUI (nesta ordem sugerida)
   1) import { CONFIG, STATUS, normalizarTexto } from './agendamento.js';
   2) Datas e horas — sempre em texto ISO ("AAAA-MM-DD" e "HH:MM"):
        hojeISO(), horaAgora(), dataValida(), horaValida(), paraMinutos(),
        formatarDataBR(), minutosAte(), estaAtrasado()
      DICA: receba "agora = new Date()" como PARÂMETRO PADRÃO. Assim o teste
      pode passar uma data fixa e o resultado deixa de depender do relógio.
   3) horarioDentroDoFuncionamento(hora, duracaoMin) -> o atendimento começa
      em horário "redondo" (de X em X minutos a partir da abertura) e TERMINA
      até o fechamento. Use o operador % (resto da divisão).
   4) Contato e endereço: somenteDigitos(), telefoneValido(), cepValido(),
      formatarCep(). Use .replace(/\D/g, '') para ficar só com os dígitos.
   5) validarAgendamento(dados, servico, opcoes) -> devolve um OBJETO
      { idDoCampo: 'mensagem' }. Vazio = tudo certo. As chaves devem ser
      iguais aos ids do HTML, para a tela marcar o campo certo.
   6) temConflito(lista, candidato) -> usa some() e o método conflitaCom().
   7) acharFeriado(feriados, data) -> usa find(); devolve o feriado ou null.
   8) formatarMoeda(valor) -> toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).

   QUEM USA ESTE ARQUIVO
   app.js (envio do formulário), api.js (cepValido, formatarCep),
   ui.js (formatação), fechamento.js (formatarDataBR, formatarMoeda) e
   scripts/validar-agenda.cjs (via import() dinâmico).

   EXEMPLOS GENÉRICOS (assunto: uma academia, para você adaptar):

   // ---- Validador de campo simples (booleano) ----------------------------
   // export const matriculaValida = (texto) => /^\d{6}$/.test(texto ?? '');

   // ---- Função pura que recebe "agora" por parâmetro ----------------------
   // export const hojeISO = (agora = new Date()) => {
   //   const dois = (n) => String(n).padStart(2, '0');
   //   return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
   // };

   // ---- Validar uma data de verdade (31/02 não existe) -------------------
   // export function dataValida(texto) {
   //   if (!/^\d{4}-\d{2}-\d{2}$/.test(texto ?? '')) return false;
   //   const [ano, mes, dia] = texto.split('-').map(Number);
   //   const d = new Date(ano, mes - 1, dia);
   //   return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
   // }

   // ---- Função que devolve um OBJETO de erros ----------------------------
   // export function validarAluno(dados) {
   //   const erros = {};
   //   if (!dados.nome || dados.nome.trim().length < 3) erros.nome = 'Informe o nome (mínimo 3 letras).';
   //   if (!matriculaValida(dados.matricula)) erros.matricula = 'Matrícula com 6 dígitos.';
   //   return erros;                      // {} = válido; { nome: '...' } = erro no campo "nome"
   // }
   // // quem chama:  const erros = validarAluno(dados);  if (Object.keys(erros).length > 0) { ...mostrar... }

   // ---- some() para detectar conflito -------------------------------------
   // export const temConflito = (lista, candidato) => lista.some((x) => x.conflitaCom(candidato));

   // ---- Conta de horário em minutos --------------------------------------
   // export const paraMinutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };

   REGRAS DE NEGÓCIO PARA CONFERIR NO DOCUMENTO FUNCIONAL
   data não pode ser passada; horário de hoje não pode já ter passado;
   telefone com DDD (10 ou 11 dígitos); serviço domiciliar exige endereço
   completo; o serviço precisa terminar até o fechamento da loja.

   COMO SABER QUE ESTÁ CERTO
   npm test — escreva testes para os casos limite (17:00 com serviço de 120
   min, 31/02, telefone com 9 dígitos...).
   ========================================================================== */
