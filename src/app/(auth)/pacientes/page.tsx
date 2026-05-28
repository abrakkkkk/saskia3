'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { calcularIdade, getIniciais, STATUS_CORES, MANCHESTER_CORES } from '@/lib/utils';

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

  useEffect(() => {
    fetch('/api/pacientes')
      .then(r => r.json())
      .then(data => { setPacientes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtrados = pacientes.filter(p => {
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    const matchBusca = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.cpf?.includes(busca);
    return matchStatus && matchBusca;
  });

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
      <div className="page-header">
        <h2><i className="las la-user-injured"></i> Pacientes</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/gestao-salas" className="btn btn-purple"><i className="las la-door-open"></i> Gerenciar Salas</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="las la-users"></i></div>
          <div><div className="stat-numero">{stats.total}</div><div className="stat-label">Total</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="las la-hourglass-half"></i></div>
          <div><div className="stat-numero">{stats.aguardando}</div><div className="stat-label">Aguardando</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><i className="las la-procedures"></i></div>
          <div><div className="stat-numero">{stats.atendimento}</div><div className="stat-label">Em Atendimento</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><i className="las la-bed"></i></div>
          <div><div className="stat-numero">{stats.internados}</div><div className="stat-label">Internados</div></div>
        </div>
      </div>

      {/* Busca */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="busca-wrapper">
          <i className="las la-search"></i>
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar por nome ou CPF..." />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {statusList.map(s => (
          <button
            key={s}
            className={`filtro-badge ${filtroStatus === s ? 'ativo' : ''}`}
            onClick={() => { setFiltroStatus(s); setPagina(1); }}
          >
            {statusLabels[s]}
            <span className="count">
              {s === 'todos' ? pacientes.length : pacientes.filter(p => p.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="tabela-wrapper">
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
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#1e3a8a', fontWeight: 700, fontSize: 14,
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
                          {manch.emoji} {p.classificacao}
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
                        <Link href={`/pacientes/${p.id}`} className="btn btn-primary btn-xs">
                          <i className="las la-eye"></i>
                        </Link>
                        <button className="btn btn-danger btn-xs" onClick={() => {
                          if (confirm('Excluir este paciente?')) {
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
    </div>
  );
}
