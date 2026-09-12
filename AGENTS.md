<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PROTOCOLO OBRIGATÓRIO DE EXECUÇÃO (TODAS AS SESSÕES)

Em 100% das sessões, você DEVE seguir e acionar as skills e regras abaixo:

1. **Prioridade de Estilo e Comunicação:** Seguir rigorosamente `i-have-adhd` em todas as respostas (sem preâmbulos, respostas diretas, estimativas de tempo, listas curtas, pt-BR).
2. **Início e Seleção de Skills:** Invocar `using-superpowers` no início de qualquer tarefa para determinar o fluxo correto antes de agir.
3. **Design e Criação:** Para novas telas, componentes ou mudanças visuais, invocar obrigatoriamente `brainstorming`, `ui-ux-pro-max` e `design-system`.
4. **Erros e Bugs:** Ao encontrar qualquer erro ou comportamento inesperado, invocar `systematic-debugging` antes de propor ou tentar qualquer correção.
5. **Planejamento e Execução:** Para tarefas de múltiplos passos, usar `writing-plans` seguido de `executing-plans` ou `subagent-driven-development`.
6. **Verificação Obrigatória:** Antes de declarar conclusão ou fazer commit/push, rodar `verification-before-completion` (evidências reais de build/testes).

---

# CONTEXTO E DIRETRIZES DO PROJETO SASKIA

## 1. Domínio e Arquitetura
- **Domínio:** Sistema de Gestão Hospitalar e Clínica (ERP Clínico/Administrativo).
- **Multi-Tenancy Obrigatório:** Todas as entidades e operações clínicas são vinculadas a um `hospitalId`. Nunca execute queries de dados sensíveis sem associar ou validar o `hospitalId` da sessão.
- **Controle de Acesso (RBAC):** Baseado no enum `CargoUsuario` (`ADMIN`, `MEDICO`, `ENFERMEIRO_ASSISTENCIAL`, `TECNICO_ENFERMAGEM`, `RECEPCIONISTA`, `FARMACEUTICO`, `OUTROS`).

## 2. Padrões de Stack e Código
- **Next.js 16 + React 19:** Utilizar App Router, Server Actions e Route Handlers sob `src/app`.
- **Estilização:** TailwindCSS v4 com ícones de `lucide-react`.
- **Banco de Dados (Prisma 7):** Sempre importar a instância singleton de `@/lib/db` (`import { prisma } from '@/lib/db'`). Nunca crie instâncias de `PrismaClient` avulsas.
- **Autenticação (NextAuth v5):** Obter sessão através de `@/lib/auth` ou `@/lib/session`. Credenciais autenticam com `email`, `senha` e `hospitalId`.
