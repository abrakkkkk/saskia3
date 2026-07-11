'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuGroups = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', icon: 'las la-home', label: 'Dashboard' },
      { href: '/pacientes', icon: 'las la-user-injured', label: 'Pacientes' },
      { href: '/agenda', icon: 'las la-calendar', label: 'Agenda' },
      { href: '/recepcao', icon: 'las la-user-nurse', label: 'Recepção' },
    ]
  },
  {
    title: 'Atendimento',
    items: [
      { href: '/receituario', icon: 'las la-file-medical', label: 'Receituário' },
      { href: '/centro-cirurgico', icon: 'las la-cut', label: 'Centro Cirúrgico' },
      { href: '/uti', icon: 'las la-procedures', label: 'UTI' },
      { href: '/exames', icon: 'las la-flask', label: 'Exames' },
      { href: '/banco-sangue', icon: 'las la-tint', label: 'Banco de Sangue' },
    ]
  },
  {
    title: 'Setores',
    items: [
      { href: '/farmacia', icon: 'las la-prescription', label: 'Farmácia' },
      { href: '/almoxarifado', icon: 'las la-boxes', label: 'Almoxarifado' },
      { href: '/cssd', icon: 'las la-sync', label: 'CSSD' },
      { href: '/ccih', icon: 'las la-microscope', label: 'CCIH' },
      { href: '/obitos', icon: 'las la-cross', label: 'Óbitos' },
    ]
  },
  {
    title: 'Apoio & Comunicação',
    items: [
      { href: '/chat', icon: 'las la-comments', label: 'Chat Interno' },
      { href: '/painel-chamadas', icon: 'las la-desktop', label: 'Painel de Chamadas' },
      { href: '/servico-social', icon: 'las la-hands-helping', label: 'Serviço Social' },
      { href: '/ouvidoria', icon: 'las la-headset', label: 'Ouvidoria' },
      { href: '/chamados-ti', icon: 'las la-tools', label: 'Manutenção (TI)' },
      { href: '/transporte', icon: 'las la-ambulance', label: 'Transporte' },
      { href: '/equipe-seguranca', icon: 'las la-shield-alt', label: 'Segurança' },
      { href: '/biblioteca', icon: 'las la-book-medical', label: 'Biblioteca' },
    ]
  },
  {
    title: 'Gestão',
    items: [
      { href: '/planos', icon: 'las la-money-bill', label: 'Planos' },
      { href: '/relatorios', icon: 'las la-chart-bar', label: 'Relatórios' },
      { href: '/admin', icon: 'las la-cog', label: 'Painel Admin' },
    ]
  }
];

const ALL_ROUTES = [
  ...menuGroups.flatMap(g => g.items),
  { href: '/pacientes-busca', icon: 'las la-search', label: 'Buscar Pacientes (Avançado)' },
  { href: '/fichas-auxiliares', icon: 'las la-clipboard-list', label: 'Fichas Auxiliares' },
  { href: '/gestao-salas', icon: 'las la-door-open', label: 'Gestão de Salas' },
  { href: '/usuario', icon: 'las la-user-circle', label: 'Meu Perfil / Usuário' },
  { href: '/admin-configuracao', icon: 'las la-building', label: 'Configuração do Hospital' },
  { href: '/admin-usuarios', icon: 'las la-users-cog', label: 'Gerenciar Usuários' },
  { href: '/admin-procedimentos', icon: 'las la-syringe', label: 'Gerenciar Procedimentos' },
  { href: '/admin-prontuarios', icon: 'las la-file-alt', label: 'Modelos de Prontuários' },
  { href: '/admin-financeiro', icon: 'las la-coins', label: 'Financeiro e Pagamentos' },
  { href: '/admin-config-dashboard', icon: 'las la-sliders-h', label: 'Configurar Dashboard' },
  { href: '/admin-hospitais', icon: 'las la-hospital-alt', label: 'Gerenciar Hospitais (Master)' },
  { href: '/ponto', icon: 'las la-clock', label: 'Ponto Eletrônico' },
  { href: '/suporte', icon: 'las la-headset', label: 'Suporte Técnico' },
  { href: '/feedback', icon: 'las la-comment-dots', label: 'Feedback do Sistema' },
  { href: '/lembretes', icon: 'las la-bell', label: 'Lembretes Globais' }
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  // Deduplicate routes based on href
  const uniqueRoutesMap = new Map();
  ALL_ROUTES.forEach(route => uniqueRoutesMap.set(route.href, route));
  const uniqueRoutes = Array.from(uniqueRoutesMap.values());

  const searchResults = uniqueRoutes.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.href.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        <i className={`las la-angle-${open ? 'left' : 'right'}`}></i>
      </button>
      <aside className={`sidebar ${open ? 'aberta' : ''}`}>
        <div className="sidebar-header">
          <h3><i className="las la-th-large"></i> Menu</h3>
        </div>
        
        <div style={{ padding: '0 15px 15px 15px' }}>
          <div style={{ position: 'relative' }}>
            <i className="las la-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' }}></i>
            <input 
              type="text" 
              placeholder="Pesquisar em todo o sistema..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 35px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
          </div>
        </div>

        <nav className="sidebar-nav">
          {searchQuery.trim() !== '' ? (
            <div className="sidebar-group">
              <div className="sidebar-category">Resultados da Pesquisa</div>
              {searchResults.length === 0 ? (
                <div style={{ padding: '10px 15px', color: '#64748b', fontSize: '13px' }}>
                  Nenhuma página encontrada.
                </div>
              ) : (
                searchResults.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
                    onClick={() => { setOpen(false); setSearchQuery(''); }}
                  >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </Link>
                ))
              )}
            </div>
          ) : (
            menuGroups.map((group, index) => (
              <div key={index} className="sidebar-group">
                <div className="sidebar-category">{group.title}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))
          )}
        </nav>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
