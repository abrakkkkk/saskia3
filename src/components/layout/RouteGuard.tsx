'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { podeAbrirRota } from '@/lib/navigation';

// Evita a casca de telas sem permissão. A proteção real dos dados está nas APIs (lib/api-guard).
export default function RouteGuard({ cargo, children }: { cargo: string; children: React.ReactNode }) {
  const pathname = usePathname();
  if (podeAbrirRota(cargo, pathname)) return <>{children}</>;
  return (
    <div className="ui-panel ui-empty" role="alert">
      <i className="las la-lock" aria-hidden="true"></i>
      <h2>Acesso restrito</h2>
      <p>Seu perfil não tem permissão para abrir esta área.</p>
      <Link href="/dashboard" className="btn btn-primary">Voltar ao início</Link>
    </div>
  );
}
