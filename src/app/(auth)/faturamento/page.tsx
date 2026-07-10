'use client';

import { useState } from 'react';

type FaturaStatus = 'EM_ANALISE' | 'ENVIADO' | 'PAGO' | 'GLOSADO';

interface Fatura {
  id: string;
  paciente: string;
  convenio: string;
  procedimento: string;
  valor: number;
  dataEmissao: Date;
  status: FaturaStatus;
}

export default function FaturamentoPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([
    { id: 'GUI-10023', paciente: 'João da Silva', convenio: 'Unimed Saúde', procedimento: 'Apendicectomia', valor: 4500.00, dataEmissao: new Date(Date.now() - 86400000 * 2), status: 'PAGO' },
    { id: 'GUI-10024', paciente: 'Maria Oliveira', convenio: 'Bradesco Saúde', procedimento: 'Consulta Ortopedia', valor: 250.00, dataEmissao: new Date(Date.now() - 86400000 * 1), status: 'ENVIADO' },
    { id: 'GUI-10025', paciente: 'Carlos Souza', convenio: 'SulAmérica', procedimento: 'Exame Hemograma Completo', valor: 85.50, dataEmissao: new Date(), status: 'EM_ANALISE' },
    { id: 'GUI-10026', paciente: 'Ana Beatriz', convenio: 'SUS', procedimento: 'Internação UTI (Diária)', valor: 1200.00, dataEmissao: new Date(), status: 'GLOSADO' },
  ]);

  const [novoPaciente, setNovoPaciente] = useState('');
  const [novoConvenio, setNovoConvenio] = useState('Unimed Saúde');
  const [novoValor, setNovoValor] = useState('');
  const [novoProcedimento, setNovoProcedimento] = useState('');
  const [showNovaConta, setShowNovaConta] = useState(false);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const getStatusBadge = (status: FaturaStatus) => {
    switch (status) {
      case 'EM_ANALISE': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ENVIADO': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'PAGO': return 'bg-green-100 text-green-800 border border-green-200 font-bold';
      case 'GLOSADO': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const metricas = {
    totalPendente: faturas.filter(f => f.status === 'EM_ANALISE' || f.status === 'ENVIADO').reduce((acc, f) => acc + f.valor, 0),
    totalRecebido: faturas.filter(f => f.status === 'PAGO').reduce((acc, f) => acc + f.valor, 0),
    totalGlosado: faturas.filter(f => f.status === 'GLOSADO').reduce((acc, f) => acc + f.valor, 0),
  };

  const gerarGuia = () => {
    if (!novoPaciente || !novoValor || !novoProcedimento) return;
    const nova: Fatura = {
      id: `GUI-100${Math.floor(Math.random() * 90) + 10}`,
      paciente: novoPaciente,
      convenio: novoConvenio,
      procedimento: novoProcedimento,
      valor: parseFloat(novoValor),
      dataEmissao: new Date(),
      status: 'EM_ANALISE'
    };
    setFaturas([nova, ...faturas]);
    setNovoPaciente(''); setNovoValor(''); setNovoProcedimento('');
    setShowNovaConta(false);
  };

  const avancarStatus = (id: string, current: FaturaStatus) => {
    const steps: FaturaStatus[] = ['EM_ANALISE', 'ENVIADO', 'PAGO'];
    const nextIdx = steps.indexOf(current) + 1;
    if (nextIdx >= steps.length) return;
    setFaturas(faturas.map(f => f.id === id ? { ...f, status: steps[nextIdx] } : f));
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-file-invoice-dollar"></i> Faturamento</h2>
          <p>Gestão de contas médicas, guias TISS e recebimentos</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#10b981' }} onClick={() => setShowNovaConta(!showNovaConta)}>
            <i className="las la-plus-circle"></i> Gerar Guia
          </button>
        </div>
      </div>

      {showNovaConta && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#065f46' }}>Emissão de Nova Guia de Faturamento</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#064e3b', marginBottom: '5px' }}>Paciente</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }} value={novoPaciente} onChange={(e) => setNovoPaciente(e.target.value)} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#064e3b', marginBottom: '5px' }}>Procedimento Base</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }} value={novoProcedimento} onChange={(e) => setNovoProcedimento(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#064e3b', marginBottom: '5px' }}>Convênio/Fonte</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }} value={novoConvenio} onChange={(e) => setNovoConvenio(e.target.value)}>
                <option value="Unimed Saúde">Unimed Saúde</option>
                <option value="Bradesco Saúde">Bradesco Saúde</option>
                <option value="Amil">Amil</option>
                <option value="SUS">SUS (FAS)</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#064e3b', marginBottom: '5px' }}>Valor (R$)</label>
              <input type="number" step="0.01" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0' }} value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ padding: '10px 20px', height: '42px', background: '#059669' }} onClick={gerarGuia}>
              Salvar Guia
            </button>
          </div>
        </div>
      )}

      {/* Métricas Financeiras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card-contador" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="contador-info">
            <span className="titulo">PENDENTE (A RECEBER)</span>
            <div className="valor" style={{ color: '#3b82f6', fontSize: '24px' }}>{formatarMoeda(metricas.totalPendente)}</div>
          </div>
          <div className="contador-icone" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <i className="las la-clock"></i>
          </div>
        </div>
        <div className="card-contador" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="contador-info">
            <span className="titulo">RECEITA CONFIRMADA</span>
            <div className="valor" style={{ color: '#10b981', fontSize: '24px' }}>{formatarMoeda(metricas.totalRecebido)}</div>
          </div>
          <div className="contador-icone" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <i className="las la-wallet"></i>
          </div>
        </div>
        <div className="card-contador" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="contador-info">
            <span className="titulo">PERDAS / GLOSAS</span>
            <div className="valor" style={{ color: '#ef4444', fontSize: '24px' }}>{formatarMoeda(metricas.totalGlosado)}</div>
          </div>
          <div className="contador-icone" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <i className="las la-file-invoice"></i>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Lista de Guias e Contas Médicas</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cód. Guia</th>
                <th>Paciente / Procedimento</th>
                <th>Convênio</th>
                <th>Valor Faturado</th>
                <th>Status da Conta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {faturas.map(f => (
                <tr key={f.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}>{f.id}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{f.paciente}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}><i className="las la-stethoscope"></i> {f.procedimento}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: f.convenio === 'Particular' ? '#8b5cf6' : '#0ea5e9' }}>{f.convenio}</span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>
                    {formatarMoeda(f.valor)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(f.status)}`} style={{ padding: '4px 8px', borderRadius: '4px' }}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    {f.status !== 'PAGO' && f.status !== 'GLOSADO' && (
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', color: '#10b981', border: '1px solid #10b981' }} 
                        onClick={() => avancarStatus(f.id, f.status)}
                      >
                        <i className="las la-arrow-right"></i> Progredir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
