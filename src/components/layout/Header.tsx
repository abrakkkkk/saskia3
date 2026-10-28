'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
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
      <Link href="/dashboard" className="header-logo" aria-label="Saskia Saúde, página inicial">
        <Image src="/images/logo.png" alt="Saskia Saúde" width={90} height={90} priority />
      </Link>
      <nav className="header-nav">
        <Link href="/dashboard" aria-label="Início"><i className="las la-home" aria-hidden="true"></i> <span>Início</span></Link>
        <Link href="/pacientes" aria-label="Pacientes"><i className="las la-user-injured" aria-hidden="true"></i> <span>Pacientes</span></Link>
        <Link href="/receituario" aria-label="Receituário"><i className="las la-file-medical" aria-hidden="true"></i> <span>Receituário</span></Link>
        <Link href="/agenda" aria-label="Agenda"><i className="las la-calendar" aria-hidden="true"></i> <span>Agenda</span></Link>
        <Link href="/recepcao" aria-label="Recepção"><i className="las la-user-nurse" aria-hidden="true"></i> <span>Recepção</span></Link>
        <Link href="/chat" aria-label="Chat"><i className="las la-comments" aria-hidden="true"></i> <span>Chat</span></Link>
        <Link href="/admin" aria-label="Admin"><i className="las la-hospital" aria-hidden="true"></i> <span>Admin</span></Link>
        <Link href="/painel-chamadas" target="_blank" rel="noopener noreferrer" aria-label="Painel TV (abre em nova aba)" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', borderRadius: '8px', padding: '0 15px', fontWeight: 600, border: 'none' }}>
          <i className="las la-tv"></i> <span>Painel TV</span>
        </Link>
        <div className="user-menu" ref={dropdownRef}>
          <button className="user-menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)} aria-expanded={dropdownOpen} aria-haspopup="true" aria-label={`Menu do usuário${session?.user?.name ? `: ${session.user.name}` : ''}`}>
            <i className="las la-user-circle" aria-hidden="true"></i>
            <span className="user-name">{session?.user?.name?.split(' ')[0]}</span>
            <i className={`las la-angle-${dropdownOpen ? 'up' : 'down'} dropdown-arrow`}></i>
          </button>
          {dropdownOpen && (
            <div className="user-dropdown">
              <div className="dropdown-user-info">
                <strong>{session?.user?.name}</strong>
                <span>{session?.user?.email}</span>
              </div>
              <div className="dropdown-divider"></div>
              <Link href="/conta" onClick={() => setDropdownOpen(false)}>
                <i className="las la-user"></i> Minha Conta
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}>
                <i className="las la-sign-out-alt"></i> Sair
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
