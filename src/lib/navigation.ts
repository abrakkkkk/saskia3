import { pode, type Permissao } from '@/lib/permissions'

export type ItemMenu = { href: string; icon: string; label: string; permissao: Permissao; oculto?: boolean }
export type GrupoMenu = { titulo: string; itens: ItemMenu[] }

// Fonte única de destinos: menu lateral, busca, atalhos e guard de páginas leem daqui.
export const MENU: GrupoMenu[] = [
  {
    titulo: 'Início',
    itens: [
      { href: '/dashboard', icon: 'las la-home', label: 'Dashboard', permissao: 'autenticado' },
    ],
  },
  {
    titulo: 'Assistência',
    itens: [
      { href: '/pacientes', icon: 'las la-user-injured', label: 'Pacientes', permissao: 'paciente:listar' },
      { href: '/pacientes-busca', icon: 'las la-search', label: 'Busca de Pacientes', permissao: 'paciente:listar' },
      { href: '/agenda', icon: 'las la-calendar', label: 'Agenda', permissao: 'agenda:ler' },
      { href: '/receituario', icon: 'las la-file-medical', label: 'Receituário', permissao: 'prescricao:ler' },
      { href: '/exames', icon: 'las la-flask', label: 'Exames', permissao: 'exame:ler' },
      { href: '/fichas-auxiliares', icon: 'las la-clipboard-list', label: 'Fichas Auxiliares', permissao: 'prontuario:ler' },
    ],
  },
  {
    titulo: 'Setores críticos',
    itens: [
      { href: '/uti', icon: 'las la-procedures', label: 'UTI', permissao: 'uti:ler' },
      { href: '/centro-cirurgico', icon: 'las la-cut', label: 'Centro Cirúrgico', permissao: 'cirurgia:ler' },
      { href: '/banco-sangue', icon: 'las la-tint', label: 'Banco de Sangue', permissao: 'sangue:ler' },
    ],
  },
  {
    titulo: 'Atendimento',
    itens: [
      { href: '/recepcao', icon: 'las la-user-nurse', label: 'Recepção', permissao: 'recepcao:operar' },
      { href: '/painel-chamadas', icon: 'las la-desktop', label: 'Painel de Chamadas', permissao: 'chamada:ler' },
    ],
  },
  {
    titulo: 'Farmácia e materiais',
    itens: [
      { href: '/farmacia', icon: 'las la-prescription', label: 'Farmácia', permissao: 'farmacia:ler' },
      { href: '/almoxarifado', icon: 'las la-boxes', label: 'Almoxarifado', permissao: 'estoque:ler' },
      { href: '/cssd', icon: 'las la-sync', label: 'CSSD', permissao: 'cssd:ler' },
    ],
  },
  {
    titulo: 'Vigilância e social',
    itens: [
      { href: '/ccih', icon: 'las la-microscope', label: 'CCIH', permissao: 'ccih:ler' },
      { href: '/servico-social', icon: 'las la-hands-helping', label: 'Serviço Social', permissao: 'social:ler' },
      { href: '/obitos', icon: 'las la-cross', label: 'Óbitos', permissao: 'obito:ler' },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { href: '/suporte', icon: 'las la-headset', label: 'Suporte', permissao: 'autenticado' },
      { href: '/chamados-ti', icon: 'las la-tools', label: 'Chamados de TI', permissao: 'autenticado' },
      { href: '/manutencao', icon: 'las la-wrench', label: 'Manutenção', permissao: 'operacao:ler' },
      { href: '/transporte', icon: 'las la-ambulance', label: 'Transporte', permissao: 'operacao:ler' },
      { href: '/gestao-salas', icon: 'las la-door-open', label: 'Salas', permissao: 'operacao:ler' },
      { href: '/equipe-seguranca', icon: 'las la-shield-alt', label: 'Segurança', permissao: 'seguranca:gerir' },
    ],
  },
  {
    titulo: 'Comunicação',
    itens: [
      { href: '/chat', icon: 'las la-comments', label: 'Chat Interno', permissao: 'autenticado' },
      { href: '/lembretes', icon: 'las la-bell', label: 'Meus Lembretes', permissao: 'autenticado' },
      { href: '/ouvidoria', icon: 'las la-bullhorn', label: 'Ouvidoria', permissao: 'autenticado' },
      { href: '/feedback', icon: 'las la-comment-dots', label: 'Sugestões', permissao: 'autenticado' },
      { href: '/ponto', icon: 'las la-clock', label: 'Meu Ponto', permissao: 'autenticado' },
    ],
  },
  {
    titulo: 'Conhecimento',
    itens: [
      { href: '/biblioteca', icon: 'las la-book-medical', label: 'Biblioteca', permissao: 'autenticado' },
      { href: '/utilitarios', icon: 'las la-calculator', label: 'Utilitários', permissao: 'autenticado' },
      { href: '/vacinacao', icon: 'las la-syringe', label: 'Calendários de Vacinação', permissao: 'autenticado' },
      { href: '/curvas-crescimento', icon: 'las la-chart-line', label: 'Curvas de Crescimento', permissao: 'autenticado' },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { href: '/admin', icon: 'las la-cog', label: 'Painel Admin', permissao: 'admin:acesso' },
      { href: '/admin-usuarios', icon: 'las la-users-cog', label: 'Usuários', permissao: 'admin:acesso' },
      { href: '/admin-configuracao', icon: 'las la-building', label: 'Hospital', permissao: 'admin:acesso' },
      { href: '/admin-procedimentos', icon: 'las la-notes-medical', label: 'Procedimentos', permissao: 'admin:acesso' },
      { href: '/admin-prontuarios', icon: 'las la-file-alt', label: 'Modelos de Prontuário', permissao: 'admin:acesso' },
      { href: '/admin-config-dashboard', icon: 'las la-sliders-h', label: 'Configurar Dashboard', permissao: 'admin:acesso' },
      { href: '/relatorios', icon: 'las la-chart-bar', label: 'Relatórios', permissao: 'relatorio:ler' },
    ],
  },
]

export function menuDoCargo(cargo: string | null | undefined): GrupoMenu[] {
  return MENU
    .map(grupo => ({ ...grupo, itens: grupo.itens.filter(item => !item.oculto && pode(cargo, item.permissao)) }))
    .filter(grupo => grupo.itens.length > 0)
}

const ITENS = MENU.flatMap(grupo => grupo.itens)

/** Rotas fora do menu (ex.: /conta) ficam liberadas a qualquer usuário autenticado. */
export function podeAbrirRota(cargo: string | null | undefined, pathname: string) {
  const item = ITENS
    .filter(i => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return !item || pode(cargo, item.permissao)
}
