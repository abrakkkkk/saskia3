# Retomada da auditoria por página — 25/10/2026

## Escopo

Continuação da auditoria incompleta, com revisão isolada de cada `page.tsx` em `src/app` por um subagente distinto (55 rotas: 52 no grupo autenticado e 3 públicas). O subagente deve revisar a lógica da página e seus fluxos de API relevantes; corrigir apenas defeitos demonstráveis, respeitando a arquitetura e o escopo hospitalar; não executar testes/build nem fazer commit. A integração/revisão global fica com o agente principal. Nenhuma validação em produção é feita.

## Fila

| Página | Subagente | Estado |
|---|---|---|
| `admin-config-dashboard` | `page_admin_config_dashboard` | Revisada; rótulo/checkbox acessível corrigido |
| `admin-configuracao` | `page_admin_configuracao` | Revisada; CNPJ/campos/prévia do logo corrigidos |
| `admin-financeiro` | `page_admin_financeiro` | Revisada; sem erro confirmado; API exige ADMIN e escopo hospitalar |
| `admin-hospitais` | `page_admin_hospitais` | Revisada; acesso e redirecionamento coerentes; runtime pendente |
| `admin-procedimentos` | `page_admin_procedimentos` | Revisada; limites de formulário/POST/PUT alinhados |
| `admin-prontuarios` | `page_admin_prontuarios` | Revisada; GET só após sessão ADMIN; labels/limites/accessibilidade alinhados |
| `admin-usuarios` | `page_admin_usuarios` | Revisada; API protege último ADMIN contra corrida serializável |
| `admin` | `page_admin` | Revisada; tickets restritos por ADMIN e hospital; sem defeito confirmado |
| `agenda` | `page_agenda` | Revisada; data local, validação/tenant APIs e mensagens de erro alinhados |
| `almoxarifado` | `page_almoxarifado` | Revisada; persistência de código/subcategoria e saldo inicial corrigidos; migration pendente de DB descartável |
| `banco-sangue` | `page_banco_sangue` | Revisada; guarda tenant, limite, erros e concorrência ajustados; runtime pendente |
| `biblioteca` | `page_biblioteca` | Revisada; sete caminhos locais corrigidos |
| `categorias` | `page_categorias` | Revisada; sessão/loading/erro e RBAC ADMIN sincronizados com API |
| `ccih` | `page_ccih` | Revisada; datas locais, feedback e validação/tenant na atualização |
| `centro-cirurgico` | `page_centro_cirurgico` | Revisada; sem mudança; divergência tela/API em conflito de sala pendente de decisão/modelo |
| `chamados-ti` | `page_chamados_ti` | Revisada; status/prioridade alinhados à API; ação apenas local removida; validação da tela por runtime pendente |
| `chat` | `page_chat` | Revisada; carga por sessão, respostas antigas, acessibilidade e limite da mensagem corrigidos; chatbot externo continua desligado |
| `configuracoes` | `page_configuracoes` | Revisada; recurso indisponível explicitamente; sem defeito confirmado |
| `conta` | `page_conta` | Revisada; hospitalId/campos/perfil/erros do servidor alinhados |
| `cssd` | `page_cssd` | Revisada; transições/validações de lote ajustadas; regra clínica de falha ainda sem decisão |
| `curvas-crescimento/meninas` | `page_curvas_meninas` | Revisada; dangerouslySetInnerHTML removido, links PDF e navegação acessível corrigidos |
| `curvas-crescimento/meninos` | `page_curvas_meninos` | Revisada; injeção de HTML/script removida, PDFs e gráfico faltante incluídos |
| `curvas-crescimento` | `page_curvas_principal` | Revisada; PDF local com nome irregular corrigido e abas acessíveis |
| `dashboard` | `page_dashboard` | Revisada; métricas mock/arquivados/UTI e erros de API corrigidos; IDs repetidos confirmados como categorias agrupadas |
| `equipe-seguranca` | `page_equipe_seguranca` | Revisada; filtro de texto, identidade e transição de encerramento ajustados |
| `exames` | `page_exames` | Revisada; status crítico/enum com migration, tenant/transition/fields e erros de UI alinhados |
| `farmacia` | `page_farmacia` | Revisada; movimentos atômicos, categoria/operador autenticado e validações corrigidos |
| `faturamento` | `page_faturamento` | Revisada; recurso indisponível explícito; API ADMIN/tenant |
| `feedback` | `page_feedback` | Revisada; BUG/validações de resposta/RBAC/privacidade e feedback corrigidos |
| `fichas-auxiliares` | `page_fichas_auxiliares` | Revisada; PDFs existentes e acessibilidade da busca/prévia ajustada |
| `gestao-salas` | `page_gestao_salas` | Revisada em segunda camada; reserva em intervalos não conflitantes, transições e datas locais alinhadas |
| `institucional` | `page_institucional` | Revisada; conteúdo estático, sem defeito confirmado |
| `lembretes` | `page_lembretes` | Revisada; carga por sessão, autoria derivada do servidor, datas locais e acessibilidade corrigidas |
| `manutencao` | `page_manutencao` | Revisada; autoria, datas, erros e transição de OS ajustados |
| `obitos` | `page_obitos` | Revisada; data/autoria/status da certidão e indisponibilidades de persistência alinhados |
| `ouvidoria` | `page_ouvidoria` | Revisada; transições da resposta, sessão, validação e labels alinhados |
| `pacientes-busca` | `page_pacientes_busca` | Revisada; filtros nulos, estados e CSV seguros; API raiz não fornece parte dos campos da busca |
| `pacientes/[id]` | `page_paciente_detalhe` | Revisada; sessão/erros/RBAC e guardas tenant/arquivado em rotas clínicas ajustados |
| `pacientes` | `page_pacientes_lista` | Revisada; validação de entrada, duplicidade por tenant e erros de carga alinhados |
| `planos` | `page_planos` | Revisada; conteúdo informativo, sem defeito confirmado |
| `politicas-privacidade` | `page_politicas_privacidade` | Revisada; página convertida a componente estático sem alterar texto jurídico |
| `ponto` | `page_ponto` | Revisada; tipos de marcação, propriedade de registros e impressão segura corrigidos |
| `receituario` | `page_receituario` | Revisada em segunda camada; ações antes vazias, arquivados/IDs e Escape corrigidos |
| `recepcao` | `page_recepcao` | Revisada; erros de carga/limites/labels e saída única de visitante alinhados |
| `relatorios` | `page_relatorios` | Revisada; datas locais, requests concorrentes e contagem arquivada corrigidos |
| `servico-social` | `page_servico_social` | Revisada; paciente/profissional/status/datas escopados e validados |
| `suporte` | `page_suporte` | Revisada; verificação de senha no servidor, RBAC de arquivamento e falso upload removidos |
| `transporte` | `page_transporte` | Revisada em segunda camada; data/autoria e vínculo paciente-hospital corrigidos |
| `usuario` | `page_usuario_retry` | Revisada; sessão/RBAC, ativos/inativos e reativação alinhados |
| `uti` | `page_uti_retry` | Revisada; APIs de tenant/transições/validação ajustadas, sem automação clínica |
| `utilitarios` | `page_utilitarios_retry` | Revisada; links estáticos sem falha confirmada; acessibilidade/tipagem corrigidas |
| `vacinacao` | `page_vacinacao` | Revisada; PDFs locais, links HTTPS validados e estado de erro Drive corrigidos |
| `/` | `page_root_public` | Revisada; sessão/hospital, erro de login e labels corrigidos |
| `painel-chamadas` | `page_painel_chamadas` | Revisada; carga por sessão e payload reduzido sem CPF |
| `sobre-nos` | `page_sobre_nos_retry` | Revisada; imagens existem; sem defeito confirmado |

## Critérios de fechamento por página

- Registrar subagente e resultado da inspeção de fonte.
- Documentar correções com comportamento esperado derivado da interface, API e schema existentes.
- Distinguir problema corrigido de risco que exige validação com banco sintético/browser; não declarar funcionamento em produção.
- Manter build/typecheck e validação visual/runtime como trabalho global posterior, conforme ambiente disponível.

## Tentativa de validação visual — 25/10/2026

- Tentativa de inventariar navegadores pelo controle integrado retornou `Local browser use is disabled in Work settings`.
- Next dev iniciou em `http://localhost:3000` e foi encerrado ao fim da tentativa.
- A tentativa de selecionar/observar a janela do Chrome pelo controle do Windows expirou na aprovação da ferramenta. Nenhuma navegação, autenticação, formulário ou acesso a dados foi realizado.
- Portanto, **nenhuma das 55 páginas foi validada visualmente no navegador** e nenhuma leitura em Z renderizada foi concluída. Não contornar a configuração de browser; retomar após habilitação explícita do recurso no Work.

## Leitura estática em Z — código/estilos, sem renderização

O Z abaixo descreve a sequência e os riscos inferidos do JSX/CSS; não afirma a aparência final. A leitura usa topo (esquerda→direita), passagem diagonal ao conteúdo e faixa inferior.

| Página | Fatos e problemas de código encontrados | Ajuste feito |
|---|---|---|
| `admin-config-dashboard` | Hierarquia título/ações → aviso → perfis → cartões é coerente. Listas internas têm scroll próprio. Checkboxes estavam invisíveis visualmente também ao foco de teclado; descrição era pequena/clara. | Adicionado foco visível ao slider; descrições escurecidas e ampliadas; paddings de seção reduzidos no mobile. |
| `admin-configuracao` | Campos têm sequência clara e associação de labels. O placeholder do ícone vazio era estilizado por seletor `<i>`, mas a página usa SVG Lucide. Padding fixo reduz área útil em viewport estreito. | CSS agora estiliza SVG da prévia e ajusta padding em telas até 768px. |
| `admin-financeiro` | Página é informativa, sem controles. Ordem textual simples; banner flexível, mas padding horizontal fixo pode reduzir a largura útil. | Nenhum ajuste; risco depende da renderização. |
| `admin-hospitais` | Página redireciona sem renderizar uma interface própria. | Nenhum ajuste; resultado visual da rota destino não validado aqui. |
| `admin-procedimentos` | Cards em grid tinham mínimo fixo de largura; campos do modal não tinham labels associados; modal sem semântica de diálogo e sem Escape. | Colunas agora se reduzem sem exceder container; labels, semântica de diálogo, Escape e foco inicial adicionados; cabeçalho/rodapé adaptam em mobile e fechamento externo bloqueia durante salvamento. |
| `admin-prontuarios` | Modal sem semântica ou Escape; grid podia exceder container estreito; cabeçalho/ações sem wrap. | Semântica, Escape e foco inicial adicionados; grid/modal e cabeçalho/rodapé adaptam a telas estreitas; clique fora não fecha enquanto salva. |
| `admin-usuarios` | Campo de busca dependia de placeholder; erros eram anunciados como status neutro; opacidade do card inteiro diminuía também o conteúdo de contas inativas. | Nome acessível e alerta assertivo; inativos identificados por fundo/borda sem reduzir contraste do texto; foco visível nos botões. |
| `admin` | Há título `h2` sem `main` próprio; controles de modal dependem de `title`; lista vazia pode aparecer antes da primeira carga. A avaliação da ordem renderizada permanece incerta. | Sem mudança nesta rodada; correções exigem conferir estrutura do layout e fluxo de atualização automática. |
| `almoxarifado` | Filtro horizontal não quebra; modais não limitavam altura; card “Todos” parecia interativo apesar de não possuir ação; buscas/controles sem rótulos acessíveis; modais sem diálogo/Escape. | Filtro quebra em telas estreitas; modais rolam dentro do viewport; card sem cursor/hover de ação; labels/nomes, semântica e Escape adicionados; foco visível nos controles. |
| `banco-sangue` | Ordem vertical é simples; tabela possui rolagem horizontal; formulário quebra linhas; controles têm labels. CSS guarda estilos não usados. Aviso explicita limites do fluxo transfusional agregado. | Nenhum ajuste visual; contraste precisa de medição em renderização. |
| `biblioteca` | Sequência banner → atalhos → documentos é clara. `loading` não aparece; botões dependem do Drive sem foco visível local; CSS contém estilos legados. | Sem mudança; estados de Drive foram tratados na rodada funcional; falta validar estado e botões visualmente. |
| `categorias` | Formulário era horizontal sem quebra; ação de exclusão ficava invisível sem hover, em especial touch e foco de teclado. Texto de loading/vazio usa slate-400. | Formulário empilha em mobile; exclusão visível em touch/foco; foco visível, `<main>` e ícones decorativos corrigidos. |
| `cssd` | Seletores CSS não correspondiam às classes JSX nos indicadores, busca e ações de lote; a composição dependia de estilos globais. Busca/rejeição e seleção de abas precisavam de nomes/estado acessíveis. | CSS atende as classes renderizadas; foco, `aria-pressed` e nome acessível de reprovação adicionados. Regra clínica para indicadores reprovados segue pendente. |
| `ccih` | Labels estavam desconectados; busca/filtro sem nome; botão de detalhes/fechar só com ícone; tabelas com overflow oculto e sem scroll horizontal; foco tinha indicação fraca. | Todos os labels agora associados; nomes acessíveis para busca/filtro e botões de detalhes; wrappers de tabela permitem scroll horizontal; foco visível e label KPI escurecido. |
| `centro-cirurgico` | Tabela 7-col em overflow-hidden sem scroll; labels desconectados; ações da linha icon-only; foco removido/sombra muito sutil; métricas 12px #94a3b8 em branco têm baixo contraste potencial. Layout de forms/salas e banner tem breakpoints/wrap. | Correção ainda não feita; revisar próxima rodada. |
| `chat` | Painel lateral width/min-width 320px e container height fixa sem breakpoint; CSS mobile local não importado/incompatível com JSX; busca/mensagem nomeadas e contatos keyboard-friendly, mas inputs removem outline e foco dos contatos sem indicador. | Sem ajuste nesta rodada. |
| `chamados-ti` | Formulário mantém 2 colunas inline sem breakpoint; tabela com width 100% em wrapper de overflow-hidden; descrição truncada em linha sem expansão; campos nomeados e erro anunciado. Foco e contraste dependem do global. | Sem mudança nesta rodada. |
| `conta` | Campos principais têm labels associados e CSS quebra formulário de senha. Foto é Base64 até 1 MB; tela não limpa avatar se API retorna `null`; estado de carga de perfil pouco explícito. | Sem mudança visual. Os pontos de avatar precisam alinhar contrato da API antes de alterar. |
| `farmacia` | Labels dos campos sem associação, busca só por placeholder, modais sem semântica/Escape, tabelas sem scroll móvel. Erros de fetch podem ser apresentados como listas vazias/zeros (confirmado pela ausência de feedback de erro). | Correções pendentes para próxima rodada; overflow/contraste ainda inferidos sem renderização. |
| `feedback` | Grid colapsa para uma coluna no breakpoint; filtros quebram em mobile. Modal não tem semântica de diálogo/Escape/foco; botões de tipo/filtro expõem estado por cor; foco dos inputs remove outline. Contraste de textos claros requer medição. | Sem mudança nesta rodada. |
| `faturamento` | Página informativa sem controles; estrutura de título, cartão de indisponibilidade anunciado como status e texto explicativo é coerente. Sem defeito confirmado no JSX/CSS analisado. | Nenhuma. |
| `fichas-auxiliares` | Tailwind define grade responsiva; folha CSS local aparenta legada e não importada. Prévia PDF tem semântica de modal/Escape, porém não contém foco; botão de preview não individualiza ficha para leitor de tela; cabeçalho pode comprimir em mobile (inferência). PDFs existem, mas abertura não foi renderizada. | Sem mudança. |
| `gestao-salas` | Métricas em texto pequeno/claro; busca e formulário sem labels associados; tabs sem estado programático; foco fraco; tabelas dentro de overflow-hidden; modal sem semântica/Escape/foco. Botões XS têm alvo de toque pequeno. | Sem mudança ainda; riscos de overflow/contraste reais dependem da renderização. |
| `institucional` | Página sem interações; grades reduzem para 1 coluna. Padding `p-16`/`p-12` reduz área útil em mobile (inferência); hierarquia de títulos salta de H1 diretamente a H3 em Missão/Visão/Valores. CSS próprio aparenta legado e não importado. | Sem mudança nesta rodada. |
| `lembretes` | Layout principal responsivo; lista tem 600px e rolagem interna; modal não limita altura/rolagem; filtros não quebram em tela estreita. Labels, nomes de botões, estado de filtros e semântica do diálogo já existem; foco de campo é sutil; opacity 60% reduz contraste em lembretes concluídos. | Sem mudança nesta rodada. |
| `manutencao` | Tabela tem scroll horizontal e formulário labels associados. Foco dos campos é sutil; abas/botões sem foco explícito local/global; métricas 11px em #94a3b8 têm potencial de contraste baixo. | Sem mudança nesta rodada. |
| `obitos` | Labels desconectados; modal mantém 2 colunas em qualquer largura; foco fraco ou sem estilo local; textos auxiliares #94a3b8 sobre branco podem ter contraste baixo. Grids/abas e busca têm wrap/responsividade declarados. | Sem mudança nesta rodada. |
| `pacientes-busca` | Labels sem `htmlFor`/id; ordenação pelo clique no `<th>` não é operável por teclado nem anuncia `aria-sort`; arquivo CSS local não é importado. Tabela tem wrapper de scroll; filtros de mãe/telefone/sexo/endereço não são entregues pela API, achado já registrado na revisão funcional; `Nome/CPF` linha com cursor sem ação própria pode sugerir affordance incorreta. | Sem ajuste visual nesta rodada; campos sem dados de origem exigem decisão da API/modelo. |
| `pacientes/[id]` | Página clínica extensa em 9 abas; vários rótulos não associados e abas sem semântica; status e estilos globais removem outline; grids inline não herdam breakpoints locais e algumas tabelas não têm overflow scroll. Risco alto de foco/legibilidade e compressão, mas sem renderização não afirmar clipping. | Sem ajuste visual nesta rodada devido ao impacto amplo e necessidade de conferir contratos/fluxos clínicos antes de refatorar. |
| `pacientes` (lista) | Tabela 7-col tem overflow hidden sem scroll horizontal; busca com outline none; labels do modal desconectados; paginação/detalhe icons-only sem nome acessível; estilos CSS dos cards não correspondem ao JSX inline. | Sem ajuste visual nesta rodada; precisa revisar tabela e modais em contexto. |
| `planos` | Aviso informativo, banner, cartões auto-fit e seções de tabela com rolagem horizontal. Slot reservado para ícone do banner está vazio; observações em tons cinza/amarelo podem ter contraste baixo. Página sem formulário/controles. Conteúdo comercial estático não foi validado. | Sem mudança. |
| `ponto` | Histórico busca/mês sem nome acessível; abas sem estado programático; foco explícito ausente nas tabs/CTAs e busca remove outline. Tabelas rolam horizontalmente. Conteúdo útil do relógio atualiza a cada segundo; risco de anúncio contínuo é inferência. Padding e botões largos podem comprimir em 320px. Contraste do badge amarelo precisa medição. | Sem mudança nesta rodada. |
| `politicas-privacidade` | Sem formulários. Tabelas com colunas sem wrapper/responsividade; container/padding fixo de 40px; links sem foco específico; conteúdo longo justificado. Regras `footer` globais vazavam o hover/margem para o layout inteiro. Conteúdo jurídico não foi validado. | Seletores de footer agora restritos a `.politica-container`. |
| `receituario` | CSS de impressão ainda tem seletor legado `#abaReceituario`, enquanto JSX usa `#papelReceita`; estilo inline atual implementa seleção de impressão dos adesivos/receita. Abas sem wrap, editor sem foco visível e labels desconectados; botões icon-only na bandeja. | Não alterei nesta rodada; testar impressão/layout depende do browser. |
| `recepcao` | Busca sem nome acessível; campos removem outline; botões × sem nome e modais sem role/aria-modal; modais sem max-height/rolagem; CSS de layout principal majoritariamente inline. | Sem mudança nesta rodada. |
| `relatorios` | CSS responsivo apontava para `.rel-grid` inexistente; gráficos inline tinham mínimo de 450px; tabelas estavam em overflow-hidden sem scroll; seletores de impressão miravam classes ausentes. | Grid de gráficos recebeu classe/css responsivo efetivo; tabelas agora têm scroll e largura mínima em mobile; filtros rápidos/período são ocultos ao imprimir. |
| `servico-social` | Formulário labels associados; busca nomeada; alerta correto; tabela com scroll. Abas sem estado programático; foco dos campos só por borda/sombra; labels métricas pequenas e claras podem ter contraste baixo; banner padding fixo pode limitar mobile. | Sem mudança nesta rodada. |
| `transporte` | Labels associados e formulário responsivo; tabela tem scroll. Tabs sem estado acessível; foco dos campos sutil; tabela sem caption; métricas #94a3b8 sobre fundo claro têm potencial de contraste baixo. | Sem mudança nesta rodada. |
| `usuario` | Tabela overflow-hidden sem scroll; modal não limita altura/rolagem, não é semanticamente dialog; × sem nome, filtros sem aria-pressed, sem foco explícito. Labels e ações principais já acessíveis. | Sem mudança nesta rodada. |
| `suporte` | CSS local não importado; layout Tailwind. Filtros sem wrap/scroll; resumo de ticket tem duas colunas fixas; labels não associados; modais sem semântica/foco explícito, apesar de limite de altura/scroll. | Sem mudança nesta rodada. |
| `uti` | Busca e formulário sem labels programáticos; layout/contraste sem CSS analisado integralmente; mapa pode ficar apertado em mobile (inferência); class visual de estados desconhecidos não definida. | Sem mudança nesta rodada. |
| `utilitarios` | Busca/chips nomeadas e responsivas; diálogo com role/aria-modal/título/Escape, mas sem contenção/restauração de foco nem limite de altura/scroll; CSS local é legado não importado; CTA verde pode ter contraste insuficiente. | Sem mudança nesta rodada. |
| `vacinacao` | Grade Tailwind responsiva e nomes dos botões presentes; foco específico ausente; padding p-8 + padding do layout pode reduzir largura útil em mobile; CSS local legado não importado. Contraste de ícone esmeralda potencialmente fraco. | Sem mudança nesta rodada. |
| `/` | Formulário login compacto, ordem unidade→email→senha→ação clara; labels/foco/alertas já presentes após revisão funcional; desktop 45/55 e painel decorativo escondido em menor largura. Identidade visual dentro do painel de login é escassa; contraste/intervalos intermediários aguardam browser. | Sem mudança nesta rodada. |
| `painel-chamadas` | Rodapé mostrava somente cores/números para tempos de triagem, sem rótulos acessíveis; botão de voz dependia de title. Header, chamada principal, histórico e footer sem breakpoints evidentes, com provável compressão em celulares. Marco do tempo espera usa criação do paciente; regra clínica desse marco requer confirmação. | Rótulos sr-only para cinco categorias, ícones de cor decorativos e aria-label/pressed no controle de voz. |
| `sobre-nos` | Responsividade por breakpoint; hierarquia de títulos tem saltos de H1→H3 e H2→H4; alguns links externos Lattes usam HTTP; possíveis cortes de selos e contraste de cargos são inferências. Imagens existem. | Sem mudança nesta rodada. |
| `dashboard` | Não há h1; estilos específicos da página não são importados; cards aplicam bordas pretas inline que sobrepõem borda esquerda colorida das classes theme; algumas métricas/resumos em flex sem wrap mobile. IDs repetidos foram revistos na rodada funcional como agrupamento intencional de módulos, sem mudança nesta análise. | Sem mudança visual nesta rodada; bordas podem ser decisão explícita e foram mantidas. |
| `equipe-seguranca` | Banner/filtros responsivos em parte, tabela tem scroll. Busca nomeada; tabs têm role/aria-selected, mas sem setas/aria-controls. Um `useCallback([])` lia `sessionStatus` e mantinha valor `loading`, impedindo fetch após autenticar. | Corrigida dependência do callback para `[sessionStatus]`; visão estática agora permite refazer a carga quando sessão muda. |
| `agenda` | Tabela rola horizontal; formulário tem max-height/scroll, modal de ações não limita altura nem scroll. Filtros sem associação, removem outline; opções/fechar icon-only sem rótulos; modais sem semântica/Escape/foco. CSS local não é importado. | Sem mudança nesta rodada. |
| `configuracoes` | Página estática informativa; `main` rotulado por h2; ícone decorativo oculto; sem formulário/controles. `role=status` em mensagem estática é anúncio redundante potencial. | Sem mudança. |
| `exames` | Tabela 7-col em overflow-hidden sem scroll; labels desconectados; modal sem role/aria-modal/nome/foco/Escape; foco removido/sombra sutil; labels KPI e badges com baixo contraste potencial. Grid cards/tab responsivos em parte. | Sem mudança nesta rodada. |
| `curvas-crescimento/meninas` | Grid min 280px; card `<article>` tinha cursor/hover como se fosse clicável, mas só botões Ver/Baixar têm ação. Modal sem focus management, embora tenha semântica/Escape. Botão Baixar verde tem contraste potencialmente baixo. | Removidos cursor e efeito hover que sugeriam clique no card inteiro. |
| `curvas-crescimento/meninos` | Mesmo falso affordance de artigo/card; ações nomeadas, modal sem focus management, botões pequenos e contraste potencialmente baixo; grade min 280px. | Removidos cursor e efeito hover do card na folha CSS importada. |
| `curvas-crescimento` | Banner + seletor com aria-pressed + grade responsiva 1/2/3/4 colunas; controles têm nomes visíveis. Paddings fixos podem reduzir largura útil em mobile (inferência); contraste não medido; funcionalmente, URL/PDF local irregular foi ajustado na rodada anterior. | Sem alteração visual nesta rodada. |
| `ouvidoria` | Formulário labels associados; tabela semântica; estados de erro/loading anunciados. Abas sem semântica programática; botão “Marcar Respondida” pode não bloquear interação repetida durante atualização (validar fluxo). Responsividade e contraste requerem browser. | Sem mudança nesta rodada. |

Leitura estática em Z concluída para as 55 rotas da fila, cada uma com seu subagente designado na revisão funcional original e subagentes de revisão visual nesta continuação. Foram corrigidos apenas defeitos confirmáveis e de baixo risco nesta passada; outros achados estão registrados como pendentes, riscos inferidos ou itens dependentes de decisão clínica/produto. **Nenhuma página foi visualmente renderizada**: composição, contrastes e viewport real aguardam habilitação do browser pelo usuário nas configurações do Work. Não alterar nem contornar essas configurações pelo agente.
