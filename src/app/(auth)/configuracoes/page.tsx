'use client';

import { useState } from 'react';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [hospitalNome, setHospitalNome] = useState('Hospital Saskia Master');
  const [cnpj, setCnpj] = useState('12.345.678/0001-99');
  
  const handleSave = () => {
    alert('Configurações salvas com sucesso!');
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-cog"></i> Configurações do Sistema</h2>
          <p>Gerencie preferências, perfis e integrações do Saskia</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleSave}>
            <i className="las la-save"></i> Salvar Alterações
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', minHeight: '60vh' }}>
        {/* Menu Lateral de Configurações */}
        <div className="card" style={{ flex: 1, padding: '0', overflow: 'hidden', alignSelf: 'flex-start' }}>
          <div 
            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: activeTab === 'geral' ? '#f8fafc' : 'white', borderLeft: activeTab === 'geral' ? '4px solid #3b82f6' : '4px solid transparent' }}
            onClick={() => setActiveTab('geral')}
          >
            <div style={{ fontWeight: 600, color: activeTab === 'geral' ? '#3b82f6' : '#475569' }}><i className="las la-hospital"></i> Dados Gerais</div>
          </div>
          <div 
            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: activeTab === 'usuarios' ? '#f8fafc' : 'white', borderLeft: activeTab === 'usuarios' ? '4px solid #3b82f6' : '4px solid transparent' }}
            onClick={() => setActiveTab('usuarios')}
          >
            <div style={{ fontWeight: 600, color: activeTab === 'usuarios' ? '#3b82f6' : '#475569' }}><i className="las la-users-cog"></i> Usuários e Permissões</div>
          </div>
          <div 
            style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: activeTab === 'integracoes' ? '#f8fafc' : 'white', borderLeft: activeTab === 'integracoes' ? '4px solid #3b82f6' : '4px solid transparent' }}
            onClick={() => setActiveTab('integracoes')}
          >
            <div style={{ fontWeight: 600, color: activeTab === 'integracoes' ? '#3b82f6' : '#475569' }}><i className="las la-plug"></i> Integrações (APIs)</div>
          </div>
          <div 
            style={{ padding: '15px 20px', cursor: 'pointer', background: activeTab === 'faturamento' ? '#f8fafc' : 'white', borderLeft: activeTab === 'faturamento' ? '4px solid #3b82f6' : '4px solid transparent' }}
            onClick={() => setActiveTab('faturamento')}
          >
            <div style={{ fontWeight: 600, color: activeTab === 'faturamento' ? '#3b82f6' : '#475569' }}><i className="las la-file-invoice"></i> Regras de Faturamento</div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="card" style={{ flex: 3 }}>
          {activeTab === 'geral' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Informações da Unidade Hospitalar</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Nome Fantasia</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={hospitalNome} onChange={(e) => setHospitalNome(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>CNPJ</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Telefone Principal</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} defaultValue="(11) 4002-8922" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Endereço Completo</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} defaultValue="Av. Paulista, 1000 - São Paulo, SP" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Controle de Acessos</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>Gerenciamento de grupos de permissão (Roles) por cargo.</p>
              
              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>Enfermeiros Assistenciais</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Acesso à Triagem, Evolução e Administração de Medicamentos</div>
                  </div>
                  <button className="btn-primary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe' }}>Editar Regras</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integracoes' && (
            <div>
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Integrações com Terceiros</h3>
              
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '40px', color: '#10b981' }}><i className="lab la-whatsapp"></i></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>WhatsApp Business API</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Envio automático de lembretes de agendamento para os pacientes.</div>
                  </div>
                  <div>
                    <span className="status-badge bg-green-100 text-green-800">Conectado</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '40px', color: '#6366f1' }}><i className="las la-file-medical-alt"></i></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>TISS / ANS Integrador</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Motor de mensageria para envio de guias médicas.</div>
                  </div>
                  <div>
                    <button className="btn-primary" style={{ background: '#3b82f6' }}>Conectar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'faturamento' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="las la-tools" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '10px' }}></i>
              <h4 style={{ color: '#475569' }}>Regras de faturamento avançado</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Módulo em desenvolvimento pela engenharia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
