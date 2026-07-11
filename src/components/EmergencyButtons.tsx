'use client';

import React, { useState } from 'react';

export default function EmergencyButtons({ userName = 'Profissional' }: { userName?: string }) {
  const [modalType, setModalType] = useState<'PANICO' | 'PCR' | null>(null);

  const confirmAction = () => {
    // In a real app, this would hit an API to broadcast the emergency
    alert(`🚨 ALERTA GLOBAL DISPARADO: ${modalType} por ${userName}`);
    setModalType(null);
  };

  return (
    <>
      <div className="perfil-botoes-emergencia">
        <button 
          className="btn-emergencia btn-panico" 
          onClick={() => setModalType('PANICO')}
        >
          <i className="las la-exclamation-triangle"></i> BOTÃO DO PÂNICO
        </button>
        <button 
          className="btn-emergencia btn-pcr" 
          onClick={() => setModalType('PCR')}
        >
          <i className="las la-heartbeat"></i> ALERTA PCR
        </button>
      </div>

      {modalType && (
        <div className="modal-overlay show">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '15px' }}>
              {modalType === 'PANICO' ? '🆘' : '💔'}
            </div>
            <h3 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '20px' }}>
              {modalType === 'PANICO' ? 'ACIONAR BOTÃO DO PÂNICO?' : 'ALERTA PCR?'}
            </h3>
            <p style={{ color: modalType === 'PANICO' ? '#dc2626' : '#f59e0b', fontWeight: 'bold' }}>
              {modalType === 'PANICO' ? '⚠️ ATENÇÃO!' : 'PARADA CARDIORRESPIRATÓRIA'}
            </p>
            <p style={{ fontSize: '13px', margin: '15px 0' }}>
              <strong>{userName}</strong><br />
              {new Date().toLocaleString('pt-BR')}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => setModalType(null)}
                style={{
                  padding: '12px 25px', border: '2px solid #ccc', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', background: 'white', color: '#666'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAction}
                style={{
                  padding: '12px 25px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '14px', color: 'white',
                  background: modalType === 'PANICO' ? '#dc2626' : '#f59e0b'
                }}
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
