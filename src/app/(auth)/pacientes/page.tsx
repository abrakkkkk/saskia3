'use client';
import { getSessionUser } from '@/lib/session';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { calcularIdade, getIniciais, STATUS_CORES, MANCHESTER_CORES } from '@/lib/utils';
import { useCallSystem } from '@/contexts/CallContext';

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  status: string;
  classificacao: string | null;
  leitoTipo: string | null;
  leitoNumero: number | null;
}

const ITENS_POR_PAGINA = 15;

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const { chamarPaciente } = useCallSystem();
  const [modalChamada, setModalChamada] = useState<{ aberto: boolean, paciente: Paciente | null, consultorio: string }>({ aberto: false, paciente: null, consultorio: 'Consultório 1' });
  const [salasCadastradas, setSalasCadastradas] = useState<any[]>([]);
  const [formPaciente, setFormPaciente] = useState<{
    nome: string; cpf: string; rg?: string; nascimento: string; sexo?: string;
    telefone?: string; email?: string; endereco?: string;
    mae?: string; convenio?: string; tipoSanguineo?: string; alergias?: string;
    status: string; classificacao: string; queixaPrincipal?: string;
  }>({ 
    nome: '', cpf: '', nascimento: '', classificacao: 'Verde', status: 'Recepção' 
  });

  const fetchPacientes = () => {
    fetch('/api/pacientes')
      .then(r => r.json())
      .then(data => { setPacientes(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPacientes();
    
    // Load salas
    fetch('/api/salas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSalasCadastradas(data);
      })
      .catch(console.error);
  }, []);

  const criarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formPaciente,
          nascimento: new Date(formPaciente.nascimento).toISOString()
        })
      });
      if (res.ok) {
        setModalAberto(false);
        setFormPaciente({ nome: '', cpf: '', nascimento: '', classificacao: 'Verde', status: 'Recepção' });
        fetchPacientes();
        alert('Paciente cadastrado com sucesso!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao cadastrar paciente.');
      }
    } catch (error) {
      alert('Falha na conexão com o servidor.');
    }
  };

  const filtrados = pacientes.filter(p => {
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    const matchBusca = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.cpf?.includes(busca);
    return matchStatus && matchBusca;
  });

  const exportarCSV = () => {
    const cabecalho = "Nome,CPF,Status,Classificacao,Idade\n";
    const linhas = filtrados.map(p => `${p.nome},${p.cpf || ''},${p.status},${p.classificacao || ''},${calcularIdade(p.nascimento)}`).join('\n');
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacientes.csv';
    a.click();
  };

  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA) || 1;
  const paginados = filtrados.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA);

  const statusList = ['todos', 'Recepção', 'Aguardando Triagem', 'Em Triagem', 'Aguardando Médico', 'Em Atendimento Médico', 'Internado', 'Alta Médica', 'Evasão'];
  const statusLabels: Record<string, string> = {
    'todos': 'Todos', 'Recepção': 'Recepção', 'Aguardando Triagem': 'Aguardando',
    'Em Triagem': 'Triagem', 'Aguardando Médico': 'Ag. Médico',
    'Em Atendimento Médico': 'Atendimento', 'Internado': 'Internados',
    'Alta Médica': 'Alta', 'Evasão': 'Evasão',
  };

  const stats = {
    total: pacientes.length,
    aguardando: pacientes.filter(p => ['Aguardando Triagem', 'Aguardando Médico'].includes(p.status)).length,
    atendimento: pacientes.filter(p => ['Em Triagem', 'Em Atendimento Médico'].includes(p.status)).length,
    internados: pacientes.filter(p => p.status === 'Internado').length,
  };

  return (
    <div>
      {/* Header and Actions in one row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#f1f5f9' }}><i className="las la-user-injured"></i> Pacientes</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setModalAberto(true)} style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '14px' }}>
            <i className="las la-plus"></i> Novo Paciente
          </button>
          <button className="btn" onClick={exportarCSV} style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px' }}>
            <i className="las la-file-csv"></i> Exportar CSV
          </button>
          <Link href="/gestao-salas" className="btn btn-purple" style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '14px' }}><i className="las la-door-open"></i> Gerenciar Salas</Link>
        </div>
      </div>

      {/* Stats - Compact Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#eff6ff', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}><i className="las la-users"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.total}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total</div></div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#fff7ed', color: '#f97316', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}><i className="las la-hourglass-half"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.aguardando}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aguardando</div></div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#f3e8ff', color: '#a855f7', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}><i className="las la-procedures"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.atendimento}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Atendimento</div></div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#fef2f2', color: '#ef4444', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}><i className="las la-bed"></i></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.internados}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Internados</div></div>
        </div>
      </div>

      {/* Busca and Filtros in one row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: '350px' }}>
          <i className="las la-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}></i>
          <input 
            value={busca} 
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }} 
            placeholder="Buscar por nome ou CPF..." 
            style={{ width: '100%', padding: '10px 10px 10px 38px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', backgroundColor: '#ffffff', color: '#0f172a' }} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '3 1 auto' }}>
          {statusList.map(s => (
            <button
              key={s}
              onClick={() => { setFiltroStatus(s); setPagina(1); }}
              style={{ 
                padding: '6px 12px', borderRadius: '8px', border: filtroStatus === s ? '1px solid #1e3a8a' : '1px solid #cbd5e1', 
                background: filtroStatus === s ? '#1e3a8a' : '#ffffff', 
                color: filtroStatus === s ? '#ffffff' : '#475569', 
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: filtroStatus === s ? '0 4px 6px -1px rgba(30, 58, 138, 0.4)' : '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              {statusLabels[s]}
              <span style={{ 
                background: filtroStatus === s ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
                color: filtroStatus === s ? '#ffffff' : '#64748b',
                padding: '2px 6px', borderRadius: '8px', fontSize: '10px' 
              }}>
                {s === 'todos' ? pacientes.length : pacientes.filter(p => p.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="tabela-wrapper" style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="tabela">
          <thead>
            <tr>
              <th>Paciente</th><th>CPF</th><th>Idade</th><th>Classificação</th>
              <th>Status</th><th>Leito</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50 }}>Carregando...</td></tr>
            ) : paginados.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>Nenhum paciente encontrado</td></tr>
            ) : (
              paginados.map((p) => {
                const idade = calcularIdade(p.nascimento);
                const statusCor = STATUS_CORES[p.status] || { bg: '#f1f5f9', text: '#475569' };
                const manch = p.classificacao ? MANCHESTER_CORES[p.classificacao] : null;

                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#0a1f44' }}>
                        <span style={{
                          width: 36, height: 36, borderRadius: 6,
                          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#1e3a8a', fontWeight: 700, fontSize: 14, border: '1px solid #bfdbfe'
                        }}>
                          {getIniciais(p.nome)}
                        </span>
                        {p.nome || '-'}
                      </span>
                    </td>
                    <td>{p.cpf || '-'}</td>
                    <td>{idade}</td>
                    <td>
                      {manch ? (
                        <span className="manchester-badge" style={{ background: manch.bg, color: manch.text, border: `1px solid ${manch.border}` }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: manch.text, display: 'inline-block' }}></span> {p.classificacao}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td>
                      <span className="status-badge" style={{ background: statusCor.bg, color: statusCor.text }}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.leitoTipo ? (
                        <span style={{
                          padding: '5px 12px', borderRadius: 15, fontSize: 11, fontWeight: 600,
                          background: p.leitoTipo === 'vermelha' ? '#fef2f2' : '#fefce8',
                          color: p.leitoTipo === 'vermelha' ? '#dc2626' : '#b45309',
                        }}>
                          Sala {p.leitoTipo === 'vermelha' ? 'Vermelha' : 'Amarela'} - {p.leitoNumero}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs" style={{ background: '#10b981', color: 'white' }} title="Chamar no Painel" onClick={() => setModalChamada({ aberto: true, paciente: p, consultorio: 'Consultório 1' })}>
                          <i className="las la-bullhorn"></i>
                        </button>
                        <Link href={`/pacientes/${p.id}`} className="btn btn-primary btn-xs">
                          <i className="las la-eye"></i>
                        </Link>
                        <button className="btn btn-danger btn-xs" onClick={async () => {
                          if (await confirm('Excluir este paciente?')) {
                            fetch(`/api/pacientes/${p.id}`, { method: 'DELETE' })
                              .then(() => setPacientes(prev => prev.filter(x => x.id !== p.id)));
                          }
                        }}>
                          <i className="las la-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="paginacao">
            <button className="pag-btn" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
              <i className="las la-angle-left"></i>
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`pag-btn ${pagina === n ? 'ativo' : ''}`} onClick={() => setPagina(n)}>
                {n}
              </button>
            ))}
            <button className="pag-btn" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
              <i className="las la-angle-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* Modal Novo Paciente */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', margin: '20px', animation: 'fadeIn 0.2s ease-out', border: '1px solid #334155', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}><i className="las la-user-plus text-blue-600"></i> Ficha Completa de Cadastro</h3>
              <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}><i className="las la-times"></i></button>
            </div>
            
            <form onSubmit={criarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Seção: Dados Pessoais */}
              <div>
                <h4 style={{ fontSize: '14px', color: '#2563eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="las la-id-card"></i> Dados Pessoais
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Nome Completo *</label>
                    <input required type="text" className="input-field" placeholder="Ex: Maria da Silva" value={formPaciente.nome} onChange={e => setFormPaciente({...formPaciente, nome: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>CPF</label>
                    <input type="text" className="input-field" placeholder="000.000.000-00" value={formPaciente.cpf} onChange={e => setFormPaciente({...formPaciente, cpf: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>RG</label>
                    <input type="text" className="input-field" placeholder="00.000.000-0" value={formPaciente.rg || ''} onChange={e => setFormPaciente({...formPaciente, rg: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Data de Nascimento *</label>
                    <input required type="date" className="input-field" value={formPaciente.nascimento} onChange={e => setFormPaciente({...formPaciente, nascimento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Sexo</label>
                    <select className="input-field" value={formPaciente.sexo || ''} onChange={e => setFormPaciente({...formPaciente, sexo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção: Contato & Endereço */}
              <div>
                <h4 style={{ fontSize: '14px', color: '#2563eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="las la-phone"></i> Contato e Endereço
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Telefone / WhatsApp</label>
                    <input type="text" className="input-field" placeholder="(00) 00000-0000" value={formPaciente.telefone || ''} onChange={e => setFormPaciente({...formPaciente, telefone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>E-mail</label>
                    <input type="email" className="input-field" placeholder="email@exemplo.com" value={formPaciente.email || ''} onChange={e => setFormPaciente({...formPaciente, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Endereço Completo</label>
                    <input type="text" className="input-field" placeholder="Rua, Número, Bairro, Cidade - UF" value={formPaciente.endereco || ''} onChange={e => setFormPaciente({...formPaciente, endereco: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>

              {/* Seção: Filiação & Outros */}
              <div>
                <h4 style={{ fontSize: '14px', color: '#2563eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="las la-users"></i> Informações Adicionais
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Nome da Mãe</label>
                    <input type="text" className="input-field" placeholder="Nome completo da mãe" value={formPaciente.mae || ''} onChange={e => setFormPaciente({...formPaciente, mae: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Convênio</label>
                    <input type="text" className="input-field" placeholder="Ex: Unimed, SUS, Bradesco" value={formPaciente.convenio || ''} onChange={e => setFormPaciente({...formPaciente, convenio: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Tipo Sanguíneo</label>
                    <select className="input-field" value={formPaciente.tipoSanguineo || ''} onChange={e => setFormPaciente({...formPaciente, tipoSanguineo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="">Desconhecido</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Alergias</label>
                    <input type="text" className="input-field" placeholder="Ex: Penicilina, Frutos do mar" value={formPaciente.alergias || ''} onChange={e => setFormPaciente({...formPaciente, alergias: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>

              {/* Seção: Atendimento Atual */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="las la-hospital"></i> Atendimento Atual
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Status de Entrada</label>
                    <select className="input-field" value={formPaciente.status} onChange={e => setFormPaciente({...formPaciente, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>
                      <option value="Recepção">Recepção (Aguardando Triagem)</option>
                      <option value="Internado">Internação Direta</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Risco Inicial</label>
                    <select className="input-field" value={formPaciente.classificacao} onChange={e => setFormPaciente({...formPaciente, classificacao: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>
                      <option value="Azul">Não Urgente (Azul)</option>
                      <option value="Verde">Pouco Urgente (Verde)</option>
                      <option value="Amarelo">Urgente (Amarelo)</option>
                      <option value="Vermelho">Emergência (Vermelho)</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Queixa Principal / Motivo</label>
                    <input type="text" className="input-field" placeholder="Descreva brevemente o motivo da vinda ao hospital..." value={formPaciente.queixaPrincipal || ''} onChange={e => setFormPaciente({...formPaciente, queixaPrincipal: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }} />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" >Salvar Ficha Completa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chamar Paciente */}
      {modalChamada.aberto && modalChamada.paciente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '20px', padding: '20px', animation: 'fadeIn 0.2s ease-out', border: '1px solid #334155', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '15px' }}>Chamar Paciente na TV</h3>
            <p style={{ marginBottom: '15px' }}>Para onde <strong>{modalChamada.paciente.nome}</strong> deve se dirigir?</p>
            
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="text"
                className="input-field" 
                placeholder="Digite o consultório ou selecione abaixo"
                value={modalChamada.consultorio}
                onChange={(e) => setModalChamada({ ...modalChamada, consultorio: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', fontSize: '15px' }}
              />
            </div>
            
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', paddingRight: '5px' }}>
              {salasCadastradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '15px', color: '#94a3b8', fontSize: '13px' }}>
                  Nenhuma sala cadastrada. Use o campo acima para digitar o consultório.
                </div>
              ) : (
                salasCadastradas.map((s, idx) => {
                  const isLivre = s.status === 'livre';
                  const isSelected = modalChamada.consultorio === s.nome;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setModalChamada({ ...modalChamada, consultorio: s.nome })}
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '8px', 
                        border: isSelected ? '2px solid #1e3a8a' : '1px solid #e2e8f0', 
                        background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '8px', 
                        background: isLivre ? '#dcfce7' : '#fee2e2', 
                        color: isLivre ? '#16a34a' : '#ef4444', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '15px'
                      }}>
                        <i className="las la-door-open"></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{s.nome}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {s.setor || ''}{s.andar ? ` - ${s.andar}` : ''} | {isLivre ? '✅ Livre' : '🔴 Em uso'}
                        </div>
                      </div>
                      <i className="las la-chevron-right" style={{ color: isSelected ? '#1e3a8a' : '#94a3b8' }}></i>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalChamada({ aberto: false, paciente: null, consultorio: '' })} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}>Cancelar</button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  chamarPaciente({
                    nome: modalChamada.paciente!.nome,
                    cpf: modalChamada.paciente!.cpf || '',
                    consultorio: modalChamada.consultorio,
                    status: modalChamada.paciente!.status
                  });
                  setModalChamada({ aberto: false, paciente: null, consultorio: '' });
                }}
              >
                <i className="las la-bullhorn"></i> Chamar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
