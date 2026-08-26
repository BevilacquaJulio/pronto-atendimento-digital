-- Cria banco e usuário do PAD no MySQL compartilhado (mysql_shared).
-- Execute como root a partir do container:
--   docker cp sql/create_db.sql mysql_shared:/tmp/create_db.sql
--   docker exec mysql_shared sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/create_db.sql'
--
-- Se o usuário já existir com plugin errado (sha256_password), use fix_usuario_pad.sql.

CREATE DATABASE IF NOT EXISTS bevilabs_pad
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'bevilabs_pad'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'JCFB@#pad@#123';

ALTER USER 'bevilabs_pad'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'JCFB@#pad@#123';

GRANT ALL PRIVILEGES ON bevilabs_pad.* TO 'bevilabs_pad'@'%';
FLUSH PRIVILEGES;
