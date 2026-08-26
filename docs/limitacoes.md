# Limitações conhecidas e abordagem escolhida

As limitações abaixo são explícitas para que o ambiente de demonstração não
seja confundido com uma implantação pronta para dados clínicos reais. Cada item
registra o que existe hoje, por que a decisão foi essa e o que faltaria para
levar aquele ponto a produção.

## 1. PWA sem operação clínica offline

O frontend é instalável, registra service worker, oferece atualização controlada
e mantém o shell estático disponível sem conexão. A PWA não permite consultar ou
alterar dados assistenciais offline.

**Abordagem adotada:** o precache contém apenas HTML, CSS, JavaScript, fontes e
imagens versionadas. Requisições `/api` usam estratégia `NetworkOnly`; tokens,
pacientes, prontuários e respostas autenticadas não são persistidos pelo service
worker.

**Para uma evolução offline:** seria necessário definir regras de sincronização,
expiração, criptografia local, resolução de conflitos, revogação remota e análise
formal de risco/LGPD. Esse comportamento não deve ser introduzido apenas com um
cache genérico.

## 2. LiveKit local não representa produção

O Compose executa uma instância única em modo de desenvolvimento, exposta por
HTTP/WebSocket local e sem TLS ou TURN configurado para redes corporativas. O
endereço ICE é fixado em `127.0.0.1` para impedir que o LiveKit anuncie o IP
inacessível da bridge do Docker e tornar determinístico o teste com duas sessões
no mesmo computador.

**Abordagem adotada:** oferecer vídeo e chat reproduzíveis sem conta externa,
separando a URL interna usada pela API da URL pública usada pelo navegador.

**Para produção ou outro dispositivo:** configurar `APP_PUBLIC_URL`,
`LIVEKIT_PUBLIC_URL` e `LIVEKIT_NODE_IP` com endereços alcançáveis, além de usar
`https://`/`wss://`, certificado confiável, TURN/TLS, firewall e monitoramento
de conectividade. Nenhuma configuração somente de Compose consegue descobrir
ou provisionar domínio, certificado, NAT e regras da rede de destino.

## 3. Revogação antecipada no LiveKit self-hosted

A aplicação revoga as credenciais no banco, impede nova emissão, remove os
participantes e apaga a sala. Entretanto, um JWT LiveKit já emitido continua
criptograficamente válido até seu TTL no modo self-hosted; a revogação nativa
antecipada é uma capacidade dependente do provedor.

**Abordagem adotada:** TTL máximo de 15 minutos, tokens individuais, remoção de
participantes e `DeleteRoom` após o commit da finalização. Os endpoints da API
deixam de emitir ou trocar qualquer credencial imediatamente.

**Para garantia mais forte:** usar um provedor com revogação suportada e validar
reconexão real em teste de integração contra esse ambiente.

## 4. Integração LiveKit automatizada usa fake

Os testes unitários verificam grants e TTL do JWT. Os E2E verificam autorização,
uso único, revogação interna e encerramento por meio de um provider fake, sem
abrir uma conexão WebRTC real.

**Abordagem adotada:** manter a suíte determinística e independente de rede.

**Próximo passo:** adicionar uma suíte separada, executada sob demanda, que sobe
LiveKit e conecta dois navegadores com Playwright para validar câmera simulada,
chat, desconexão e tentativa de reconexão.

## 5. Cobertura automatizada do frontend é parcial

O frontend cobre login, validação, autorização de rotas, estados da fila,
busca, conflito `409`, retomada de atendimento antigo, administração de perfis,
convites, triagem e encaminhamento, prontuário e finalização. Histórico
detalhado e a mídia WebRTC real ainda dependem dos E2E do backend e de inspeção
manual.

**Abordagem adotada:** concentrar a maior cobertura automática nas regras do
servidor, pois o frontend não deve ser a fronteira de segurança.

**Próximo passo:** cobrir histórico e diferenças visuais por papel, além de uma
suíte de navegador separada para o LiveKit real.

## 6. Sessão do profissional no navegador

O access token é mantido na sessão do navegador para restaurar a navegação após
reload. É a opção mais simples, mas continua exposta a JavaScript em caso de XSS
e não há fluxo de refresh token.

**Abordagem adotada:** token com expiração, Helmet, ausência de HTML arbitrário e
nenhum segredo de infraestrutura no bundle.

**Para produção:** preferir cookie `HttpOnly`, `Secure` e `SameSite`, com access
token curto, rotação de refresh token e proteção CSRF adequada.

## 7. Observabilidade básica

Há healthcheck e logs do NestJS, mas não existem métricas Prometheus, tracing
distribuído, correlação de requisições ou alertas.

**Abordagem adotada:** auditoria clínica fica separada de logs operacionais e é
persistida de forma append-only.

**Para produção:** logs JSON com correlation ID, métricas RED, tracing para
MySQL/LiveKit e alertas de erro, latência e indisponibilidade.

## 8. Ambiente Docker depende do Traefik e do MySQL compartilhado

As imagens usam builds multi-stage, usuário não-root na API, healthchecks,
limites de recursos e rotação de logs. O Compose não cria banco: usa o
`mysql_shared` já existente no host e publica a API e o frontend pelo Traefik.

**Abordagem adotada:** o mesmo padrão de deploy dos projetos Bevilabs
(`bl_*`), com LiveKit ainda em modo `--dev`.

**Para produção:** secrets do orquestrador, LiveKit sem `--dev`, TURN quando a
rede bloquear UDP, imagens fixadas por digest, scanner de vulnerabilidades e
pipeline que execute `docker compose run --rm --build migrate` antes do rollout.

## 9. Dados e conformidade

O seed contém apenas dados fictícios. A solução não foi submetida a uma análise
formal de LGPD, retenção, consentimento, criptografia de campos ou políticas de
backup de prontuário.

**Abordagem adotada:** impedir acesso indevido por autenticação, papel, vínculo e
auditoria, sem alegar conformidade regulatória completa.

**Para produção:** DPIA/relatório de impacto, classificação de dados, retenção,
criptografia em trânsito e repouso, gestão de consentimento e processo de
resposta a incidentes.

## 10. Escala e disponibilidade

A topologia é single-node. MySQL compartilhado, API e LiveKit são pontos únicos de falha.

**Abordagem adotada:** monólito modular e infraestrutura mínima, suficientes para
demonstrar regras de negócio e concorrência.

**Para produção:** réplicas stateless da API, MySQL com backup/replicação,
LiveKit dimensionado para banda e CPU e testes de carga com metas explícitas.

## 11. Entrega do convite ao paciente é assistida

A aplicação gera o link individual e oferece cópia e compartilhamento pelo
recurso nativo do dispositivo. Não existe envio automático por SMS, WhatsApp ou
e-mail nesta versão.

**Abordagem adotada:** manter a emissão do segredo separada de provedores de
mensageria, permitindo que o profissional escolha um canal de contato já
autorizado pelo paciente.

**Para produção:** integrar um provedor transacional, registrar consentimento e
status de entrega, aplicar templates sem dados clínicos e definir retentativa e
expiração do convite.
