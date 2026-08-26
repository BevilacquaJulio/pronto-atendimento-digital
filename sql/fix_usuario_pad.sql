-- Corrige usuário do PAD para plugin compatível com Prisma (caching_sha2_password).
-- Execute como root dentro do mysql_shared:
--   docker cp sql/fix_usuario_pad.sql mysql_shared:/tmp/fix_usuario_pad.sql
--   docker exec mysql_shared sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/fix_usuario_pad.sql'

CREATE DATABASE IF NOT EXISTS bevilabs_pad
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'bevilabs_pad'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'JCFB@#pad@#123';

ALTER USER 'bevilabs_pad'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'JCFB@#pad@#123';

GRANT ALL PRIVILEGES ON bevilabs_pad.* TO 'bevilabs_pad'@'%';
FLUSH PRIVILEGES;
