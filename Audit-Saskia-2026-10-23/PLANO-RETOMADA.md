# Saskia — plano de retomada da auditoria e correções

> Continuação do trabalho autorizado pelo usuário. Executar por etapas, com revisão e evidência antes de cada correção.

**Objetivo:** comparar o checkout `bea67c8` com `SASKIA_T1`, completar fluxos reais, corrigir defeitos funcionais/visuais e verificar limites de autenticação, RBAC e isolamento hospitalar.

**Arquitetura:** revalidar primeiro o source atual e o comportamento em Docker isolado com dois hospitais e dados sintéticos. Depois mapear a paridade de cada tela com APIs/persistência e fazer revisão visual pelo browser. Corrigir em fatias pequenas, cada uma com regressão própria; registrar resultados fora do repositório na pasta Audit.

**Stack:** Next.js 16 App Router, React 19, Tailwind v4, lucide-react, Prisma 7, PostgreSQL, NextAuth v5, Docker e CUA/browser.

**Especificação:** `HANDOFF.md` nesta pasta; requisitos de tenant/RBAC em `C:\Users\abrah\OneDrive\Documents\Saskia\AGENTS.md`.

## Restrições globais

- Todas as leituras e gravações clínicas usam `hospitalId` autenticado; não confiar em tenant, usuário ou papel enviado pelo cliente.
- ADMIN administra apenas o próprio hospital; hospital e primeiro ADMIN são provisionados fora da interface pública.
- Sinais vitais: médico/enfermeiro/técnico; enfermagem: enfermeiro/técnico; nutrição: `OUTROS`; timeline: qualquer profissional autenticado do hospital.
- Não usar dados reais, credenciais de produção nem provedores externos; fixtures e segredos de teste devem ser sintéticos.
- Preservar identidade visual incumbente; substituir emojis por ícones lucide adequados e acessíveis.
- Chatbot permanece desativado por decisão do usuário: não há chave da OpenAI.
- Sem commit, push ou PR sem autorização específica. Preservar alterações existentes e não enviar arquivos de auditoria ou assets que não sejam necessários ao sistema.

---

## Plano A — Segurança e regressões de API

### A1. Rebaseline

**Arquivos:** `src/app/api/**/route.ts`, `src/app/api/**/[id]/route.ts`, `src/lib/auth.ts`, `src/lib/session.ts`, `prisma/schema.prisma`, `.agents/skills/security-audit/coverage-ledger.json`, artefatos em `C:\Users\abrah\OneDrive\Documents\Audit-Saskia-2026-10-23`.

- [ ] Confirmar HEAD, árvore limpa/alterada e fontes de cada commit desde `15e76df`.
- [ ] Inventariar 81 handlers por recurso, método HTTP, autenticação, papel, hospital e entidade consultada.
- [ ] Dividir as 7 unidades antigas em unidades por domínio/rota e marcar registros anteriores como histórico até revalidar no HEAD.
- [ ] Atualizar `architecture.md`, `coverage-ledger.json`, `run-metadata.json` e estado dos achados para o source atual.

### A2. Ambiente e testes de fronteira

**Ambiente:** containers isolados Docker com rede externa bloqueada, app sem rede externa, root filesystem somente leitura, cópia atual do source somente leitura, scratch em `tmpfs` limitado, DB sintético em `tmpfs` e recursos limitados.

- [ ] Gerar cópia atual a partir de arquivos rastreados, excluindo `.env*`, `.git`, `node_modules`, arquivos de segredo, certificados, bancos e o proxy legado que contém segredo literal.
- [ ] Restaurar imagens locais e recriar runtime/Postgres; usar apenas variáveis allowlist e `AUTH_SECRET` sintético.
- [ ] Criar dois hospitais fictícios, usuários sintéticos com cada papel necessário e registros clínicos claramente falsos.
- [ ] Para cada unidade, escrever teste negativo primeiro: sem sessão, tenant divergente, papel proibido, ID de objeto cross-tenant e payload com campos de tenant/autor.
- [ ] Confirmar que os testes falham antes e passam após correções; limpar fixtures com rotina segura no próprio DB efêmero.

### A3. Revalidar controles e corrigir

**Domínios:** autenticação/sessão; usuários e hospital; pacientes e rotas filhas; admin/configuração; agenda/cirurgia/UTI; exames; estoque/farmácia; recepção/transporte/salas/visitantes; fatura/feedback/ouvidoria/drive; upload e conteúdo HTML; rate/resource limits.

- [ ] Revisar handlers de leitura e escrita separadamente, incluindo métodos pouco usados (`PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).
- [ ] Validar `hospitalId` na query final ao banco, incluindo relações indiretas com paciente/hospital; usar update/delete atômico por `id + hospitalId`.
- [ ] Validar papéis no servidor conforme as decisões do usuário; esconder controle na UI não substitui API.
- [ ] Permitir somente campos e transições de estado previstos; validar tipos, tamanhos, enumeradores, números e datas.
- [ ] Corrigir somente falhas demonstradas e acrescentar regressão para cada raiz.
- [ ] Atualizar achados JSON e ledger com fingerprint, evidência atual, teste e blocker específico.

## Plano B — Paridade funcional e dados reais do produto

### B1. Matriz entre sistema atual e T1

**Fontes:** `src/app/**/page.tsx`, `src/components/**`, `src/app/api/**`, `prisma/schema.prisma`, `SASKIA_T1/**` (não abrir nem copiar o conteúdo do `proxy-api.php` que contém segredo literal).

- [ ] Mapear as 55 páginas visíveis para recurso, API, modelo Prisma e funcionalidade equivalente em T1.
- [ ] Rotular cada ação como persistida, apenas UI, mock explícito, indisponível, duplicada ou não correspondente; validar no source, não só por palavras como `mock`/`TODO`.
- [ ] Comparar os fluxos ausentes em ordem de risco: registro clínico, administração de pacientes, agenda/cirurgia, medicação/exames, depois operações administrativas.
- [ ] Manter dados clínicos e financeiros reais fora de `localStorage`, fixtures estáticas e arrays locais; persistir via API autenticada e tenant-scoped.
- [ ] Implementar uma funcionalidade ausente por tarefa, começando por teste de fluxo/API sintético que demonstre o requisito e sua persistência.
- [ ] Quando requisitos de produto ou fluxo clínico não puderem ser inferidos com segurança, registrar pergunta concreta ao usuário antes de escolher regra clínica.

## Plano C — UI, acessibilidade e inspeção visual

### C1. Revisão renderizada

**Ferramentas:** browser/PC autorizado pelo usuário; Impeccable `detect --json`; axe ou verificações equivalentes se já disponíveis no ambiente.

- [ ] Criar conta/sessão sintética local, iniciar app isolado e verificar login, dashboard, navegação e páginas por perfil.
- [ ] Fazer passagens de desktop e viewport móvel; salvar capturas sem dados pessoais e registrar overflow, contraste, estados vazios, foco, labels e alvos de toque.
- [ ] Abrir e testar ações principais somente com fixtures sintéticas; marcar recursos sem ação/backend em vez de simular sucesso.
- [ ] Verificar os 31 arquivos inicialmente encontrados com caracteres emoji; substituir símbolos visuais por lucide-react, mantendo texto semanticamente claro e acessível.
- [ ] Corrigir layouts quebrados por página ou componente compartilhado, preservando a identidade incumbente e sem alterar regras clínicas junto com estética.
- [ ] Remover botões fake, badges/estados de presença falsos e mensagens de sucesso sem persistência; confirmar que o chatbot está indisponível de forma honesta.

### C2. Verificação visual pós-correção

- [ ] Repetir as mesmas rotas e viewports; comparar com as capturas iniciais.
- [ ] Executar uma vez o detector Impeccable sobre os arquivos de UI alterados e conferir cada aviso manualmente.
- [ ] Rodar lint direcionado, build isolado e smoke das ações afetadas; registrar bloqueios ambientais sem marcar teste como sucesso.

## Fechamento e estado de entrega

- [ ] Revisar regressões de todos os domínios alterados, TypeScript, lint, build e navegação visual.
- [ ] Executar os validadores de findings e coverage; corrigir formato ou manter execução `incomplete` com razão precisa.
- [ ] Atualizar `REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`, `HANDOFF.md`, `findings.json`, `coverage-ledger.json` e `run-metadata.json`.
- [ ] Conferir `git diff`, arquivos rastreados, segredos acidentais e escopo mínimo; não publicar nada sem autorização.
