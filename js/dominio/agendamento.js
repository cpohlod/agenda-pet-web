/* ==========================================================================
   agendamento.js — O "CORAÇÃO" DO NEGÓCIO   (ticket: US07)

   O QUE É ESTE ARQUIVO
   Guarda as DECISÕES DE NEGÓCIO e os MODELOS de dados: a configuração da
   loja, os status possíveis, as classes (Servico, Agendamento,
   AgendamentoDomiciliar), a fábrica que escolhe a classe certa e o gerador
   de protocolo.

   REGRA DE OURO
   Nada aqui conhece o navegador: sem document, window, localStorage ou
   fetch. É isso que permite o MESMO arquivo rodar na página E no Node
   (scripts/ e tests/).

   O QUE FAZER AQUI (nesta ordem sugerida)
   1) CONFIG  -> um objeto congelado (Object.freeze) com as constantes do
                 negócio: horário de abertura/fechamento, passo dos horários,
                 cidade da loja, taxas de deslocamento, minutos do lembrete.
   2) STATUS  -> objeto congelado com os 3 status (Agendado, Concluído,
                 Cancelado). Use-o no lugar de "strings soltas" no código.
   3) normalizarTexto(texto) -> tira acento e deixa minúsculo, para comparar
                 "São Paulo" com "sao paulo".
   4) class Servico -> dados de um item do catálogo (id, nome, descrição,
                 preço, duração, se é domiciliar). Converta números com Number().
   5) class Agendamento -> um atendimento na loja. Tem getters (ativo,
                 inicio, tipo) e métodos (calcularValor, resumo, conflitaCom,
                 alterarStatus, paraJSON).
   6) class AgendamentoDomiciliar extends Agendamento -> HERANÇA: reaproveita
                 tudo e acrescenta o endereço e a taxa de deslocamento.
                 Reescreva só o que muda (calcularValor, resumo, paraJSON).
   7) criarAgendamento(dados, catalogo) -> FÁBRICA: recebe um objeto simples
                 (do formulário, do localStorage ou do JSON) e devolve a
                 instância da classe certa.
   8) criarGeradorProtocolo(ultimo) -> CLOSURE: devolve uma função que
                 "lembra" o contador entre as chamadas.
   9) ultimoNumeroProtocolo(lista) -> descobre o maior número já usado, para
                 o gerador continuar de onde parou depois de recarregar.

   QUEM USA ESTE ARQUIVO
   regras.js, fechamento.js, storage.js (via paraJSON), app.js, ui.js,
   scripts/*.js e tests/. É a base: não importa nenhum outro arquivo do projeto.

   EXEMPLOS GENÉRICOS (use o MESMO raciocínio com os dados do AgendaPet;
   aqui o assunto é uma biblioteca, para você não copiar e colar):

   // ---- 1) Configuração congelada --------------------------------------
   // export const CONFIG = Object.freeze({
   //   abre: '09:00',
   //   multaPorDia: 2.5,
   //   diasDeEmprestimo: 7,
   // });

   // ---- 2) Enum de status ------------------------------------------------
   // export const SITUACAO = Object.freeze({ ATIVO: 'Ativo', DEVOLVIDO: 'Devolvido' });

   // ---- 4) Classe simples com conversão de tipos -----------------------
   // export class Livro {
   //   constructor({ id, titulo, paginas }) {
   //     this.id = id;
   //     this.titulo = titulo;
   //     this.paginas = Number(paginas);      // vindo de JSON/formulário pode ser texto
   //   }
   // }

   // ---- 5) Classe com getter e método ------------------------------------
   // export class Emprestimo {
   //   constructor({ codigo, livro, leitor, situacao = SITUACAO.ATIVO }) {
   //     this.codigo = codigo;
   //     this.livro = livro;                  // guarde o OBJETO, não só o id
   //     this.leitor = leitor;
   //     this.situacao = situacao;
   //   }
   //   get ativo() { return this.situacao === SITUACAO.ATIVO; }   // usado como propriedade
   //   calcularValor() { return CONFIG.multaPorDia * 0; }          // método: usa ()
   //   paraJSON() { return { codigo: this.codigo, livroId: this.livro.id, ... }; } // sem métodos
   // }

   // ---- 6) Herança: só reescreve o que é diferente -----------------------
   // export class EmprestimoEspecial extends Emprestimo {
   //   constructor({ prazoExtra, ...dados }) {
   //     super(dados);                        // o pai monta os campos comuns
   //     this.prazoExtra = prazoExtra;
   //   }
   //   calcularValor() { return super.calcularValor() + 5; }  // reaproveita o do pai
   // }

   // ---- 7) Fábrica --------------------------------------------------------
   // export function criarEmprestimo(dados, catalogo) {
   //   const livro = catalogo.find((l) => l.id === dados.livroId);
   //   if (!livro) throw new Error(`Livro desconhecido: ${dados.livroId}`);
   //   return dados.especial ? new EmprestimoEspecial({ ...dados, livro }) : new Emprestimo({ ...dados, livro });
   // }

   // ---- 8) Closure (contador "preso" dentro da função) ----------------
   // export function criarGeradorCodigo(ultimo = 0) {
   //   let contador = ultimo;                 // ninguém de fora enxerga esta variável
   //   return function proximo() {
   //     contador += 1;
   //     return `EMP-${String(contador).padStart(4, '0')}`;   // EMP-0001, EMP-0002...
   //   };
   // }

   COMO SABER QUE ESTÁ CERTO
   - npm test  (tests/dominio.test.js) cobre closure, herança e fábrica.
   - Dá para importar este arquivo no Node sem erro (prova que não usa DOM).
   ========================================================================== */
