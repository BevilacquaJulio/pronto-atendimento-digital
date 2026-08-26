# PAD — Frontend

React 19 + TypeScript + Vite + TanStack Query + React Router + React Hook Form + Zod.
Consome a API NestJS descrita em `../api`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + bundle de produção
npm run lint
npm run test       # Vitest + Testing Library
```

Variáveis de ambiente (prefixo `VITE_`, embutidas no build — nunca coloque segredo aqui):

| Variável              | Para que serve                                             |
| --------------------- | ---------------------------------------------------------- |
| `VITE_API_URL`        | baseURL do cliente axios (`src/lib/api.ts`)                |
| `VITE_PUBLIC_APP_URL` | origem usada ao montar o link de convite do paciente        |

No Docker o frontend chama `https://api.${DOMAIN}`. O nginx ainda faz proxy de
`/api` na origem do app para o serviço `api`, útil se o build usar URL relativa.

---

## Onde mexer em quê

### Estilo

Não existe CSS dentro de componente. Tudo mora em `src/styles/`, e o
`src/index.css` só declara a ordem da cascata:

```
src/styles/
  tokens.css       cor, tipografia, espaçamento, sombra, movimento — comece aqui
  base.css         reset, foco, utilidades globais
  primitives.css   um bloco por componente de src/components/ui
  shell.css        sidebar, topbar, drawer, menu de perfil
  pages/
    login.css      queue.css   patients.css   room.css   admin.css
  motion.css       animação + prefers-reduced-motion (por último de propósito)
```

Regra prática: **para mudar a cara do produto inteiro, mexa só em `tokens.css`.**
A paleta parte de dois hexadecimais fixos — `#11426b` (azul institucional) e
`#00aea9` (teal de acento) — e todos os degraus vizinhos são derivados deles,
para não precisar de opacidade improvisada em estado, fundo e borda.

### Componentes

```
src/components/ui/       primitivos sem regra de negócio
  Button  Select  Modal  ConfirmDialog  ToastProvider  Tooltip
  Alert  Avatar  StatusBadge  DataState  FormField  SearchInput
  Pagination  FilterChips
src/components/brand/    Logo (SVG inline em currentColor)
src/components/layout/   AppShell, SidebarNav, Breadcrumb, navigation.ts
src/hooks/               useDisclosure, useDismissable, useTypeahead, useOnlineStatus
src/features/<recurso>/  api.ts, types.ts, schema.ts, components/, pages/
```

`Select`, `Modal` e `DropdownMenu` são próprios — sem Radix, sem Headless UI.
Motivo: zero dependência nova no build do Docker e controle total do CSS.
O custo é ter que acertar acessibilidade na mão, então os três seguem padrões
ARIA conhecidos e têm teste (`Select.test.tsx`, `AppShell.test.tsx`).

### Onde mora a decisão clínica

Coisas que **não** são de apresentação e por isso não vivem em componente:

| Arquivo                                       | O que define                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| `features/atendimentos/queue-helpers.ts`      | o que é "alta prioridade" (grave **e** em aberto)         |
| `features/atendimentos/rotulos.ts`            | vocabulário de status e risco exibido na tela             |
| `features/prontuario/sinais-vitais.ts`        | faixas de referência de sinais vitais (adulto em repouso) |
| `features/sala/risk-options.ts`               | classificação de Manchester + tempo-alvo                  |
| `features/usuarios/role-options.ts`           | o que cada papel pode fazer (espelho da matriz de acesso) |

A definição de alta prioridade é a mesma no `resumirFila` da API. Se mudar de
um lado, mude do outro — senão o card mostra 3 e a lista devolve 5.

---

## Decisões que valem saber

**Os contadores da fila vêm do backend.** `GET /atendimentos` devolve `resumo`
com contagens do período inteiro, independentes de paginação. Antes a tela
somava os itens da página, então "alta prioridade: 2" queria dizer "2 entre os
10 visíveis" — número errado numa decisão de fila.

**Cards e linhas são links de verdade.** O nome do paciente é uma `<a>` que
cobre o card via `::after` (`.link-card__overlay`). Isso preserva abrir em nova
aba, copiar endereço e a navegação por links do leitor de tela — que um
`onClick` numa `<div>` perde.

**Ação destrutiva passa por `ConfirmDialog`.** Desativar usuário, trocar papel,
encaminhar, encerrar atendimento, finalizar prontuário e regerar convite. O
diálogo lista consequências concretas ("o link já enviado deixa de funcionar"),
nunca o genérico "esta ação não pode ser desfeita" — que o usuário aprende a
ignorar.

**Risco nunca é só cor.** O badge de Manchester sempre traz o rótulo escrito.
Cerca de 8% dos homens têm alguma discromatopsia, e impressão em preto e branco
segue comum em serviço de saúde.

**`<dialog>` nativo nos modais.** Entrega armadilha de foco, top layer e
`::backdrop` de graça. O jsdom não implementa `showModal()`, então há um
preenchimento em `src/test/setup.ts` — a alternativa seria ramificar o
componente e testar um caminho que nunca roda em produção.

**Sem `localStorage` para dado clínico.** O único uso é a preferência de menu
recolhido (`pad:sidebar-collapsed`). Token e dados de paciente ficam em memória.

## Responsividade

Tabela e cartão são markup separado, não tabela reflowada — tabela com
`display: block` perde a associação entre cabeçalho e célula, e o leitor de tela
passa a ler valores sem dizer do que são.

| Largura   | O que muda                                                     |
| --------- | -------------------------------------------------------------- |
| ≥ 1181px  | layout completo, painel da sala ao lado do vídeo               |
| ≤ 1024px  | sidebar vira drawer; painel da sala desce para baixo do vídeo  |
| ≤ 900px   | tabelas viram cartões (fila e usuários)                        |
| ≤ 720px   | toolbar empilha; toasts ocupam a largura da tela               |
| ≤ 560px   | métricas em 2 colunas; formulários em coluna única             |

**A marca é SVG inline, não `<img>`.** `components/brand/Logo.tsx` desenha o
símbolo com `currentColor`, então ele fica branco na sidebar escura e azul no
cartão claro sem `filter: brightness(0) invert(1)` e sem uma segunda arte
invertida. A mesma geometria gera `public/favicon.svg` e os ícones da PWA, para
a marca não divergir entre a aplicação e a tela inicial do dispositivo.
