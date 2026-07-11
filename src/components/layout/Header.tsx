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
      <Link href="/dashboard" className="header-logo">
        <Image src="/images/logo.png" alt="Saskia Saúde" width={90} height={90} priority />
      </Link>
      <nav className="header-nav">
        <Link href="/dashboard"><i className="las la-home"></i> <span>Início</span></Link>
        <Link href="/pacientes"><i className="las la-user-injured"></i> <span>Pacientes</span></Link>
        <Link href="/receituario"><i className="las la-file-medical"></i> <span>Receituário</span></Link>
        <Link href="/agenda"><i className="las la-calendar"></i> <span>Agenda</span></Link>
        <Link href="/recepcao"><i className="las la-user-nurse"></i> <span>Recepção</span></Link>
        <Link href="/chat"><i className="las la-comments"></i> <span>Chat</span></Link>
        <Link href="/admin"><i className="las la-hospital"></i> <span>Admin</span></Link>
        <Link href="/painel-chamadas" target="_blank" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', borderRadius: '10px', padding: '0 15px', fontWeight: 600, border: 'none' }}>
          <i className="las la-tv"></i> <span>Painel TV</span>
        </Link>
        <div className="user-menu" ref={dropdownRef}>
          <button className="user-menu-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <i className="las la-user-circle"></i>
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
