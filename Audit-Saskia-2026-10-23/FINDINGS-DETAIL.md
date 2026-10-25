# Registros de segurança

## Estado de mitigação no source — revisão de 23/10/2026

Os registros abaixo preservam evidências observadas antes das correções. Não interpretar como confirmação de que os defeitos continuam presentes no checkout atual. Foram implementados controles nas quatro rotas legadas e testes sintéticos pós-correção (29 assertions); na API plural de categorias (14 assertions); no proxy de chat (8 assertions); além das correções documentadas para usuários, sessão, rotas filhas de paciente e configuração do dashboard. O build integral final passou no ambiente isolado.

O estado atual exige revisão independente dos diffs e testes de regressão persistentes. Playwright não iniciou por limite de recursos. Sem validação de deployment/produção; nenhum dado real nem provedor externo foi usado. A conciliação individual de cada registro estruturado fica pendente.

Os cinco registros abaixo passaram por verificação final independente do código-fonte e continuam `needs_validation`. Isso confirma os padrões nos handlers, mas não confirma alcançabilidade ou efeito no deployment: não foi possível executar servidor e banco isolados.

1. **`saskia:api-auth-legacy` — handlers legados sem autenticação local**
   - Escopo: `src/app/api/adminlog/route.ts`, `categoria/route.ts`, `procedimento/route.ts`, `ccihregistro/route.ts`.
   - Evidência: GET usa `hospitalId` informado na query; POST passa o body para criação; não há `auth()` no handler. Rotas pluralizadas próximas usam sessão, sem proteger as rotas antigas.
   - Falta: confirmar exposição e controles de borda; validar leitura/escrita com banco descartável.

2. **`saskia:api-chat-proxy` — proxy de IA usa chave do servidor sem autenticação no handler**
   - Escopo: `src/app/api/chat-ia/route.ts`.
   - Evidência: recebe mensagens e parâmetros do caller e encaminha requisição usando `OPENAI_API_KEY`; não verifica sessão.
   - Falta: confirmar chave configurada, exposição, limites externos e quota sem chamar provedor real.

3. **`saskia:patient-child-cross-tenant-write` — registros clínicos filhos sem validar o hospital do paciente**
   - Escopo: `src/app/api/pacientes/[id]/sinais/route.ts`, `timeline/route.ts`, `enfermagem/route.ts`, `nutricao/route.ts`.
   - Evidência: exigem sessão, mas criam registros com paciente indicado na URL sem lookup `{ id, hospitalId }`; o paciente e os filhos têm relações sem restrição composta de hospital.
   - Falta: reproduzir mutação controlada com dois tenants fictícios e verificar leitura posterior.

4. **`saskia:user-role-tenant-escalation` — API plural de usuário aceita campos de cargo/tenant**
   - Escopo: `src/app/api/usuarios/route.ts` e `src/app/api/usuarios/[id]/route.ts`.
   - Evidência: POST exige apenas sessão e usa `cargo` recebido; PUT verifica o alvo no tenant, mas espalha o body na atualização incluindo `cargo`/`hospitalId`. A rota singular ADMIN não protege essas rotas plurais.
   - Falta: confirmar persistência e impacto de sessão com usuários descartáveis de diferentes cargos.

5. **`saskia:dashboard-config-missing-rbac` — qualquer sessão pode gravar configuração compartilhada**
   - Escopo: `src/app/api/config-dashboard/route.ts`, página de configuração e `src/app/api/verify-support-password/route.ts`.
   - Evidência: endpoint grava por hospital da sessão sem validar cargo; a senha destrava a UI, mas não autoriza a chamada. A rota da senha tem fallback fixo quando variável não está definida.
   - Falta: validar comportamento com sessão fictícia e conferir configuração do deployment sem expor segredo.
