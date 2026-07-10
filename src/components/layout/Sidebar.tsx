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
      { href: '/configuracoes', icon: 'las la-hospital', label: 'Admin (Config)' },
    ]
  }
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
        <nav className="sidebar-nav">
          {menuGroups.map((group, index) => (
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
          ))}
        </nav>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
