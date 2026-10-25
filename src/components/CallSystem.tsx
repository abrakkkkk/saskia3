'use client';

import React, { useEffect } from 'react';
import { useCallSystem } from '@/contexts/CallContext';

export default function CallSystem() {
  const { chamadaAtiva, fecharChamada } = useCallSystem();

  // Fecha automaticamente após 10 segundos
  useEffect(() => {
    if (chamadaAtiva) {
      const timer = setTimeout(() => {
        fecharChamada();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [chamadaAtiva, fecharChamada]);

  if (!chamadaAtiva) return null;

  return (
    <div className="alerta-ativo" style={{ display: 'block' }}>
      <i className="las la-bell" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{chamadaAtiva.nome}</div>
      <div style={{ fontSize: '14px', marginTop: '4px' }}>
        CPF: {chamadaAtiva.cpf || 'N/I'} | Status: {chamadaAtiva.status}
      </div>
      <div style={{ fontSize: '18px', marginTop: '10px', color: '#fefce8' }}>
        <MapPin size={14} aria-hidden="true" /> Dirija-se ao {chamadaAtiva.consultorio}
      </div>
      <button 
        onClick={fecharChamada} 
        style={{
          marginTop: '15px', padding: '8px 16px', background: 'rgba(255,255,255,0.2)',
          border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        <i className="las la-times"></i> Fechar
      </button>
    </div>
  );
}
import { MapPin } from 'lucide-react'
