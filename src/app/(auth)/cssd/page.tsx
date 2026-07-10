'use client';

import { useState } from 'react';

type CssdStatus = 'SUJA' | 'PREPARO' | 'AUTOCLAVE' | 'ARSENAL';

interface LoteEsterilizacao {
  id: string;
  nomeCaixa: string;
  setorOrigem: string;
  status: CssdStatus;
  entrada: Date;
}

export default function CssdPage() {
  const [lotes, setLotes] = useState<LoteEsterilizacao[]>([
    { id: 'L-101', nomeCaixa: 'Caixa de Ortopedia (Grande)', setorOrigem: 'Centro Cirúrgico', status: 'SUJA', entrada: new Date() },
    { id: 'L-102', nomeCaixa: 'Kits de Sutura', setorOrigem: 'Pronto Socorro', status: 'PREPARO', entrada: new Date() },
    { id: 'L-103', nomeCaixa: 'Caixa de Oftalmologia', setorOrigem: 'Centro Cirúrgico', status: 'AUTOCLAVE', entrada: new Date(Date.now() - 3600000) },
  ]);

  const [nomeCaixa, setNomeCaixa] = useState('');
  const [setorOrigem, setSetorOrigem] = useState('Centro Cirúrgico');

  const registrarEntrada = () => {
    if (!nomeCaixa) return;
    const novo: LoteEsterilizacao = {
      id: `L-${Math.floor(Math.random() * 900) + 100}`,
      nomeCaixa,
      setorOrigem,
      status: 'SUJA',
      entrada: new Date()
    };
    setLotes([...lotes, novo]);
    setNomeCaixa('');
  };

  const moverLote = (id: string, novoStatus: CssdStatus) => {
    setLotes(lotes.map(l => l.id === id ? { ...l, status: novoStatus } : l));
  };

  const renderColuna = (titulo: string, statusKey: CssdStatus, icone: string, corHeader: string, corCard: string) => {
    const itens = lotes.filter(l => l.status === statusKey);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '15px', background: corHeader, color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className={`las ${icone}`} style={{ fontSize: '24px' }}></i> {titulo} ({itens.length})
        </div>
        <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '400px' }}>
          {itens.map(item => (
            <div key={item.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${corCard}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{item.id}</div>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{item.nomeCaixa}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}><i className="las la-map-marker"></i> {item.setorOrigem}</div>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                {statusKey === 'SUJA' && <button className="btn-primary" style={{ padding: '6px', fontSize: '11px', flex: 1, justifyContent: 'center' }} onClick={() => moverLote(item.id, 'PREPARO')}>Lavado <i className="las la-arrow-right"></i></button>}
                {statusKey === 'PREPARO' && <button className="btn-primary" style={{ padding: '6px', fontSize: '11px', flex: 1, justifyContent: 'center', background: '#3b82f6' }} onClick={() => moverLote(item.id, 'AUTOCLAVE')}>Autoclave <i className="las la-arrow-right"></i></button>}
                {statusKey === 'AUTOCLAVE' && <button className="btn-primary" style={{ padding: '6px', fontSize: '11px', flex: 1, justifyContent: 'center', background: '#10b981' }} onClick={() => moverLote(item.id, 'ARSENAL')}>Estéril <i className="las la-check"></i></button>}
                {statusKey === 'ARSENAL' && <button className="btn-primary" style={{ padding: '6px', fontSize: '11px', flex: 1, justifyContent: 'center', background: '#64748b' }} onClick={() => moverLote(item.id, 'SUJA')}>Usado <i className="las la-undo"></i></button>}
              </div>
            </div>
          ))}
          {itens.length === 0 && <div style={{ color: '#cbd5e1', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>Vazio</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-sync"></i> CME / CSSD</h2>
          <p>Central de Material e Esterilização</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Registrar Entrada de Material Sujo</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Descrição da Caixa/Kit</label>
            <input type="text" className="input-field" placeholder="Ex: Caixa de Instrumental Geral" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={nomeCaixa} onChange={(e) => setNomeCaixa(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Setor de Origem</label>
            <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={setorOrigem} onChange={(e) => setSetorOrigem(e.target.value)}>
              <option value="Centro Cirúrgico">Centro Cirúrgico</option>
              <option value="Pronto Socorro">Pronto Socorro</option>
              <option value="Ambulatório">Ambulatório</option>
              <option value="UTI">UTI</option>
            </select>
          </div>
          <button className="btn-primary" style={{ padding: '10px 20px', height: '42px', background: '#ef4444' }} onClick={registrarEntrada}>
            <i className="las la-biohazard"></i> Dar Entrada
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
        {renderColuna('Área Suja', 'SUJA', 'la-biohazard', '#ef4444', '#ef4444')}
        {renderColuna('Preparo', 'PREPARO', 'la-hands-wash', '#f59e0b', '#f59e0b')}
        {renderColuna('Esterilização', 'AUTOCLAVE', 'la-thermometer-full', '#3b82f6', '#3b82f6')}
        {renderColuna('Arsenal (Limpo)', 'ARSENAL', 'la-shield-alt', '#10b981', '#10b981')}
      </div>
    </div>
  );
}
