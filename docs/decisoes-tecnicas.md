# Decisões técnicas e trade-offs

Este documento registra as principais decisões do PAD, as alternativas
consideradas e as consequências assumidas. O objetivo não é afirmar que existe
uma única solução correta, mas tornar explícito por que esta implementação é
adequada ao escopo definido para o projeto.

## 1. Monólito modular em vez de microsserviços

**Decisão:** uma API NestJS organizada por módulos de domínio.

**Motivo:** fila, prontuário, auditoria e sala compartilham transações e
invariantes. Separá-los cedo aumentaria latência, observabilidade necessária e
risco de consistência distribuída sem benefício proporcional para um sistema
deste porte. Um limite de módulo custa uma pasta; um limite de rede custa uma
estratégia de consistência.

**Trade-off:** a aplicação escala como uma unidade. Se vídeo, auditoria ou fila
apresentarem perfis de carga muito diferentes em produção, esses limites de
módulo permitem extração posterior.

## 2. MySQL e Prisma com garantias também no banco

**Decisão:** Prisma para acesso tipado e migrations, complementado por coluna
gerada com unique, triggers e SQL transacional onde o ORM não expressa a regra.

**Motivo:** regras como “um profissional não pode ter dois atendimentos ativos”
e “prontuário finalizado é imutável” precisam sobreviver a concorrência,
múltiplas instâncias e chamadas que não passam pelo frontend. MySQL não tem
índice único parcial; a coluna gerada que só preenche em `EM_ANDAMENTO` reproduz
o mesmo efeito porque UNIQUE aceita vários NULL.

**Trade-off:** a sessão usa READ COMMITTED (não o REPEATABLE READ padrão do
InnoDB) para o compare-and-swap reavaliar o `WHERE`. As migrations de gatilho
são SQL cru, fora do que o Prisma gera sozinho.

## 3. Operação atômica ao assumir atendimento

**Decisão:** a disputa é resolvida por atualização condicional/transação no
banco, não por um `if` após uma leitura.

**Motivo:** duas requisições podem observar o mesmo estado antes de qualquer uma
gravar. O banco é o único coordenador compartilhado por todas as instâncias.

**Trade-off:** conflitos esperados aparecem como `409`; o cliente precisa tratar
esse resultado como disputa perdida, não como falha inesperada.

## 4. Autorização em camadas

**Decisão:** JWT identifica o profissional; guards globais verificam papel e
vínculo com o atendimento ou paciente.

**Motivo:** RBAC sozinho permitiria que qualquer médico acessasse qualquer
prontuário. O domínio exige também autorização por recurso, próxima de ABAC.

**Trade-off:** algumas requisições autorizadas exigem consulta adicional para
resolver o vínculo. O custo é aceito para evitar IDOR e vazamento de dado
sensível.

## 5. Administrador sem acesso clínico

**Decisão:** `ADMIN` gerencia usuários e consulta metadados de auditoria, mas não
acessa fila, pacientes ou prontuários.

**Motivo:** privilégio administrativo não implica necessidade assistencial. É
uma aplicação direta de menor privilégio.

**Trade-off:** suporte operacional que precise investigar conteúdo clínico deve
ser conduzido por um papel clínico autorizado, nunca por elevação silenciosa do
administrador.

## 6. Prontuário imutável e correção por adendo

**Decisão:** após a finalização, o registro original não é editado. Correções são
novas entidades com autor e timestamp.

**Motivo:** preserva histórico médico-legal e torna a evolução auditável.

**Trade-off:** a leitura precisa apresentar documento e adendos em conjunto; a
modelagem é mais rica que um simples campo de texto editável.

## 7. Link do paciente opaco e armazenado como hash

**Decisão:** o paciente recebe um segredo aleatório de uso único; o banco guarda
somente SHA-256.

**Motivo:** um JWT no link carregaria dados verificáveis e continuaria válido até
expirar. O token opaco pode ser consumido atomicamente e não pode ser recuperado
a partir de um vazamento do banco.

**Trade-off:** a troca depende de uma consulta ao banco, o que é desejável neste
caso porque uso, expiração e revogação precisam ser verificados centralmente.

## 8. LiveKit em vez de WebRTC próprio

**Decisão:** usar LiveKit para mídia, chat por data packets e administração da
sala; a API permanece responsável pela autorização e emissão de tokens.

**Motivo:** sinalização, ICE, publicação de trilhas e compatibilidade entre
navegadores são problemas especializados. Implementá-los do zero desviaria o
foco das regras clínicas e de segurança, que são o problema real deste
sistema.

**Trade-off:** disponibilidade e revogação de sessão também dependem das
capacidades do provedor. O modo self-hosted local não representa toda a
topologia necessária para produção.

## 9. SPA React com Vite em vez de Next.js

**Decisão:** React SPA porque o produto é um portal autenticado, sem necessidade
de SEO ou renderização pública no servidor.

**Motivo:** Vite reduz configuração e oferece ciclo rápido de desenvolvimento.
Rotas são carregadas sob demanda e o estado remoto fica no TanStack Query.

**Trade-off:** o primeiro acesso baixa o shell do cliente e depende de JavaScript.
Uma landing page pública com SEO seria um caso diferente e poderia justificar
SSR/SSG.

## 10. TanStack Query e Context em vez de Redux

**Decisão:** React Query gerencia estado vindo da API; Context mantém somente a
sessão autenticada.

**Motivo:** quase todo estado global é cache remoto. Redux duplicaria cache,
invalidação e estados de carregamento sem necessidade.

**Trade-off:** se surgirem fluxos locais extensos, edição offline ou colaboração
complexa, um store dedicado poderá ser introduzido pontualmente.

## 11. Jest no backend e Vitest no frontend

**Decisão:** Jest e Supertest no NestJS; Vitest e React Testing Library no Vite.

**Motivo:** Jest é o runner consolidado no ecossistema NestJS. Vitest reutiliza
transformações e configuração do Vite, mantendo uma API de teste familiar.

**Trade-off:** existem dois runners no repositório, porém cada um reduz a
configuração acidental da sua camada.

## 12. Nginx como origem única no Docker

**Decisão:** o bundle usa `/api` e o Nginx encaminha esse prefixo para o NestJS.

**Motivo:** o navegador acessa frontend e API pela mesma origem, simplificando
CORS e aproximando o ambiente do uso atrás de um proxy reverso.

**Trade-off:** a URL da API é definida no build do frontend. Alterá-la requer
rebuild da imagem, comportamento esperado para variáveis `VITE_*`.

## 13. Migração one-off antes da API

**Decisão:** o serviço `migrate` (profile `tools`) aplica só `prisma migrate
deploy`. Não sobe com `up`. Seed é comando à parte.

**Motivo:** migrations não pertencem ao build da imagem e não devem disputar
entre réplicas da aplicação. O seed carrega usuários de demonstração e não deve
rodar em produção.

**Trade-off:** o primeiro deploy exige criar o banco e o usuário no
`mysql_shared` por um canal administrativo seguro e depois executar
`docker compose run --rm --build migrate`. Senhas não ficam em SQL versionado.

## 14. Compose atrás do Traefik com MySQL compartilhado

**Decisão:** o Compose de produção não cria banco. API e migrate usam a rede
externa `mysql_shared`; API, frontend e LiveKit usam a rede `traefik`.

**Motivo:** um MySQL por projeto no mesmo VPS multiplica backup, memória e
superfície de falha. TLS e roteamento ficam no Traefik, que já existe no host.

**Trade-off:** o `up` assume Traefik, `mysql_shared` e o schema `pad` já
criados. WebRTC do LiveKit ainda publica `7881/TCP` e `7882/UDP` no host porque
UDP não passa pelo entrypoint HTTP do Traefik.

## 15. Override transitivo de segurança no Swagger

**Decisão:** manter `@nestjs/swagger` 11.4.6 e sobrescrever somente seu
`js-yaml` para 5.2.3.

**Motivo:** a versão atual do Swagger fixa `js-yaml` 5.2.1, reportado pelo npm
audit por consumo exponencial de CPU. A versão 5.2.3 contém a correção e mantém
a mesma linha major esperada pelo pacote.

**Trade-off:** o override deve ser removido quando o Swagger atualizar sua
dependência. Build, testes e `npm audit --omit=dev` fazem parte da verificação
para detectar incompatibilidade ou regressão.

## 16. PWA com cache exclusivo do shell

**Decisão:** gerar manifesto e service worker com `vite-plugin-pwa`, usando
precache apenas para arquivos estáticos versionados e `NetworkOnly` para a API.

**Motivo:** a instalação melhora acesso e experiência em dispositivos móveis,
mas respostas clínicas e autenticadas não devem ser copiadas para o Cache
Storage sem uma arquitetura offline, criptografia e política de sincronização
deliberadas.

**Trade-off:** a interface pode abrir sem rede, porém fila, pacientes,
prontuários, autenticação e sala continuam indisponíveis até a conexão voltar.
Essa limitação é intencional e evita apresentar disponibilidade aparente com
dados potencialmente desatualizados ou expostos no dispositivo.

## 17. CI separada por camada e banco E2E descartável

**Decisão:** executar API e frontend em jobs paralelos e construir as imagens
Docker somente depois que ambos passarem. Os E2E recebem um MySQL exclusivo
do job, com migrations e seed aplicados do zero. Localmente, o comando
`npm run test:e2e:local` reproduz o mesmo isolamento com um projeto Compose
separado, armazenamento temporário e limpeza automática ao final.

**Motivo:** falhas de lint, teste ou build aparecem na camada responsável, e os
testes que escrevem dados nunca compartilham o banco de demonstração. A etapa de
containers valida que os Dockerfiles continuam reproduzíveis após mudanças nas
dependências ou no código. O nome `pad_test` continua obrigatório no guard dos
E2E, mas sua criação deixou de ser uma etapa manual para quem clona o projeto.

**Trade-off:** construir as três imagens aumenta o tempo do workflow. O custo é
aceito na branch principal e em pull requests porque a execução local via Docker
é o caminho documentado de instalação — se ela quebrar, o projeto quebra para
quem chega.

## 18. Permissões administrativas baseadas em papéis

**Decisão:** a gestão de acesso permite criar, ativar, desativar e trocar o
papel entre `ADMIN`, `ENFERMEIRO` e `MEDICO`. Cada papel recebe a matriz fixa de
permissões descrita em [matriz-de-acesso.md](./matriz-de-acesso.md).

**Motivo:** o domínio apresentado possui três funções claras e não exige
permissões personalizadas por pessoa. Expor caixas de seleção independentes
poderia produzir combinações incoerentes, como prontuário sem acesso ao
atendimento.

**Trade-off:** a solução não oferece papéis customizados nem permissões
granulares. Se a organização precisar de novas funções, a evolução adequada é
modelar permissões nomeadas e políticas testáveis, preservando as regras de
vínculo por recurso.

## 19. Convite emitido pela plataforma e entrega assistida

**Decisão:** o profissional gera o convite na sala e pode copiá-lo ou usar o
compartilhamento nativo do dispositivo; a API não envia mensagens diretamente.

**Motivo:** SMS, e-mail e WhatsApp exigem provedor, consentimento, templates,
tratamento de falha e configuração externa que estão fora do escopo atual.

**Trade-off:** há uma etapa manual antes de o paciente receber o link. A
separação mantém o token de uso único e permite adicionar um canal transacional
posteriormente sem alterar a autorização da sala.
