<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DIRETRIZES DE COMUNICAÇÃO

- Respostas em pt-BR, diretas, sem preâmbulos.
- Listas curtas. Sem fechamento prolixo.

---

# CONTEXTO E DIRETRIZES DO PROJETO SASKIA

## 1. Domínio e Arquitetura
- **Domínio:** Sistema de Gestão Hospitalar e Clínica (ERP Clínico/Administrativo).
- **Multi-Tenancy Obrigatório:** Todas as entidades e operações clínicas são vinculadas a um `hospitalId`. Nunca execute queries de dados sensíveis sem associar ou validar o `hospitalId` da sessão.
- **Controle de Acesso (RBAC):** Baseado no enum `CargoUsuario` (`ADMIN`, `MEDICO`, `ENFERMEIRO_ASSISTENCIAL`, `TECNICO_ENFERMAGEM`, `RECEPCIONISTA`, `FARMACEUTICO`, `NUTRICIONISTA`, `ASSISTENTE_SOCIAL`, `OUTROS`). A matriz cargo × permissão vive só em `@/lib/permissions`; rotas de API usam `exigir(permissao)` de `@/lib/api-guard` e o menu vem de `@/lib/navigation`. Nunca compare cargo por string solta. **O ADMIN do sistema tem acesso total a tudo, ver e agir (decisão do dono, indiscutível):** `pode()` devolve `true` para ADMIN em qualquer permissão. Não crie regra que exclua o ADMIN.
- **Emergência (pânico e PCR):** botões no cabeçalho para todos os cargos; `POST /api/emergencias` (aciona), `GET` (alertas ativos, todos os logados e a TV), `PATCH /api/emergencias/[id]` (encerra: médico, enfermagem, ADMIN). Faixa em `EmergenciaAlertas` (layout logado) e no painel de TV. Pânico = algo muito grave no hospital; PCR = parada cardiorrespiratória.

## 2. Padrões de Stack e Código
- **Next.js 16 + React 19:** Utilizar App Router, Server Actions e Route Handlers sob `src/app`.
- **Estilização:** TailwindCSS v4 com ícones Line Awesome (`<i className="las la-...">`) na maior parte das telas e `lucide-react` em páginas mais novas; ao tocar uma tela, mantenha a família que ela já usa. Componentes compartilhados de página (PageHeader, StatCard, Tabs, Panel, EmptyState etc.) ficam em `@/components/ui`.
- **Banco de Dados (Prisma 7):** Sempre importar a instância singleton de `@/lib/db` (`import { prisma } from '@/lib/db'`). Nunca crie instâncias de `PrismaClient` avulsas.
- **Autenticação (NextAuth v5):** Em rotas de API, obter o ator com `exigir()` de `@/lib/api-guard` (valida sessão, permissão e `hospitalId`); em páginas, use `auth()` de `@/lib/auth`. Senhas: só bcrypt via `@/lib/password` (mínimo de 12 caracteres). Credenciais autenticam com `email`, `senha` e `hospitalId`.

## 3. Design e interface: skill Impeccable (OBRIGATÓRIA)
Toda tarefa que cria, altera, revisa ou audita interface (`src/app/**/page.tsx`, `src/components/**`, qualquer `.css`, textos de UI, login, menu, rodapé, dashboard) **passa pela skill `impeccable`** (`.claude/skills/impeccable/SKILL.md`). Sem exceção para ajustes pequenos.
- **Antes de editar UI:** ler `PRODUCT.md`, `DESIGN.md` e `.claude/skills/impeccable/reference/craft-floor.md`; depois carregar o playbook do comando (`reference/<comando>.md`).
- **Comando por tipo de tarefa:** `audit` (qualidade técnica, acessibilidade, responsivo), `critique` (revisão de UX), `polish` (passe final antes de publicar), `layout`, `typeset`, `clarify` (textos), `adapt` (telas), `harden` (estados vazios, erro, limites), `distill` (reduzir verbosidade).
- **Usar de forma autônoma:** invocar sem esperar pedido. Toda página nova ou alterada recebe `audit` e `polish`; entrega de UI só termina com verificação no navegador, desktop e celular.
- **Fonte de verdade visual:** `DESIGN.md`. Nunca criar estilo novo de botão, cartão, cabeçalho ou tabela por página; reutilizar `@/components/ui`. A identidade (gradiente azul-marinho, logo, Inter) só muda por pedido explícito do dono.
- **Modo de contingência (decisão do dono do repositório):** o launcher/binário do Impeccable (`scripts/impeccable`, hooks do detector e modo `live`) **não está instalado** por não ser auditável. Ao ler o aviso de "launcher indisponível" do Setup, não rodar nada: ler `PRODUCT.md` e `DESIGN.md` diretamente e seguir os passos 2 e 3 do Setup. Para habilitar o detector, o dono precisa aprovar o download do binário.
- Atualizar `DESIGN.md` quando o sistema visual mudar (`document`).
