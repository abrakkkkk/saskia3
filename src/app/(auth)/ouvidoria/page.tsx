'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './ouvidoria.css';

export default function OuvidoriaPage() {
  const { data: session } = useSession();
  const [tabAtiva, setTabAtiva] = useState('registrar');
  
  // Dados
  const [manifestacoes, setManifestacoes] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    tipo: 'Elogio',
    nome: '',
    contato: '',
    setor: 'Geral',
    descricao: ''
  });

  const getHospitalId = () => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

  useEffect(() => {
    const hid = getHospitalId();
    try {
      const o = JSON.parse(localStorage.getItem(`${hid}_ouvManifestacoes`) || '[]');
      setManifestacoes(o);
    } catch(e) {}
  }, [session]);

  const registrarManifestacao = () => {
    if (!form.descricao.trim()) {
      alert("⚠️ Descreva a manifestação!");
      return;
    }

    const nova = {
      id: Date.now(),
      tipo: form.tipo,
      nome: form.nome.trim() || "Anônimo",
      contato: form.contato,
      setor: form.setor,
      descricao: form.descricao,
      status: "Pendente",
      data: new Date().toISOString()
    };

    const hid = getHospitalId();
    const atualizadas = [...manifestacoes, nova];
    setManifestacoes(atualizadas);
    localStorage.setItem(`${hid}_ouvManifestacoes`, JSON.stringify(atualizadas));

    setForm({
      tipo: 'Elogio',
      nome: '',
      contato: '',
      setor: 'Geral',
      descricao: ''
    });
    alert(`✅ Manifestação registrada com sucesso! Protocolo: ${nova.id}`);
    setTabAtiva('lista');
  };

  const responderManifestacao = (id: number) => {
    if (!confirm("Confirmar que esta manifestação foi respondida/tratada?")) return;
    const hid = getHospitalId();
    const novas = manifestacoes.map(m => m.id === id ? { ...m, status: "Respondida" } : m);
    setManifestacoes(novas);
    localStorage.setItem(`${hid}_ouvManifestacoes`, JSON.stringify(novas));
  };

  // Estatísticas
  const pendentes = manifestacoes.filter(m => m.status === "Pendente").length;
  const respondidas = manifestacoes.filter(m => m.status === "Respondida").length;

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
                <label>Contato (opcional)</label>
                <input type="text" value={form.contato} onChange={e => setForm({...form, contato: e.target.value})} placeholder="Telefone ou e-mail" />
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
                <tr><th>Protocolo</th><th>Data</th><th>Tipo</th><th>Nome</th><th>Setor</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {manifestacoes.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma manifestação registrada.</td></tr>
                ) : (
                  manifestacoes.slice().reverse().map((m, i) => {
                    let tipoBadge = "badge-info";
                    if (m.tipo === 'Elogio') tipoBadge = "badge-success";
                    if (m.tipo === 'Reclamação') tipoBadge = "badge-warning";
                    if (m.tipo === 'Denúncia') tipoBadge = "badge-danger";

                    return (
                      <tr key={i}>
                        <td><strong>#{m.id.toString().slice(-6)}</strong></td>
                        <td>{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                        <td><span className={`badge ${tipoBadge}`}>{m.tipo}</span></td>
                        <td>{m.nome}</td>
                        <td>{m.setor}</td>
                        <td>
                          <span className={`badge ${m.status === 'Respondida' ? 'badge-success' : 'badge-warning'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td>
                          {m.status === 'Pendente' && (
                            <button className="btn btn-success btn-sm" onClick={() => responderManifestacao(m.id)}>
                              <i className="las la-check"></i> Marcar Respondida
                            </button>
                          )}
                        </td>
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
