/* ==========================================================================
   storage.js — TODO O ACESSO AO localStorage MORA AQUI   (ticket: US08; apoia US05)

   O QUE É ESTE ARQUIVO
   A "gaveta" do navegador: guarda a agenda, o filtro escolhido, o tema
   (claro/escuro) e o cache de feriados. Nenhum outro arquivo chama
   localStorage direto — se um dia trocar por outro armazenamento, só este
   arquivo muda.

   O QUE ESTE ARQUIVO CONCENTRA
   1) PREFIXO e CHAVES -> todas as chaves começam com um prefixo do seu
      sistema ("agendapet:"), para não misturar com outros sites/projetos.
   2) lerJSON(chave, padrao) / salvarJSON(chave, valor)
        - localStorage só guarda TEXTO: use JSON.stringify ao salvar e
          JSON.parse ao ler.
        - lerJSON NUNCA pode quebrar a página: se a chave não existe ou o
          texto está corrompido, devolva o valor padrão (try/catch).
        - salvarJSON devolve true/false (pode falhar: modo privado, cheio).
   3) lerAgenda() / salvarAgenda(lista)
        - ao salvar, converta cada objeto com paraJSON() (classes não vão
          inteiras para o texto: métodos se perdem).
        - ao ler, só aceite uma LISTA de objetos; qualquer outra coisa vira [].
        - quem reconstrói as classes é o app.js (usando criarAgendamento).
   4) lerFiltro() / salvarFiltro() e lerTema() / salvarTema()
        - valide o que lê: um valor estranho vira o padrão.
   5) lerFeriadosCache(ano, validadeMs) / salvarFeriadosCache(ano, lista)
        - guarde { salvoEm: Date.now(), feriados } e ignore se passou da validade.
   6) limparDados() -> remove SOMENTE as chaves do seu prefixo (nunca use
      localStorage.clear(), que apagaria dados de outros sistemas).

   EXEMPLOS GENÉRICOS (assunto: lista de tarefas):

   // ---- Prefixo e chaves ---------------------------------------------------
   // const PREFIXO = 'tarefas:';
   // export const CHAVES = Object.freeze({ lista: `${PREFIXO}lista`, tema: `${PREFIXO}tema` });

   // ---- Ler com proteção --------------------------------------------------
   // export function lerJSON(chave, padrao) {
   //   try {
   //     const bruto = localStorage.getItem(chave);        // null se não existe
   //     return bruto === null ? padrao : JSON.parse(bruto);
   //   } catch {
   //     return padrao;                                    // JSON corrompido não derruba a página
   //   }
   // }

   // ---- Salvar com proteção ----------------------------------------------
   // export function salvarJSON(chave, valor) {
   //   try {
   //     localStorage.setItem(chave, JSON.stringify(valor));
   //     return true;
   //   } catch {
   //     return false;
   //   }
   // }

   // ---- Ler lista validando o formato ---------------------------------
   // export function lerLista() {
   //   const valor = lerJSON(CHAVES.lista, []);
   //   return Array.isArray(valor) ? valor : [];
   // }

   // ---- Ler preferência com valores permitidos -------------------------
   // const TEMAS = ['claro', 'escuro'];
   // export const lerTema = () => { const t = lerJSON(CHAVES.tema, 'claro'); return TEMAS.includes(t) ? t : 'claro'; };

   // ---- Cache com validade ---------------------------------------------
   // export function lerCache(chave, validadeMs) {
   //   const cache = lerJSON(chave, null);
   //   const valido = cache && Date.now() - Number(cache.salvoEm) < validadeMs;
   //   return valido ? cache.dados : null;
   // }
   // export const salvarCache = (chave, dados) => salvarJSON(chave, { salvoEm: Date.now(), dados });

   // ---- Limpar só o que é seu --------------------------------------------
   // export function limparDados() {
   //   const minhas = Object.keys(localStorage).filter((c) => c.startsWith(PREFIXO));
   //   minhas.forEach((c) => localStorage.removeItem(c));
   //   return minhas.length;
   // }

   COMO TESTAR
   - DevTools > Application > Local Storage: veja as chaves aparecendo.
   - Estrague o valor de uma chave à mão (ex.: "{abc") e recarregue: a
     página precisa abrir normalmente.
   ========================================================================== */
