<!--
  bug-report.md — RELATÓRIO DE BUG   (ticket: US12)

  O QUE É: o registro de UM bug real que você encontrou e corrigiu usando o
  depurador. Mostra que você investiga com método, e não por tentativa e erro.

  O QUE FAZER: copie o modelo de "Modelos e Apoio/bug-report_MODELO.md" e
  preencha. Estrutura esperada:

    # Relatório de bug — BUG-01
    | Campo | Valor |            -> título, ticket relacionado, onde apareceu,
                                    branch/PR da correção, gravidade
    ## Passos para reproduzir       -> numerados, para qualquer pessoa repetir
    ## Resultado esperado x obtido  -> tabela comparando os dois
    ## Investigação com o depurador -> onde pôs o breakpoint, quais variáveis
                                       observou, o que descobriu
                                       (inclua o print docs/depuracao.png)
    ## Causa raiz                   -> a explicação em 1 ou 2 frases
    ## Correção                     -> o que mudou (trecho antes/depois)
    ## Como evitar de novo          -> um teste, uma regra, uma revisão

  EXEMPLO GENÉRICO DE "CAUSA RAIZ":
    "O total somava também os itens cancelados, porque o filter usava
     !== 'Pago' em vez de === 'Pago'."

  Imagens que costumam ficar nesta pasta (você as cria):
    docs/depuracao.png   print do depurador pausado no breakpoint
    docs/kanban.png      print do quadro Kanban
    docs/tela-1280.png   print da tela final
-->
