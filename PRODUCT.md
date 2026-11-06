# Product

<!-- impeccable:product-schema 1 -->

> Escrito de forma autônoma a partir do repositório e das decisões do dono nesta auditoria. Itens marcados **[inferido]** não foram confirmados em entrevista; corrigir quando houver divergência.

## Platform

web

## Users

Equipes de um hospital em operação real, em pt-BR, usando o sistema durante o plantão:
médicos, enfermeiros assistenciais, técnicos de enfermagem, recepcionistas, farmacêuticos, nutricionistas, assistentes sociais, administradores do hospital e demais colaboradores (cargo `OUTROS`, incluindo vigilância).
Trabalham em pé, com pressa e muitas interrupções. **Desktop (recepção, posto de enfermagem) e celular/tablet (equipe em movimento) têm peso parecido**: toda tela precisa ser boa nos dois (confirmado pelo dono).
O painel de chamadas (`/painel-chamadas`) roda em TV, lido a distância.
Clientes: **hospitais privados de médio porte e rede pública/prefeituras** (confirmado). A linguagem e os módulos precisam servir aos dois.

## Product Purpose

Saskia Saúde Integrada é um ERP hospitalar e clínico multi-tenant: cada hospital (`hospitalId`) vê somente os seus dados.
Cobre jornada do paciente (recepção, triagem, atendimento, internação, alta, óbito), prescrição, exames, UTI, centro cirúrgico, banco de sangue, farmácia, almoxarifado, CSSD, CCIH, serviço social, operação (manutenção, transporte, salas, segurança), comunicação interna e administração.
Sucesso: o profissional faz a tarefa certa rápido, sem erro clínico, e cada cargo só enxerga e altera o que lhe cabe.

## Positioning

Plataforma única, em português, desenhada para a rotina de hospitais brasileiros privados e públicos, com controle de acesso por cargo, trilha de auditoria e conformidade com a LGPD desde a base **[inferido]**.

## Operating Context

- Cada hospital opera um tenant; o Hospital Geral Alfa é o hospital de **teste** (sem dados reais).
- Acesso por cargo: a matriz está em `src/lib/permissions.ts`; o menu por cargo em `src/lib/navigation.ts`. A interface nunca deve oferecer ação que o cargo não pode executar.
- Tarefas em que erro ou lentidão da tela mais custa (confirmado): **triagem e classificação de risco, prescrição e medicação, UTI/centro cirúrgico/banco de sangue, recepção e cadastro**. Estado, criticidade, alergia e prazo precisam ser lidos de relance; na recepção cada clique a mais atrasa a fila.
- Mantido por uma equipe pequena (dono do projeto e Anaylaa, parte fundamental do time).

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, Tailwind v4 mais CSS por página, Prisma 7 com Postgres (Neon), NextAuth 5. Deploy na Vercel.
- Dois conjuntos de ícones convivem: Line Awesome (`las la-*`) na maior parte e `lucide-react` em telas mais novas.
- Decisões do dono que a interface deve respeitar:
  - o chatbot de IA está desligado e removido;
  - botões de emergência, evolução de UTI e checklist cirúrgico ficam bloqueados até aprovação clínica;
  - a identidade visual atual (fundo azul-marinho, cartões brancos, logo Saskia) é mantida.
- Terminologia: Paciente, Prontuário, Evolução, Triagem, Classificação de risco (Manchester), UTI, CSSD, CCIH, Óbito, Evasão, Transferência.

## Brand Commitments

Nome "Saskia Saúde Integrada", logo em `public/images/logo.png`, parceiros Uniforpar e EnfBia no rodapé. Fonte Inter. Paleta azul-marinho com acentos por área (ver DESIGN.md). O dono pediu explicitamente: **não alterar a identidade visual**, apenas refinar; e já reprovou excesso de verbosidade e cartões/ícones grandes demais.

## Evidence on Hand

Dados reais de pacientes: nenhum no ambiente de teste. Não inventar métricas, depoimentos nem números de hospitais clientes.

## Product Principles

1. Segurança do paciente antes de estética: estado crítico nunca depende só de cor.
2. Leitura de relance: rótulos curtos, números grandes, detalhe sob demanda (tooltip ou tela interna).
3. Cada cargo vê só o que pode usar; ação indisponível não aparece.
4. Uma tela, um padrão: cabeçalho, cartões, tabelas, formulários e estados vazios iguais em todos os módulos.
5. Português claro e direto; sem jargão técnico na interface.

## Accessibility & Inclusion

Mínimo WCAG 2.2 AA (contraste 4,5:1 no texto normal), alvos de toque de pelo menos 40 px no celular, navegação por teclado com foco visível, `prefers-reduced-motion` respeitado. Uso em celular, tablet e TV a distância (celular confirmado).
