# Cria/corrige banco do PAD, aplica migrations e popula dados demo.
# Uso (na raiz do repositório):
#   .\scripts\mysql-setup-pad.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Invoke-Checked {
  param([string]$Label, [scriptblock]$Block)
  Write-Host $Label
  & $Block
  if ($LASTEXITCODE -ne 0) {
    throw "$Label falhou (exit $LASTEXITCODE)."
  }
}

if (-not (docker ps --format '{{.Names}}' | Select-String -Pattern '^mysql_shared$' -Quiet)) {
  throw 'Container mysql_shared não está rodando.'
}

Invoke-Checked 'Copiando sql/fix_usuario_pad.sql...' {
  docker cp sql/fix_usuario_pad.sql mysql_shared:/tmp/fix_usuario_pad.sql
}

Invoke-Checked 'Ajustando usuário MySQL (root dentro do container)...' {
  docker exec mysql_shared sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/fix_usuario_pad.sql'
}

Invoke-Checked 'Aplicando migrations...' {
  docker run --rm --network mysql_shared --env-file .env pad-migrate npx prisma migrate deploy
}

Invoke-Checked 'Populando dados de demonstração...' {
  docker run --rm --network mysql_shared --env-file .env -e NODE_ENV=development pad-migrate npx prisma db seed
}

Write-Host 'Pronto. Suba a stack: docker compose -f docker-compose.local.yml up -d --build'
