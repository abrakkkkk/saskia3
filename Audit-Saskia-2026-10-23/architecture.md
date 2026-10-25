# Saskia — arquitetura e limites desta execução

## Produto e limites de cobertura

ERP hospitalar multi-hospital com dados de pacientes, prontuários, agenda, prescrições, farmácia/estoque, UTI, centro cirúrgico, atendimento administrativo e administração de usuários. Os papéis declarados são `ADMIN`, `MEDICO`, `ENFERMEIRO_ASSISTENCIAL`, `TECNICO_ENFERMAGEM`, `RECEPCIONISTA`, `FARMACEUTICO` e `OUTROS` (`prisma/schema.prisma:13-21`). Os dados clínicos devem ficar vinculados ao `hospitalId` da sessão, conforme as instruções do repositório.

O checkout atual é `davidkhauan/Saskia`, branch `phase-3-agendamentos-cirurgias-estoque`, commit `15e76df`, com alterações locais preexistentes. Nenhuma delas foi criada nesta auditoria. `SASKIA_T1/` está acessível para comparação, mas é ignorado pelo Git (`.gitignore:46`) e não integra a árvore versionada atual. A correspondência por nomes indica páginas antigas incorporadas como novas rotas/componentes (`ficha-paciente` → `/pacientes/[id]`; `enfbia` → chatbot global; `curvas-meninas`/`curvas-meninos` → `/curvas-crescimento/meninas|meninos`); nomes não equivalentes exigem validação funcional antes de declarar paridade.

## Stack, identidades e controles

Next.js 16.2.6/App Router, React 19.2.4, NextAuth Credentials com JWT de 24h, Prisma 7/PostgreSQL. A instância singleton é `src/lib/db.ts`; sessão e claims ficam em `src/lib/auth.ts`. O layout `src/app/(auth)/layout.tsx` protege páginas, não Route Handlers. Cada API precisa validar sessão, papel e escopo por recurso/hospital no ponto de escrita/leitura.

Entradas relevantes: formulários e `fetch` do browser, rotas de API App Router, arquivos JSON em corpos HTTP, conteúdo editável de receita, mensagens do chatbot, variáveis de ambiente e integração externa com OpenAI/Google Drive. Persistência principal ocorre via Prisma; algumas páginas mantêm dados no `localStorage`. T1 possui páginas HTML/JS e integrações Netlify, mas nenhum deployment ativo foi confirmado.

## Execução e fontes

Há Node/npm, dependências e Playwright em `node_modules`, mas sem configuração de testes ou cache de browser. O sandbox disponível não consegue impor ambiente vazio com allowlist, rede externa bloqueada, checkout read-only, escrita apenas em scratch e limites de recursos. Por isso, nenhum build, lint, servidor, navegador, Playwright, seed, fixture ou endpoint foi executado. Não foi lido `.env`. Esta auditoria usa fonte estática; reachability em deployment, dados, headers, gateway, credenciais e comportamento de renderização continuam sem validação.

## Pontos de partida e seleção de domínios

Começar em `src/app/api/**/route.ts`, `src/app/(auth)/**/page.tsx`, `src/components/chatbot/**`, `src/lib/auth.ts`, `src/lib/session.ts`, `prisma/schema.prisma`, `package.json` e `SASKIA_T1/`. Companions selecionados: HTTP/auth para rotas/sessões; data isolation para multi-tenancy; client-side para armazenamento/renderização; AI/LLM para mensagens/output; cloud/deployment para segredos e configuração; supply-chain para dependências/release. O predecessor contém uma chave literal em `SASKIA_T1/proxy-api.php:17-18`; seu valor não foi copiado. Validade, histórico, rotação e uso em produção não foram confirmados.

Não há ledgers anteriores encontrados. O plano cobre primeiro limites de autorização, isolamento clínico, renderização, IA e segredos/fallbacks; páginas, fluxos funcionais, UI/responsividade, todos os endpoints, paridade T1 e validação runtime continuam requerendo trabalho adicional.
