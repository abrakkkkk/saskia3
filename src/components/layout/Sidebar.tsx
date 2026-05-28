'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/dashboard', icon: 'las la-home', label: 'Dashboard' },
  { href: '/pacientes', icon: 'las la-user-injured', label: 'Pacientes' },
  { href: '/agenda', icon: 'las la-calendar', label: 'Agenda' },
  { href: '/receituario', icon: 'las la-file-medical', label: 'Receituário' },
  { href: '/recepcao', icon: 'las la-user-nurse', label: 'Recepção' },
  { href: '/chat', icon: 'las la-comments', label: 'Chat Interno' },
  { href: '/painel-chamadas', icon: 'las la-desktop', label: 'Painel de Chamadas' },
  { href: '/equipe-seguranca', icon: 'las la-shield-alt', label: 'Segurança' },
  { href: '/farmacia', icon: 'las la-prescription', label: 'Farmácia' },
  { href: '/obitos', icon: 'las la-cross', label: 'Óbitos' },
  { href: '/planos', icon: 'las la-money-bill', label: 'Planos' },
  { href: '/almoxarifado', icon: 'las la-boxes', label: 'Almoxarifado' },
  { href: '/centro-cirurgico', icon: 'las la-cut', label: 'Centro Cirúrgico' },
  { href: '/uti', icon: 'las la-procedures', label: 'UTI' },
  { href: '/exames', icon: 'las la-flask', label: 'Exames' },
  { href: '/ccih', icon: 'las la-shield-virus', label: 'CCIH' },
  { href: '/banco-sangue', icon: 'las la-tint', label: 'Banco de Sangue' },
  { href: '/cssd', icon: 'las la-pump-soap', label: 'CSSD' },
  { href: '/servico-social', icon: 'las la-hands-helping', label: 'Serviço Social' },
  { href: '/manutencao', icon: 'las la-tools', label: 'Manutenção' },
  { href: '/transporte', icon: 'las la-ambulance', label: 'Transporte' },
  { href: '/ouvidoria', icon: 'las la-headset', label: 'Ouvidoria' },
  { href: '/relatorios', icon: 'las la-chart-bar', label: 'Relatórios' },
  { href: '/admin', icon: 'las la-hospital', label: 'Admin' },
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
          {menuItems.map((item) => (
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
        </nav>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
