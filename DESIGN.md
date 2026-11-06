---
name: Saskia Saúde Integrada
description: ERP hospitalar em azul-marinho, com cartões brancos compactos e acentos de cor por área assistencial.
colors:
  navy-night: "#051024"
  navy-deep: "#0a1f44"
  navy-royal: "#11235a"
  blue-brand: "#1e3a8a"
  blue-action: "#3b82f6"
  blue-mist: "#bfdbfe"
  surface: "#ffffff"
  surface-muted: "#f1f5f9"
  line: "#e2e8f0"
  text: "#0f172a"
  text-muted: "#475569"
  on-dark: "#f8fafc"
  on-dark-muted: "#cbd5e1"
  success: "#15803d"
  warning: "#b45309"
  danger: "#b91c1c"
  info: "#1d4ed8"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  kpi:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  base: "8px"
  card: "12px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.blue-brand}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.base}"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "12px 14px"
---

# Design System: Saskia Saúde Integrada

> Escrito em modo de varredura a partir de `src/app/globals.css`, `dashboard.css` e das telas. A "Estrela-guia" e a linguagem descritiva são propostas **[inferidas]**; o dono pode revisá-las.

## Overview

**Creative North Star: "A Sala de Controle Clara"**

Um painel de plantão: fundo azul-marinho profundo que recua, cartões brancos que carregam a informação, e uma cor de acento por área (assistência, críticos, apoio, operação, gestão) para o olho achar o setor sem ler.
A densidade é média e compacta: poucos pixels de decoração, números grandes, rótulos curtos.

**Key Characteristics:**
- Fundo em gradiente azul-marinho fixo; todo conteúdo legível vive sobre superfícies claras ou texto claro.
- Acento por área na borda do cartão, nunca como fundo inteiro.
- Raio de 8 px nos controles e 12 px nos cartões; sombras suaves e baixas.
- Inter em todo o sistema; ícones lineares (Line Awesome ou Lucide), sem emoji.

## Colors

Azul-marinho institucional com acentos funcionais saturados só em pontos pequenos.

### Primary
- **Azul Marca** (#1e3a8a): botões primários, itens ativos, links de ação.
- **Azul Ação** (#3b82f6): foco, destaques e borda do tema assistência.

### Neutral
- **Marinho Noite → Real** (#051024 → #11235a): fundo da aplicação, cabeçalho e menu lateral (gradiente 135°).
- **Superfície** (#ffffff) e **Superfície Suave** (#f1f5f9): cartões, tabelas, campos.
- **Texto** (#0f172a) e **Texto Suave** (#475569): conteúdo sobre superfícies claras.
- **Sobre Escuro** (#f8fafc) e **Sobre Escuro Suave** (#cbd5e1): títulos e textos direto sobre o fundo azul.

### Acentos por área (borda do cartão e ícone)
- **Assistência** azul `#3b82f6`; **Apoio clínico** verde `#10b981`; **Críticos** vermelho `#ef4444`; **Operação** âmbar `#f59e0b`; **Gestão e conhecimento** roxo `#8b5cf6`; **Registros** cinza `#64748b`. Texto do acento usa o tom -700 para passar AA.

### Risco (escala Manchester)
- **Vermelho** `#dc2626`, **Laranja** `#ea580c`, **Amarelo** `#ca8a04`, **Verde** `#16a34a`, **Azul** `#2563eb`: tokens `--risco-*`, componente `RiscoBadge`. É a única cor com significado clínico fixo.

### Named Rules
**A Regra do Fundo Escuro.** Texto escuro sobre o gradiente azul é proibido. Título, subtítulo e rótulo que ficam direto no fundo usam `--ui-on-dark`.
**A Regra da Cor com Significado.** Vermelho, laranja e amarelo pertencem ao risco e ao alerta. Cor de área (azul, verde, roxo, âmbar, cinza) vive só no ladrilho do ícone e numa borda suave; nunca em faixa lateral, faixa superior ou bloco grande.
**A Regra da Matiz Própria.** Cada indicador tem a sua matiz (âmbar aguardando, azul atendimento, violeta internados, vermelho risco vermelho, amarelo risco amarelo, teal cirurgias, ciano UTI, verde altas, rosa evasões, ardósia óbitos e transferências). Com valor: fundo lavado, ladrilho sólido com ícone branco, borda na matiz. Zero: cartão branco e ladrilho pálido, sem virar cinza.

## Typography

**Fonte única:** Inter (variável, local), com fallback do sistema.

**Character:** neutra e técnica; o peso, não a família, faz a hierarquia.

### Hierarchy
- **Headline** (600, 20 px): título da página.
- **Title** (600, 15 px): nome de cartão e de atalho.
- **KPI** (800, 28 px, 1.1): número de indicador.
- **Body** (400, 14 px, 1.45): conteúdo e tabelas.
- **Label** (600, 12 px, caixa alta com espaçamento 0.04em): rótulo de campo e título de seção.

## Layout

Cabeçalho fixo de 76 px (`--header-h`), menu lateral de 250 px que desliza sobre o conteúdo, conteúdo em grade fluida (`auto-fit/auto-fill`).
Atalhos em colunas de 220 px; indicadores em colunas de 200 px (2 colunas no celular). Ritmo de 10 a 12 px entre cartões e 20 a 28 px entre seções.

## Elevation & Depth

Híbrido: superfícies brancas sobre fundo escuro já dão profundidade; sombra baixa (`0 2px 8px rgba(15,35,72,.08)`) em repouso, mais forte só no hover. Sem blur decorativo fora do login.

## Shapes

Raio de 8 px em botões, campos e ladrilhos de ícone (`--ui-radius-control`); 12 px em cartões e painéis (`--ui-radius-card`); círculo só no botão flutuante de menu do celular. Sem faixas laterais ou superiores coloridas.

## Components

### Page header (`PageHeader`)
- Sem faixa preenchida: título `h1` 24 px/600 direto sobre o fundo, subtítulo de 14 px (máx. 64ch), ações alinhadas à direita, filete de 1 px embaixo. Toda página tem exatamente um `h1`.

### Buttons (`.btn`)
- **Shape:** 8 px, 14 px/600, altura 40 px no desktop e 44 px no toque (`pointer: coarse` ou ≤768 px); `sm` e `xs` 32/40 (nenhum alvo abaixo de 32 px no desktop).
- **Variantes:** primary (#1e3a8a), secondary (branco com borda), success (#15803d), danger (#b91c1c), warning (#b45309), info (#0e7490), purple (#6d28d9). Sem gradiente, sem sombra, sem deslocamento no hover.
- **Estados:** hover escurece o tom; disabled 50% de opacidade; foco com anel de 3 px.

### Cards / Containers
- **Corner Style:** 12 px. **Background:** branco, borda de 1 px (#e2e8f0) e sombra baixa.
- **Indicador (`StatCard`):** ladrilho de ícone 36 px com fundo suave do tom, número de 26 px/700 tabular, rótulo de 12 px. Valor 0 recua para cinza; `alerta` pinta o número. Explicação longa vai em tooltip, nunca em texto fixo.
- **Atalho:** ladrilho de 36 px com a cor da área, borda suave da mesma cor, título de 14 px e descrição de 12 px.
- **Risco (`RiscoBadge`):** pílula com ponto Manchester e rótulo.

### Inputs / Fields
- **Style:** fundo branco, borda #cbd5e1, raio 8 px, 14 px, altura 40 px (44 px no toque); rótulo de 13 px/600 acima, sem caixa alta.
- **Focus:** borda azul e anel de 3 px.

### Tables (`.tabela`)
- Cabeçalho claro (#f1f5f9) com rótulos de 12 px/600 em caixa normal; células de 14 px com números tabulares; linha com hover suave; contêiner branco com borda e raio 12 px.

### Navigation
- Cabeçalho com atalhos por cargo; menu lateral com busca e grupos por área; no celular os atalhos saem e o botão de menu vira círculo no canto inferior esquerdo.

## Do's and Don'ts

### Do:
- **Do** manter títulos sobre o fundo azul em `--ui-on-dark` e conferir contraste ≥ 4,5:1.
- **Do** usar rótulos de uma a três palavras e mover a explicação para `title` ou para a tela interna.
- **Do** reutilizar `PageHeader`, `StatCard`, `Tabs`, `Panel`, `EmptyState`, `LoadingState` e `ErrorState` de `@/components/ui`.
- **Do** esconder ações que o cargo não pode executar.

### Don't:
- **Don't** criar novo estilo de botão, cartão, cabeçalho ou tabela por página; nem CSS próprio para o que já existe em `@/components/ui` e no `globals.css`.
- **Don't** usar faixa colorida lateral ou superior em cartões, `transition: all`, gradiente em botão ou texto em caixa alta para rótulo comum.
- **Don't** usar texto escuro direto sobre o gradiente nem ícone sem nome acessível.
- **Don't** usar emoji, cartões gigantes ou ícones maiores que 24 px em listas.
- **Don't** alterar o logo, o gradiente azul-marinho ou a fonte Inter sem pedido explícito do dono.
