'use client';

import { useState, useEffect } from 'react';
import './uti.css';

interface UtiLeito {
  id: string;
  numero: number;
  status: string; // LIVRE, OCUPADO, RESERVADO, MANUTENCAO, LIMPEZA
  pacienteId: string | null;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Paciente {
  id: string;
  nome: string;
}

export default function UtiPage() {
  const [activeTab, setActiveTab] = useState<'mapa' | 'admissao' | 'pacientes'>('mapa');
  const [leitosUTI, setLeitosUTI] = useState<UtiLeito[]>([]);
  const [pacientesGerais, setPacientesGerais] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  // Admission form state
  const [formAdmissao, setFormAdmissao] = useState({ pacienteId: '', leitoId: '' });

  const [buscaPaciente, setBuscaPaciente] = useState('');

  const carregarDados = async () => {
    try {
      const [resLeitos, resPacientes] = await Promise.all([
        fetch('/api/uti'),
        fetch('/api/pacientes')
      ]);
      const dadosLeitos = await resLeitos.json().catch(() => null);
      const dadosPacientes = await resPacientes.json().catch(() => null);
      if (!resLeitos.ok) throw new Error(dadosLeitos?.error || 'Não foi possível carregar os leitos.');
      if (!resPacientes.ok) throw new Error(dadosPacientes?.error || 'Não foi possível carregar os pacientes.');
      if (!Array.isArray(dadosLeitos) || !Array.isArray(dadosPacientes)) throw new Error('A resposta da UTI está inválida.');
      setLeitosUTI(dadosLeitos);
      setPacientesGerais(dadosPacientes);
      setErroCarga('');
    } catch(e) {
      setErroCarga(e instanceof Error ? e.message : 'Não foi possível carregar os dados da UTI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const admitirPaciente = async () => {
    const { pacienteId, leitoId } = formAdmissao;

    if (!pacienteId || !leitoId) {
      alert('Selecione um paciente cadastrado e um leito livre.');
      return;
    }

    try {
      const res = await fetch(`/api/uti/${leitoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OCUPADO',
          pacienteId,
        })
      });

      const resposta = await res.json().catch(() => null);
      if(!res.ok) throw new Error(resposta?.error || "Erro ao admitir paciente no leito");

      setFormAdmissao({ pacienteId: '', leitoId: '' });

      setActiveTab('mapa');
      alert('Paciente vinculado ao leito. Registre os dados clínicos da admissão no prontuário.');
      carregarDados();
    } catch(e: any) {
      alert(e.message);
    }
  };

  const liberarLeito = async (leitoId: string, nome: string | null) => {
    if (await confirm(`Liberar o leito UTI de ${nome || 'este paciente'}?`)) {
      try {
        const res = await fetch(`/api/uti/${leitoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'LIVRE'
          })
        });
        const resposta = await res.json().catch(() => null);
        if(!res.ok) throw new Error(resposta?.error || "Erro ao dar alta do leito");

        alert('Leito liberado. O paciente permanece internado no hospital.');
        carregarDados();
      } catch(e: any) {
        alert(e.message);
      }
    }
  };

  // Indicators
  const ocupados = leitosUTI.filter(l => l.status === 'OCUPADO').length;
  const disponiveis = leitosUTI.filter(l => l.status === 'LIVRE').length;
  const totalLeitos = leitosUTI.length;
  const taxaOcupacao = totalLeitos > 0 ? Math.round((ocupados / totalLeitos) * 100) : 0;
  
  const leitosFiltrados = leitosUTI.filter(l => 
    l.status === 'OCUPADO' && l.pacienteNome &&
    (l.pacienteNome.toLowerCase().includes(buscaPaciente.toLowerCase()) || 
    String(l.numero).includes(buscaPaciente))
  );

  const statusLabel: Record<string, string> = { LIVRE: " Disponível", OCUPADO: " Ocupado", RESERVADO: " Reservado", MANUTENCAO: " Manutenção", LIMPEZA: " Limpeza" };
  const cssClassMap: Record<string, string> = { LIVRE: "disponivel", OCUPADO: "ocupado", RESERVADO: "reservado", MANUTENCAO: "bloqueado", LIMPEZA: "bloqueado" };

  if (loading) return <div className="uti-loading" role="status" aria-live="polite"><i className="las la-spinner la-spin" aria-hidden="true"></i> Carregando leitos da UTI...</div>;

  return (
    <div className="conteudo">
      <div className="uti-container">

        <div className="banner-uti">
          <div>
            <h1><i className="las la-procedures"></i> UTI - Gestão de Leitos</h1>
            <p>Monitoramento, indicadores e controle de ocupação da Unidade de Terapia Intensiva</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={() => setActiveTab('admissao')}><i className="las la-plus-circle"></i> Vincular paciente ao leito</button>
          </div>
        </div>

        {erroCarga && <p className="uti-error" role="alert"><i className="las la-exclamation-circle" aria-hidden="true"></i>{erroCarga}</p>}

        <div className="indicadores-grid">
          <div className="indicador-card bom"><div className="ind-icon"><i className="las la-bed"></i></div><div className="ind-valor">{totalLeitos}</div><div className="ind-label">Total de Leitos</div></div>
          <div className="indicador-card critico"><div className="ind-icon"><i className="las la-door-closed"></i></div><div className="ind-valor">{ocupados}</div><div className="ind-label">Leitos Ocupados</div></div>
          <div className="indicador-card bom"><div className="ind-icon"><i className="las la-door-open"></i></div><div className="ind-valor">{disponiveis}</div><div className="ind-label">Leitos Disponíveis</div></div>
          <div className="indicador-card alerta"><div className="ind-icon"><i className="las la-chart-line"></i></div><div className="ind-valor">{taxaOcupacao}%</div><div className="ind-label">Taxa de Ocupação</div></div>
        </div>

        <div className="tabs-uti" role="group" aria-label="Seções da UTI">
          <button type="button" aria-pressed={activeTab === 'mapa'} className={`tab-btn ${activeTab === 'mapa' ? 'ativo' : ''}`} onClick={() => setActiveTab('mapa')}><i className="las la-th-large" aria-hidden="true"></i> Mapa de Leitos</button>
          <button type="button" aria-pressed={activeTab === 'admissao'} className={`tab-btn ${activeTab === 'admissao' ? 'ativo' : ''}`} onClick={() => setActiveTab('admissao')}><i className="las la-user-plus" aria-hidden="true"></i> Admissão</button>
          <button type="button" aria-pressed={activeTab === 'pacientes'} className={`tab-btn ${activeTab === 'pacientes' ? 'ativo' : ''}`} onClick={() => setActiveTab('pacientes')}><i className="las la-users" aria-hidden="true"></i> Pacientes UTI</button>
        </div>

        {activeTab === 'mapa' && (
          <div className="mapa-leitos">
            {leitosUTI.map(l => {
              return (
                <div key={l.id} className={`leito-card ${cssClassMap[l.status]}`}>
                  <div className="leito-numero">
                    <span>UTI {l.numero}</span>
                    <span className="leito-status">{statusLabel[l.status]}</span>
                  </div>
                  {l.status === 'OCUPADO' ? (
                    <>
                      <div className="leito-info">
                        <p><i className="las la-user"></i> <strong>{l.pacienteNome}</strong></p>
                        <p><i className="las la-calendar"></i> Última Att: {new Date(l.updatedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="leito-acoes">
                        <button className="btn btn-sm btn-warning" onClick={() => liberarLeito(l.id, l.pacienteNome)}><i className="las la-check-circle"></i> Liberar leito</button>
                      </div>
                    </>
                  ) : (
                    <div className="leito-info" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      <i className="las la-bed" style={{ fontSize: '36px' }}></i>
                      <p>Leito {l.status === 'LIVRE' ? 'disponível' : l.status.toLowerCase()}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'admissao' && (
          <div className="form-panel">
            <h3><i className="las la-user-plus"></i> Vincular paciente cadastrado a um leito livre</h3>
            <p>Esta ação altera o status e associa o paciente ao leito. Registre os dados clínicos da admissão no prontuário.</p>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="uti-paciente">Paciente *</label>
                <select id="uti-paciente" value={formAdmissao.pacienteId} onChange={e => setFormAdmissao({...formAdmissao, pacienteId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {pacientesGerais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="uti-leito">Leito *</label>
                <select id="uti-leito" value={formAdmissao.leitoId} onChange={e => setFormAdmissao({...formAdmissao, leitoId: e.target.value})}>
                  <option value="">Selecione o leito...</option>
                  {leitosUTI.filter(l => l.status === 'LIVRE').map(l => <option key={l.id} value={l.id}>Leito UTI {l.numero}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-success" onClick={admitirPaciente} style={{ width: '100%', marginTop: '15px', justifyContent: 'center', padding: '14px' }}>
              <i className="las la-save"></i> Admitir na UTI
            </button>
          </div>
        )}

        {activeTab === 'pacientes' && (
          <div>
            <div className="search-box">
              <input type="text" aria-label="Buscar paciente internado por nome ou leito" placeholder="Buscar por nome ou leito..." value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} />
            </div>
            <div className="uti-table-wrapper">
              <table className="tabela-uti">
                <thead>
                  <tr>
                    <th>Leito</th><th>Paciente</th><th>Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leitosFiltrados.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum paciente internado encontrado</td></tr>
                  ) : (
                    leitosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td><strong>Leito {l.numero}</strong></td>
                        <td>{l.pacienteNome}</td>
                        <td><span className="badge badge-info">{l.status}</span></td>
                        <td>
                          {l.status === 'OCUPADO' && (
                            <button className="btn btn-sm btn-warning" aria-label={`Liberar leito ${l.numero}`} onClick={() => liberarLeito(l.id, l.pacienteNome)}><i className="las la-check-circle"></i></button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
