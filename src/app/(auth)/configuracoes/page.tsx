'use client';

import { useState, useEffect } from 'react';

// Interfaces para tipar os dados do estado
interface AppConfig {
  geral: {
    hospitalNome: string;
    cnpj: string;
    telefone: string;
    endereco: string;
  };
  integracoes: {
    whatsappAtivo: boolean;
    tissAtivo: boolean;
  };
  faturamento: {
    taxaAdministrativa: number;
    diasVencimento: number;
    gerarGuiaAutomatica: boolean;
    alertaVencimento: boolean;
  };
  perfis: {
    nome: string;
    descricao: string;
    permissoes: string[];
  }[];
}

const DEFAULT_CONFIG: AppConfig = {
  geral: {
    hospitalNome: 'Hospital Saskia Master',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 4002-8922',
    endereco: 'Av. Paulista, 1000 - São Paulo, SP'
  },
  integracoes: {
    whatsappAtivo: true,
    tissAtivo: false
  },
  faturamento: {
    taxaAdministrativa: 5,
    diasVencimento: 30,
    gerarGuiaAutomatica: true,
    alertaVencimento: true
  },
  perfis: [
    { nome: 'Médicos', descricao: 'Acesso a prescrições, evolução e prontuário completo', permissoes: ['prontuario', 'prescricao'] },
    { nome: 'Enfermeiros Assistenciais', descricao: 'Acesso à Triagem, Evolução e Administração de Medicamentos', permissoes: ['triagem', 'evolucao'] },
    { nome: 'Faturamento', descricao: 'Acesso a guias TISS, repasses e contas médicas', permissoes: ['faturamento', 'relatorios'] }
  ]
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carregar dados do localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('saskiaAppConfig');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao fazer parse das configurações", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('saskiaAppConfig', JSON.stringify(config));
    setToastMessage('Configurações salvas com sucesso!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Funções utilitárias para atualizar os nested objects
  const updateGeral = (key: keyof AppConfig['geral'], value: string) => {
    setConfig(prev => ({ ...prev, geral: { ...prev.geral, [key]: value } }));
  };
  
  const updateFaturamento = (key: keyof AppConfig['faturamento'], value: number | boolean) => {
    setConfig(prev => ({ ...prev, faturamento: { ...prev.faturamento, [key]: value } }));
  };

  const updateIntegracoes = (key: keyof AppConfig['integracoes'], value: boolean) => {
    setConfig(prev => ({ ...prev, integracoes: { ...prev.integracoes, [key]: value } }));
  };

  // Lógica da UI de Switch Toggle (CSS embutido para agilidade visual)
  const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label?: string }) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
      <div style={{ position: 'relative' }}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        <div style={{ width: '48px', height: '24px', backgroundColor: checked ? '#10b981' : '#cbd5e1', borderRadius: '8px', transition: 'all 0.3s' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: checked ? '26px' : '2px', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
      </div>
      {label && <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{label}</span>}
    </label>
  );

  if (!mounted) return null;

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#10b981', color: 'white', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', animation: 'fade-in 0.3s ease-out' }}>
          <i className="las la-check-circle" style={{ fontSize: '24px' }}></i> {toastMessage}
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-cog"></i> Configurações do Sistema</h2>
          <p>Gerencie preferências, perfis e integrações do Saskia</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <i className="las la-save"></i> Salvar Alterações
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', minHeight: '60vh' }}>
        {/* Menu Lateral de Configurações */}
        <div className="card" style={{ flex: 1, padding: '0', overflow: 'hidden', alignSelf: 'flex-start' }}>
          {[
            { id: 'geral', label: 'Dados Gerais', icon: 'las la-hospital' },
            { id: 'usuarios', label: 'Usuários e Permissões', icon: 'las la-users-cog' },
            { id: 'integracoes', label: 'Integrações (APIs)', icon: 'las la-plug' },
            { id: 'faturamento', label: 'Regras de Faturamento', icon: 'las la-file-invoice' },
          ].map(tab => (
            <div 
              key={tab.id}
              style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: activeTab === tab.id ? '#f8fafc' : 'white', borderLeft: activeTab === tab.id ? '4px solid #3b82f6' : '4px solid transparent', transition: 'all 0.2s' }}
              onClick={() => setActiveTab(tab.id)}
            >
              <div style={{ fontWeight: 600, color: activeTab === tab.id ? '#3b82f6' : '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={tab.icon} style={{ fontSize: '20px' }}></i> {tab.label}
              </div>
            </div>
          ))}
        </div>

        {/* Conteúdo Principal */}
        <div className="card" style={{ flex: 3 }}>
          {activeTab === 'geral' && (
            <div className="animate-in fade-in duration-300">
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Informações da Unidade Hospitalar</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Nome Fantasia</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={config.geral.hospitalNome} onChange={(e) => updateGeral('hospitalNome', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>CNPJ</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={config.geral.cnpj} onChange={(e) => updateGeral('cnpj', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Telefone Principal</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={config.geral.telefone} onChange={(e) => updateGeral('telefone', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Endereço Completo</label>
                  <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={config.geral.endereco} onChange={(e) => updateGeral('endereco', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <div className="animate-in fade-in duration-300">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '18px', color: '#1e293b', margin: 0 }}>Controle de Acessos</h3>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                  <i className="las la-plus"></i> Novo Perfil
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {config.perfis.map((perfil, index) => (
                  <div key={index} style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'all 0.2s', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="las la-shield-alt text-blue-500"></i> {perfil.nome}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '15px' }}>{perfil.descricao}</div>
                        
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <ToggleSwitch checked={perfil.permissoes.includes('triagem')} onChange={() => {}} label="Triagem" />
                          <ToggleSwitch checked={perfil.permissoes.includes('evolucao')} onChange={() => {}} label="Evolução Clínica" />
                          <ToggleSwitch checked={perfil.permissoes.includes('faturamento')} onChange={() => {}} label="Faturamento" />
                          <ToggleSwitch checked={perfil.permissoes.includes('relatorios')} onChange={() => {}} label="Relatórios" />
                        </div>
                      </div>
                      <button className="btn" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 10px' }}>
                        <i className="las la-pen"></i> Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integracoes' && (
            <div className="animate-in fade-in duration-300">
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Integrações com Terceiros</h3>
              
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                {/* WhatsApp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', border: config.integracoes.whatsappAtivo ? '1px solid #10b981' : '1px solid #e2e8f0', borderRadius: '8px', background: config.integracoes.whatsappAtivo ? '#ecfdf5' : 'white', transition: 'all 0.3s' }}>
                  <div style={{ fontSize: '48px', color: config.integracoes.whatsappAtivo ? '#10b981' : '#cbd5e1' }}><i className="lab la-whatsapp"></i></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>WhatsApp Business API</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Envio automático de lembretes de agendamento e resultados de exames.</div>
                  </div>
                  <div>
                    <ToggleSwitch checked={config.integracoes.whatsappAtivo} onChange={(v) => updateIntegracoes('whatsappAtivo', v)} label={config.integracoes.whatsappAtivo ? 'Conectado' : 'Desligado'} />
                  </div>
                </div>

                {/* TISS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', border: config.integracoes.tissAtivo ? '1px solid #6366f1' : '1px solid #e2e8f0', borderRadius: '8px', background: config.integracoes.tissAtivo ? '#eef2ff' : 'white', transition: 'all 0.3s' }}>
                  <div style={{ fontSize: '48px', color: config.integracoes.tissAtivo ? '#6366f1' : '#cbd5e1' }}><i className="las la-file-medical-alt"></i></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>TISS / ANS Integrador</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Motor de mensageria automática para envio de guias médicas.</div>
                  </div>
                  <div>
                    <ToggleSwitch checked={config.integracoes.tissAtivo} onChange={(v) => updateIntegracoes('tissAtivo', v)} label={config.integracoes.tissAtivo ? 'Conectado' : 'Desligado'} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'faturamento' && (
            <div className="animate-in fade-in duration-300">
              <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Regras de Faturamento Avançado</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '15px', color: '#0f172a', marginBottom: '15px', fontWeight: 600 }}><i className="las la-calculator text-blue-500"></i> Parâmetros Financeiros</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Taxa Administrativa Padrão (%)</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" min="0" max="100" className="input-field" style={{ width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155' }} value={config.faturamento.taxaAdministrativa} onChange={(e) => updateFaturamento('taxaAdministrativa', Number(e.target.value))} />
                        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600 }}>%</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Aplicada automaticamente sobre guias particulares.</p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Prazo de Vencimento de Guias (Dias)</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" min="1" className="input-field" style={{ width: '100%', padding: '10px', paddingRight: '50px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155' }} value={config.faturamento.diasVencimento} onChange={(e) => updateFaturamento('diasVencimento', Number(e.target.value))} />
                        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600, fontSize: '12px' }}>Dias</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Calculado a partir da data de emissão.</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '15px', color: '#0f172a', marginBottom: '15px', fontWeight: 600 }}><i className="las la-robot text-blue-500"></i> Automação de Faturamento</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px dashed #cbd5e1' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155' }}>Gerar Guia Automática (TISS)</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Gera a fatura assim que o médico finalizar o atendimento na Evolução Clínica.</div>
                      </div>
                      <ToggleSwitch checked={config.faturamento.gerarGuiaAutomatica} onChange={(v) => updateFaturamento('gerarGuiaAutomatica', v)} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155' }}>Alertas de Vencimento Próximo</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Notifica a central financeira 5 dias antes de uma fatura vencer.</div>
                      </div>
                      <ToggleSwitch checked={config.faturamento.alertaVencimento} onChange={(v) => updateFaturamento('alertaVencimento', v)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

