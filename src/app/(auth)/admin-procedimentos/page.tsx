'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import './procedimentos.css';

interface Procedimento {
  nome: string;
  descricao: string;
  valor: string;
  area: string;
}

export default function AdminProcedimentosPage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formArea, setFormArea] = useState('Enfermagem');

  useEffect(() => {
    try {
      const u = JSON.stringify(getSessionUser());
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      fetch(`/api/procedimento?hospitalId=${hid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Map db object to UI model
            const mapped = data.map(p => ({
              id: p.id,
              nome: p.nome,
              descricao: p.descricao || '',
              valor: p.valorBase ? `R$ ${p.valorBase}` : '',
              area: 'Geral' // or some default
            }));
            setProcedimentos(mapped);
          }
        })
        .catch(console.error);
    } catch(e) {}
  }, []);

  const saveProcedimentos = (data: Procedimento[]) => {
    setProcedimentos(data);
    const novo = data[data.length - 1];
    if (hospitalId && novo) {
      // POST the newest
      fetch('/api/procedimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hospitalId, 
          nome: novo.nome, 
          descricao: novo.descricao 
        })
      }).catch(console.error);
    }
  };

  const abrirModal = (index: number | null = null) => {
    if (index !== null) {
      const p = procedimentos[index];
      setEditIndex(index);
      setFormNome(p.nome);
      setFormDescricao(p.descricao);
      setFormValor(p.valor || '');
      setFormArea(p.area || 'Enfermagem');
    } else {
      setEditIndex(null);
      setFormNome('');
      setFormDescricao('');
      setFormValor('');
      setFormArea('Enfermagem');
    }
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditIndex(null);
  };

  const salvarProcedimento = () => {
    if (!formNome.trim()) {
      alert("Informe o nome do procedimento!");
      return;
    }

    const p: Procedimento = {
      nome: formNome,
      descricao: formDescricao,
      valor: formValor,
      area: formArea
    };

    let novaLista = [...procedimentos];
    if (editIndex !== null) {
      novaLista[editIndex] = p;
    } else {
      novaLista.push(p);
    }

    saveProcedimentos(novaLista);
    fecharModal();
    alert("✅ Procedimento salvo com sucesso!");
  };

  const excluirProcedimento = (index: number) => {
    if(confirm("Tem certeza que deseja excluir este procedimento?")) {
      let novaLista = [...procedimentos];
      novaLista.splice(index, 1);
      saveProcedimentos(novaLista);
    }
  };

  return (
    <div className="conteudo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2><i className="las la-syringe"></i> Procedimentos</h2>
          <p>Gerencie o catálogo de procedimentos, exames e serviços prestados.</p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()} style={{ padding: '12px 24px' }}>
          <i className="las la-plus"></i> Novo Procedimento
        </button>
      </div>

      <div className="lista-procedimentos">
        {procedimentos.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhum procedimento cadastrado.</p>
        ) : (
          procedimentos.map((p, idx) => (
            <div className="procedimento-item" key={idx}>
              <div className="procedimento-info">
                <h4>{p.nome}</h4>
                <p>{p.descricao}</p>
                <div className="procedimento-footer">
                  <span className={`badge-area area-${p.area}`}>
                    {p.area === 'Enfermagem' && <i className="las la-user-nurse"></i>}
                    {p.area === 'Médico' && <i className="las la-stethoscope"></i>}
                    {p.area === 'Exames' && <i className="las la-vial"></i>}
                    {p.area === 'Administrativo' && <i className="las la-file-alt"></i>}
                    {' '}{p.area}
                  </span>
                  {p.valor && (
                    <span className="badge-valor">
                      <i className="las la-coins"></i> {p.valor}
                    </span>
                  )}
                </div>
              </div>
              <div className="procedimento-acoes">
                <button className="btn-editar" onClick={() => abrirModal(idx)} title="Editar"><i className="las la-edit"></i></button>
                <button className="btn-excluir" onClick={() => excluirProcedimento(idx)} title="Excluir"><i className="las la-trash"></i></button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className={editIndex !== null ? "las la-edit" : "las la-plus-circle"}></i> {editIndex !== null ? "Editar Procedimento" : "Novo Procedimento"}</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }} onClick={fecharModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do procedimento *</label>
                <input 
                  type="text" 
                  value={formNome} 
                  onChange={e => setFormNome(e.target.value)} 
                  placeholder="Ex: Curativo Simples" 
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  rows={3} 
                  value={formDescricao} 
                  onChange={e => setFormDescricao(e.target.value)} 
                  placeholder="Detalhes e observações sobre o procedimento"
                />
              </div>
              <div className="form-group">
                <label>Valor (opcional)</label>
                <input 
                  type="text" 
                  value={formValor} 
                  onChange={e => setFormValor(e.target.value)} 
                  placeholder="Ex: R$ 50,00" 
                />
              </div>
              <div className="form-group">
                <label>Área Responsável</label>
                <select value={formArea} onChange={e => setFormArea(e.target.value)}>
                  <option value="Enfermagem">Enfermagem</option>
                  <option value="Médico">Médico</option>
                  <option value="Exames">Exames</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-success" onClick={salvarProcedimento}><i className="las la-save"></i> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
