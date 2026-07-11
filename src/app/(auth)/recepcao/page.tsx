'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getIniciais, calcularIdade } from '@/lib/utils';
import { useCallSystem } from '@/contexts/CallContext';

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  status: string;
  classificacao: string | null;
  nascimento: string | null;
  dataCadastro?: string;
}

export default function RecepcaoPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [formPaciente, setFormPaciente] = useState({ nome: '', cpf: '', nascimento: '', telefone: '' });
  const [busca, setBusca] = useState('');
  const [resultadoBusca, setResultadoBusca] = useState<Paciente | null>(null);
  const [buscou, setBuscou] = useState(false);
  const { chamarPaciente } = useCallSystem();

  const fetchPacientes = () => {
    fetch('/api/pacientes')
      .then(res => res.json())
      .then(data => {
        setPacientes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPacientes();
    const interval = setInterval(fetchPacientes, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, []);

  const enviarParaTriagem = async (id: string) => {
    try {
      await fetch(`/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aguardando Triagem' })
      });
      fetchPacientes();
      if (resultadoBusca && resultadoBusca.id === id) {
        setResultadoBusca({ ...resultadoBusca, status: 'Aguardando Triagem' });
      }
      alert('Paciente enviado para triagem!');
    } catch (e) {
      alert('Erro ao enviar para triagem');
    }
  };

  const criarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formPaciente.nome,
          cpf: formPaciente.cpf,
          nascimento: formPaciente.nascimento ? new Date(formPaciente.nascimento).toISOString() : null,
          telefone: formPaciente.telefone,
          status: 'Recepção'
        })
      });
      if (res.ok) {
        setModalAberto(false);
        setFormPaciente({ nome: '', cpf: '', nascimento: '', telefone: '' });
        fetchPacientes();
        alert('Paciente cadastrado com sucesso!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao cadastrar paciente.');
      }
    } catch (error) {
      console.error(error);
      alert('Falha ao comunicar com o servidor.');
    }
  };

  const buscarPaciente = () => {
    if (!busca.trim()) {
      setResultadoBusca(null);
      setBuscou(false);
      return;
    }
    const termo = busca.toLowerCase();
    const encontrado = pacientes.find(p => 
      (p.nome && p.nome.toLowerCase().includes(termo)) || 
      (p.cpf && p.cpf.includes(termo))
    );
    setResultadoBusca(encontrado || null);
    setBuscou(true);
  };

  const stats = {
    recepcao: pacientes.filter(p => p.status === 'Recepção').length,
    aguardandoTriagem: pacientes.filter(p => p.status === 'Aguardando Triagem').length,
    aguardandoMedico: pacientes.filter(p => p.status === 'Aguardando Médico').length,
    internados: pacientes.filter(p => p.status === 'Internado').length
  };

  const recentes = [...pacientes].sort((a, b) => {
    const dataA = a.dataCadastro ? new Date(a.dataCadastro).getTime() : 0;
    const dataB = b.dataCadastro ? new Date(b.dataCadastro).getTime() : 0;
    return dataB - dataA;
  }).slice(0, 10);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '26px', color: '#0a1f44', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <i className="las la-user-nurse"></i> Recepção
        </h2>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)} style={{ background: '#16a34a', color: 'white', border: 'none' }}>
          <i className="las la-user-plus"></i> Novo Paciente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #64748b' }}>
          <h3 style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 0' }}><i className="las la-clipboard-list"></i> Na Recepção</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>{stats.recepcao}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 0' }}><i className="las la-hourglass-half"></i> Aguard. Triagem</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.aguardandoTriagem}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 0' }}><i className="las la-user-md"></i> Aguard. Médico</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.aguardandoMedico}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #ec4898' }}>
          <h3 style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 0' }}><i className="las la-bed"></i> Internados</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ec4898' }}>{stats.internados}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#0a1f44' }}><i className="las la-search"></i> Buscar Paciente</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Digite nome ou CPF..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()}
            style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px' }}
          />
          <button onClick={buscarPaciente} style={{ background: '#1e3a8a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <i className="las la-search"></i> Buscar
          </button>
        </div>

        {buscou && (
          <div style={{ marginTop: '20px' }}>
            {resultadoBusca ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1e3a8a', fontSize: '16px' }}><i className="las la-user-circle"></i> {resultadoBusca.nome}</h4>
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}><i className="las la-id-card"></i> CPF: {resultadoBusca.cpf || "Não informado"}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}><i className="las la-flag"></i> Status: {resultadoBusca.status || "Recepção"}</p>
                </div>
                <button 
                  onClick={() => enviarParaTriagem(resultadoBusca.id)}
                  style={{ background: '#1e3a8a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <i className="las la-stethoscope"></i> Iniciar Triagem
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                <i className="las la-user-slash" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                <p>Paciente não encontrado</p>
                <button onClick={() => setModalAberto(true)} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginTop: '10px' }}>
                  <i className="las la-user-plus"></i> Cadastrar novo paciente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#0a1f44' }}><i className="las la-history"></i> Últimos Pacientes na Recepção</h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>Paciente</th>
                  <th style={{ background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>CPF</th>
                  <th style={{ background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>Chegada</th>
                  <th style={{ background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>Status</th>
                  <th style={{ background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentes.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum paciente na recepção</td></tr>
                ) : (
                  recentes.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{p.nome}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>{p.cpf || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>{p.dataCadastro ? new Date(p.dataCadastro).toLocaleDateString('pt-BR') : '-'}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <span style={{ 
                          display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                          background: p.status === 'Recepção' ? '#64748b' : p.status === 'Aguardando Triagem' ? '#f59e0b' : p.status === 'Em Triagem' ? '#3b82f6' : '#8b5cf6',
                          color: 'white'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <Link href={`/pacientes/${p.id}`} style={{ background: 'transparent', border: 'none', color: '#1e3a8a', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Ver Ficha">
                            <i className="las la-eye"></i>
                          </Link>
                          {p.status === 'Recepção' && (
                            <button 
                              onClick={() => enviarParaTriagem(p.id)}
                              style={{ background: 'transparent', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Enviar para Triagem"
                            >
                              <i className="las la-arrow-right"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo Paciente */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '450px', maxWidth: '90%', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: '#1e3a8a', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="las la-user-plus"></i> Novo Paciente</span>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '25px' }}>
              <form onSubmit={criarPaciente}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#333' }}><i className="las la-user"></i> Nome completo *</label>
                <input required type="text" placeholder="Nome completo" value={formPaciente.nome} onChange={e => setFormPaciente({...formPaciente, nome: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box' }} />
                
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#333' }}><i className="las la-id-card"></i> CPF</label>
                <input type="text" placeholder="CPF (opcional)" value={formPaciente.cpf} onChange={e => setFormPaciente({...formPaciente, cpf: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box' }} />
                
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#333' }}><i className="las la-calendar"></i> Data de Nascimento</label>
                <input type="date" value={formPaciente.nascimento} onChange={e => setFormPaciente({...formPaciente, nascimento: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box' }} />
                
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#333' }}><i className="las la-phone"></i> Telefone</label>
                <input type="text" placeholder="(00) 00000-0000" value={formPaciente.telefone} onChange={e => setFormPaciente({...formPaciente, telefone: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box' }} />
                
                <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="las la-save"></i> Cadastrar e Iniciar Atendimento
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

