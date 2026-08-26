-- A checagem no service é conveniência (409 com mensagem). Este gatilho é
-- a garantia real: mesmo um UPDATE feito por script ou por outra instância
-- é recusado quando finalizadoEm já está preenchido.
CREATE TRIGGER `trg_prontuario_imutavel`
BEFORE UPDATE ON `Prontuario`
FOR EACH ROW
BEGIN
  IF OLD.`finalizadoEm` IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PRONTUARIO_IMUTAVEL';
  END IF;
END;
