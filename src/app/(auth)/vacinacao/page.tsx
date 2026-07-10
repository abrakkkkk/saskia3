'use client';

import { useState } from 'react';

interface Vacina {
  id: string;
  nome: string;
  idadeRecomendada: string;
  status: 'APLICADA' | 'PENDENTE' | 'ATRASADA';
  dataAplicacao?: Date;
  lote?: string;
}

export default function VacinacaoPage() {
  const [vacinas, setVacinas] = useState<Vacina[]>([
    { id: '1', nome: 'BCG (Tuberculose)', idadeRecomendada: 'Ao nascer', status: 'APLICADA', dataAplicacao: new Date('2024-01-10'), lote: 'L-882' },
    { id: '2', nome: 'Hepatite B (1ª Dose)', idadeRecomendada: 'Ao nascer', status: 'APLICADA', dataAplicacao: new Date('2024-01-10'), lote: 'L-441' },
    { id: '3', nome: 'Pentavalente (1ª Dose)', idadeRecomendada: '2 meses', status: 'APLICADA', dataAplicacao: new Date('2024-03-12'), lote: 'L-102' },
    { id: '4', nome: 'Poliomielite VIP (1ª Dose)', idadeRecomendada: '2 meses', status: 'APLICADA', dataAplicacao: new Date('2024-03-12'), lote: 'L-998' },
    { id: '5', nome: 'Rotavírus (1ª Dose)', idadeRecomendada: '2 meses', status: 'APLICADA', dataAplicacao: new Date('2024-03-12'), lote: 'L-774' },
    { id: '6', nome: 'Meningocócica C (1ª Dose)', idadeRecomendada: '3 meses', status: 'ATRASADA' },
    { id: '7', nome: 'Pentavalente (2ª Dose)', idadeRecomendada: '4 meses', status: 'PENDENTE' },
    { id: '8', nome: 'Poliomielite VIP (2ª Dose)', idadeRecomendada: '4 meses', status: 'PENDENTE' },
  ]);

  const aplicarVacina = (id: string) => {
    setVacinas(vacinas.map(v => 
      v.id === id ? { ...v, status: 'APLICADA', dataAplicacao: new Date(), lote: 'L-NEW' } : v
    ));
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APLICADA': return { color: '#10b981', bg: '#ecfdf5', icone: 'la-check-circle' };
      case 'PENDENTE': return { color: '#64748b', bg: '#f1f5f9', icone: 'la-clock' };
      case 'ATRASADA': return { color: '#ef4444', bg: '#fef2f2', icone: 'la-exclamation-circle' };
      default: return { color: '#64748b', bg: '#f1f5f9', icone: 'la-syringe' };
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-syringe"></i> Carteira de Vacinação Digital</h2>
          <p>Calendário Nacional de Imunização</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>
        {/* Perfil do Paciente */}
        <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e0f2fe', color: '#0ea5e9', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto' }}>
              <i className="las la-child"></i>
            </div>
            <h3 style={{ fontSize: '18px', color: '#1e293b' }}>Enzo Gabriel</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>4 meses de idade</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ color: '#64748b' }}>Aplicadas</span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{vacinas.filter(v => v.status === 'APLICADA').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>
              <span style={{ color: '#ef4444' }}>Atrasadas</span>
              <span style={{ fontWeight: 700, color: '#ef4444' }}>{vacinas.filter(v => v.status === 'ATRASADA').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f1f5f9', borderRadius: '8px' }}>
              <span style={{ color: '#64748b' }}>Próximas (Pendentes)</span>
              <span style={{ fontWeight: 700, color: '#64748b' }}>{vacinas.filter(v => v.status === 'PENDENTE').length}</span>
            </div>
          </div>
        </div>

        {/* Timeline de Vacinas */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Histórico Vacinal</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {vacinas.map(vacina => {
              const style = getStatusStyle(vacina.status);
              return (
                <div key={vacina.id} style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', background: style.bg, borderRadius: '12px', border: `1px solid ${style.bg === '#fef2f2' ? '#fecaca' : style.bg === '#ecfdf5' ? '#d1fae5' : '#e2e8f0'}` }}>
                  
                  {/* Ícone */}
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <i className={`las ${style.icone}`}></i>
                  </div>
                  
                  {/* Dados */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {vacina.nome}
                      {vacina.status === 'ATRASADA' && <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase' }}>Atrasada</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      Recomendada: <span style={{ fontWeight: 600 }}>{vacina.idadeRecomendada}</span>
                    </div>
                  </div>
                  
                  {/* Status/Ação */}
                  <div style={{ textAlign: 'right' }}>
                    {vacina.status === 'APLICADA' ? (
                      <div>
                        <div style={{ color: '#10b981', fontWeight: 600, fontSize: '14px' }}>Aplicada em {vacina.dataAplicacao?.toLocaleDateString()}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Lote: {vacina.lote}</div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => aplicarVacina(vacina.id)}
                        className="btn btn-primary" 
                        style={{ padding: '8px 16px', background: vacina.status === 'ATRASADA' ? '#ef4444' : '#3b82f6' }}
                      >
                        Registrar Aplicação
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
