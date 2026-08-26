-- Impede que o mesmo profissional tenha dois atendimentos EM_ANDAMENTO.
-- MySQL não tem índice único parcial. A coluna gerada vale o id do profissional
-- só nesse status e fica NULL nos demais; UNIQUE no MySQL aceita vários NULL,
-- então o efeito é o mesmo do índice parcial do Postgres.
--
-- VIRTUAL, não STORED: no MySQL 8.4, coluna gerada STORED que referencia
-- profissionalId (FK para Usuario) falha com erro 1215. VIRTUAL mantém a mesma
-- regra de unicidade e funciona com o índice abaixo.
--
-- É esta restrição que sustenta "um atendimento ativo por profissional"
-- mesmo com duas requisições simultâneas: a segunda viola o unique e o
-- MySQL devolve 1062, que o Prisma traduz para P2002 e a API para 409.
ALTER TABLE `Atendimento`
  ADD COLUMN `profissionalAtivo` CHAR(36)
    GENERATED ALWAYS AS (
      IF(`status` = 'EM_ANDAMENTO', `profissionalId`, NULL)
    ) VIRTUAL,
  ADD UNIQUE INDEX `uniq_profissional_atendimento_ativo` (`profissionalAtivo`);
