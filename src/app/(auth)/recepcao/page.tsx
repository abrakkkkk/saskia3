'use client';

import { useState, useEffect } from 'react';
import { getIniciais } from '@/lib/utils'; // Assumindo que existe, se não, eu mudo depois.

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
  status: string;
  classificacao: string | null;
}

export default function RecepcaoPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [formPaciente, setFormPaciente] = useState({ nome: '', cpf: '', nascimento: '', classificacao: 'Verde' });

  const fetchPacientes = () => {
    fetch('/api/pacientes')
      .then(res => res.json())
      .then(data => {
        // Filtrar apenas pacientes na recepção ou recém-chegados
        const naRecepcao = data.filter((p: Paciente) => p.status === 'Recepção' || p.status === 'Aguardando');
        setPacientes(naRecepcao);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  const chamarPainel = async (paciente: Paciente) => {
    try {
      await fetch('/api/chamadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          cpf: paciente.cpf,
          consultorio: 'Recepção 01'
        })
      });
      alert(`Paciente ${paciente.nome} chamado ao painel!`);
    } catch (e) {
      alert('Erro ao chamar paciente');
    }
  };

  const enviarParaTriagem = async (id: string) => {
    try {
      await fetch(`/api/pacientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Triagem' })
      });
      fetchPacientes(); // Atualiza a lista removendo o paciente
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
          nascimento: new Date(formPaciente.nascimento).toISOString(),
          classificacao: formPaciente.classificacao,
          status: 'Recepção'
        })
      });
      if (res.ok) {
        setModalAberto(false);
        setFormPaciente({ nome: '', cpf: '', nascimento: '', classificacao: 'Verde' });
        fetchPacientes(); // recarrega a lista
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

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-user-nurse"></i> Recepção</h2>
          <p>Gestão de chegada de pacientes e encaminhamentos</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Novo Paciente
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Fila de Espera</h3>
          
          {loading ? (
            <p>Carregando fila...</p>
          ) : pacientes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-check-circle" style={{ fontSize: '48px', marginBottom: '10px', color: '#10b981' }}></i>
              <p>Recepção vazia. Nenhum paciente aguardando.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>CPF</th>
                    <th>Status</th>
                    <th>Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map(paciente => (
                    <tr key={paciente.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                            {paciente.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{paciente.nome}</div>
                          </div>
                        </div>
                      </td>
                      <td>{paciente.cpf || 'Não informado'}</td>
                      <td>
                        <span className="status-badge bg-yellow-100 text-yellow-800" style={{ color: 'inherit' }}>
                           Aguardando
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => chamarPainel(paciente)}
                          >
                            <i className="las la-bullhorn"></i> Chamar
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            onClick={() => enviarParaTriagem(paciente.id)}
                          >
                            <i className="las la-arrow-right"></i> Triagem
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Novo Paciente */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '20px', color: '#1e293b', margin: 0 }}><i className="las la-user-plus text-blue-600"></i> Cadastrar Paciente</h3>
              <button onClick={() => setModalAberto(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}><i className="las la-times"></i></button>
            </div>
            
            <form onSubmit={criarPaciente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Nome Completo *</label>
                <input required type="text" className="input-field" placeholder="Ex: Maria da Silva" value={formPaciente.nome} onChange={e => setFormPaciente({...formPaciente, nome: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>CPF</label>
                  <input type="text" className="input-field" placeholder="000.000.000-00" value={formPaciente.cpf} onChange={e => setFormPaciente({...formPaciente, cpf: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Data de Nascimento *</label>
                  <input required type="date" className="input-field" value={formPaciente.nascimento} onChange={e => setFormPaciente({...formPaciente, nascimento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>Risco Aparente (Triagem Visual)</label>
                <select className="input-field" value={formPaciente.classificacao} onChange={e => setFormPaciente({...formPaciente, classificacao: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="Azul">Não Urgente (Azul)</option>
                  <option value="Verde">Pouco Urgente (Verde)</option>
                  <option value="Amarelo">Urgente (Amarelo)</option>
                  <option value="Vermelho">Emergência (Vermelho)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" >Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
