# Invariantes do sistema

Um **invariante** é uma condição que precisa ser verdadeira sempre — inclusive sob requisições simultâneas, chamadas diretas à API sem passar pela interface, múltiplas instâncias da aplicação e falhas em camadas superiores.

## Onde uma regra deve ser garantida

Da garantia mais forte para a mais fraca:

```
constraint no banco  >  transação  >  service  >  controller  >  frontend
```

Cada regra empurrada um nível para baixo elimina uma família inteira de falhas, não uma falha isolada.

Exemplo concreto — *"um profissional não pode ter dois atendimentos em andamento"*:

| Onde a regra vive | O que a contorna |
|---|---|
| Botão desabilitado no React | Abrir duas abas; chamar a API por outro cliente; estado local desatualizado |
| `if` no service (consulta a contagem e então atualiza) | Duas requisições simultâneas: ambas leem zero, ambas gravam |
| Índice único (coluna gerada) no MySQL | Nada. O banco recusa a segunda linha |

A diferença entre a segunda e a terceira linha é a diferença entre *funciona em teste manual* e *está correto*.

## Tabela de invariantes

| # | Invariante | Garantido por | Verificação |
|---|---|---|---|
| 1 | Um atendimento nunca tem dois profissionais | `UPDATE ... WHERE id = ? AND status = 'AGUARDANDO'` em comando único; zero linhas afetadas resulta em `409` | Duas requisições simultâneas em `/iniciar` → um `201`, um `409` |
| 2 | Um profissional nunca tem dois atendimentos `EM_ANDAMENTO` | Coluna gerada `profissionalAtivo` + `UNIQUE` (equivalente MySQL do índice parcial) | Mesmo profissional inicia dois atendimentos → `409` |
| 3 | O status nunca assume transição fora do grafo | Função pura `podeTransicionar()` retornando `422`, com trigger no banco como segunda barreira | Finalizar atendimento `AGUARDANDO` → `422` |
| 4 | Prontuário finalizado nunca é alterado | Trigger `BEFORE UPDATE` que aborta quando `finalizadoEm` não é nulo | `PATCH` após finalização → recusado; `POST /adendos` → `201` |
| 5 | Nenhum acesso a dado clínico ocorre sem registro | Interceptor global, que grava inclusive quando a resposta é `403` | Ler prontuário e consultar `/auditoria` |
| 6 | Nenhum token de sala sobrevive ao fim do atendimento | Transação que altera o status e revoga os tokens, seguida de encerramento da sala no provedor de vídeo | Finalizar e reutilizar o token → `403` |
| 7 | O link do paciente vale para um único atendimento e um único uso | Busca pelo hash do token com verificação de `atendimentoId`, `usadoEm`, `expiraEm` e `revogadoEm` | Link do atendimento A usado no atendimento B → `403` |
| 8 | Dado clínico exige papel autorizado **e** vínculo com o recurso | Guards globais que negam por padrão, mais verificação de escopo | `ADMIN` solicitando prontuário → `403`; médico solicitando prontuário de atendimento alheio → `403` |

## Grafo de estados

```
AGUARDANDO ──────► EM_ANDAMENTO ──────► FINALIZADO
     │
     └──────► CANCELADO
```

`CANCELADO` só é alcançável a partir de `AGUARDANDO`. `FINALIZADO` e `CANCELADO` são terminais.

## Encerramento da sala LiveKit

A revogação interna é imediata: a mesma transação que muda o atendimento para
`FINALIZADO` preenche `revogadoEm` em todas as credenciais. Depois do commit, a
API remove as identidades conhecidas e executa `DeleteRoom`, desconectando quem
estiver na chamada. Nenhum endpoint emite outra credencial fora de
`EM_ANDAMENTO`.

No LiveKit Cloud, `RemoveParticipant` também revoga o JWT anterior e impede a
reconexão. O LiveKit self-hosted não oferece revogação antecipada de JWT; nesse
modo, `DeleteRoom`, bloqueio de nova emissão e TTL de no máximo 15 minutos são
as barreiras disponíveis. Essa é uma limitação explícita do provedor, não uma
promessa escondida da aplicação. Referências: [ciclo de tokens](https://docs.livekit.io/frontends/reference/tokens-grants/#token-lifecycle)
e [Room Service API](https://docs.livekit.io/reference/other/roomservice-api/).

## Contrato de erros HTTP

| Código | Significado |
|---|---|
| `401` | Não autenticado |
| `403` | Autenticado, mas sem permissão ou sem vínculo com o recurso |
| `404` | Recurso inexistente |
| `409` | A operação era válida, mas o estado mudou — conflito de concorrência |
| `422` | A operação nunca seria válida no grafo de estados |

`409` e `422` não são intercambiáveis. `422` indica impossibilidade semântica; `409` indica disputa perdida.

Todo erro responde `{ codigo, mensagem }`, com `codigo` em `SCREAMING_SNAKE_CASE` e estável. O frontend decide comportamento pelo `codigo`, nunca pelo texto da mensagem.
