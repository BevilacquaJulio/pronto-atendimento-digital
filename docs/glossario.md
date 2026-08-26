# Glossário do domínio

Este projeto usa **uma única palavra por conceito**, em todas as camadas: tabela do banco, model do Prisma, service, rota da API e componente React.

Convenção: **o que um profissional de saúde reconheceria fica em português; o que só um desenvolvedor vê fica em inglês.**

O termo `Prontuário` não é equivalente a *medical record* — é um documento com valor médico-legal e regras próprias de retificação. Traduzir criaria uma camada de tradução mental entre a linguagem da área de negócio e o código, que é onde erro de regra de negócio costuma nascer.

## Entidades

| Conceito | Nome no código | Onde aparece |
|---|---|---|
| Pessoa que será atendida | `Paciente` | model, `/pacientes`, `<PacienteDetalhe/>` |
| Uma passagem pela fila, do início ao fim | `Atendimento` | model, `/atendimentos`, `AtendimentoService` |
| Registro clínico do atendimento | `Prontuario` | model, `/prontuarios` |
| Correção posterior do prontuário | `ProntuarioAdendo` | model, `/prontuarios/:id/adendos` |
| Sinais vitais e queixa, registrados pelo enfermeiro | `Triagem` | model, `/atendimentos/:id/triagem` |
| Credencial temporária de acesso à sala de vídeo | `SalaToken` | model |
| Registro de quem acessou qual dado clínico | `LogAuditoria` | model, `/auditoria` |
| Profissional de saúde ou administrador | `Usuario` | model, `/usuarios` |

## Valores fixos

**Status do atendimento** — sempre em maiúsculo, sempre estas quatro palavras:

```
AGUARDANDO · EM_ANDAMENTO · FINALIZADO · CANCELADO
```

**Papéis:**

```
ENFERMEIRO · MEDICO · ADMIN
```

O paciente não é um papel do sistema: ele não tem conta nem login. Entra na sala por um link temporário e é tratado como participante anônimo portador de um token de sala.

## Campos

Datas e marcos temporais em português: `criadoEm`, `iniciadoEm`, `finalizadoEm`, `entradaFila`, `expiraEm`, `revogadoEm`, `usadoEm`.

Referências: `pacienteId`, `profissionalId`, `atendimentoId`, `autorId`.

## Sufixos técnicos

Em inglês, colados ao substantivo em português:

```
AtendimentoService · ProntuarioController · SalaTokenGuard · AtendimentoModule
```

## Rotas

Português, plural, minúsculo:

```
/atendimentos · /prontuarios · /pacientes · /triagens · /usuarios · /auditoria · /sala
```

## Termos que não são usados neste projeto

`appointment` · `consultation` · `medicalRecord` · `doctor` · `nurse` · `patient` · `createdAt` · `WAITING` · `IN_PROGRESS`
