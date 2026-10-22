/* ==========================================================================
   api.js — TODO O fetch MORA AQUI   (tickets: US02, US04, US05)

   O QUE É ESTE ARQUIVO
   É a "ponte" entre o seu sistema e o mundo de fora: o JSON local do
   catálogo, a API ViaCEP (endereço pelo CEP) e a BrasilAPI (feriados).
   Nenhum outro arquivo chama fetch direto.

   O QUE FAZER AQUI
   Cada função devolve DADOS PRONTOS ou LANÇA um erro com um "tipo", para a
   tela decidir a mensagem certa. Quem desenha a mensagem é o ui.js, quem
   decide quando chamar é o app.js; aqui só se busca e se trata a resposta.

   O QUE ESTE ARQUIVO CONCENTRA
   1) class ErroApi extends Error -> um erro com campo "tipo":
        'rede' (sem conexão) | 'http' (servidor respondeu erro) |
        'formato' (dado de entrada inválido) | 'nao-encontrado'
   2) buscarJSON(url, mensagemHttp) -> função interna que faz o fetch, confere
      response.ok e converte para JSON, UMA vez só (evita repetir código).
   3) carregarServicos()      -> lê data/servicos.json.
   4) carregarAgendaExemplo() -> lê data/agenda-exemplo.json.
   5) buscarCep(cep)          -> valida o CEP (use regras.js), consulta o ViaCEP
      e devolve { cep, logradouro, bairro, cidade, uf }.
   6) buscarFeriados(ano)     -> consulta a BrasilAPI e guarda em cache
      (use as funções de storage.js).

   PEGADINHAS IMPORTANTES
   - fetch SÓ rejeita a Promise quando a requisição nem chegou ao servidor
     (sem internet). Erro 404/500 NÃO cai no catch: confira response.ok.
   - O ViaCEP responde HTTP 200 com { "erro": true } quando o CEP tem formato
     válido mas não existe. Trate esse caso.
   - Os nomes dos campos da API podem diferir dos seus (ex.: "localidade"
     vira "cidade"). Converta aqui, para o resto do sistema não conhecer a API.

   EXEMPLOS GENÉRICOS (assunto: consulta de países e de usuários):

   // ---- Erro personalizado com "tipo" ----------------------------------
   // export class ErroApi extends Error {
   //   constructor(tipo, mensagem) {
   //     super(mensagem);
   //     this.name = 'ErroApi';
   //     this.tipo = tipo;
   //   }
   // }

   // ---- Função central: fetch + response.ok + JSON ---------------------
   // async function buscarJSON(url, mensagemHttp) {
   //   let resposta;
   //   try {
   //     resposta = await fetch(url);
   //   } catch {
   //     throw new ErroApi('rede', 'Sem conexão com o servidor.');
   //   }
   //   if (!resposta.ok) throw new ErroApi('http', `${mensagemHttp} (erro HTTP ${resposta.status}).`);
   //   return resposta.json();
   // }

   // ---- Função pública que usa a central --------------------------------
   // export const carregarUsuarios = () => buscarJSON('data/usuarios.json', 'Não foi possível carregar os usuários');

   // ---- Função com validação antes + conversão dos campos ------------------
   // export async function buscarPais(codigo) {
   //   if (!/^[A-Za-z]{2}$/.test(codigo)) throw new ErroApi('formato', 'Use 2 letras (ex.: BR).');
   //   const dados = await buscarJSON(`https://api.exemplo.com/paises/${codigo}`, 'Serviço indisponível');
   //   if (dados.erro) throw new ErroApi('nao-encontrado', 'País não encontrado.');
   //   return { codigo: dados.sigla, nome: dados.nomeOficial ?? '' };   // só o que o sistema precisa
   // }

   // ---- Como QUEM CHAMA trata os erros (isso fica no app.js) ---------------
   // try {
   //   const pais = await buscarPais(valor);
   // } catch (erro) {
   //   if (erro instanceof ErroApi && erro.tipo === 'nao-encontrado') { ...mensagem amigável... }
   //   else { ...mensagem genérica... }
   // }

   // ---- Cache com validade (usa o storage.js) ----------------------------
   // const emCache = lerCache(ano, VALIDADE_MS);
   // if (emCache) return emCache;                 // não gasta rede
   // const dados = await buscarJSON(url, '...');
   // salvarCache(ano, dados);
   // return dados;

   COMO TESTAR
   - Teste os 3 caminhos de cada função: sucesso, rede fora (DevTools >
     Network > Offline) e resposta com erro (URL errada).
   - Servir a página por http (npm start): fetch de arquivo local não
     funciona abrindo o index.html com duplo clique.
   ========================================================================== */
