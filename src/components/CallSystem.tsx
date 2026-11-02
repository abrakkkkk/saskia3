'use client';

import { useEffect } from 'react';
import { Bell, MapPin, X } from 'lucide-react';
import { useCallSystem } from '@/contexts/CallContext';

export default function CallSystem() {
  const { chamadaAtiva, fecharChamada } = useCallSystem();

  // Fecha automaticamente após 10 segundos
  useEffect(() => {
    if (!chamadaAtiva) return;
    const timer = setTimeout(fecharChamada, 10000);
    return () => clearTimeout(timer);
  }, [chamadaAtiva, fecharChamada]);

  if (!chamadaAtiva) return null;

  return (
    <div className="alerta-ativo" role="status" style={{ display: 'block', maxWidth: 'calc(100vw - 24px)' }}>
      <Bell size={32} aria-hidden="true" />
      <div style={{ fontSize: 22, fontWeight: 700, overflowWrap: 'anywhere' }}>{chamadaAtiva.nome}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>Status: {chamadaAtiva.status}</div>
      <div style={{ fontSize: 16, marginTop: 10 }}>
        <MapPin size={14} aria-hidden="true" /> Dirija-se ao {chamadaAtiva.consultorio}
      </div>
      <button type="button" className="btn btn-sm" onClick={fecharChamada} style={{ marginTop: 12 }}>
        <X size={14} aria-hidden="true" /> Fechar
      </button>
    </div>
  );
}
