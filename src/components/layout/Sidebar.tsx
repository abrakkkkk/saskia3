'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuDoCargo } from '@/lib/navigation';

export default function Sidebar({ cargo }: { cargo: string }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const pathname = usePathname();
  const grupos = useMemo(() => menuDoCargo(cargo), [cargo]);

  const termo = busca.trim().toLowerCase();
  const resultados = termo
    ? grupos.flatMap(g => g.itens).filter(i => i.label.toLowerCase().includes(termo))
    : [];

  const linkClass = (href: string) =>
    `sidebar-link ${pathname === href || pathname.startsWith(`${href}/`) ? 'active' : ''}`;

  const fechar = () => { setOpen(false); setBusca(''); };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
      >
        <i className={`las la-${open ? 'times' : 'bars'}`} aria-hidden="true"></i>
      </button>
      <aside className={`sidebar ${open ? 'aberta' : ''}`} aria-label="Menu principal">
        <div className="sidebar-header">
          <h3><i className="las la-th-large" aria-hidden="true"></i> Menu</h3>
        </div>

        <div className="sidebar-search">
          <i className="las la-search" aria-hidden="true"></i>
          <input
            type="search"
            name="sidebar-search-input"
            autoComplete="off"
            aria-label="Pesquisar no menu"
            placeholder="Pesquisar no menu..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <nav className="sidebar-nav">
          {termo ? (
            <div className="sidebar-group">
              <div className="sidebar-category">Resultados</div>
              {resultados.length === 0 ? (
                <p className="sidebar-vazio">Nenhuma página encontrada.</p>
              ) : resultados.map(item => (
                <Link key={item.href} href={item.href} prefetch={false} className={linkClass(item.href)} onClick={fechar}>
                  <i className={item.icon} aria-hidden="true"></i>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ) : grupos.map(grupo => (
            <div key={grupo.titulo} className="sidebar-group">
              <div className="sidebar-category">{grupo.titulo}</div>
              {grupo.itens.map(item => (
                <Link key={item.href} href={item.href} prefetch={false} className={linkClass(item.href)} onClick={fechar}>
                  <i className={item.icon} aria-hidden="true"></i>
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
