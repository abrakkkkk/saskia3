# Auditoria Saskia — relatório parcial

## Atualização de execução — pausa em 23/10/2026

**Estado:** `incomplete`. Esta atualização substitui as afirmações de que nenhum runtime/teste ocorreu: foi usado ambiente Docker isolado e sintético; a compilação completa do estado final passou (Next 16.2.6 / Prisma 7.8.0; TypeScript e 102 páginas estáticas).

Quatro APIs legadas tiveram controles adicionados após reprodução prévia de acesso anônimo/cross-tenant: 29 assertions sintéticas passaram. A API plural de categorias teve controles ADMIN/tenant e 14 assertions passaram. O proxy de chat teve autenticação, limites e validação; 8 assertions passaram, sem chamada ao provedor externo. Mitigações para usuários, sessão, rotas filhas de pacientes e configuração do dashboard também têm verificações sintéticas parciais. Rever código e testes ao retomar; resultados pré-correção são evidência histórica e não descrevem necessariamente o estado atual.

Playwright não conseguiu iniciar Chromium por limite de recursos; a interface não foi validada no browser. Auditoria funcional, visual, paridade com `SASKIA_T1`, varredura completa de emojis e cobertura de APIs/páginas seguem incompletas. Lint geral anterior: 260 erros e 144 avisos em 115 arquivos; lint direcionado final não foi repetido após os últimos ajustes de UI. Nada foi commitado ou enviado.

O chatbot pode encaminhar mensagens à OpenAI quando `OPENAI_API_KEY` existir. Aprovação institucional de fornecedor, retenção e tratamento de dados de saúde ainda não foi confirmada; nenhum segredo foi consultado e nenhum pedido ao provedor ocorreu. Validar política e manter desabilitado para dados clínicos identificáveis até decisão autorizada.

**Estado:** `incomplete` — revisão estática; validação runtime bloqueada pela falta de sandbox isolado compatível.

## Escopo e confiança

Foram examinados o app Next.js atual, rotas API, autenticação, partes do schema Prisma, fontes de UI e o predecessor local `SASKIA_T1/`. O checkout estava sujo antes desta execução; não alterei arquivos do produto, não fiz commit e não publiquei nada. A comparação de nomes encontrou correspondências plausíveis para `ficha-paciente`, `enfbia` e curvas de crescimento, mas isso não comprova paridade de comportamento.

Esta não é uma certificação de segurança nem prova de comportamento implantado. Há cinco candidatos de segurança com evidência estática e validação independente de fonte; todos permanecem `needs_validation` porque não foi possível executar testes com dados fictícios em ambiente isolado e porque controles fora do repositório não são conhecidos. Não atribuí severidade a esses candidatos.

## Achados prioritários

1. **Rotas legadas sem autenticação local:** `adminlog`, `categoria`, `procedimento` e `ccihregistro` leem por `hospitalId` escolhido na query e aceitam JSON diretamente na criação. O risco concreto depende de estarem alcançáveis sem controle de borda.
2. **Proxy de IA sem autenticação local:** `/api/chat-ia` encaminha conteúdo e parâmetros do caller usando credencial do servidor, podendo consumir quota/cobrança caso a chave exista e a rota esteja acessível.
3. **Escrita clínica sem verificar tenant do paciente:** quatro rotas filhas aceitam ID de paciente na URL e gravam sem comparar o paciente ao hospital da sessão.
4. **Escalada de privilégio em usuários:** a API plural não exige ADMIN; criação aceita cargo e PUT aceita campos arbitrários, inclusive hospitalId depois da checagem inicial de tenant.
5. **RBAC ausente na configuração compartilhada do dashboard:** o endpoint de gravação exige sessão, mas não papel ADMIN; a senha da tela não é vinculada ao endpoint. O fallback fixo na rota de senha também depende da configuração de deployment.

Os registros completos, caminhos de validação e correções mínimas estão em [FINDINGS-DETAIL.md](FINDINGS-DETAIL.md) e [NEEDS-VALIDATION.md](NEEDS-VALIDATION.md).

## Falhas funcionais/visuais encontradas por fonte

- **Dados/fluxos de demonstração ou incompletos:** inicialização financeira em `localStorage`; feedback/relatórios com dados de fallback; UTI com métricas zeradas/mockadas e evolução marcada como simulada; botão de novo agendamento informa “em desenvolvimento”. Precisa-se validar o banco e os fluxos antes de remover os fallbacks para evitar apagar informação legítima.
- **Upload sem fluxo completo:** ficha do paciente mostra input de documento sem handler; suporte lê anexos no cliente, mas a chamada de criação de ticket não envia esses arquivos.
- **Controles que falham silenciosamente:** o frontend de configuração do dashboard apresenta sucesso sem verificar `response.ok`; vários formulários usam `alert` e chamadas com catch superficial. A varredura inicial também encontrou usos de `localStorage` para configuração/dados administrativos e caminhos com dados fictícios.
- **Emojis:** a varredura Unicode da interface ativa encontrou 288 ocorrências em 36 arquivos de `src/app`, `src/components` e `src/lib`. A direção aprovada é manter a identidade visual atual, substituir emojis por ícones consistentes e manter rótulos de status legíveis por texto/cor. O inventário inclui alertas, botões de emergência, triagem, escala de dor, suporte e controles que inserem símbolos em receitas.
- **Visual:** a revisão ainda não viu a interface renderizada. O passe planejado cobre responsividade, hierarquia, espaçamento, contraste, estados vazio/loading/erro/desabilitado, foco por teclado e consistência entre módulos. Nenhuma conclusão visual foi inventada sem render.

## Limites e cobertura pendente

O inventário local encontrou 55 arquivos `page.tsx` e 82 arquivos de handlers API; quatro unidades têm candidatos de segurança e três unidades Wave 2 estão bloqueadas/incompletas. A rodada não cobre todas as combinações de superfície, módulo e ciclo de vida. Permanecem pendentes: revisão funcional de todas as abas, paridade detalhada com T1, testes de autorização/tenant em banco descartável, lint/build, testes Playwright/responsivos, análise de deployment/headers/gateway e conferência de todas as ações sem backend.

O sandbox disponível não consegue impor simultaneamente: ambiente vazio com allowlist, rede externa bloqueada, checkout e toolchain somente leitura, escrita restrita a scratch e limites explícitos de processo/CPU/memória/disco/tempo. Não rodei Next.js, Prisma, build, lint, Playwright, seed, endpoint ou fixture. Não li `.env`, não usei contas reais e não chamei provedores.

Os dois validadores dos artefatos foram tentados, mas recusaram a leitura porque o ambiente não oferece proteção OS-level no-follow/nonblocking. Não contornei essa proteção; a validação sintática/schema permanece pendente.

Há uma chave de API literal em `SASKIA_T1/proxy-api.php:17-18`. O arquivo está em `SASKIA_T1/`, ignorado pelo Git atual; não determinei se o segredo esteve em histórico/deployment ou se continua válido. O responsável deve verificar fora deste chat e revogar/rotacionar se a chave tiver sido usada em qualquer ambiente.

## Próximos passos bloqueados

## Fechamento da auditoria parcial

Os cinco registros atuais passaram por verificação independente final de fonte e permanecem `needs_validation`; isso não equivale a confirmação do comportamento em runtime. A crítica Wave 2 encontrou lacunas adicionais e candidatos clínicos/administrativos, listados em [NEEDS-VALIDATION.md](NEEDS-VALIDATION.md), sem serem tratados como achados finais. O estado do run é `incomplete`. Nenhuma alteração foi feita no produto; a verificação visual continua pendente de runner seguro.

O critic final confirmou que ainda faltam revisão endpoint a endpoint dos handlers, disposições por rota para hospitais/fatura/Drive, revisão funcional das 55 páginas e comparação com T1, renderização visual, validação ampla de autenticação/controles de borda e revisão de segredos/integrações. O encerramento fica `incomplete` por esses limites, pelo runner indisponível e porque os validadores dos artefatos não puderam ler os arquivos com proteção no-follow/nonblocking neste Windows.

Para continuar com correções verificadas, é necessário disponibilizar um runner isolado conforme acima, uma cópia descartável do projeto e banco de testes com dois hospitais e usuários fictícios de papéis diferentes. O teste de UI precisa de browser instalado/cacheado e dados de teste. Não envie credenciais de produção. Depois da configuração, a ordem é: validar os candidatos, corrigir os controles de segurança, completar fluxos sem persistência real, remover mocks com fonte de dados validada, substituir emojis por ícones, ajustar o visual com a identidade aprovada e exercitar as telas críticas em Playwright.

## Atualização de implementação e validação (23/10/2026)

O relatório foi inicialmente escrito antes de haver runtime disponível. Depois, houve execução em containers descartáveis: build Next/Prisma passou; testes HTTP sintéticos para tenant/RBAC/configuração/faturas/usuários foram executados. A tela de gestão de usuários e as rotas plurais foram reescritas; sete testes sintéticos das APIs novas passaram. Um achado adicional foi corrigido em `src/lib/auth.ts`: cada leitura de sessão agora confirma que usuário e hospital seguem ativos e atualiza o cargo, reduzindo o risco de uma sessão JWT de 24 horas preservar acesso após desativação/rebaixamento. A validação central dessa nova consulta ainda não foi exercitada no runtime.

O Chromium Playwright não iniciou devido ao limite de processos/threads do container (`pthread_create: Resource temporarily unavailable`), então não há evidência de interação real pelo browser para a tela nova. O lint permanece inconclusivo. A auditoria geral, paridade com `SASKIA_T1`, revisão das páginas e disposição dos achados restantes continuam incompletas. Achados/correções anteriores nesta atualização devem ser lidos como estado atual, não como certificação de segurança.

## Continuação de 24/10/2026

O build isolado do source atual passou. Nesta rodada, foram feitas alterações locais para manter o chatbot permanentemente desligado por decisão do usuário: componente removido do layout, endpoint protegido com `503`, e teste unitário Node passou 1/1 mesmo com chave sintética definida. Nenhuma chave real foi consultada ou chamada. Ainda não foram implementadas as telas desativadas de emergência/UTI/cirurgia.

A auditoria não avançou para HTTP ou inspeção renderizada: a política do runner rejeitou duas tentativas de iniciar o servidor Next no container. Os containers foram parados. Não houve teste Playwright. O estado segue incompleto; falta disponibilizar uma forma autorizada de iniciar o servidor local isolado. Ver candidatos adicionais e decisões clínicas em NEEDS-VALIDATION e HANDOFF.

## Reteste em 24/10/2026

Runner Docker aceitou comandos. O teste unitário do chatbot desativado passou (1/1); build Next/TypeScript passou com 1 worker e gerou 102 páginas estáticas. Com 15 workers, Next falhou com `EAGAIN` ao criar processos. Não houve teste HTTP, servidor, login ou Playwright nesta rodada. Containers foram parados. As decisões clínicas sobre emergência, evolução UTI e checklist cirúrgico ainda aguardam implementação/fluxo aprovado.

## Atualização corretiva da execução — 24/10/2026

Esta atualização substitui o status de ambiente/testes anterior: Docker Engine foi instalado e verificado no WSL, com Node 22 em container de validação. O build final Next 16.2.6 / Prisma 7.8.0 concluiu com sucesso: compilação, TypeScript interno, geração das 103 páginas estáticas e traces. `tsc --noEmit` também passou separadamente no mesmo código. Foram executados três testes Node e passaram; um teste de integração tenant foi pulado por não haver `AUDIT_BASE_URL`/banco sintético conectado. Não houve servidor HTTP, Playwright ou revisão visual renderizada.

Alterações de produto nesta rodada incluem: agenda funcional com status Prisma corretos; relatórios com dados agregados tenant-scoped sem mocks; banco de sangue limitado a contagens persistidas e sem fluxo transfusional simulado; anexos clínicos sem falso sucesso; sinais vitais com parsing estrito; transição concorrente de leito UTI condicional/serializável; arquivamento reversível em vez de cascade delete; movimentação de estoque validada e atômica; guardas de hospital nas APIs de salas, reservas e exames. Decisões anteriores de emergência, evolução UTI, checklist cirúrgico e chatbot permanecem respeitadas.

A auditoria geral continua `incomplete`: não houve percurso Playwright, visual desktop/mobile, teste HTTP de tenant com banco, comparação de paridade completa com `SASKIA_T1`, nem cobertura integral dos 55 pages e handlers. Lint geral tem achados preexistentes anotados; não foi repetido globalmente. Não é certificação para produção. Nenhum commit/push/PR.

### Fechamento visual e de build — 24/10/2026

Build de produção passou com webpack offline e 103 rotas. TypeScript independente passou. Três testes unitários/contratuais passaram e um teste de integração foi pulado sem banco/API. O detector Impeccable 4.7.0 foi executado uma vez em 11 arquivos UI e apontou cinco barras laterais coloridas. Foram trocadas por linhas superiores discretas; não foi repetido o detector após essa alteração pequena. Continua pendente inspeção real em browser/Playwright e revisão visual responsiva.

## Estado de entrega do código — 24/10/2026

As correções acumuladas foram salvas localmente em `main`, commit `5c360cdd1f52720b910a0b29c842522c7cb244ae` (`fix: harden tenant isolation and core workflows`), contendo 123 arquivos. O commit ficou local e o working tree estava limpo. O envio aos repositórios `davidkhauan/Saskia` e `abrakkkkk/saskia3` continua pendente; portanto, não considerar os remotos atualizados. Na retomada, conferir divergências antes de enviar, sem force push. A auditoria geral segue incompleta; não houve validação HTTP/Playwright visual nesta rodada. Ver detalhes e retomada em HANDOFF.md.


### Trabalho ainda pendente

- Enviar o commit local aos dois repositórios e confirmar o estado remoto.
- Executar o teste de integração de isolamento tenant com servidor e banco sintéticos conectados; ele existe, mas ainda não foi executado nessa configuração.
- Validar por navegador/Playwright todas as páginas, abas, permissões e estados visuais em desktop e mobile.
- Completar a comparação funcional com `SASKIA_T1` e registrar as diferenças intencionais.
- Completar a revisão de todos os handlers e achados remanescentes, corrigindo o que os testes confirmarem.
- Fazer inspeção visual renderizada completa e concluir a remoção/substituição de emojis por ícones.
- Repetir build, testes e migrations em ambiente descartável após a integração final.

Até concluir essas etapas, a auditoria e a validação para uso real permanecem incompletas. Chatbot, controles de emergência e fluxos clínicos pendentes continuam desativados conforme as decisões registradas.
