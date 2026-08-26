-- A API valida primeiro para devolver 422 com uma mensagem útil, mas a
-- garantia precisa sobreviver a bugs no service, scripts e múltiplas
-- instâncias. O gatilho é a última barreira do grafo definido pelo case.
CREATE TRIGGER `trg_transicao_status_atendimento`
BEFORE UPDATE ON `Atendimento`
FOR EACH ROW
BEGIN
  -- Ramos permitidos precisam de um statement. SET id=id é no-op; o ELSE
  -- é quem recusa. MySQL não aceita IF vazio num gatilho.
  IF OLD.`status` = NEW.`status` THEN
    SET NEW.`id` = NEW.`id`;
  ELSEIF OLD.`status` = 'AGUARDANDO' AND NEW.`status` IN ('EM_ANDAMENTO', 'CANCELADO') THEN
    SET NEW.`id` = NEW.`id`;
  ELSEIF OLD.`status` = 'EM_ANDAMENTO' AND NEW.`status` = 'FINALIZADO' THEN
    SET NEW.`id` = NEW.`id`;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRANSICAO_ATENDIMENTO_INVALIDA';
  END IF;
END;
