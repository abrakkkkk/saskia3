'use client';

import React, { createContext, useState, useEffect } from 'react';

// Exportando o contexto apenas caso seja necessário num futuro (o override global do window.alert é o mecanismo principal)
export const AlertContext = createContext<unknown>(null);

export default function AlertProvider() {
  const [alertState, setAlertState] = useState({ 
    isOpen: false, 
    message: '', 
    type: 'info' // info, success, warning, error
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    message: '',
    resolve: null
  });

  useEffect(() => {
    // Salvando a referência original
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    // Sobrescrevendo alert
    window.alert = (message?: unknown) => {
      const msgStr = String(message || '');
      let type = 'info';
      
      // Detecção de tipo baseada no conteúdo da string original
      if (msgStr.includes('✅') || msgStr.toLowerCase().includes('sucesso')) {
        type = 'success';
      } else if (msgStr.includes('⚠️') || msgStr.toLowerCase().includes('atenção') || msgStr.toLowerCase().includes('preencha')) {
        type = 'warning';
      } else if (msgStr.includes('🚨') || msgStr.toLowerCase().includes('erro') || msgStr.toLowerCase().includes('falha')) {
        type = 'error';
      }

      setAlertState({
        isOpen: true,
        message: msgStr,
        type
      });
    };

    // Sobrescrevendo confirm para retornar uma Promise
    window.confirm = (message?: string) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          message: String(message || ''),
          resolve
        });
      }) as unknown as boolean; // Cast necessário para enganar o TS onde é esperado um boolean síncrono
    };

    // Cleanup caso o componente seja desmontado
    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = (value: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(value);
    }
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  // Ícones e cores dinâmicas baseadas no tipo
  const getModalConfig = () => {
    switch (alertState.type) {
      case 'success':
        return { icon: 'las la-check-circle', color: '#10b981', title: 'Sucesso' };
      case 'warning':
        return { icon: 'las la-exclamation-triangle', color: '#f59e0b', title: 'Atenção' };
      case 'error':
        return { icon: 'las la-times-circle', color: '#ef4444', title: 'Erro' };
      default:
        return { icon: 'las la-info-circle', color: '#3b82f6', title: 'Informação' };
    }
  };

  const config = getModalConfig();

  return (
    <>
      {/* Modal Customizado de Alert */}
      {alertState.isOpen && (
        <div className="modal-overlay show" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '64px', marginBottom: '15px', color: config.color }}>
              <i className={config.icon}></i>
            </div>
            <h3 style={{ color: '#0f172a', marginBottom: '15px', fontSize: '20px' }}>
              {config.title}
            </h3>
            <p style={{ color: '#475569', fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              {alertState.message}
            </p>
            <button 
              onClick={closeAlert}
              style={{
                padding: '12px 25px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '14px', color: 'white',
                background: config.color, width: '100%',
                transition: 'opacity 0.2s',
                boxShadow: `0 4px 12px ${config.color}40`
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Modal Customizado de Confirm */}
      {confirmState.isOpen && (
        <div className="modal-overlay show" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div style={{ fontSize: '64px', marginBottom: '15px', color: '#f59e0b' }}>
              <i className="las la-question-circle"></i>
            </div>
            <h3 style={{ color: '#0f172a', marginBottom: '15px', fontSize: '20px' }}>
              Confirmação
            </h3>
            <p style={{ color: '#475569', fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              {confirmState.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => handleConfirm(false)}
                style={{
                  padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '14px', color: '#475569',
                  background: 'white', flex: 1,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleConfirm(true)}
                style={{
                  padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '14px', color: 'white',
                  background: '#f59e0b', flex: 1,
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
