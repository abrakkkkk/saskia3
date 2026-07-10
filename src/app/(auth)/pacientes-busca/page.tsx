'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  status: string;
  classificacao: string;
}

export default function BuscarPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch('/api/pacientes')
      .then(r => r.json())
      .then(data => {
        setPacientes(data);
        setCarregando(false);
      });
  }, []);

  const pacientesFiltrados = pacientes.filter(p => {
    const buscaMatch = p.nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
                       (p.cpf && p.cpf.includes(termoBusca));
    const statusMatch = filtroStatus === 'Todos' || p.status === filtroStatus;
    return buscaMatch && statusMatch;
  });

  const badgeClass = (classificacao: string) => {
    switch (classificacao) {
      case 'Vermelho': return 'bg-red-100 text-red-700';
      case 'Amarelo': return 'bg-yellow-100 text-yellow-700';
      case 'Verde': return 'bg-green-100 text-green-700';
      case 'Azul': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2><i className="las la-search"></i> Buscar Pacientes</h2>
      </div>

      <div className="card mb-30" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="busca-wrapper" style={{ flex: '1', minWidth: '300px' }}>
          <i className="las la-search"></i>
          <input 
            type="text" 
            placeholder="Buscar por Nome ou CPF..." 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['Todos', 'Recepção', 'Em Triagem', 'Em Atendimento Médico', 'Internado', 'Alta'].map(status => (
            <div 
              key={status}
              className={`filtro-badge ${filtroStatus === status ? 'ativo' : ''}`}
              onClick={() => setFiltroStatus(status)}
            >
              {status}
            </div>
          ))}
        </div>
      </div>

      <div className="tabela-wrapper">
        <table className="tabela">
          <thead>
            <tr>
              <th>Paciente / CPF</th>
              <th>Status Atual</th>
              <th>Classificação</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={4} className="text-center">Carregando...</td></tr>
            ) : pacientesFiltrados.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted">Nenhum paciente encontrado.</td></tr>
            ) : (
              pacientesFiltrados.map((paciente) => (
                <tr key={paciente.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{paciente.nome}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>CPF: {paciente.cpf || 'Não informado'}</div>
                  </td>
                  <td>{paciente.status}</td>
                  <td>
                    {paciente.classificacao ? (
                      <span className={`status-badge ${badgeClass(paciente.classificacao)}`}>
                        {paciente.classificacao}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Não triado</span>
                    )}
                  </td>
                  <td className="text-center">
                    <Link href={`/pacientes/${paciente.id}`} className="btn btn-primary btn-sm">
                      <i className="las la-eye"></i> Prontuário
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
