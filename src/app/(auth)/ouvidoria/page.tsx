'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './ouvidoria.css';

export default function OuvidoriaPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.cargo === 'ADMIN';
  const [tabAtiva, setTabAtiva] = useState('registrar');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
  // Dados
  const [manifestacoes, setManifestacoes] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    tipo: 'Elogio',
    nome: '',
    setor: 'Geral',
    descricao: ''
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ouvidoria');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar as manifestações.');
      setManifestacoes(Array.isArray(data) ? data : []);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Não foi possível carregar as manifestações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const registrarManifestacao = async () => {
    if (!form.descricao.trim()) {
      alert(" Descreva a manifestação!");
      return;
    }

    const payload = {
      tipo: form.tipo,
      setor: form.setor,
      paciente: form.nome.trim() || "Anônimo",
      mensagem: form.descricao.trim()
    };

    try {
      const res = await fetch('/api/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao registrar');
      
      const nova = await res.json();
      
      setForm({
        tipo: 'Elogio',
        nome: '',
        setor: 'Geral',
        descricao: ''
      });
      alert(` Manifestação registrada com sucesso! Protocolo: ${nova.protocolo}`);
      carregarDados();
      setTabAtiva('lista');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const responderManifestacao = async (id: string) => {
    if (!await confirm("Confirmar que esta manifestação foi respondida/tratada?")) return;
    
    try {
      const res = await fetch(`/api/ouvidoria/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Respondida" })
      });
      if (!res.ok) throw new Error('Erro ao responder');
      
      carregarDados();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Estatísticas
  const estaRespondida = (status: string) => ['RESPONDIDA', 'RESPONDIDO', 'CONCLUIDA', 'CONCLUÍDA'].includes(status.toUpperCase());
  const pendentes = manifestacoes.filter(m => !estaRespondida(m.status || '')).length;
  const respondidas = manifestacoes.filter(m => estaRespondida(m.status || '')).length;

  if (loading && manifestacoes.length === 0) return <div>Carregando...</div>;

  return (
    <div className="conteudo">
      <div className="ouv-container">

        <div className="banner-ouv">
          <div>
            <h1><i className="las la-headset"></i> Ouvidoria</h1>
            <p>Canal de manifestações: elogios, sugestões, reclamações e denúncias</p>
          </div>
          <button className="btn btn-success" onClick={() => setTabAtiva('registrar')}>
            <i className="las la-plus-circle"></i> Nova Manifestação
          </button>
        </div>

        {erroCarga && <div role="alert" className="alert-erro" style={{ margin: '0 0 16px' }}>{erroCarga}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-numero">{manifestacoes.length}</div>
            <div className="stat-label">Total de Manifestações</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero" style={{ color: '#d97706' }}>{pendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero" style={{ color: '#16a34a' }}>{respondidas}</div>
            <div className="stat-label">Respondidas</div>
          </div>
        </div>

        <div className="tabs-ouv">
          <button className={`tab-btn ${tabAtiva === 'registrar' ? 'ativo' : ''}`} onClick={() => setTabAtiva('registrar')}>
            <i className="las la-plus-circle"></i> Registrar
          </button>
          <button className={`tab-btn ${tabAtiva === 'lista' ? 'ativo' : ''}`} onClick={() => setTabAtiva('lista')}>
            <i className="las la-list"></i> Manifestações
          </button>
        </div>

        {tabAtiva === 'registrar' && (
          <div className="form-panel">
            <h3><i className="las la-headset"></i> Registrar Manifestação</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Elogio</option>
                  <option>Sugestão</option>
                  <option>Reclamação</option>
                  <option>Denúncia</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Nome (opcional)</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Anônimo se não preencher" />
              </div>
              <div className="form-grupo">
                <label>Setor Relacionado</label>
                <select value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}>
                  <option>Geral</option>
                  <option>Emergência</option>
                  <option>UTI</option>
                  <option>Enfermaria</option>
                  <option>Recepção</option>
                  <option>Farmácia</option>
                </select>
              </div>
              <div className="form-grupo full">
                <label>Descrição *</label>
                <textarea rows={4} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva sua manifestação..."></textarea>
              </div>
            </div>
            <button className="btn btn-success" onClick={registrarManifestacao} style={{ width: '100%', marginTop: '15px' }}>
              <i className="las la-save"></i> Enviar Manifestação
            </button>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div className="tabela-wrapper">
            <table className="tabela-ouv">
              <thead>
                <tr><th>Protocolo</th><th>Data</th><th>Tipo</th><th>Nome</th><th>Setor</th><th>Status</th>{isAdmin && <th>Ações</th>}</tr>
              </thead>
              <tbody>
                {manifestacoes.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma manifestação registrada.</td></tr>
                ) : (
                  manifestacoes.slice().map((m) => {
                    let tipoBadge = "badge-info";
                    if (m.tipo === 'Elogio') tipoBadge = "badge-success";
                    if (m.tipo === 'Reclamação') tipoBadge = "badge-warning";
                    if (m.tipo === 'Denúncia') tipoBadge = "badge-danger";

                    return (
                      <tr key={m.id}>
                        <td><strong>#{m.protocolo}</strong></td>
                        <td>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td><span className={`badge ${tipoBadge}`}>{m.tipo}</span></td>
                        <td>{m.paciente}</td>
                        <td>{m.setor}</td>
                        <td>
                          <span className={`badge ${estaRespondida(m.status || '') ? 'badge-success' : 'badge-warning'}`}>
                            {estaRespondida(m.status || '') ? 'Respondida' : (m.status === 'ABERTO' ? 'Pendente' : m.status)}
                          </span>
                        </td>
                        {isAdmin && <td>
                          {!estaRespondida(m.status || '') && (
                            <button className="btn btn-success btn-sm" onClick={() => responderManifestacao(m.id)}>
                              <i className="las la-check"></i> Marcar Respondida
                            </button>
                          )}
                        </td>}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
