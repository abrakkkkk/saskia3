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

interface Visitante {
  id: string;
  nome: string;
  documento: string | null;
  destino: string | null;
  pacienteId: string | null;
  paciente?: { nome: string } | null;
  entrada: string;
  saida: string | null;
  status: string;
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

  // Visitantes
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [modalVisitante, setModalVisitante] = useState(false);
  const [formVisitante, setFormVisitante] = useState({ nome: '', documento: '', destino: '' });
  const [abaAtiva, setAbaAtiva] = useState<'pacientes' | 'visitantes'>('pacientes');

  const fetchPacientes = () => {
    fetch('/api/pacientes')
      .then(res => res.json())
      .then(data => {
        setPacientes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchVisitantes = () => {
    fetch('/api/visitantes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVisitantes(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPacientes();
    fetchVisitantes();
    const interval = setInterval(() => { fetchPacientes(); fetchVisitantes(); }, 10000);
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

  const criarVisitante = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/visitantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formVisitante.nome,
          documento: formVisitante.documento || null,
          destino: formVisitante.destino || null
        })
      });
      if (res.ok) {
        setModalVisitante(false);
        setFormVisitante({ nome: '', documento: '', destino: '' });
        fetchVisitantes();
        alert('Visitante registrado com sucesso!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao registrar visitante.');
      }
    } catch (error) {
      console.error(error);
      alert('Falha ao comunicar com o servidor.');
    }
  };

  const darSaidaVisitante = async (id: string) => {
    if (!await confirm('Confirmar saída deste visitante?')) return;
    try {
      await fetch(`/api/visitantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SAIU' })
      });
      fetchVisitantes();
    } catch (error) {
      alert('Erro ao registrar saída.');
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

  const hoje = new Date().toDateString();
  const visitantesDentro = visitantes.filter(v => v.status === 'DENTRO');
  const visitantesHojeSairam = visitantes.filter(v => v.status === 'SAIU' && v.saida && new Date(v.saida).toDateString() === hoje);

  const recentes = [...pacientes].sort((a, b) => {
    const dataA = a.dataCadastro ? new Date(a.dataCadastro).getTime() : 0;
    const dataB = b.dataCadastro ? new Date(b.dataCadastro).getTime() : 0;
    return dataB - dataA;
  }).slice(0, 10);

  const formatHora = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDataHora = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '26px', color: '#0a1f44', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <i className="las la-user-nurse"></i> Recepção
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalVisitante(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', transition: 'all 0.2s' }}>
            <i className="las la-walking"></i> Registrar Visitante
          </button>
          <button onClick={() => setModalAberto(true)} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', transition: 'all 0.2s' }}>
            <i className="las la-user-plus"></i> Novo Paciente
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '25px' }}>
        <div style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #64748b', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-clipboard-list"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Na Recepção</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#64748b' }}>{stats.recepcao}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #f59e0b', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-hourglass-half"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aguard. Triagem</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#f59e0b' }}>{stats.aguardandoTriagem}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #3b82f6', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-user-md"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aguard. Médico</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#3b82f6' }}>{stats.aguardandoMedico}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #ec4899', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-bed"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Internados</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#ec4899' }}>{stats.internados}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #6366f1', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-walking"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visitantes Dentro</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#6366f1' }}>{visitantesDentro.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', padding: '18px', borderRadius: '14px', textAlign: 'center', borderLeft: '4px solid #10b981', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.06 }}><i className="las la-sign-out-alt"></i></div>
          <h3 style={{ fontSize: '11px', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saíram Hoje</h3>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#10b981' }}>{visitantesHojeSairam.length}</div>
        </div>
      </div>

      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '22px', marginBottom: '25px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0a1f44' }}><i className="las la-search"></i> Buscar Paciente</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Digite nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPaciente()}
            style={{ flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', transition: 'border 0.2s', outline: 'none' }}
          />
          <button onClick={buscarPaciente} style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}>
            <i className="las la-search"></i> Buscar
          </button>
        </div>

        {buscou && (
          <div style={{ marginTop: '18px' }}>
            {resultadoBusca ? (
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: '12px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1e3a8a', fontSize: '15px' }}><i className="las la-user-circle"></i> {resultadoBusca.nome}</h4>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px' }}><i className="las la-id-card"></i> CPF: {resultadoBusca.cpf || "Não informado"}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px' }}><i className="las la-flag"></i> Status: {resultadoBusca.status || "Recepção"}</p>
                </div>
                <button
                  onClick={() => enviarParaTriagem(resultadoBusca.id)}
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}
                >
                  <i className="las la-stethoscope"></i> Iniciar Triagem
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '25px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                <i className="las la-user-slash" style={{ fontSize: '40px', marginBottom: '8px' }}></i>
                <p style={{ margin: '0 0 10px 0' }}>Paciente não encontrado</p>
                <button onClick={() => setModalAberto(true)} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                  <i className="las la-user-plus"></i> Cadastrar novo paciente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '0' }}>
        <button
          onClick={() => setAbaAtiva('pacientes')}
          style={{
            padding: '12px 28px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
            borderRadius: '12px 12px 0 0',
            background: abaAtiva === 'pacientes' ? 'white' : '#e2e8f0',
            color: abaAtiva === 'pacientes' ? '#1e3a8a' : '#64748b',
            boxShadow: abaAtiva === 'pacientes' ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="las la-user-injured"></i> Pacientes Recentes
        </button>
        <button
          onClick={() => setAbaAtiva('visitantes')}
          style={{
            padding: '12px 28px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
            borderRadius: '12px 12px 0 0',
            background: abaAtiva === 'visitantes' ? 'white' : '#e2e8f0',
            color: abaAtiva === 'visitantes' ? '#6366f1' : '#64748b',
            boxShadow: abaAtiva === 'visitantes' ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="las la-walking"></i> Controle de Visitantes
          {visitantesDentro.length > 0 && (
            <span style={{ background: '#6366f1', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
              {visitantesDentro.length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div style={{ background: 'white', borderRadius: '0 14px 14px 14px', padding: '25px', marginBottom: '30px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {abaAtiva === 'pacientes' && (
          <>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#0a1f44' }}><i className="las la-history"></i> Últimos Pacientes na Recepção</h3>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Carregando...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paciente</th>
                      <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPF</th>
                      <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chegada</th>
                      <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentes.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum paciente na recepção</td></tr>
                    ) : (
                      recentes.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fafbfc' : 'white', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{p.nome}</td>
                          <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{p.cpf || '-'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{p.dataCadastro ? new Date(p.dataCadastro).toLocaleDateString('pt-BR') : '-'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '13px' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                              background: p.status === 'Recepção' ? '#64748b' : p.status === 'Aguardando Triagem' ? '#f59e0b' : p.status === 'Em Triagem' ? '#3b82f6' : '#8b5cf6',
                              color: 'white'
                            }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
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
          </>
        )}

        {abaAtiva === 'visitantes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0a1f44' }}><i className="las la-walking"></i> Visitantes — Controle de Acesso</h3>
              <button onClick={() => setModalVisitante(true)} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="las la-plus-circle"></i> Novo Visitante
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Documento</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destino</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrada</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saída</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', padding: '12px 14px', textAlign: 'center', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {visitantes.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <i className="las la-door-open" style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}></i>
                      Nenhum visitante registrado hoje.
                    </td></tr>
                  ) : (
                    visitantes.map((v, idx) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fafbfc' : 'white', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: v.status === 'DENTRO' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#94a3b8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '13px', fontWeight: '800', flexShrink: 0
                            }}>
                              {v.nome.charAt(0).toUpperCase()}
                            </div>
                            {v.nome}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{v.documento || '-'}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{v.destino || '-'}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{formatDataHora(v.entrada)}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#475569' }}>{v.saida ? formatDataHora(v.saida) : '-'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                            background: v.status === 'DENTRO' ? '#dcfce7' : '#f1f5f9',
                            color: v.status === 'DENTRO' ? '#16a34a' : '#64748b'
                          }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: v.status === 'DENTRO' ? '#16a34a' : '#94a3b8', display: 'inline-block' }}></span>
                            {v.status === 'DENTRO' ? 'Dentro' : 'Saiu'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {v.status === 'DENTRO' ? (
                            <button
                              onClick={() => darSaidaVisitante(v.id)}
                              style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(239,68,68,0.3)' }}
                              title="Registrar Saída"
                            >
                              <i className="las la-sign-out-alt"></i> Dar Saída
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>✓ Concluído</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Novo Paciente */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: '450px', maxWidth: '90%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><i className="las la-user-plus"></i> Novo Paciente</span>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '25px' }}>
              <form onSubmit={criarPaciente}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-user"></i> Nome completo *</label>
                <input required type="text" placeholder="Nome completo" value={formPaciente.nome} onChange={e => setFormPaciente({...formPaciente, nome: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} />

                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-id-card"></i> CPF</label>
                <input type="text" placeholder="CPF (opcional)" value={formPaciente.cpf} onChange={e => setFormPaciente({...formPaciente, cpf: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box', outline: 'none' }} />

                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-calendar"></i> Data de Nascimento</label>
                <input type="date" value={formPaciente.nascimento} onChange={e => setFormPaciente({...formPaciente, nascimento: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box', outline: 'none' }} />

                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-phone"></i> Telefone</label>
                <input type="text" placeholder="(00) 00000-0000" value={formPaciente.telefone} onChange={e => setFormPaciente({...formPaciente, telefone: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />

                <button type="submit" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', padding: '13px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                  <i className="las la-save"></i> Cadastrar e Iniciar Atendimento
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Visitante */}
      {modalVisitante && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: '450px', maxWidth: '90%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><i className="las la-walking"></i> Registrar Visitante</span>
              <button onClick={() => setModalVisitante(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '25px' }}>
              <form onSubmit={criarVisitante}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-user"></i> Nome completo *</label>
                <input required type="text" placeholder="Nome do visitante" value={formVisitante.nome} onChange={e => setFormVisitante({...formVisitante, nome: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box', outline: 'none' }} />

                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-id-card"></i> Documento (RG/CPF)</label>
                <input type="text" placeholder="Documento (opcional)" value={formVisitante.documento} onChange={e => setFormVisitante({...formVisitante, documento: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box', outline: 'none' }} />

                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}><i className="las la-map-marker"></i> Destino</label>
                <input type="text" placeholder="Ex: Leito 104, UTI, Diretoria" value={formVisitante.destino} onChange={e => setFormVisitante({...formVisitante, destino: e.target.value})} style={{ width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />

                <button type="submit" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '13px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                  <i className="las la-door-open"></i> Registrar Entrada
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
