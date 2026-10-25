# Itens que exigem validação

## Atualização na pausa — 23/10/2026

O bloqueio antigo de ausência total de sandbox está superado para um conjunto delimitado: houve testes sintéticos e build em Docker isolado. Permanecem pendentes: Playwright (Chromium falhou por limite de recursos), auditoria de todas as páginas/APIs, auditoria visual completa, varredura global de emojis, paridade com `SASKIA_T1`, regressões duráveis e revisão independente das mitigações. Nenhuma validação ocorreu em produção.

### Decisão institucional pendente: chatbot e dados clínicos

`/api/chat-ia` encaminha mensagens à OpenAI caso `OPENAI_API_KEY` esteja configurada. Nenhum segredo foi consultado e nenhum pedido ao provedor foi feito. Antes de habilitar com conteúdo de saúde identificável, a organização precisa aprovar fornecedor, finalidade, retenção e tratamento. Na ausência dessa aprovação, a retomada deve manter o recurso desabilitado por padrão e implementar controle operacional default-off.

As fixtures do container eram sintéticas e em `tmpfs`; containers foram parados a pedido do usuário. Refazer fixtures somente com dados sintéticos ao reiniciar.

## Bloqueio de execução

O ambiente atual não consegue impor simultaneamente rede externa bloqueada, ambiente vazio com allowlist, checkout/toolchain somente leitura, escrita somente em scratch e limites explícitos de recursos. Por isso nenhum build, lint, Next, Prisma, Playwright, seed, endpoint ou fixture foi executado. Para retomar, disponibilize runner isolado, cópia descartável, banco de teste com dois hospitais e contas fictícias com papéis diferentes, além de browser Playwright instalado/cacheado. Não envie credenciais de produção.

Os validadores locais dos relatórios também não puderam concluir: ambos recusaram a leitura por falta de proteção OS-level no-follow/nonblocking neste Windows. A checagem de schema permanece pendente.

## Candidatos Wave 2 ainda fora dos cinco registros finais

Esses pontos foram identificados/verificados por fonte nas rodadas Wave 2, mas não passaram pelo ciclo completo de consolidação/validação final e não são apresentados como achados finais:

- Exames: `src/app/api/pacientes/[id]/exames/route.ts` e `src/app/api/exames/route.ts` associam paciente sem verificar o hospital do paciente.
- UTI: handlers aceitam paciente e atualizam estado sem confirmar o tenant do paciente relacionado.
- Estoque: movimentação valida paciente opcional, mas atualiza item de estoque por ID sem tenant.
- Agendamento: PUT busca alvo inicialmente no hospital, mas espalha body completo na atualização por ID.
- Visitantes/transporte/salas/reservas: mutações por ID não impõem escopo de hospital no registro; criação de reserva não valida se sala é do mesmo hospital.
- Admin/hospitais/fatura/Drive: `src/app/api/hospitais/[id]/route.ts`, `hospitais/route.ts`, `hospital/route.ts`, `fatura/route.ts` e `drive/route.ts` foram apontadas na revisão de cobertura para análise individual de verbos, cargo e tenant. Não há disposição final por rota; não inferir impacto implantado.
- T1 DOM XSS: nome salvo em `localStorage` por `SASKIA_T1/ficha-paciente.html` é interpolado em `innerHTML` por `SASKIA_T1/pacientes.html`. Origem/deployment e uso de perfis compartilhados são desconhecidos.
- Credencial legada: há valor literal em `SASKIA_T1/proxy-api.php:17-18`; arquivo é ignorado pelo Git atual. Histórico, validade e uso em deployment não foram verificados. O responsável deve verificar e rotacionar caso tenha sido usada.

## Funcionalidade e visual ainda não verificados

A comparação estática listou fluxos mockados/incompletos, uploads sem persistência, botões em desenvolvimento e 288 ocorrências de emojis em 36 arquivos. O levantamento está no relatório principal. Todas as 55 páginas e 82 handlers ainda não foram exercitados. A revisão renderizada do design (responsividade, hierarquia, espaçamento, contraste, estados vazio/loading/erro/desabilitado e foco de teclado) continua pendente. Direção aprovada: preservar a identidade visual, substituir cada emoji por ícone coerente e padronizar ícones/estados.

O critic final também identificou cobertura ainda ausente para os handlers API restantes, lifecycle amplo de autenticação/sessão/controles de borda, segredos/integrações/uploads e comparação funcional sistemática entre T1 e o app atual. Este encerramento antecipado é explicitamente `incomplete`; esses itens não foram considerados cobertos.

## Atualização de 24/10/2026

Política do runner rejeitou duas tentativas de inicializar o servidor Next local isolado. Nenhum teste HTTP, login ou Playwright foi executado nesta rodada; containers estão parados. Build isolado passou e teste Node do chatbot desativado passou 1/1.

Decisões do usuário: chatbot desligado (sem chave); botões de emergência desativados até haver fluxo definido; evolução UTI e checklist cirúrgico ocultos/desativados até aprovação clínica. Alterações de código cobrem somente chatbot; demais decisões aguardam implementação.

Candidatos de segurança adicionais identificados por fonte: mutações sala/reserva/transporte por ID sem escopo de hospital; rotas de médico/escore/exame podem associar paciente sem conferir tenant. Candidatos funcionais/visuais: relatórios aleatórios, banco de sangue com dados fixos/localStorage e agendamento em desenvolvimento. Não estão confirmados em runtime.

### Reteste de execução — 24/10/2026

Docker aceitou execução de comandos. Build passou com `CIRCLE_NODE_TOTAL=1`; com 15 workers falhou ao criar subprocessos (`EAGAIN`). Teste unitário do chatbot default-off passou 1/1. Servidor, HTTP e Playwright não foram revalidados. Containers foram parados ao fim.

## Nota de continuidade — 24/10/2026

Build passa com 3 workers (`CIRCLE_NODE_TOTAL=4`); valor 2 resulta em 1 worker; 14 workers falham com EAGAIN. Um teste de integração sintético para isolamento de seis rotas foi criado, mas não rodou porque a política bloqueou novamente iniciar o servidor Next em foreground dentro do container. Runtime e DB foram parados. Na próxima sessão, precisa iniciar o servidor manualmente no container ou fornecer runner autorizado; depois executar a integração e continuar as correções. Três agentes foram interrompidos ao atingir o bloqueio; não foram observadas edições paralelas no checkout.


### Retomada WSL — 24/10/2026

Corrigidas no source as mutações cross-tenant de sala, reserva e transporte por ID, a validação de vínculo hospital-paciente nas gravações médica/escore/exame, e a criação de reservas com sala do mesmo hospital. Há regressão sintética em `tests/tenant-isolation.integration.test.mjs`; continua pendente porque o CLI Docker não está disponível no WSL atual (`docker: command not found`) e nenhum runner isolado acessível está configurado. Não executar Next/Prisma/Playwright fora do isolamento exigido.

## Atualização de código/validação — 24/10/2026

- Corrigidos nesta rodada: escala de sinais com parse permissivo; ocupação concorrente de UTI; mutação de estoque com tipo/quantidade inválidos e débito não atômico; risco de cascade ao excluir paciente (agora arquiva, ADMIN do hospital, com consulta/restauração); guardas ausentes de hospital em salas/reservas/exames; mass assignment em várias rotas alteradas.
- Build e typecheck finais passaram dentro de Docker offline, rootfs somente leitura, código e dependências readonly, credenciais sintéticas não válidas para serviços externos. Testes `chatbot-disabled` e `reports-page-contract`: 3 assertions/testes no total passaram.
- `tenant-isolation.integration.test.mjs`: **skipped** nesta execução por falta de endpoint e banco sintético em rede interna. Não considerar isolamento cross-tenant confirmado em execução.
- Risco restante: revisar RBAC de edição e exclusão em outras entidades clínicas; conferir associação e restrições de tamanho nos demais handlers; detectar rotas públicas legadas e políticas de edge/deployment; possível coordenação de estoque sanguíneo concorrente por tipos repetidos não tem constraint única no schema.
- Visual: remoção do emoji foi aplicada em TS/TSX/JS/JSX/CSS da árvore `src` na varredura anterior e repetida por inspeção parcial. Build passou, mas nenhuma tela foi aberta em Chromium/Playwright. Hierarquia, responsividade e fluxos ainda precisam de revisão visual renderizada.
- Paridade T1 e inventário de abas: permanecem incompletos. A revisão cobriu problemas adicionais encontrados nas páginas tocadas, mas não todas as áreas do produto.
