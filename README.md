# AgendaPet Web — Patinhas & Cia

Painel web responsivo e acessível para a gestão de agendamentos diários do pet shop Patinhas & Cia, desenvolvido com HTML5 semântico, CSS3 (mobile-first com Flexbox) e JavaScript puro (ESM no front-end e módulos Node.js no back-end).

## Funcionalidades Implementadas

- **US01 — Estrutura Semântica e Acessível:** Landmarks semânticos (`header`, `nav`, `main`, `section`, `aside`, `footer`), formulário com labels associados e contrastes adequados (WCAG AA).
- **US02 — Catálogo de Serviços:** Carregamento assíncrono via `fetch` a partir de `data/servicos.json`, com tratamento dos três estados visuais (carregando, sucesso e erro com botão "Tentar novamente").
- **US03 — Formulário de Novo Agendamento:**
  - Campos: tutor, telefone com DDD, pet, espécie, serviço, data, horário comercial e observações.
  - Validação completa com JavaScript no evento `submit` (com `preventDefault`): campos obrigatórios, telefone válido, data não passada e horário dentro do funcionamento.
  - Acessibilidade: mensagens de erro visíveis na tela anunciadas com `role="alert"` e `aria-live="polite"`, movendo o foco para o primeiro campo inválido (sem uso de `alert()`).
  - Ao salvar com sucesso: exibe feedback de confirmação, limpa o formulário e inclui o agendamento imediatamente na lista da agenda.
- **US04 — Endereço Automático por CEP (ViaCEP):**
  - Exibição condicional dos campos de endereço apenas para serviços que aceitam atendimento domiciliar.
  - Consulta automática à API ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) ao digitar 8 dígitos numéricos (com ou sem hífen).
  - Preenchimento automático de logradouro, bairro, cidade e UF, posicionando o foco diretamente no campo número.
  - Tratamento com mensagens específicas para formato inválido, CEP não encontrado e indisponibilidade de rede.
  - Garantia de preenchimento manual completo do endereço caso a API esteja fora do ar.
- **US05 — Alerta de Feriados com Cache (BrasilAPI):**
  - Consulta de feriados nacionais na BrasilAPI (`https://brasilapi.com.br/api/feriados/v1/{ano}`) ao selecionar a data.
  - Cache no `localStorage` com registro de data da consulta e validade de 30 dias para evitar requisições repetidas.
  - Exibição do nome do feriado e bloqueio do salvamento sem a marcação explícita de "Agendar mesmo assim".
  - Resiliência: caso a API de feriados falhe, um aviso é emitido e o sistema permite continuar o agendamento normalmente.
- **US06 — Agenda do Dia (Lista, Busca, Filtros e Atalhos):**
  - Renderização dinâmica e segura via DOM (`createElement`, `textContent`, `classList`) sem uso de `innerHTML`.
  - Ordenação automática dos agendamentos do dia por horário e status (Agendado, Concluído, Cancelado).
  - Interação com mouse: botões para concluir e cancelar atendimentos, efeito hover e destaque com realce ao selecionar itens.
  - Busca em tempo real por tutor ou pet via eventos `input` e `keyup`.
  - Atalhos globais de teclado: `N` para focar no primeiro campo do formulário, `/` para focar e selecionar a busca, e `Esc` para limpar a busca.
  - Acessibilidade total por teclado com `Tab`, `Enter` e `Espaço` em todos os controles interativos.
  - Filtro por status (`todos`, `Agendado`, `Concluído`, `Cancelado`), contador dinâmico de agendamentos e mensagem dedicada para lista vazia.
- **US07 — Regras de Negócio, POO e Fechamento do Dia:**
  - **Programação Orientada a Objetos (POO):** Classe base `Agendamento` e subclasse especializada `AgendamentoDomiciliar extends Agendamento`, com construtores, atributos (`endereco` no domiciliar), getters (`ativo`, `inicio`, `tipo`) e sobrescrita polimórfica de métodos (`calcularValor()` e `resumo()`). Uso significativo da palavra-chave `this` para vinculação de instância.
  - **Prevenção de conflitos de agenda:** Método `conflitaCom(outro)` e função `temConflito(lista, novo)` impedindo agendamentos ativos simultâneos na mesma data e horário. Cancelamentos liberam o horário automaticamente.
  - **Protocolo sequencial sem variáveis globais:** Implementação de gerador via closure (`criarGeradorProtocolo(ultimo)`), preservando o contador de forma privada no escopo léxico da função.
  - **Função de alta ordem com callbacks:** `filtrarAgendamentos(lista, ...criterios)` recebe funções callback independentes (`porStatus`, `porBusca` ou predicados customizados) combinadas por meio de `every()`.
  - **Fechamento consolidado do dia:** Cálculo de total de atendimentos, faturamento dos concluídos, valores a receber dos agendados, cancelados, agrupamento por serviço e próximo atendimento do dia. Utiliza métodos de array (`map`, `filter`, `find`, `every`, `some`, `reduce`, `sort`) e laços (`for...of`).
  - **Atualização em tempo real na interface:** Renderização automática dos cartões de fechamento e da tabela de atendimentos por serviço, além do banner de próximo atendimento.
- **US08 — Persistência e Exportação dos Dados:**
  - **Isolamento de persistência em `js/storage.js`:** Acesso centralizado ao `localStorage` com prefixo delimitador (`agendapet:`), garantindo que outras aplicações no mesmo domínio não sejam afetadas.
  - **Tratamento robusto de erros com `try/catch`:** Tratamento para dados corrompidos ou sintaxe JSON inválida em `lerJSON()`, retornando valores padrão seguros sem interromper o funcionamento da aplicação. Tratamento de exceções em `salvarJSON()` (como estouro de cota `QuotaExceededError`).
  - **Persistência de agendamentos, filtros e preferências:**
    - Agenda persistida automaticamente a cada criação, alteração de status ou exclusão, serializando instâncias de classes com `paraJSON()`.
    - Filtro de status ativo restaurado automaticamente ao recarregar a página.
    - Preferência de interface (tema claro / escuro com atributo `data-tema`) persistida e reaplicada no carregamento inicial da página.
  - **Botão "Limpar meus dados":** Exclui exclusivamente as chaves da aplicação (`agendapet:*`), mantendo os dados de outros sistemas intactos e preservando a escolha de tema do usuário.
  - **Exportação e utilitários:**
    - Botão "Exportar dados": renderiza o JSON estruturado e identado (2 espaços), exatamente no mesmo esquema de dados consumido pelos scripts Node.js (US11).
    - Botão "Copiar": transfere o conteúdo do JSON para a área de transferência usando a API Clipboard ou fallback.
    - Botão "Baixar JSON" (Bônus): gera e baixa o arquivo `agenda-AAAA-MM-DD.json` localmente via Blob e Object URL.
    - Botão "Carregar exemplo": permite importar instantaneamente os dados de `data/agenda-exemplo.json` para demonstração e testes.
- **US09 — Relógio e Lembretes de Atendimento (Timers):**
  - **Temporizador periódico com `setInterval`:** Atualização periódica a cada 30 segundos sincronizando o relógio (`.relogio__hora`) e recalculando a agenda do dia.
  - **Destaque automático de atendimentos atrasados:** Identifica agendamentos com horário anterior ao momento atual que ainda estejam com status `Agendado`, aplicando as classes visuais `.item--atrasado` e o selo `.selo--atrasado`.
  - **Cálculo dinâmico do próximo atendimento:** O banner da agenda exibe em tempo real o texto `"Próximo atendimento em X min: ..."` para atendimentos futuros e `"Próximo atendimento agora: ..."` para o atendimento corrente.
  - **Lembrete visual antecipado (15 minutos ou menos):** Exibição dinâmica do banner de alerta `#lembrete` sempre que um agendamento do dia estiver a 15 minutos ou menos do seu início (`CONFIG.minutoLembrete = 15`), preparando o atendente para a chegada do pet.
  - **Controle de Pausar e Retomar com `clearInterval`:** Botão interativo `#btn-lembretes` permitindo pausar e retomar os lembretes periódicos com atualização dinâmica de estado WAI-ARIA (`aria-pressed`).
  - **Notificações temporárias com `setTimeout` (Toast):** Sistema de toast flutuante com desaparecimento automático após 4 segundos, prevenindo timers acumulados/duplicados através de `clearTimeout` antes de cada novo agendamento.

## Decisões de Negócio e Regras da Loja

### Horário de Funcionamento da Loja (US03)
- **Horário de atendimento:** Das **08:00 às 18:00**.
- **Intervalo de agendamento (passo):** De **30 em 30 minutos** (ex.: 08:00, 08:30, 09:00, etc.).
- **Término do atendimento:** Nenhum serviço pode ultrapassar o horário de encerramento da loja. O horário inicial somado à duração do serviço escolhido (`duracaoMin`) deve terminar até as **18:00**.
- **Datas:** Não é permitido registrar agendamentos em datas passadas. Se a data for hoje, o horário não pode ser anterior ao horário atual.
- **Telefone:** Obrigatório com DDD (10 dígitos para fixo ou 11 dígitos para celular com nono dígito).

### Atendimento Domiciliar e Taxa de Deslocamento (US04, US07)
- **Serviços permitidos:** Apenas serviços com a flag `domiciliar: true` no catálogo podem ser realizados no domicílio do tutor (ex.: Banho e Tosa Completa aceitam; Adestramento é realizado apenas na loja física).
- **Taxa de deslocamento:**
  - Para a cidade sede da loja (**São Paulo**): taxa fixa de **R$ 15,00** adicionada ao valor do serviço.
  - Para as demais cidades: taxa de **R$ 30,00** adicionada ao valor do serviço.
- O cálculo do valor total do atendimento domiciliar é encapsulado pelo método `calcularValor()` da subclasse `AgendamentoDomiciliar`, invocando `super.calcularValor() + this.taxaDeslocamento()`.

### Fechamento Financeiro do Dia (US07)
- **Faturamento realizado:** Considera única e exclusivamente os agendamentos com status **Concluído** (`STATUS.CONCLUIDO`).
- **Valores a receber:** Soma os valores dos atendimentos ainda pendentes com status **Agendado** (`STATUS.AGENDADO`).
- Atendimentos com status **Cancelado** (`STATUS.CANCELADO`) não compõem faturamento nem valores a receber.
- **Próximo atendimento:** Localiza o primeiro atendimento ativo com status `Agendado` a partir do horário atual (`HH:MM`).

---

## Declaração de Variáveis no JavaScript: const, let e var (e por que evitar var)

No JavaScript moderno (ECMAScript 2015 / ES6 em diante), a forma como declaramos identificadores mudou fundamentalmente para garantir previsibilidade, imutabilidade e segurança no controle de escopo.

### 1. `var` (Legado — Evite)
- **Escopo de função (Function Scope):** Variáveis declaradas com `var` não respeitam blocos delimitados por chaves `{ ... }` (como estruturas `if`, `for`, `while` ou `switch`). Elas "vazam" para toda a função onde foram declaradas ou para o escopo global.
- **Hoisting permissivo com `undefined`:** A declaração da variável é içada (*hoisted*) para o topo do seu escopo e imediatamente inicializada com `undefined`. Acessar a variável antes de sua declaração na linha de código não gera erro, mas retorna `undefined`, o que mascara bugs silenciosos.
- **Permite redeclaração:** É possível redeclarar a mesma variável com `var` repetidas vezes no mesmo escopo sem nenhum erro (`var pet = 'Rex'; var pet = 'Thor';`), facilitando sobrescritas acidentais em arquivos extensos.
- **Poluição do escopo global:** Variáveis com `var` declaradas fora de funções no navegador tornam-se propriedades diretas do objeto `window` (`window.pet`), aumentando o risco de conflitos entre bibliotecas e scripts.

### 2. `let` (Moderno — Para variáveis mutáveis)
- **Escopo de bloco (Block Scope):** A variável existe exclusivamente dentro do bloco `{ ... }` em que foi declarada.
- **Hoisting com Zona Morta Temporal (TDZ — *Temporal Dead Zone*):** A variável é içada conceitualmente, mas **não** é inicializada. Tentar acessar uma variável declarada com `let` antes de sua linha de definição lança um erro fatal imediato (`ReferenceError: Cannot access 'nome' before initialization`), tornando a falha explícita.
- **Não permite redeclaração:** Declarar duas vezes a mesma variável com `let` no mesmo escopo causa erro de sintaxe imediato (`SyntaxError: Identifier 'x' has already been declared`).
- **Permite reatribuição:** O valor associado ao identificador pode ser alterado ao longo da execução (`let contador = 0; contador += 1;`).

### 3. `const` (Moderno — Padrão recomendado)
- **Escopo de bloco e TDZ:** Segue rigorosamente as mesmas regras de escopo de bloco e zona morta temporal que `let`.
- **Declaração com inicialização obrigatória:** Não é permitido declarar uma constante sem fornecer seu valor inicial (`const total;` é inválido).
- **Imutabilidade da vinculação (Binding):** O identificador não pode ser reatribuído (`const taxa = 15; taxa = 20;` lança `TypeError: Assignment to constant variable`).
- **Atenção — Imutabilidade da referência vs. Conteúdo do objeto:** `const` impede a reatribuição da referência na memória, mas **não** congela as propriedades de objetos ou elementos de arrays. Um objeto instanciado com `const` pode ter suas propriedades modificadas. Para tornar um objeto imutável de forma profunda, utiliza-se `Object.freeze()`.

### 4. Por que evitar `var`?
1. **Prevenção de vazamento de escopo e bugs em laços:** Em laços `for (var i = 0; i < 3; i++)`, a variável `i` permanece acessível fora do laço. Em operações assíncronas (como callbacks de eventos ou timers), todas as iterações compartilham a mesma referência única de `i`. Com `let`, cada iteração cria uma vinculação de bloco nova e isolada.
2. **Eliminação de bugs silenciosos:** O içamento com inicialização em `undefined` de `var` frequentemente gera lógicas condicionais enganosas onde o código executa com valores indefinidos sem disparar erros. Com `let` e `const`, erros de acesso precoce são detectados imediatamente via `ReferenceError`.
3. **Evita colisões acidentais por redeclaração:** Com `const` e `let`, o compilador/interpretador rejeita duplicidade de declaração no mesmo escopo.
4. **Regra de Ouro (Clean Code em JavaScript Moderno):**
   - Use **`const` por padrão** para todas as declarações (variáveis, funções, classes, referências de objetos e arrays).
   - Use **`let` apenas quando a variável estritamente precisar ser reatribuída** (ex.: contadores em acumuladores, variáveis de controle de fluxo de laços).
   - **Nunca use `var`** em projetos modernos.

---

## Como Rodar

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```
   Acesse a aplicação no navegador em `http://localhost:5500`.

3. **Execute os testes automatizados do domínio:**
   ```bash
   npm test
   ```

## Tecnologias

- **HTML5** semântico e acessível (WAI-ARIA).
- **CSS3** estruturado com variáveis CSS (Custom Properties) e layout Flexbox.
- **JavaScript (ES2022+):** Módulos nativos (ESM), sem frameworks ou bibliotecas externas no front-end.
- **Node.js (>=20):** Executor nativo de testes (`node:test`).
