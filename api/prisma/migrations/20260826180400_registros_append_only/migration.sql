-- Adendos e logs são trilhas históricas. A aplicação não expõe UPDATE/DELETE,
-- e o banco repete a garantia para scripts e acessos fora da API.
--
-- MySQL não aceita "BEFORE UPDATE OR DELETE" num gatilho só. O corpo é um
-- SIGNAL simples, sem BEGIN/END, para o migrate não partir o SQL no ; interno.
CREATE TRIGGER `trg_adendo_no_update`
  BEFORE UPDATE ON `ProntuarioAdendo`
  FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRO_APPEND_ONLY';

CREATE TRIGGER `trg_adendo_no_delete`
  BEFORE DELETE ON `ProntuarioAdendo`
  FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRO_APPEND_ONLY';

CREATE TRIGGER `trg_auditoria_no_update`
  BEFORE UPDATE ON `LogAuditoria`
  FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRO_APPEND_ONLY';

CREATE TRIGGER `trg_auditoria_no_delete`
  BEFORE DELETE ON `LogAuditoria`
  FOR EACH ROW
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REGISTRO_APPEND_ONLY';
