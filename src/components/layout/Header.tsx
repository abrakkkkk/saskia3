'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { pode, type Permissao } from '@/lib/permissions';

type Atalho = { href: string; icon: string; label: string; permissao: Permissao };

const ATALHOS: Atalho[] = [
  { href: '/dashboard', icon: 'las la-home', label: 'Início', permissao: 'autenticado' },
  { href: '/pacientes', icon: 'las la-user-injured', label: 'Pacientes', permissao: 'paciente:listar' },
  { href: '/receituario', icon: 'las la-file-medical', label: 'Receituário', permissao: 'prescricao:ler' },
  { href: '/agenda', icon: 'las la-calendar', label: 'Agenda', permissao: 'agenda:ler' },
  { href: '/recepcao', icon: 'las la-user-nurse', label: 'Recepção', permissao: 'recepcao:operar' },
  { href: '/chat', icon: 'las la-comments', label: 'Chat', permissao: 'autenticado' },
  { href: '/admin', icon: 'las la-hospital', label: 'Admin', permissao: 'admin:acesso' },
];

type Props = { nome: string; email: string; cargo: string };

export default function Header({ nome, email, cargo }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <Link href="/dashboard" className="header-logo" aria-label="Saskia Saúde, ir para o início">
        <Image src="/images/logo-header.png" alt="" width={421} height={190} sizes="190px" priority />
      </Link>
      <nav className="header-nav" aria-label="Atalhos">
        {ATALHOS.filter(a => pode(cargo, a.permissao)).map(a => (
          <Link key={a.href} href={a.href} prefetch={false} className="header-atalho">
            <i className={a.icon} aria-hidden="true"></i> <span>{a.label}</span>
          </Link>
        ))}
        {pode(cargo, 'chamada:ler') && (
          <Link href="/painel-chamadas" target="_blank" prefetch={false} className="header-painel" aria-label="Abrir Painel TV em nova aba">
            <i className="las la-tv" aria-hidden="true"></i> <span>Painel TV</span>
          </Link>
        )}
        <div className="user-menu" ref={dropdownRef}>
          <button
            className="user-menu-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-label={`Menu de ${nome}`}
          >
            <i className="las la-user-circle" aria-hidden="true"></i>
            <span className="user-name">{nome.split(' ')[0]}</span>
            <i className={`las la-angle-${dropdownOpen ? 'up' : 'down'} dropdown-arrow`} aria-hidden="true"></i>
          </button>
          {dropdownOpen && (
            <div className="user-dropdown">
              <div className="dropdown-user-info">
                <strong>{nome}</strong>
                <span>{email}</span>
              </div>
              <div className="dropdown-divider"></div>
              <Link href="/conta" onClick={() => setDropdownOpen(false)}>
                <i className="las la-user" aria-hidden="true"></i> Minha Conta
              </Link>
              <Link href="/politicas-privacidade" onClick={() => setDropdownOpen(false)}>
                <i className="las la-shield-alt" aria-hidden="true"></i> Privacidade
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}>
                <i className="las la-sign-out-alt" aria-hidden="true"></i> Sair
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
