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

## Decisões de Negócio e Regras da Loja

### Horário de Funcionamento da Loja (US03)
- **Horário de atendimento:** Das **08:00 às 18:00**.
- **Intervalo de agendamento (passo):** De **30 em 30 minutos** (ex.: 08:00, 08:30, 09:00, etc.).
- **Término do atendimento:** Nenhum serviço pode ultrapassar o horário de encerramento da loja. O horário inicial somado à duração do serviço escolhido (`duracaoMin`) deve terminar até as **18:00**.
- **Datas:** Não é permitido registrar agendamentos em datas passadas. Se a data for hoje, o horário não pode ser anterior ao horário atual.
- **Telefone:** Obrigatório com DDD (10 dígitos para fixo ou 11 dígitos para celular com nono dígito).

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
